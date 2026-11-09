-- Order requests (additive). A buyer asks to take one listed artwork at the
-- asking price or at the price of an accepted offer. The artist confirms or
-- declines. No payment, charge, reservation or stock change happens here, and
-- no existing table, column or policy is altered.
--
-- Privacy: the buyer's phone, delivery address, PIN and email are readable by
-- the buyer and, only after the artist confirms, by that artwork's artist.
-- Artists never read this table directly; they use artist_order_requests(),
-- which returns first name and a PIN prefix until the request is confirmed.

begin;
create table if not exists public.order_requests(
  id uuid primary key default gen_random_uuid(),
  artwork_id uuid not null references public.artworks(id) on delete cascade,
  buyer_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  offer_id uuid references public.offers(id) on delete set null,
  amount_inr integer not null,
  status text not null default 'pending',
  buyer_name text not null,
  buyer_phone text not null default '',
  delivery_address text not null default '',
  delivery_pin text not null default '',
  buyer_email text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.order_requests enable row level security;
revoke all on public.order_requests from anon, authenticated;
commit;

alter table public.order_requests drop constraint if exists order_requests_amount_range;
alter table public.order_requests add constraint order_requests_amount_range check (amount_inr between 1 and 10000000);
alter table public.order_requests drop constraint if exists order_requests_status_values;
alter table public.order_requests add constraint order_requests_status_values check (status in ('pending','confirmed','declined','withdrawn'));
alter table public.order_requests drop constraint if exists order_requests_field_lengths;
alter table public.order_requests add constraint order_requests_field_lengths check (
  char_length(btrim(buyer_name)) between 1 and 80 and char_length(buyer_phone) <= 20 and char_length(delivery_address) <= 300
  and (delivery_pin = '' or delivery_pin ~ '^[0-9]{6}$') and char_length(buyer_email) <= 120);

create unique index if not exists order_requests_one_open_idx on public.order_requests(artwork_id, buyer_id) where status in ('pending','confirmed');
create index if not exists order_requests_artwork_idx on public.order_requests(artwork_id, created_at desc);
create index if not exists order_requests_buyer_idx on public.order_requests(buyer_id, created_at desc);

drop trigger if exists order_requests_updated_at on public.order_requests;
create trigger order_requests_updated_at before update on public.order_requests for each row execute function public.set_updated_at();

-- The buyer reads only their own rows. No insert, update or delete grants:
-- every change goes through the functions below.
grant select on public.order_requests to authenticated;
drop policy if exists order_requests_read_buyer on public.order_requests;
create policy order_requests_read_buyer on public.order_requests for select to authenticated using ((select auth.uid()) = buyer_id);

create or replace function public.create_order_request(p_artwork uuid, p_name text, p_phone text, p_address text, p_pin text, p_email text, p_offer uuid default null)
returns public.order_requests language plpgsql security definer set search_path = '' as $$
declare
  v_caller uuid := auth.uid();
  a public.artworks;
  o public.offers;
  v_amount integer;
  v_recent integer;
  v_row public.order_requests;
  v_name text := btrim(coalesce(p_name, ''));
  v_phone text := btrim(coalesce(p_phone, ''));
  v_address text := btrim(coalesce(p_address, ''));
  v_pin text := btrim(coalesce(p_pin, ''));
  v_email text := btrim(coalesce(p_email, ''));
begin
  if v_caller is null then raise exception 'Sign in to send an order request.'; end if;
  select * into a from public.artworks where id = p_artwork;
  if not found or a.status <> 'published' or not a.for_sale then raise exception 'This artwork is not listed for sale.'; end if;
  if a.owner_id = v_caller then raise exception 'This is your own artwork.'; end if;
  v_amount := a.asking_price_inr;
  if p_offer is not null then
    select * into o from public.offers where id = p_offer and buyer_id = v_caller and artwork_id = p_artwork and status = 'accepted';
    if not found then raise exception 'That is not an accepted offer of yours on this artwork.'; end if;
    v_amount := o.amount_inr;
  end if;
  if char_length(v_name) < 1 or char_length(v_name) > 80 then raise exception 'Enter your name.'; end if;
  if a.format = 'Physical' then
    if v_phone !~ '^[0-9+ ()-]{7,20}$' then raise exception 'Enter a valid phone number.'; end if;
    if char_length(v_address) < 5 or char_length(v_address) > 300 then raise exception 'Enter your delivery address.'; end if;
    if v_pin !~ '^[0-9]{6}$' then raise exception 'Enter a 6-digit PIN code.'; end if;
    v_email := '';
  else
    if char_length(v_email) > 120 or v_email !~ '^[^@ ]+@[^@ ]+\.[^@ ]+$' then raise exception 'Enter a valid email for the file.'; end if;
    v_phone := ''; v_address := ''; v_pin := '';
  end if;
  perform pg_advisory_xact_lock(hashtext(v_caller::text));
  select count(*) into v_recent from public.order_requests r where r.buyer_id = v_caller and r.created_at > now() - interval '1 hour';
  if v_recent >= 10 then raise exception 'Too many requests in a short time. Wait a while before sending another.'; end if;
  begin
    insert into public.order_requests(artwork_id, buyer_id, offer_id, amount_inr, buyer_name, buyer_phone, delivery_address, delivery_pin, buyer_email)
    values (p_artwork, v_caller, p_offer, v_amount, v_name, v_phone, v_address, v_pin, v_email) returning * into v_row;
  exception when unique_violation then
    raise exception 'You already have an open request for this artwork.';
  end;
  return v_row;
end;
$$;
revoke all on function public.create_order_request(uuid, text, text, text, text, text, uuid) from public, anon, authenticated;
grant execute on function public.create_order_request(uuid, text, text, text, text, text, uuid) to authenticated;

create or replace function public.artist_order_requests(p_artworks uuid[])
returns table(id uuid, artwork_id uuid, status text, amount_inr integer, created_at timestamptz, first_name text, area text, buyer_name text, buyer_phone text, delivery_address text, delivery_pin text, buyer_email text)
language sql security definer set search_path = '' stable as $$
  select r.id, r.artwork_id, r.status, r.amount_inr, r.created_at,
    split_part(btrim(r.buyer_name), ' ', 1),
    case when r.delivery_pin <> '' then left(r.delivery_pin, 3) || 'xxx' else '' end,
    case when r.status = 'confirmed' then r.buyer_name end,
    case when r.status = 'confirmed' then r.buyer_phone end,
    case when r.status = 'confirmed' then r.delivery_address end,
    case when r.status = 'confirmed' then r.delivery_pin end,
    case when r.status = 'confirmed' then r.buyer_email end
  from public.order_requests r join public.artworks a on a.id = r.artwork_id
  where a.owner_id = auth.uid() and r.artwork_id = any(p_artworks)
  order by r.created_at desc limit 50;
$$;
revoke all on function public.artist_order_requests(uuid[]) from public, anon, authenticated;
grant execute on function public.artist_order_requests(uuid[]) to authenticated;

create or replace function public.respond_order_request(p_request uuid, p_action text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v public.order_requests;
  v_caller uuid := auth.uid();
begin
  select r.* into v from public.order_requests r where r.id = p_request for update;
  if not found then raise exception 'Request not found.'; end if;
  if v_caller is null or not exists(select 1 from public.artworks a where a.id = v.artwork_id and a.owner_id = v_caller) then
    raise exception 'Only the artist can answer this request.';
  end if;
  if v.status <> 'pending' then raise exception 'This request is already closed.'; end if;
  if p_action = 'confirm' then
    update public.order_requests set status = 'confirmed' where id = p_request returning * into v;
  elsif p_action = 'decline' then
    update public.order_requests set status = 'declined' where id = p_request returning * into v;
  else
    raise exception 'Unknown response.';
  end if;
  return jsonb_build_object('id', v.id, 'status', v.status);
end;
$$;
revoke all on function public.respond_order_request(uuid, text) from public, anon, authenticated;
grant execute on function public.respond_order_request(uuid, text) to authenticated;

create or replace function public.buyer_order_action(p_request uuid, p_action text)
returns public.order_requests language plpgsql security definer set search_path = '' as $$
declare
  v public.order_requests;
  v_caller uuid := auth.uid();
begin
  select r.* into v from public.order_requests r where r.id = p_request for update;
  if not found then raise exception 'Request not found.'; end if;
  if v_caller is null or v.buyer_id <> v_caller then raise exception 'Only the buyer can change this request.'; end if;
  if p_action <> 'withdraw' then raise exception 'Unknown action.'; end if;
  if v.status <> 'pending' then raise exception 'Only a request still waiting for the artist can be withdrawn.'; end if;
  update public.order_requests set status = 'withdrawn' where id = p_request returning * into v;
  return v;
end;
$$;
revoke all on function public.buyer_order_action(uuid, text) from public, anon, authenticated;
grant execute on function public.buyer_order_action(uuid, text) to authenticated;

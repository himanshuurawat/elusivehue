-- 008: artist-managed delivery. Additive and backward compatible.
-- Existing artworks get a delivery fee of 0 and existing orders keep their
-- amount, a fee of 0 and delivery_state 'none', so nothing about an existing
-- order changes. The artist ships with a courier of their own choice and types
-- the courier and tracking ID; the site does not verify either. No refund,
-- cancellation, auto-delivery or auto-expiry rules are defined here.
begin;

-- Artist-set delivery fee, whole rupees, per artwork (0 = no separate fee).
alter table public.artworks add column if not exists delivery_fee_inr integer not null default 0;
alter table public.artworks drop constraint if exists artworks_delivery_fee_range;
alter table public.artworks add constraint artworks_delivery_fee_range check (delivery_fee_inr between 0 and 100000);
grant update(delivery_fee_inr) on public.artworks to authenticated;

-- Per-order snapshot of the fee and the delivery progress.
alter table public.order_requests add column if not exists delivery_fee_inr integer not null default 0;
alter table public.order_requests add column if not exists delivery_state text not null default 'none';
alter table public.order_requests add column if not exists courier text not null default '';
alter table public.order_requests add column if not exists tracking_id text not null default '';
alter table public.order_requests add column if not exists tracking_url text not null default '';
alter table public.order_requests add column if not exists dispatched_at timestamptz;
alter table public.order_requests add column if not exists delivered_at timestamptz;

alter table public.order_requests drop constraint if exists order_requests_delivery_fee_range;
alter table public.order_requests add constraint order_requests_delivery_fee_range check (delivery_fee_inr between 0 and 100000);
alter table public.order_requests drop constraint if exists order_requests_delivery_state_values;
alter table public.order_requests add constraint order_requests_delivery_state_values check (delivery_state in ('none','dispatched','delivered'));
alter table public.order_requests drop constraint if exists order_requests_delivery_field_lengths;
alter table public.order_requests add constraint order_requests_delivery_field_lengths check (
  char_length(courier) <= 40 and char_length(tracking_id) <= 30 and char_length(tracking_url) <= 300
  and (tracking_url = '' or tracking_url ~ '^https://[^ ]+$'));

-- create_order_request, replaced in full: identical to 005 except that a
-- Physical order also snapshots the artwork's current delivery fee. The total
-- the buyer saw is amount_inr + delivery_fee_inr and a later change to the
-- artwork cannot alter it. Digital works never carry a fee.
create or replace function public.create_order_request(p_artwork uuid, p_name text, p_phone text, p_address text, p_pin text, p_email text, p_offer uuid default null)
returns public.order_requests language plpgsql security definer set search_path = '' as $$
declare
  v_caller uuid := auth.uid();
  a public.artworks;
  o public.offers;
  v_amount integer;
  v_fee integer := 0;
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
    v_fee := a.delivery_fee_inr;
  else
    if char_length(v_email) > 120 or v_email !~ '^[^@ ]+@[^@ ]+\.[^@ ]+$' then raise exception 'Enter a valid email for the file.'; end if;
    v_phone := ''; v_address := ''; v_pin := '';
  end if;
  perform pg_advisory_xact_lock(hashtext(v_caller::text));
  select count(*) into v_recent from public.order_requests r where r.buyer_id = v_caller and r.created_at > now() - interval '1 hour';
  if v_recent >= 10 then raise exception 'Too many requests in a short time. Wait a while before sending another.'; end if;
  begin
    insert into public.order_requests(artwork_id, buyer_id, offer_id, amount_inr, delivery_fee_inr, buyer_name, buyer_phone, delivery_address, delivery_pin, buyer_email)
    values (p_artwork, v_caller, p_offer, v_amount, v_fee, v_name, v_phone, v_address, v_pin, v_email) returning * into v_row;
  exception when unique_violation then
    raise exception 'You already have an open request for this artwork.';
  end;
  return v_row;
end;
$$;
revoke all on function public.create_order_request(uuid, text, text, text, text, text, uuid) from public, anon, authenticated;
grant execute on function public.create_order_request(uuid, text, text, text, text, text, uuid) to authenticated;

-- artist_order_requests, replaced in full: identical to 006 plus the delivery
-- fee and delivery progress. Contact-detail gating is unchanged. The return
-- type changes, so the old function is dropped and its grants re-created.
drop function if exists public.artist_order_requests(uuid[]);
create or replace function public.artist_order_requests(p_artworks uuid[])
returns table(id uuid, artwork_id uuid, status text, amount_inr integer, created_at timestamptz, payment_state text, first_name text, area text, buyer_name text, buyer_phone text, delivery_address text, delivery_pin text, buyer_email text, delivery_fee_inr integer, delivery_state text, courier text, tracking_id text, tracking_url text)
language sql security definer set search_path = '' stable as $$
  select r.id, r.artwork_id, r.status, r.amount_inr, r.created_at, r.payment_state,
    split_part(btrim(r.buyer_name), ' ', 1),
    case when r.delivery_pin <> '' then left(r.delivery_pin, 3) || 'xxx' else '' end,
    case when r.status = 'confirmed' then r.buyer_name end,
    case when r.status = 'confirmed' then r.buyer_phone end,
    case when r.status = 'confirmed' then r.delivery_address end,
    case when r.status = 'confirmed' then r.delivery_pin end,
    case when r.status = 'confirmed' then r.buyer_email end,
    r.delivery_fee_inr, r.delivery_state, r.courier, r.tracking_id, r.tracking_url
  from public.order_requests r join public.artworks a on a.id = r.artwork_id
  where a.owner_id = auth.uid() and r.artwork_id = any(p_artworks)
  order by r.created_at desc limit 50;
$$;
revoke all on function public.artist_order_requests(uuid[]) from public, anon, authenticated;
grant execute on function public.artist_order_requests(uuid[]) to authenticated;

-- The artist records the courier and tracking they arranged themselves. Only
-- after they confirmed the payment from their own app. May be corrected until
-- the buyer marks the parcel delivered.
create or replace function public.artist_mark_dispatched(p_request uuid, p_courier text, p_tracking_id text, p_tracking_url text default '')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v public.order_requests;
  v_caller uuid := auth.uid();
  v_courier text := btrim(coalesce(p_courier, ''));
  v_tid text := btrim(coalesce(p_tracking_id, ''));
  v_url text := btrim(coalesce(p_tracking_url, ''));
begin
  select r.* into v from public.order_requests r where r.id = p_request for update;
  if not found then raise exception 'Order not found.'; end if;
  if v_caller is null or not exists(select 1 from public.artworks a where a.id = v.artwork_id and a.owner_id = v_caller) then
    raise exception 'Only the artist can do this.';
  end if;
  if v.status <> 'confirmed' or v.payment_state <> 'received' then raise exception 'Confirm the payment in your own app first.'; end if;
  if v.delivery_state = 'delivered' then raise exception 'The buyer already marked this delivered.'; end if;
  if char_length(v_courier) < 2 or char_length(v_courier) > 40 then raise exception 'Enter the courier name.'; end if;
  if v_tid !~ '^[A-Za-z0-9-]{6,30}$' then raise exception 'Tracking ID: 6 to 30 letters, numbers or dashes.'; end if;
  if v_url <> '' and (char_length(v_url) > 300 or v_url !~ '^https://[^ ]+$') then raise exception 'The tracking link must start with https://'; end if;
  update public.order_requests set delivery_state = 'dispatched', courier = v_courier, tracking_id = v_tid, tracking_url = v_url,
    dispatched_at = coalesce(dispatched_at, now())
  where id = p_request returning * into v;
  return jsonb_build_object('id', v.id, 'delivery_state', v.delivery_state);
end;
$$;
revoke all on function public.artist_mark_dispatched(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.artist_mark_dispatched(uuid, text, text, text) to authenticated;

-- The buyer says the parcel arrived. Nothing happens automatically if they never do.
create or replace function public.buyer_mark_delivered(p_request uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v public.order_requests;
  v_caller uuid := auth.uid();
begin
  select r.* into v from public.order_requests r where r.id = p_request for update;
  if not found then raise exception 'Order not found.'; end if;
  if v_caller is null or v.buyer_id <> v_caller then raise exception 'Only the buyer can do this.'; end if;
  if v.delivery_state <> 'dispatched' then raise exception 'The artist has not marked this as dispatched.'; end if;
  update public.order_requests set delivery_state = 'delivered', delivered_at = now() where id = p_request returning * into v;
  return jsonb_build_object('id', v.id, 'delivery_state', v.delivery_state);
end;
$$;
revoke all on function public.buyer_mark_delivered(uuid) from public, anon, authenticated;
grant execute on function public.buyer_mark_delivered(uuid) to authenticated;

commit;

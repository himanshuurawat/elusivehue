-- Sold out (additive). The artist can mark a listed artwork as sold out by
-- hand. A sold-out artwork stays visible, shows a Sold out label, and takes no
-- new order requests or offers. Orders already placed are not touched, and the
-- artist keeps full control: marking available again reopens it. Nothing is
-- automatic and there is no stock count.
alter table public.artworks add column if not exists sold_out boolean not null default false;
grant update(sold_out) on public.artworks to authenticated;

drop policy if exists offers_insert_buyer on public.offers;
create policy offers_insert_buyer on public.offers for insert to authenticated with check (
  (select auth.uid()) = buyer_id
  and exists(select 1 from public.artworks a
             where a.id = artwork_id and a.status = 'published' and a.for_sale and not a.sold_out and a.owner_id <> (select auth.uid()))
);

-- create_order_request: identical to 008 plus the sold-out check.
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
  if a.sold_out then raise exception 'This artwork is sold out.'; end if;
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

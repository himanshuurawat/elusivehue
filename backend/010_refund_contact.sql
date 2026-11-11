-- 010: while a refund is open, the artist keeps seeing the buyer's PHONE, the
-- same number the buyer gave and the artist already received when confirming.
-- Same audience, no new exposure. Hidden again once the refund is received (or
-- when there was no refund). Address, PIN code, email and full name stay hidden
-- after a cancel. User-approved scope (phone only). PROPOSED, not applied.
-- Only artist_order_requests changes; same signature and columns as 009, so it
-- is replaced in place. Rollback: re-run the artist_order_requests definition
-- from 009 (safe at any time, it only changes what is returned).
begin;

drop function if exists public.artist_order_requests(uuid[]);
create or replace function public.artist_order_requests(p_artworks uuid[])
returns table(id uuid, artwork_id uuid, status text, amount_inr integer, created_at timestamptz, payment_state text, first_name text, area text, buyer_name text, buyer_phone text, delivery_address text, delivery_pin text, buyer_email text, delivery_fee_inr integer, delivery_state text, courier text, tracking_id text, tracking_url text, refund_state text, refund_upi text, cancelled_at timestamptz)
language sql security definer set search_path = '' stable as $$
  select r.id, r.artwork_id, r.status, r.amount_inr, r.created_at, r.payment_state,
    split_part(btrim(r.buyer_name), ' ', 1),
    case when r.delivery_pin <> '' then left(r.delivery_pin, 3) || 'xxx' else '' end,
    case when r.status = 'confirmed' then r.buyer_name end,
    case when r.status = 'confirmed' or (r.status = 'cancelled' and r.refund_state in ('requested', 'sent', 'not_received')) then r.buyer_phone end,
    case when r.status = 'confirmed' then r.delivery_address end,
    case when r.status = 'confirmed' then r.delivery_pin end,
    case when r.status = 'confirmed' then r.buyer_email end,
    r.delivery_fee_inr, r.delivery_state, r.courier, r.tracking_id, r.tracking_url,
    r.refund_state,
    case when r.status = 'cancelled' and r.refund_state in ('requested', 'sent', 'not_received') then r.refund_upi else '' end,
    r.cancelled_at
  from public.order_requests r join public.artworks a on a.id = r.artwork_id
  where a.owner_id = auth.uid() and r.artwork_id = any(p_artworks)
  order by r.created_at desc limit 50;
$$;
revoke all on function public.artist_order_requests(uuid[]) from public, anon, authenticated;
grant execute on function public.artist_order_requests(uuid[]) to authenticated;

commit;

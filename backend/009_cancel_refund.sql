-- 009: buyer cancels an order before dispatch; if the ARTIST has confirmed
-- they received the payment, the artist refunds from their own UPI app and the
-- buyer confirms. PROPOSED, not applied anywhere.
-- A refund is only ever requested for a payment the artist confirmed receiving
-- (payment_state 'received'). While the artist is still checking a payment the
-- buyer marked (payment_state 'buyer_marked'), cancelling is blocked, so the
-- artist is never asked to refund money they have not received and money that
-- arrives later cannot be orphaned on a cancelled order.
-- A buyer with an unsettled refund on an artwork cannot open a new order for
-- that same artwork until it is settled (trigger at the end).
-- Additive. Existing rows keep status, refund_state 'none' and no refund UPI.
-- Money never touches the site: this only records who says what. The site
-- cannot send, hold, verify or guarantee a refund. It does not define what
-- happens when an artist ignores a refund, or what help a buyer gets; those
-- policies are undecided and nothing here invents them.
-- Concurrency: every function locks the order row (select ... for update), so
-- a cancel and a dispatch on the same order are serialised and only one wins.
begin;

alter table public.order_requests add column if not exists refund_state text not null default 'none';
alter table public.order_requests add column if not exists refund_upi text not null default '';
alter table public.order_requests add column if not exists cancelled_at timestamptz;
alter table public.order_requests add column if not exists refund_sent_at timestamptz;
alter table public.order_requests add column if not exists refund_received_at timestamptz;

alter table public.order_requests drop constraint if exists order_requests_status_values;
alter table public.order_requests add constraint order_requests_status_values check (status in ('pending','confirmed','declined','withdrawn','cancelled'));
alter table public.order_requests drop constraint if exists order_requests_refund_state_values;
alter table public.order_requests add constraint order_requests_refund_state_values check (refund_state in ('none','requested','sent','received','not_received'));
alter table public.order_requests drop constraint if exists order_requests_refund_upi_format;
alter table public.order_requests add constraint order_requests_refund_upi_format check (refund_upi = '' or (char_length(refund_upi) <= 80 and refund_upi ~ '^[A-Za-z0-9._-]{2,64}@[A-Za-z][A-Za-z0-9.-]{1,40}$'));
alter table public.order_requests drop constraint if exists order_requests_refund_needs_cancel;
alter table public.order_requests add constraint order_requests_refund_needs_cancel check (refund_state = 'none' or (status = 'cancelled' and refund_upi <> ''));

-- The buyer cancels a confirmed order that the artist has not dispatched.
-- Artist confirmed payment received: a refund request with the buyer's UPI ID is recorded.
-- Payment still being checked (buyer_marked): cancel is refused until the artist answers.
-- No payment, or artist could not find it ('none', 'missing'): cancelled, nothing to refund.
create or replace function public.buyer_cancel_order(p_request uuid, p_refund_upi text default '')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v public.order_requests;
  v_caller uuid := auth.uid();
  v_upi text := btrim(coalesce(p_refund_upi, ''));
  v_paid boolean;
begin
  select r.* into v from public.order_requests r where r.id = p_request for update;
  if not found then raise exception 'Order not found.'; end if;
  if v_caller is null or v.buyer_id <> v_caller then raise exception 'Only the buyer can do this.'; end if;
  if v.status <> 'confirmed' then raise exception 'Only a confirmed order can be cancelled here.'; end if;
  if v.delivery_state <> 'none' then raise exception 'The artist has already dispatched this order. Cancelling in the app is no longer available.'; end if;
  if v.payment_state = 'buyer_marked' then raise exception 'The artist is still checking your payment. You can cancel once they answer.'; end if;
  v_paid := v.payment_state = 'received';
  if v_paid then
    if v_upi !~ '^[A-Za-z0-9._-]{2,64}@[A-Za-z][A-Za-z0-9.-]{1,40}$' then raise exception 'Enter a valid UPI ID, like name@bank.'; end if;
    update public.order_requests set status = 'cancelled', refund_state = 'requested', refund_upi = v_upi, cancelled_at = now()
      where id = p_request returning * into v;
  else
    update public.order_requests set status = 'cancelled', cancelled_at = now()
      where id = p_request returning * into v;
  end if;
  return jsonb_build_object('id', v.id, 'status', v.status, 'refund_state', v.refund_state);
end;
$$;
revoke all on function public.buyer_cancel_order(uuid, text) from public, anon, authenticated;
grant execute on function public.buyer_cancel_order(uuid, text) to authenticated;

-- The artist says they sent the refund from their own UPI app.
create or replace function public.artist_refund_sent(p_request uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v public.order_requests;
  v_caller uuid := auth.uid();
begin
  select r.* into v from public.order_requests r where r.id = p_request for update;
  if not found then raise exception 'Order not found.'; end if;
  if v_caller is null or not exists(select 1 from public.artworks a where a.id = v.artwork_id and a.owner_id = v_caller) then
    raise exception 'Only the artist can do this.';
  end if;
  if v.status <> 'cancelled' or v.refund_state <> 'requested' then raise exception 'There is no refund waiting to be sent.'; end if;
  update public.order_requests set refund_state = 'sent', refund_sent_at = now() where id = p_request returning * into v;
  return jsonb_build_object('id', v.id, 'refund_state', v.refund_state);
end;
$$;
revoke all on function public.artist_refund_sent(uuid) from public, anon, authenticated;
grant execute on function public.artist_refund_sent(uuid) to authenticated;

-- The buyer confirms the refund arrived, or says it has not. A refund marked
-- "not received" can still be confirmed later if the money turns up.
create or replace function public.buyer_refund_response(p_request uuid, p_action text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v public.order_requests;
  v_caller uuid := auth.uid();
begin
  select r.* into v from public.order_requests r where r.id = p_request for update;
  if not found then raise exception 'Order not found.'; end if;
  if v_caller is null or v.buyer_id <> v_caller then raise exception 'Only the buyer can do this.'; end if;
  if v.status <> 'cancelled' then raise exception 'This order is not cancelled.'; end if;
  if p_action = 'received' then
    if v.refund_state not in ('sent', 'not_received') then raise exception 'The artist has not marked a refund as sent.'; end if;
    update public.order_requests set refund_state = 'received', refund_received_at = now() where id = p_request returning * into v;
  elsif p_action = 'not_received' then
    if v.refund_state <> 'sent' then raise exception 'The artist has not marked a refund as sent.'; end if;
    update public.order_requests set refund_state = 'not_received' where id = p_request returning * into v;
  else
    raise exception 'Unknown response.';
  end if;
  return jsonb_build_object('id', v.id, 'refund_state', v.refund_state);
end;
$$;
revoke all on function public.buyer_refund_response(uuid, text) from public, anon, authenticated;
grant execute on function public.buyer_refund_response(uuid, text) to authenticated;

-- artist_mark_dispatched, replaced in full: identical to 008 plus a clear
-- message when the buyer already cancelled (the row lock makes this race safe).
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
  if v.status = 'cancelled' then raise exception 'The buyer cancelled this order. Do not dispatch it.'; end if;
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

-- artist_order_requests, replaced in full: identical to 008 plus the refund
-- state, the buyer's refund UPI (only to the artwork's own artist, only while a refund is open)
-- and the cancel time. Contact details stay gated on status = 'confirmed', so
-- a cancelled order no longer shows the buyer's phone or address.
drop function if exists public.artist_order_requests(uuid[]);
create or replace function public.artist_order_requests(p_artworks uuid[])
returns table(id uuid, artwork_id uuid, status text, amount_inr integer, created_at timestamptz, payment_state text, first_name text, area text, buyer_name text, buyer_phone text, delivery_address text, delivery_pin text, buyer_email text, delivery_fee_inr integer, delivery_state text, courier text, tracking_id text, tracking_url text, refund_state text, refund_upi text, cancelled_at timestamptz)
language sql security definer set search_path = '' stable as $$
  select r.id, r.artwork_id, r.status, r.amount_inr, r.created_at, r.payment_state,
    split_part(btrim(r.buyer_name), ' ', 1),
    case when r.delivery_pin <> '' then left(r.delivery_pin, 3) || 'xxx' else '' end,
    case when r.status = 'confirmed' then r.buyer_name end,
    case when r.status = 'confirmed' then r.buyer_phone end,
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

-- One unsettled refund per buyer and artwork blocks a fresh order for that
-- artwork. Settled means received. A trigger avoids replacing create_order_request.
create or replace function public.order_requests_block_reorder()
returns trigger language plpgsql set search_path = '' as $$
begin
  if exists(select 1 from public.order_requests r where r.buyer_id = new.buyer_id and r.artwork_id = new.artwork_id
    and r.status = 'cancelled' and r.refund_state in ('requested', 'sent', 'not_received')) then
    raise exception 'Your earlier cancelled order for this artwork still has an open refund. Finish that first.';
  end if;
  return new;
end;
$$;
revoke all on function public.order_requests_block_reorder() from public, anon;
drop trigger if exists order_requests_block_reorder on public.order_requests;
create trigger order_requests_block_reorder before insert on public.order_requests
  for each row execute function public.order_requests_block_reorder();

commit;

-- Rollback for 009. PROPOSED, not applied anywhere.
-- Safe ONLY while no order has ever been cancelled through 009. Dropping the
-- 'cancelled' status or the refund columns would destroy or invalidate real
-- cancelled rows and open refunds, so this refuses to run if any exist.
-- Once a cancelled row exists, roll forward instead (fix with a new migration);
-- do not roll back. The functions 008 originals are restored from 008 manually.
begin;
do $$ begin
  if exists(select 1 from public.order_requests where status = 'cancelled' or refund_state <> 'none') then
    raise exception 'Cancelled or refund rows exist. Rolling back would lose them. Roll forward instead.';
  end if;
end $$;
drop trigger if exists order_requests_block_reorder on public.order_requests;
drop function if exists public.order_requests_block_reorder();
drop function if exists public.buyer_cancel_order(uuid, text);
drop function if exists public.artist_refund_sent(uuid);
drop function if exists public.buyer_refund_response(uuid, text);
-- then re-run the 008 definitions of artist_mark_dispatched and artist_order_requests
alter table public.order_requests drop constraint if exists order_requests_refund_needs_cancel;
alter table public.order_requests drop constraint if exists order_requests_refund_upi_format;
alter table public.order_requests drop constraint if exists order_requests_refund_state_values;
alter table public.order_requests drop constraint if exists order_requests_status_values;
alter table public.order_requests add constraint order_requests_status_values check (status in ('pending','confirmed','declined','withdrawn'));
alter table public.order_requests drop column if exists refund_state, drop column if exists refund_upi, drop column if exists cancelled_at, drop column if exists refund_sent_at, drop column if exists refund_received_at;
commit;

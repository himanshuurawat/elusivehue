-- 007: fix QR snapshot protection.
--
-- The 006 storage policies checked order_requests inside the policy
-- expression. Policy subqueries run with the caller's own row-level
-- security, and artists have no direct SELECT policy on order_requests
-- (they read orders through the security-definer artist_order_requests
-- function). So for an artist the NOT EXISTS check saw zero rows and the
-- delete of a snapshot-referenced QR was allowed. Verified live.
--
-- Fix: two narrow security-definer functions. They return only booleans,
-- expose no order details, and use a fixed search_path.
--
--   qr_snapshot_in_use(name): DELETE protection only. True when any order
--   snapshot references the object. Global by design: an owner must never
--   delete a referenced QR, regardless of whose order references it.
--
--   buyer_may_read_qr(name): SELECT authorization. Caller-scoped: true only
--   when the CALLING user is the buyer of a confirmed order whose snapshot
--   is exactly this object. No other logged-in user can read it.

create or replace function public.qr_snapshot_in_use(p_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.order_requests r where r.qr_path_snapshot = p_name
  );
$$;

create or replace function public.buyer_may_read_qr(p_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.order_requests r
    where r.buyer_id = (select auth.uid())
      and r.status = 'confirmed'
      and r.qr_path_snapshot = p_name
  );
$$;

revoke all on function public.qr_snapshot_in_use(text) from public;
revoke all on function public.buyer_may_read_qr(text) from public;
grant execute on function public.qr_snapshot_in_use(text) to authenticated;
grant execute on function public.buyer_may_read_qr(text) to authenticated;

-- Delete your own file only while no order snapshot references it.
drop policy if exists payment_qrs_delete_unreferenced on storage.objects;
create policy payment_qrs_delete_unreferenced on storage.objects for delete to authenticated
  using(bucket_id='artist-payment-qrs' and (storage.foldername(name))[1]=(select auth.uid())::text
    and not public.qr_snapshot_in_use(name));

-- Read your own files, or the exact snapshot file of an order confirmed to
-- you as the buyer. The QR is never public and never visible on a listing.
drop policy if exists payment_qrs_read_scoped on storage.objects;
create policy payment_qrs_read_scoped on storage.objects for select to authenticated
  using(bucket_id='artist-payment-qrs' and (
    (storage.foldername(name))[1]=(select auth.uid())::text
    or public.buyer_may_read_qr(name)));

-- Direct artist payments (additive). After an artist confirms an order
-- request, the buyer sees the artist's own UPI QR and pays the artist
-- directly in their UPI app. The platform never receives, holds or moves
-- money; the artist alone confirms receipt from their own UPI app.
--
-- Privacy: an artist's UPI details live in artist_payment_details, which
-- only the artist can read. Buyers never read it. At the moment the artist
-- confirms an order, the artist's CURRENT details are copied into snapshot
-- columns on that order row; the buyer payment page reads only the snapshot,
-- so a later change of QR or UPI ID can never alter the payee of an
-- already-confirmed order. Orders confirmed before this migration have empty
-- snapshots and never fall back to the artist's live details.
--
-- No existing table, column, policy, status value or index is altered except
-- the additive columns on order_requests and the snapshot copy added inside
-- respond_order_request. Payment state never changes the order status and
-- never frees the one-open-order index: payment is not fulfillment.

begin;

create table if not exists public.artist_payment_details(
  artist_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  upi_id text not null default '',
  payee_name text not null default '',
  qr_path text not null default '',
  qr_version integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.artist_payment_details enable row level security;
revoke all on public.artist_payment_details from anon, authenticated;

alter table public.order_requests add column if not exists payment_state text not null default 'none';
alter table public.order_requests add column if not exists payment_marked_at timestamptz;
alter table public.order_requests add column if not exists payment_responded_at timestamptz;
alter table public.order_requests add column if not exists qr_path_snapshot text not null default '';
alter table public.order_requests add column if not exists upi_id_snapshot text not null default '';
alter table public.order_requests add column if not exists payee_name_snapshot text not null default '';

commit;

alter table public.order_requests drop constraint if exists order_requests_payment_state_values;
alter table public.order_requests add constraint order_requests_payment_state_values check (payment_state in ('none','buyer_marked','received','missing'));
alter table public.artist_payment_details drop constraint if exists artist_payment_details_field_lengths;
alter table public.artist_payment_details add constraint artist_payment_details_field_lengths check (
  char_length(upi_id) <= 60 and char_length(payee_name) <= 80 and char_length(qr_path) <= 200);

-- Only the artist reads their own payment details. No insert, update or
-- delete grants: every change goes through artist_set_payment_details().
grant select on public.artist_payment_details to authenticated;
drop policy if exists artist_payment_details_read_own on public.artist_payment_details;
create policy artist_payment_details_read_own on public.artist_payment_details for select to authenticated using ((select auth.uid()) = artist_id);

drop trigger if exists artist_payment_details_updated_at on public.artist_payment_details;
create trigger artist_payment_details_updated_at before update on public.artist_payment_details for each row execute function public.set_updated_at();

-- The artist registers or replaces their payment details. The QR file is
-- uploaded first (a new versioned object, see storage policies below) and
-- this call only records the new pointer. Light format check on the UPI ID;
-- this does not verify that the QR or UPI ID belongs to anyone, and the UI
-- never claims it does.
create or replace function public.artist_set_payment_details(p_upi_id text, p_payee_name text, p_qr_path text)
returns public.artist_payment_details language plpgsql security definer set search_path = '' as $$
declare
  v_caller uuid := auth.uid();
  v public.artist_payment_details;
begin
  if v_caller is null then raise exception 'Sign in first.'; end if;
  -- path must live in the caller's own folder
  if p_qr_path <> '' and (storage.foldername(p_qr_path))[1] <> v_caller::text then
    raise exception 'QR must be uploaded to your own folder first.';
  end if;
  if p_upi_id <> '' and p_upi_id !~ '^[A-Za-z0-9._-]{2,}@[A-Za-z]{2,}$' then
    raise exception 'That does not look like a UPI ID (name@bank).';
  end if;
  insert into public.artist_payment_details(artist_id, upi_id, payee_name, qr_path, qr_version)
  values (v_caller, p_upi_id, p_payee_name, p_qr_path, case when p_qr_path = '' then 0 else 1 end)
  on conflict (artist_id) do update set
    upi_id = excluded.upi_id,
    payee_name = excluded.payee_name,
    qr_path = excluded.qr_path,
    qr_version = case when excluded.qr_path <> '' and excluded.qr_path <> public.artist_payment_details.qr_path
                      then public.artist_payment_details.qr_version + 1
                      else public.artist_payment_details.qr_version end
  returning * into v;
  return v;
end;
$$;
revoke all on function public.artist_set_payment_details(text, text, text) from public, anon, authenticated;
grant execute on function public.artist_set_payment_details(text, text, text) to authenticated;

-- respond_order_request, replaced in full: identical to 005 except the
-- confirm branch, which also snapshots the artist's current payment details
-- onto the order (empty snapshot when the artist has none yet).
create or replace function public.respond_order_request(p_request uuid, p_action text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v public.order_requests;
  v_caller uuid := auth.uid();
  d public.artist_payment_details;
begin
  select r.* into v from public.order_requests r where r.id = p_request for update;
  if not found then raise exception 'Request not found.'; end if;
  if v_caller is null or not exists(select 1 from public.artworks a where a.id = v.artwork_id and a.owner_id = v_caller) then
    raise exception 'Only the artist can answer this request.';
  end if;
  if v.status <> 'pending' then raise exception 'This request is already closed.'; end if;
  if p_action = 'confirm' then
    select * into d from public.artist_payment_details where artist_id = v_caller;
    update public.order_requests set status = 'confirmed',
      qr_path_snapshot = coalesce(d.qr_path, ''),
      upi_id_snapshot = coalesce(d.upi_id, ''),
      payee_name_snapshot = coalesce(d.payee_name, '')
    where id = p_request returning * into v;
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

-- artist_order_requests, replaced in full: identical to 005 plus
-- payment_state in the result. Contact-detail gating is unchanged.
-- The added OUT column changes the return type, so the old function must be
-- dropped first; its grants are re-created right after.
drop function if exists public.artist_order_requests(uuid[]);
create or replace function public.artist_order_requests(p_artworks uuid[])
returns table(id uuid, artwork_id uuid, status text, amount_inr integer, created_at timestamptz, payment_state text, first_name text, area text, buyer_name text, buyer_phone text, delivery_address text, delivery_pin text, buyer_email text)
language sql security definer set search_path = '' stable as $$
  select r.id, r.artwork_id, r.status, r.amount_inr, r.created_at, r.payment_state,
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

-- The buyer says they paid. Never proof: the artist confirms from their app.
create or replace function public.buyer_mark_paid(p_request uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v public.order_requests;
  v_caller uuid := auth.uid();
begin
  select r.* into v from public.order_requests r where r.id = p_request for update;
  if not found then raise exception 'Order not found.'; end if;
  if v_caller is null or v.buyer_id <> v_caller then raise exception 'Only the buyer can do this.'; end if;
  if v.status <> 'confirmed' then raise exception 'The artist has not accepted this order.'; end if;
  if v.payment_state not in ('none','missing') then raise exception 'Payment is already being checked.'; end if;
  update public.order_requests set payment_state = 'buyer_marked', payment_marked_at = now() where id = p_request returning * into v;
  return jsonb_build_object('id', v.id, 'payment_state', v.payment_state);
end;
$$;
revoke all on function public.buyer_mark_paid(uuid) from public, anon, authenticated;
grant execute on function public.buyer_mark_paid(uuid) to authenticated;

-- The artist answers from their own UPI app: received, or not found.
create or replace function public.artist_payment_response(p_request uuid, p_action text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v public.order_requests;
  v_caller uuid := auth.uid();
begin
  select r.* into v from public.order_requests r where r.id = p_request for update;
  if not found then raise exception 'Order not found.'; end if;
  if v_caller is null or not exists(select 1 from public.artworks a where a.id = v.artwork_id and a.owner_id = v_caller) then
    raise exception 'Only the artist can answer this.';
  end if;
  if v.status <> 'confirmed' or v.payment_state <> 'buyer_marked' then raise exception 'Nothing to check right now.'; end if;
  if p_action = 'received' then
    update public.order_requests set payment_state = 'received', payment_responded_at = now() where id = p_request returning * into v;
  elsif p_action = 'missing' then
    update public.order_requests set payment_state = 'missing', payment_responded_at = now() where id = p_request returning * into v;
  else
    raise exception 'Unknown response.';
  end if;
  return jsonb_build_object('id', v.id, 'payment_state', v.payment_state);
end;
$$;
revoke all on function public.artist_payment_response(uuid, text) from public, anon, authenticated;
grant execute on function public.artist_payment_response(uuid, text) to authenticated;

-- artist_order_requests() additionally returns payment_state (contact-detail
-- gating unchanged: full buyer details only after confirm).

-- QR images: private bucket, one artist's files under their own uid folder.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('artist-payment-qrs','artist-payment-qrs',false,2097152,array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

-- Upload only new versioned files into your own folder. There is NO update
-- policy: an uploaded QR can never be overwritten, even by its owner.
drop policy if exists payment_qrs_insert_own on storage.objects;
create policy payment_qrs_insert_own on storage.objects for insert to authenticated
  with check(bucket_id='artist-payment-qrs' and (storage.foldername(name))[1]=(select auth.uid())::text);

-- Delete your own file only while no order snapshot references it.
drop policy if exists payment_qrs_delete_unreferenced on storage.objects;
create policy payment_qrs_delete_unreferenced on storage.objects for delete to authenticated
  using(bucket_id='artist-payment-qrs' and (storage.foldername(name))[1]=(select auth.uid())::text
    and not exists(select 1 from public.order_requests r where r.qr_path_snapshot = name));

-- Read your own files, or the exact snapshot file of an order confirmed to
-- you as the buyer. The QR is never public and never visible on a listing.
drop policy if exists payment_qrs_read_scoped on storage.objects;
create policy payment_qrs_read_scoped on storage.objects for select to authenticated
  using(bucket_id='artist-payment-qrs' and (
    (storage.foldername(name))[1]=(select auth.uid())::text
    or exists(select 1 from public.order_requests r
              where r.buyer_id = (select auth.uid()) and r.status = 'confirmed' and r.qr_path_snapshot = name)));

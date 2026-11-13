-- Rollback for 013_one_buyer_per_physical_artwork.sql: restores
-- respond_order_request exactly as 006_direct_payments.sql defined it
-- (no one-buyer-per-physical-artwork guard).
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

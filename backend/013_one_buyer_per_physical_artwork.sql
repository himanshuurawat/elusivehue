-- One buyer per physical artwork (additive). A physical artwork is a single
-- piece: once the artist confirms one buyer's request, no other request on
-- that artwork can be confirmed. The guard lives in respond_order_request,
-- the only function that sets status 'confirmed'. A per-artwork advisory
-- lock serializes concurrent confirms, so two confirms at the same moment
-- cannot both pass. Declined, withdrawn and cancelled orders do not block:
-- only a live 'confirmed' order holds the piece, so a cancelled order frees
-- it for another buyer. Digital artworks are unchanged: a file can still be
-- sold to more than one buyer. Buyers can still send requests, the artist
-- still answers them one by one, and sold-out stays manual; nothing here
-- declines, hides or auto-marks anything.
--
-- respond_order_request, replaced in full: identical to 006 except the
-- confirm branch first takes a per-artwork advisory lock and refuses when
-- the artwork is physical and already has a confirmed order.
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
    perform pg_advisory_xact_lock(hashtext(v.artwork_id::text));
    if exists(select 1 from public.order_requests r join public.artworks a on a.id = r.artwork_id
              where r.artwork_id = v.artwork_id and r.status = 'confirmed' and a.format = 'Physical') then
      raise exception 'This artwork is already confirmed for another buyer.';
    end if;
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

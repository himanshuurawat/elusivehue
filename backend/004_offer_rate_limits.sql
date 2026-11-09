-- Offer rate limiting (additive). Bounds scripted abuse without touching a
-- normal negotiation:
--   1. creation: at most 10 new offers per buyer per rolling hour (a real
--      buyer makes a handful of offers in a day);
--   2. transitions: at most one counter (artist) or revise (buyer) per 60s
--      per offer, keyed to that actor's OWN last action so the other party's
--      reply is never delayed. Terminal actions (accept, decline, withdraw,
--      accept_counter) are exempt - they close the conversation by themselves.
-- Known edge, accepted: if a whole exchange happens inside 60s, the same
-- actor's next counter/revise waits out the remainder of that minute.

begin;
alter table public.offers add column if not exists last_buyer_action_at timestamptz not null default now();
alter table public.offers add column if not exists last_artist_action_at timestamptz;
commit;

create or replace function public.offers_creation_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_recent integer;
begin
  -- Serialize concurrent inserts per buyer; without this two simultaneous
  -- inserts could both pass the count check below.
  perform pg_advisory_xact_lock(hashtext(NEW.buyer_id::text));
  select count(*) into v_recent from public.offers o
   where o.buyer_id = NEW.buyer_id and o.created_at > now() - interval '1 hour';
  if v_recent >= 10 then
    raise exception 'Too many offers in a short time. Wait a while before making another.';
  end if;
  -- Creation is the buyer's first action; ignore any client-supplied values.
  NEW.last_buyer_action_at := now();
  NEW.last_artist_action_at := null;
  return NEW;
end;
$$;
revoke all on function public.offers_creation_limit() from public, anon, authenticated;

drop trigger if exists offers_creation_limit on public.offers;
create trigger offers_creation_limit before insert on public.offers
  for each row execute function public.offers_creation_limit();

create or replace function public.respond_offer(p_offer uuid, p_action text, p_counter integer default null)
returns public.offers language plpgsql security definer set search_path = '' as $$
declare
  v_offer public.offers;
  v_caller uuid := auth.uid();
begin
  select o.* into v_offer from public.offers o where o.id = p_offer for update;
  if not found then raise exception 'Offer not found.'; end if;
  if v_caller is null or not exists(select 1 from public.artworks a where a.id = v_offer.artwork_id and a.owner_id = v_caller) then
    raise exception 'Only the artist can answer this offer.';
  end if;
  if v_offer.status not in ('pending','countered') then raise exception 'This offer is already closed.'; end if;
  if p_action = 'counter' and v_offer.last_artist_action_at is not null
     and now() - v_offer.last_artist_action_at < interval '60 seconds' then
    raise exception 'Give it a moment before sending another counter.';
  end if;
  if p_action = 'accept' then
    update public.offers set status = 'accepted', last_artist_action_at = now() where id = p_offer returning * into v_offer;
  elsif p_action = 'decline' then
    update public.offers set status = 'declined', last_artist_action_at = now() where id = p_offer returning * into v_offer;
  elsif p_action = 'counter' then
    if p_counter is null or p_counter < 1 or p_counter > 10000000 then raise exception 'Use a whole-rupee counter from 1 to 10,000,000.'; end if;
    update public.offers set status = 'countered', counter_amount_inr = p_counter, last_artist_action_at = now() where id = p_offer returning * into v_offer;
  else
    raise exception 'Unknown response.';
  end if;
  return v_offer;
end;
$$;
revoke all on function public.respond_offer(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.respond_offer(uuid, text, integer) to authenticated;

create or replace function public.buyer_offer_action(p_offer uuid, p_action text, p_amount integer default null, p_note text default null)
returns public.offers language plpgsql security definer set search_path = '' as $$
declare
  v_offer public.offers;
  v_caller uuid := auth.uid();
begin
  select o.* into v_offer from public.offers o where o.id = p_offer for update;
  if not found then raise exception 'Offer not found.'; end if;
  if v_caller is null or v_offer.buyer_id <> v_caller then raise exception 'Only the buyer can change this offer.'; end if;
  if p_action = 'revise' and now() - v_offer.last_buyer_action_at < interval '60 seconds' then
    raise exception 'Give it a moment before changing your offer again.';
  end if;
  if p_action = 'withdraw' then
    if v_offer.status not in ('pending','countered') then raise exception 'This offer is already closed.'; end if;
    update public.offers set status = 'withdrawn', last_buyer_action_at = now() where id = p_offer returning * into v_offer;
  elsif p_action = 'accept_counter' then
    if v_offer.status <> 'countered' or v_offer.counter_amount_inr is null then raise exception 'There is no counter-offer to accept.'; end if;
    update public.offers set status = 'accepted', amount_inr = v_offer.counter_amount_inr, last_buyer_action_at = now() where id = p_offer returning * into v_offer;
  elsif p_action = 'revise' then
    if v_offer.status <> 'countered' then raise exception 'Wait for the artist to answer before changing your offer.'; end if;
    if p_amount is null or p_amount < 1 or p_amount > 10000000 then raise exception 'Use a whole-rupee offer from 1 to 10,000,000.'; end if;
    update public.offers
      set status = 'pending', amount_inr = p_amount, counter_amount_inr = null,
          note = left(coalesce(p_note, ''), 200), last_buyer_action_at = now()
      where id = p_offer returning * into v_offer;
  else
    raise exception 'Unknown action.';
  end if;
  return v_offer;
end;
$$;
revoke all on function public.buyer_offer_action(uuid, text, integer, text) from public, anon, authenticated;
grant execute on function public.buyer_offer_action(uuid, text, integer, text) to authenticated;

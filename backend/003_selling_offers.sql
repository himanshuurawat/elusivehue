-- Selling: artist-set description and for-sale flag on artworks, and a
-- persisted make-an-offer conversation per artwork. Additive only: existing
-- drafts, shared artworks, profiles and follows are unchanged, and every
-- current artwork keeps for_sale = false (still shared, not offered for sale).
-- No payments, orders, charges or reservations are created anywhere here.

begin;
alter table public.artworks add column if not exists description text not null default '';
alter table public.artworks add column if not exists for_sale boolean not null default false;
commit;

alter table public.artworks drop constraint if exists artworks_description_length;
alter table public.artworks add constraint artworks_description_length check (char_length(description) <= 1000);

-- Column grants widen what the existing artworks_update_own row policy can change.
grant update(description, for_sale) on public.artworks to authenticated;

begin;
create table if not exists public.offers(
  id uuid primary key default gen_random_uuid(),
  artwork_id uuid not null references public.artworks(id) on delete cascade,
  buyer_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  amount_inr integer not null,
  note text not null default '',
  status text not null default 'pending',
  counter_amount_inr integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.offers enable row level security;
revoke all on public.offers from anon, authenticated;
commit;

alter table public.offers drop constraint if exists offers_amount_range;
alter table public.offers add constraint offers_amount_range check (amount_inr between 1 and 10000000);
alter table public.offers drop constraint if exists offers_counter_range;
alter table public.offers add constraint offers_counter_range check (counter_amount_inr is null or counter_amount_inr between 1 and 10000000);
alter table public.offers drop constraint if exists offers_note_length;
alter table public.offers add constraint offers_note_length check (char_length(note) <= 200);
alter table public.offers drop constraint if exists offers_status_values;
alter table public.offers add constraint offers_status_values check (status in ('pending','countered','accepted','declined','withdrawn'));

-- One open conversation per buyer per artwork. Closed offers stay as history.
create unique index if not exists offers_one_open_idx on public.offers(artwork_id, buyer_id) where status in ('pending','countered');
create index if not exists offers_artwork_idx on public.offers(artwork_id, created_at desc);
create index if not exists offers_buyer_idx on public.offers(buyer_id, created_at desc);

drop trigger if exists offers_updated_at on public.offers;
create trigger offers_updated_at before update on public.offers for each row execute function public.set_updated_at();

-- Only the two parties ever read an offer. Counts are not public.
grant select, insert on public.offers to authenticated;
drop policy if exists offers_read_parties on public.offers;
create policy offers_read_parties on public.offers for select to authenticated
  using ((select auth.uid()) = buyer_id
         or exists(select 1 from public.artworks a where a.id = artwork_id and a.owner_id = (select auth.uid())));
drop policy if exists offers_insert_buyer on public.offers;
create policy offers_insert_buyer on public.offers for insert to authenticated with check (
  (select auth.uid()) = buyer_id
  and exists(select 1 from public.artworks a
             where a.id = artwork_id and a.status = 'published' and a.for_sale and a.owner_id <> (select auth.uid()))
);
-- No direct update or delete grants: every state change goes through the two
-- functions below, which check the caller's side and the allowed transition.

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
  if p_action = 'accept' then
    update public.offers set status = 'accepted' where id = p_offer returning * into v_offer;
  elsif p_action = 'decline' then
    update public.offers set status = 'declined' where id = p_offer returning * into v_offer;
  elsif p_action = 'counter' then
    if p_counter is null or p_counter < 1 or p_counter > 10000000 then raise exception 'Use a whole-rupee counter from 1 to 10,000,000.'; end if;
    update public.offers set status = 'countered', counter_amount_inr = p_counter where id = p_offer returning * into v_offer;
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
  if p_action = 'withdraw' then
    if v_offer.status not in ('pending','countered') then raise exception 'This offer is already closed.'; end if;
    update public.offers set status = 'withdrawn' where id = p_offer returning * into v_offer;
  elsif p_action = 'accept_counter' then
    if v_offer.status <> 'countered' or v_offer.counter_amount_inr is null then raise exception 'There is no counter-offer to accept.'; end if;
    update public.offers set status = 'accepted', amount_inr = v_offer.counter_amount_inr where id = p_offer returning * into v_offer;
  elsif p_action = 'revise' then
    if v_offer.status <> 'countered' then raise exception 'Wait for the artist to answer before changing your offer.'; end if;
    if p_amount is null or p_amount < 1 or p_amount > 10000000 then raise exception 'Use a whole-rupee offer from 1 to 10,000,000.'; end if;
    update public.offers
      set status = 'pending', amount_inr = p_amount, counter_amount_inr = null,
          note = left(coalesce(p_note, ''), 200)
      where id = p_offer returning * into v_offer;
  else
    raise exception 'Unknown action.';
  end if;
  return v_offer;
end;
$$;
revoke all on function public.buyer_offer_action(uuid, text, integer, text) from public, anon, authenticated;
grant execute on function public.buyer_offer_action(uuid, text, integer, text) to authenticated;

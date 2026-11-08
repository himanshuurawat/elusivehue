-- Marketplace wiring: public artist profiles (gated on shared work),
-- persisted follows, follower counts. Additive only; existing private
-- drafts, photos and account policies are unchanged.

begin;
create table if not exists public.follows(
  follower_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  artist_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, artist_id),
  check (follower_id <> artist_id)
);
alter table public.follows enable row level security;
revoke all on public.follows from anon, authenticated;
commit;

create index if not exists follows_artist_idx on public.follows(artist_id);

grant select, insert, delete on public.follows to authenticated;
create policy follows_read_own on public.follows for select to authenticated using ((select auth.uid()) = follower_id);
create policy follows_insert_own on public.follows for insert to authenticated with check ((select auth.uid()) = follower_id);
create policy follows_delete_own on public.follows for delete to authenticated using ((select auth.uid()) = follower_id);

-- A profile is publicly readable only while the artist has at least one
-- published (shared) artwork. Unsharing everything re-privatizes it.
grant select on public.profiles to anon;
create policy profiles_read_public on public.profiles for select to anon, authenticated
  using (exists (select 1 from public.artworks a where a.owner_id = profiles.id and a.status = 'published'));

-- Counts are public; who follows whom is not (follows rows stay own-only).
create function public.follower_count(p_artist uuid) returns bigint language sql stable security definer set search_path = '' as $$
  select count(*) from public.follows f where f.artist_id = p_artist
$$;
revoke all on function public.follower_count(uuid) from public, anon, authenticated;
grant execute on function public.follower_count(uuid) to anon, authenticated;

-- Pretty-URL lookups: artwork by its id suffix, artist by username or id suffix.
-- Both run as the invoker, so the row-level policies above still apply.
create function public.published_artwork_by_prefix(p_prefix text) returns setof public.artworks language sql stable set search_path = '' as $$
  select a.* from public.artworks a
  where a.status = 'published' and p_prefix ~ '^[0-9a-f]{8}$' and a.id::text like p_prefix || '%'
  limit 2
$$;
revoke all on function public.published_artwork_by_prefix(text) from public, anon, authenticated;
grant execute on function public.published_artwork_by_prefix(text) to anon, authenticated;

create function public.public_artist(p_param text) returns setof public.profiles language sql stable set search_path = '' as $$
  select p.* from public.profiles p
  where lower(p.username) = lower(p_param) or (p_param ~ '^[0-9a-f]{8}$' and p.id::text like p_param || '%')
  limit 2
$$;
revoke all on function public.public_artist(text) from public, anon, authenticated;
grant execute on function public.public_artist(text) to anon, authenticated;

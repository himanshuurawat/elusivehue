begin;create table public.profiles(id uuid primary key references auth.users(id) on delete cascade,username text,display_name text not null default '',bio text not null default '',created_at timestamptz not null default now(),updated_at timestamptz not null default now());alter table public.profiles enable row level security;revoke all on public.profiles from anon,authenticated;commit;

alter table public.profiles add constraint username_format check(username is null or username ~ '^[a-zA-Z0-9_]{3,24}$'),add constraint display_name_length check(char_length(display_name)<=80),add constraint bio_length check(char_length(bio)<=500);create unique index profiles_username_lower_key on public.profiles(lower(username)) where username is not null;

grant select,insert on public.profiles to authenticated;grant update(username,display_name,bio) on public.profiles to authenticated;create policy profiles_read_own on public.profiles for select to authenticated using((select auth.uid())=id);create policy profiles_insert_own on public.profiles for insert to authenticated with check((select auth.uid())=id);create policy profiles_update_own on public.profiles for update to authenticated using((select auth.uid())=id) with check((select auth.uid())=id);

begin;create table public.artworks(id uuid primary key default gen_random_uuid(),owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade);alter table public.artworks enable row level security;revoke all on public.artworks from anon,authenticated;commit;

alter table public.artworks add title text not null,add medium text not null,add format text not null,add size_class text not null,add width numeric(9,2) not null,add height numeric(9,2) not null,add unit text not null;

alter table public.artworks add asking_price_inr integer not null,add image_path text not null,add status text not null default 'draft',add created_at timestamptz not null default now(),add updated_at timestamptz not null default now();

alter table public.artworks add check(format in ('Physical','Digital')),add check(size_class in ('Small','Medium','Large')),add check(width>0 and width<=100000),add check(height>0 and height<=100000),add check(unit in ('cm','px'));

alter table public.artworks add check(asking_price_inr between 1 and 10000000),add check(status in ('draft','published')),add check(char_length(btrim(title)) between 1 and 100),add check(char_length(btrim(medium)) between 1 and 100);

alter table public.artworks add check((format='Physical' and unit='cm') or (format='Digital' and unit='px' and width=trunc(width) and height=trunc(height)));

alter table public.artworks add check(split_part(image_path,'/',1)=owner_id::text and char_length(image_path) between 38 and 250 and image_path !~ '\.\.');

create index artworks_owner_created_idx on public.artworks(owner_id,created_at desc);create index artworks_published_created_idx on public.artworks(created_at desc) where status='published';

grant select on public.artworks to anon,authenticated;grant insert,delete on public.artworks to authenticated;grant update(title,medium,format,size_class,width,height,unit,asking_price_inr,image_path,status) on public.artworks to authenticated;

create policy artworks_read_published on public.artworks for select to anon,authenticated using(status='published');create policy artworks_read_own on public.artworks for select to authenticated using((select auth.uid())=owner_id);

create policy artworks_insert_own on public.artworks for insert to authenticated with check((select auth.uid())=owner_id);

create policy artworks_update_own on public.artworks for update to authenticated using((select auth.uid())=owner_id) with check((select auth.uid())=owner_id);create policy artworks_delete_own on public.artworks for delete to authenticated using((select auth.uid())=owner_id);

create function public.set_updated_at() returns trigger language plpgsql set search_path='' as $$begin new.updated_at=now();return new;end;$$;revoke all on function public.set_updated_at() from public,anon,authenticated;

create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();create trigger artworks_updated_at before update on public.artworks for each row execute function public.set_updated_at();

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('artwork-photos','artwork-photos',false,8388608,array['image/jpeg','image/png','image/webp']);

create policy artwork_photos_read_own on storage.objects for select to authenticated using(bucket_id='artwork-photos' and (storage.foldername(name))[1]=(select auth.uid())::text);

create policy artwork_photos_insert_own on storage.objects for insert to authenticated with check(bucket_id='artwork-photos' and (storage.foldername(name))[1]=(select auth.uid())::text);

create policy artwork_photos_update_own on storage.objects for update to authenticated using(bucket_id='artwork-photos' and (storage.foldername(name))[1]=(select auth.uid())::text) with check(bucket_id='artwork-photos' and (storage.foldername(name))[1]=(select auth.uid())::text);

create policy artwork_photos_delete_own on storage.objects for delete to authenticated using(bucket_id='artwork-photos' and (storage.foldername(name))[1]=(select auth.uid())::text);

create policy artwork_photos_read_published on storage.objects for select to anon,authenticated using(bucket_id='artwork-photos' and exists(select 1 from public.artworks a where a.status='published' and a.image_path=name));

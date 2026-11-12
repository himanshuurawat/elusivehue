import {type SupabaseClient} from '@supabase/supabase-js';
import {configuredAccountClient} from './account-service';
import {slugFor} from './publicSlug';

/*
 * Real shared-artwork reads + persisted Follow, on top of the approved
 * project. Anonymous reads are allowed only for published (shared) rows
 * by the row-level policies in backend/002_marketplace_follows.sql.
 * Photos stay single copies in the existing private bucket: a published
 * artwork's photo is readable through a signed URL without duplicating it.
 */

export type SharedArtwork = {
  id: string;
  owner_id: string;
  title: string;
  medium: string;
  format: 'Physical' | 'Digital';
  size_class: string;
  width: number;
  height: number;
  unit: string;
  asking_price_inr: number;
  description: string;
  for_sale: boolean;
  sold_out: boolean;
  delivery_fee_inr: number;
  image_path: string;
  created_at: string;
};

export type PublicProfile = {id: string; username: string | null; display_name: string; bio: string};

export type ArtworkBundle = {work: SharedArtwork; artist: PublicProfile; followers: number; following: boolean};
export type ArtistBundle = {profile: PublicProfile; works: SharedArtwork[]; followers: number; following: boolean};

export function publicClient(): SupabaseClient | null {
  return configuredAccountClient();
}

export const artworkParam = (a: {id: string; title: string}): string => `${slugFor(a.title)}-${a.id.slice(0, 8)}`;
export const artistParam = (p: {id: string; username: string | null}): string => p.username ?? p.id.slice(0, 8);

function fail(error: {message: string} | null): void {
  if (error) throw new Error(error.message);
}

async function followState(client: SupabaseClient, artistId: string): Promise<{followers: number; following: boolean}> {
  const {data: count, error: countError} = await client.rpc('follower_count', {p_artist: artistId});
  fail(countError);
  let following = false;
  const {data: sessionData} = await client.auth.getSession();
  if (sessionData.session) {
    const {data, error} = await client.from('follows').select('artist_id').eq('artist_id', artistId).maybeSingle();
    if (!error) following = Boolean(data);
  }
  return {followers: Number(count ?? 0), following};
}

export async function loadArtworkBundle(client: SupabaseClient, param: string): Promise<ArtworkBundle | null> {
  const {data, error} = await client.rpc('published_artwork_by_prefix', {p_prefix: param.slice(-8)});
  fail(error);
  const rows = (data ?? []) as SharedArtwork[];
  if (rows.length !== 1) return null;
  const work = rows[0];
  const {data: profiles, error: profileError} = await client.rpc('public_artist', {p_param: work.owner_id.slice(0, 8)});
  fail(profileError);
  const artist = ((profiles ?? []) as PublicProfile[])[0];
  if (!artist) return null;
  const state = await followState(client, artist.id);
  return {work, artist, ...state};
}

export async function loadArtistBundle(client: SupabaseClient, param: string): Promise<ArtistBundle | null> {
  const {data, error} = await client.rpc('public_artist', {p_param: param});
  fail(error);
  const rows = (data ?? []) as PublicProfile[];
  if (rows.length !== 1) return null;
  const profile = rows[0];
  const {data: works, error: worksError} = await client
    .from('artworks')
    .select('*')
    .eq('owner_id', profile.id)
    .eq('status', 'published')
    .order('created_at', {ascending: false})
    .limit(50);
  fail(worksError);
  const state = await followState(client, profile.id);
  return {profile, works: (works ?? []) as SharedArtwork[], ...state};
}

export async function saveFollow(client: SupabaseClient, artistId: string, follow: boolean): Promise<void> {
  const {data, error} = await client.auth.getUser();
  fail(error);
  if (!data.user) throw new Error('Sign in to follow artists.');
  if (follow) {
    const {error: writeError} = await client
      .from('follows')
      .upsert({follower_id: data.user.id, artist_id: artistId}, {onConflict: 'follower_id,artist_id', ignoreDuplicates: true});
    fail(writeError);
  } else {
    const {error: writeError} = await client.from('follows').delete().eq('artist_id', artistId).eq('follower_id', data.user.id);
    fail(writeError);
  }
}

export async function sharedPhotoUrl(client: SupabaseClient, path: string): Promise<string> {
  const {data, error} = await client.storage.from('artwork-photos').createSignedUrl(path, 3600);
  fail(error);
  return data!.signedUrl;
}

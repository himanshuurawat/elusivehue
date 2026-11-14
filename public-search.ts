import type {SupabaseClient} from '@supabase/supabase-js';
import type {GalleryItem, PublicProfile, SharedArtwork} from './public-service';

function fail(error: {message: string} | null): void {
  if (error) throw new Error(error.message);
}

export type SearchResults = {artists: PublicProfile[]; works: GalleryItem[]};

/* Gallery search: artists by username or display name, and published works
 * by title. Both run on the anonymous read policies in
 * backend/002_marketplace_follows.sql - profiles are visible only while the
 * artist has shared work, artworks only when published - so search exposes
 * nothing the artist and artwork pages do not already show. */
export async function searchPublic(client: SupabaseClient, raw: string): Promise<SearchResults> {
  const q = raw.trim().replace(/[^a-zA-Z0-9_ -]/g, '').slice(0, 40);
  if (q.length < 2) return {artists: [], works: []};
  const like = `%${q}%`;
  const artistQuery = client
    .from('profiles')
    .select('id,username,display_name,bio')
    .or(`username.ilike.${like},display_name.ilike.${like}`)
    .limit(6);
  const workQuery = client
    .from('artworks')
    .select('*')
    .eq('status', 'published')
    .ilike('title', like)
    .order('created_at', {ascending: false})
    .limit(6);
  const [{data: artists, error: artistsError}, {data: works, error: worksError}] = await Promise.all([artistQuery, workQuery]);
  fail(artistsError);
  fail(worksError);
  const rows = (works ?? []) as SharedArtwork[];
  let photos = new Map<string, string>();
  if (rows.length) {
    const {data: signed} = await client.storage.from('artwork-photos').createSignedUrls(rows.map(w => w.image_path), 3600);
    photos = new Map((signed ?? []).map(s => [s.path ?? '', s.signedUrl]));
  }
  return {artists: (artists ?? []) as PublicProfile[], works: rows.map(work => ({work, photo: photos.get(work.image_path) ?? ''}))};
}

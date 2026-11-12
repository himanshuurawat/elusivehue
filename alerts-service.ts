import type {SupabaseClient} from '@supabase/supabase-js';
import type {Artwork} from './account-service';
import type {SharedArtwork} from './public-service';
import type {Offer} from './offers-service';
import type {ArtistOrderRequest, MyOrderRequest} from './orders-service';

/*
 * In-app "needs your action" list. It is worked out from rows the signed-in
 * user can already read (their offers and orders as buyer, and as artist the
 * same safe reads My orders and My artworks use). Nothing is stored, nothing
 * is sent, no email or push, and no database change.
 */

export type AlertItem = {key: string; role: 'artist' | 'buyer'; text: string; to: string};

type ArtistView = Pick<ArtistOrderRequest, 'id' | 'status' | 'payment_state' | 'delivery_state' | 'refund_state' | 'first_name' | 'buyer_email'>;
type BuyerView = Pick<MyOrderRequest, 'id' | 'artwork_id' | 'offer_id' | 'status' | 'payment_state' | 'delivery_state' | 'refund_state' | 'qr_path_snapshot' | 'upi_id_snapshot' | 'buyer_email'>;
type OfferView = Pick<Offer, 'id' | 'artwork_id' | 'status'>;

export type AlertInput = {
  titles: Map<string, string>;
  artistOffers: OfferView[];
  artistOrders: Array<ArtistView & {artwork_id: string}>;
  buyerOffers: OfferView[];
  buyerOrders: BuyerView[];
  artworkLinks: Map<string, string>;
};

export function deriveAlerts(i: AlertInput): AlertItem[] {
  const out: AlertItem[] = [];
  const name = (id: string) => i.titles.get(id) ?? 'an artwork';
  for (const o of i.artistOffers) if (o.status === 'pending') out.push({key: `ao-${o.id}`, role: 'artist', text: `New offer on ${name(o.artwork_id)}. Answer it.`, to: `/my-artworks?focus=${o.id}`});
  for (const r of i.artistOrders) {
    const w = name(r.artwork_id);
    if (r.status === 'pending') out.push({key: `ar-${r.id}`, role: 'artist', text: `${r.first_name || 'A buyer'} sent an order request for ${w}. Confirm or decline.`, to: `/my-artworks?focus=${r.id}`});
    else if (r.status === 'confirmed' && r.payment_state === 'buyer_marked') out.push({key: `ap-${r.id}`, role: 'artist', text: `${r.first_name || 'The buyer'} says they paid for ${w}. Check your own UPI app and answer.`, to: `/orders?focus=${r.id}`});
    else if (r.status === 'confirmed' && r.payment_state === 'received' && r.delivery_state === 'none') out.push({key: `ad-${r.id}`, role: 'artist', text: r.buyer_email ? `Payment received for ${w}. Mark the file as sent.` : `Payment received for ${w}. Add the courier and tracking.`, to: `/orders?focus=${r.id}`});
    else if (r.status === 'cancelled' && r.refund_state === 'requested') out.push({key: `af-${r.id}`, role: 'artist', text: `A cancel request on ${w} needs your refund answer.`, to: `/orders?focus=${r.id}`});
  }
  const sentOffers = new Set(i.buyerOrders.map(r => r.offer_id).filter(Boolean));
  const activeOrderFor = new Set(i.buyerOrders.filter(r => r.status === 'pending' || r.status === 'confirmed').map(r => r.artwork_id));
  const seen = new Set<string>();
  for (const o of i.buyerOffers) { // newest first: only the latest offer per artwork can still need an answer
    if (seen.has(o.artwork_id)) continue;
    seen.add(o.artwork_id);
    const link = i.artworkLinks.get(o.artwork_id);
    if (o.status === 'countered' && link) out.push({key: `bo-${o.id}`, role: 'buyer', text: `The artist countered your offer on ${name(o.artwork_id)}. Open the artwork to answer.`, to: link});
    if (o.status === 'accepted' && link && !sentOffers.has(o.id) && !activeOrderFor.has(o.artwork_id)) out.push({key: `ba-${o.id}`, role: 'buyer', text: `Your offer on ${name(o.artwork_id)} was accepted. Open the artwork to send your order request.`, to: link});
  }
  for (const r of i.buyerOrders) {
    const w = name(r.artwork_id);
    const to = `/orders?focus=${r.id}`;
    if (r.status === 'confirmed' && r.payment_state === 'missing' && (r.qr_path_snapshot || r.upi_id_snapshot)) out.push({key: `bm-${r.id}`, role: 'buyer', text: `The artist could not find your payment for ${w}. Check the transaction status in your UPI app and sort it out with the artist. Do not pay again until you know.`, to});
    else if (r.status === 'confirmed' && r.payment_state === 'none' && (r.qr_path_snapshot || r.upi_id_snapshot)) out.push({key: `bp-${r.id}`, role: 'buyer', text: `${w} is confirmed. Pay the artist.`, to: `/orders/${r.id}/pay`});
    else if (r.status === 'confirmed' && r.delivery_state === 'dispatched') out.push({key: `br-${r.id}`, role: 'buyer', text: r.buyer_email ? `The file for ${w} was marked sent. Confirm when you have it.` : `${w} was dispatched. Confirm when it arrives.`, to});
    else if (r.status === 'cancelled' && r.refund_state === 'sent') out.push({key: `bf-${r.id}`, role: 'buyer', text: `The artist marked your refund for ${w} as sent. Confirm if you got it.`, to});
  }
  return out;
}

export type AlertDeps = {
  myArtworks: (client: SupabaseClient) => Promise<Artwork[]>;
  artistOrderRequests: (client: SupabaseClient, ids: string[]) => Promise<ArtistOrderRequest[]>;
  offersForArtworks: (client: SupabaseClient, ids: string[]) => Promise<Offer[]>;
  artworkParam: (a: {id: string; title: string}) => string;
};

async function realDeps(): Promise<AlertDeps> {
  const [acc, ord, off, pub] = await Promise.all([import('./account-service'), import('./orders-service'), import('./offers-service'), import('./public-service')]);
  return {myArtworks: c => acc.accountRepository(c).myArtworks(), artistOrderRequests: ord.artistOrderRequests, offersForArtworks: off.offersForArtworks, artworkParam: pub.artworkParam};
}

/* complete is false when any read failed, so callers never present a partial or failed check as "nothing to do". */
export type AlertResult = {items: AlertItem[]; complete: boolean};

export async function loadAlerts(client: SupabaseClient, injected?: AlertDeps): Promise<AlertResult> {
  const {data: sess} = await client.auth.getSession();
  const uid = sess.session?.user.id;
  if (!uid) return {items: [], complete: true};
  const deps = injected ?? await realDeps();
  let complete = true;
  const soft = async <T>(p: PromiseLike<T>, fallback: T): Promise<T> => {try {return await p;} catch {complete = false; return fallback;}};
  const rows = async <T>(p: PromiseLike<{data: unknown; error: unknown}>): Promise<T[]> => {
    try {const r = await p; if (r.error) {complete = false; return [];} return (r.data ?? []) as T[];} catch {complete = false; return [];}
  };
  const mine = await soft(deps.myArtworks(client), [] as Artwork[]);
  const ids = mine.filter(a => a.status === 'published').map(a => a.id);
  const titles = new Map<string, string>(mine.map(a => [a.id, a.title]));
  const [aOrders, aOffers, buyerOffers, buyerOrders] = await Promise.all([
    soft(deps.artistOrderRequests(client, ids), [] as ArtistOrderRequest[]),
    soft(deps.offersForArtworks(client, ids), [] as Offer[]),
    rows<OfferView>(client.from('offers').select('id,artwork_id,status').eq('buyer_id', uid).order('created_at', {ascending: false}).limit(50)),
    rows<MyOrderRequest>(client.from('order_requests').select('*').order('created_at', {ascending: false}).limit(50)),
  ]);
  const links = new Map<string, string>();
  const need = [...new Set([...buyerOffers.map(o => o.artwork_id), ...buyerOrders.map(r => r.artwork_id)])].filter(id => !titles.has(id) || buyerOffers.some(o => o.artwork_id === id));
  await Promise.all(need.map(async id => {
    try {
      const {data, error} = await client.rpc('published_artwork_by_prefix', {p_prefix: id.slice(0, 8)});
      if (error) {complete = false; return;}
      const hit = ((data ?? []) as SharedArtwork[]).find(w => w.id === id);
      if (hit) {links.set(id, `/artwork/${deps.artworkParam(hit)}`); titles.set(id, hit.title);}
    } catch {complete = false;}
  }));
  const items = deriveAlerts({titles, artistOffers: aOffers, artistOrders: aOrders, buyerOffers, buyerOrders, artworkLinks: links});
  return {items, complete};
}

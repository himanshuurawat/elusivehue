import {type SupabaseClient} from '@supabase/supabase-js';
import {signedInUserId, type Offer} from './offers-service';

/*
 * Order requests: a buyer asks to take one listed artwork, the artist
 * confirms or declines (backend/005_order_requests.sql). Nothing here
 * takes payment, charges, reserves stock or changes the listing. The
 * buyer's phone and address reach the artist only after they confirm.
 */

export type DeliveryState = 'none' | 'dispatched' | 'delivered';

export type OrderStatus = 'pending' | 'confirmed' | 'declined' | 'withdrawn';

export type MyOrderRequest = {
  id: string;
  artwork_id: string;
  offer_id: string | null;
  amount_inr: number;
  status: OrderStatus;
  buyer_name: string;
  buyer_phone: string;
  delivery_address: string;
  delivery_pin: string;
  buyer_email: string;
  created_at: string;
  payment_state: 'none' | 'buyer_marked' | 'received' | 'missing';
  qr_path_snapshot: string;
  upi_id_snapshot: string;
  payee_name_snapshot: string;
  delivery_fee_inr: number;
  delivery_state: DeliveryState;
  courier: string;
  tracking_id: string;
  tracking_url: string;
};

export type ArtistOrderRequest = {
  id: string;
  artwork_id: string;
  status: OrderStatus;
  amount_inr: number;
  created_at: string;
  payment_state: 'none' | 'buyer_marked' | 'received' | 'missing';
  first_name: string;
  area: string;
  buyer_name: string | null;
  buyer_phone: string | null;
  delivery_address: string | null;
  delivery_pin: string | null;
  buyer_email: string | null;
  delivery_fee_inr: number;
  delivery_state: DeliveryState;
  courier: string;
  tracking_id: string;
  tracking_url: string;
};

export type OrderDetails = {name: string; phone: string; address: string; pin: string; email: string};

function fail(error: {message: string} | null): void {
  if (error) throw new Error(error.message);
}

/* The signed-in buyer's latest request for one artwork. */
export async function myOrderForArtwork(client: SupabaseClient, artworkId: string): Promise<MyOrderRequest | null> {
  const {data, error} = await client
    .from('order_requests')
    .select('*')
    .eq('artwork_id', artworkId)
    .order('created_at', {ascending: false})
    .limit(1)
    .maybeSingle();
  fail(error);
  return (data as MyOrderRequest) ?? null;
}

export async function sendOrderRequest(
  client: SupabaseClient,
  artworkId: string,
  details: OrderDetails,
  offer: Offer | null,
): Promise<MyOrderRequest> {
  if (!(await signedInUserId(client))) throw new Error('Sign in to send an order request.');
  const {data, error} = await client.rpc('create_order_request', {
    p_artwork: artworkId,
    p_name: details.name,
    p_phone: details.phone,
    p_address: details.address,
    p_pin: details.pin,
    p_email: details.email,
    p_offer: offer ? offer.id : null,
  });
  fail(error);
  return data as MyOrderRequest;
}

export async function withdrawOrderRequest(client: SupabaseClient, requestId: string): Promise<void> {
  const {error} = await client.rpc('buyer_order_action', {p_request: requestId, p_action: 'withdraw'});
  fail(error);
}

export async function artistOrderRequests(client: SupabaseClient, artworkIds: string[]): Promise<ArtistOrderRequest[]> {
  if (artworkIds.length === 0) return [];
  const {data, error} = await client.rpc('artist_order_requests', {p_artworks: artworkIds});
  fail(error);
  return (data ?? []) as ArtistOrderRequest[];
}

export async function respondOrderRequest(client: SupabaseClient, requestId: string, action: 'confirm' | 'decline'): Promise<void> {
  const {error} = await client.rpc('respond_order_request', {p_request: requestId, p_action: action});
  fail(error);
}

/* Artist-managed delivery: the artist types the courier and tracking they arranged
   themselves; the buyer marks it received. Nothing here is verified by the site. */
export async function markDispatched(client: SupabaseClient, requestId: string, courier: string, trackingId: string, trackingUrl: string): Promise<void> {
  const {error} = await client.rpc('artist_mark_dispatched', {p_request: requestId, p_courier: courier, p_tracking_id: trackingId, p_tracking_url: trackingUrl});
  fail(error);
}

export async function markDelivered(client: SupabaseClient, requestId: string): Promise<void> {
  const {error} = await client.rpc('buyer_mark_delivered', {p_request: requestId});
  fail(error);
}

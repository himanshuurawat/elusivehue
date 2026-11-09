import {type SupabaseClient} from '@supabase/supabase-js';

/*
 * Persisted make-an-offer conversations on top of the approved project.
 * Offers are private to the two parties (row-level policies in
 * backend/003_selling_offers.sql). State changes go through the
 * respond_offer / buyer_offer_action functions; the client never
 * updates offer rows directly. No payment, order or reservation is
 * created anywhere in this flow.
 */

export type OfferStatus = 'pending' | 'countered' | 'accepted' | 'declined' | 'withdrawn';

export type Offer = {
  id: string;
  artwork_id: string;
  buyer_id: string;
  amount_inr: number;
  note: string;
  status: OfferStatus;
  counter_amount_inr: number | null;
  created_at: string;
  updated_at: string;
};

function fail(error: {message: string} | null): void {
  if (error) throw new Error(error.message);
}

export async function signedInUserId(client: SupabaseClient): Promise<string | null> {
  const {data, error} = await client.auth.getUser();
  fail(error);
  return data.user?.id ?? null;
}

/* The signed-in buyer's latest offer conversation for one artwork. */
export async function myOfferForArtwork(client: SupabaseClient, artworkId: string): Promise<Offer | null> {
  const {data, error} = await client
    .from('offers')
    .select('*')
    .eq('artwork_id', artworkId)
    .order('created_at', {ascending: false})
    .limit(1)
    .maybeSingle();
  fail(error);
  return (data as Offer) ?? null;
}

/* The artist's inbox: offers on their own artworks, newest first. */
export async function offersForArtworks(client: SupabaseClient, artworkIds: string[]): Promise<Offer[]> {
  if (artworkIds.length === 0) return [];
  const {data, error} = await client
    .from('offers')
    .select('*')
    .in('artwork_id', artworkIds)
    .order('created_at', {ascending: false})
    .limit(50);
  fail(error);
  return (data ?? []) as Offer[];
}

export function checkOfferAmount(amount: number): number {
  if (!Number.isInteger(amount) || amount < 1 || amount > 10000000) {
    throw new Error('Use a whole-rupee amount from 1 to 10,000,000.');
  }
  return amount;
}

export async function makeOffer(client: SupabaseClient, artworkId: string, amount: number, note: string): Promise<Offer> {
  const buyer = await signedInUserId(client);
  if (!buyer) throw new Error('Sign in to make an offer.');
  const {data, error} = await client
    .from('offers')
    .insert({artwork_id: artworkId, buyer_id: buyer, amount_inr: checkOfferAmount(amount), note: note.trim().slice(0, 200)})
    .select()
    .single();
  fail(error);
  return data as Offer;
}

export async function respondOffer(client: SupabaseClient, offerId: string, action: 'accept' | 'decline' | 'counter', counter?: number): Promise<Offer> {
  const {data, error} = await client.rpc('respond_offer', {
    p_offer: offerId,
    p_action: action,
    p_counter: action === 'counter' ? checkOfferAmount(counter ?? NaN) : null,
  });
  fail(error);
  return data as Offer;
}

export async function buyerOfferAction(client: SupabaseClient, offerId: string, action: 'withdraw' | 'accept_counter' | 'revise', amount?: number, note?: string): Promise<Offer> {
  const {data, error} = await client.rpc('buyer_offer_action', {
    p_offer: offerId,
    p_action: action,
    p_amount: action === 'revise' ? checkOfferAmount(amount ?? NaN) : null,
    p_note: action === 'revise' ? (note ?? '').trim().slice(0, 200) : null,
  });
  fail(error);
  return data as Offer;
}

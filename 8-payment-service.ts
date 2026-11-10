import {type SupabaseClient} from '@supabase/supabase-js';

/*
 * Direct artist payments (backend/006_direct_payments.sql). The platform
 * never receives, holds or moves money. An artist saves their own UPI QR,
 * UPI ID and payee name; when they confirm an order, those details are
 * snapshotted onto that order, and only that order's buyer can read them.
 * The buyer pays in their own UPI app and says so; the artist alone
 * confirms receipt from their own UPI app. A buyer screenshot is never
 * proof, and nothing here verifies that a QR or UPI ID belongs to anyone.
 */

export type PaymentState = 'none' | 'buyer_marked' | 'received' | 'missing';

export type ArtistPaymentDetails = {
  artist_id: string;
  upi_id: string;
  payee_name: string;
  qr_path: string;
  qr_version: number;
};

function fail(error: {message: string} | null): void {
  if (error) throw new Error(error.message);
}

/* The signed-in artist's own payment details (owner-only read). */
export async function myPaymentDetails(client: SupabaseClient): Promise<ArtistPaymentDetails | null> {
  const {data, error} = await client.from('artist_payment_details').select('*').maybeSingle();
  fail(error);
  return (data as ArtistPaymentDetails) ?? null;
}

/* Upload a new QR image as a new versioned file; never overwrites. */
export async function uploadPaymentQr(client: SupabaseClient, file: File, version: number): Promise<string> {
  const {data: userData, error: userError} = await client.auth.getUser();
  if (userError || !userData.user) throw new Error('Your session has ended. Sign in again.');
  const ext = (file.type.split('/')[1] || 'png').replace('jpeg', 'jpg');
  const path = `${userData.user.id}/qr-${version}.${ext}`;
  const {error} = await client.storage.from('artist-payment-qrs').upload(path, file, {contentType: file.type, upsert: false});
  fail(error);
  return path;
}

export async function savePaymentDetails(client: SupabaseClient, upiId: string, payeeName: string, qrPath: string): Promise<void> {
  const {error} = await client.rpc('artist_set_payment_details', {p_upi_id: upiId, p_payee_name: payeeName, p_qr_path: qrPath});
  fail(error);
}

/* Short-lived signed URL for a QR the caller is allowed to see. */
export async function paymentQrUrl(client: SupabaseClient, path: string): Promise<string> {
  const {data, error} = await client.storage.from('artist-payment-qrs').createSignedUrl(path, 300);
  fail(error);
  return data!.signedUrl;
}

/* The buyer says they paid. The artist still confirms from their own app. */
export async function markOrderPaid(client: SupabaseClient, requestId: string): Promise<void> {
  const {error} = await client.rpc('buyer_mark_paid', {p_request: requestId});
  fail(error);
}

/* The artist answers from their own UPI app. */
export async function respondOrderPayment(client: SupabaseClient, requestId: string, action: 'received' | 'missing'): Promise<void> {
  const {error} = await client.rpc('artist_payment_response', {p_request: requestId, p_action: action});
  fail(error);
}

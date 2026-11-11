# Artist-managed delivery (design preview only, not on main)

Route: `/#/delivery-preview`. Local state only: no database, account, courier or network call. Nothing is saved.

Flow: confirmed -> artist confirms payment in own UPI app -> packed -> artist picks a courier (or types one), enters tracking ID and optional https tracking link -> dispatched -> buyer taps "I received it" -> delivered.

- The artist uses any courier and pays it themselves. No courier account or booking belongs to Elusive Hue.
- Tracking is typed by the artist. The page says the site does not verify the courier or parcel.
- Tracking ID is validated (6-30 letters, digits, dashes). Link must be https.
- Digital works: artist sends the file directly after the payment check. No site storage.

## Decided by the user (2026-11-11)
- One shared order screen, same progress for both sides, role-specific actions. The buyer/artist switch in the preview is preview-only.
- Delivery fee is set separately by the artist. The buyer sees the full total (price + delivery) before sending the order request.

## Open decisions (not decided here)
- Refund and cancellation terms.
- What happens if the buyer never confirms delivery (no auto-expiry exists today).

## Real version vs existing schema (reconciled, nothing applied)
Existing (backend 005-007): `order_requests` has `status` (pending, confirmed, declined, withdrawn) and `payment_state` (none, buyer_marked, received, missing). Clients can only SELECT their own rows as buyer. All writes go through security-definer functions (`respond_order_request`, `buyer_mark_paid`, `artist_payment_response`, `artist_order_requests`). The artist reads orders only through `artist_order_requests`.

So the preview's "Payment received" step maps to `payment_state = 'received'` (the real flow has a buyer_marked step before it). A real version would add, on `order_requests`:
- `delivery_state text not null default 'none'` (none, dispatched, delivered) with a check constraint
- `courier text`, `tracking_id text`, `tracking_url text` (length and https checks), `dispatched_at`, `delivered_at`
and two new functions, `artist_mark_dispatched(request, courier, tracking_id, url)` (only if status = confirmed and payment_state = received) and `buyer_mark_delivered(request)` (only if delivery_state = dispatched), plus `artist_order_requests` extended to return the new fields. No direct client writes, same pattern as payments. The preview's "Packed" step stays display-only (no column).

Needs user approval before any of it is written or applied.

Checked locally on desktop (1280px) and mobile (390px): full artist and buyer flow, validation error, no horizontal overflow.

## Real integration (branch artist-delivery-preview)
User approved the Supabase delivery fields and rules on 2026-11-11. `backend/008_artist_delivery.sql` was applied to the Elusive Hue project that day (additive; the project had 0 orders and 0 artworks at that point, so no backfill was needed).

- artworks.delivery_fee_inr (0..100000, artist sets it in My artworks > Selling, physical works only).
- order_requests: delivery_fee_inr (snapshot at request time), delivery_state, courier, tracking_id, tracking_url, dispatched_at, delivered_at.
- Functions: artist_mark_dispatched (needs status confirmed and payment_state received; editable until delivered), buyer_mark_delivered (needs dispatched). artist_order_requests and create_order_request extended. No client write grants on order_requests.
- UI: checkout shows price + delivery = total before sending; pay page and My orders use the total; My orders shows one progress line with role-specific actions (artist: courier + tracking form; buyer: tracking + "I received it").
- Not defined: refund and cancellation terms, auto-delivery or auto-expiry, courier integration, notification emails.
- Known edge: an order cannot be dispatched until the artist confirms payment in the site, so an artist with no payment details added cannot mark dispatch.

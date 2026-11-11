# Artist-managed delivery

The artist picks and pays their own courier and types the tracking details. Elusive Hue never books a courier, never holds money and does not verify the courier or the parcel.

Flow: buyer sends an order request -> artist confirms -> buyer pays the artist directly in their UPI app and taps "I have paid" -> artist checks their own UPI app and taps "Payment received in my app" -> artist picks a courier, enters a tracking ID and an optional https link, and marks it dispatched -> buyer taps "I received it" -> delivered.

## Behaviour
- One shared order screen (My orders) for both sides, one progress line (Accepted, Payment received, Dispatched, Delivered), role-specific actions.
- The delivery fee is set by the artist in My artworks > Selling (0 to 100000, physical works). The buyer sees price + delivery = total before sending the request, and the pay page uses the total.
- The order badge shows Dispatched or Delivered once a confirmed order ships. The stored order status (pending, confirmed, declined, withdrawn) is unchanged.
- Tracking ID is validated (6-30 letters, digits, dashes). The link must be https. The artist can edit tracking until the buyer marks it delivered.
- Dispatch needs payment_state = received, which the artist sets on the site. An artist with no saved payment details cannot reach it.
- Digital works: the artist sends the file directly after the payment check. No site storage.

## Backend (backend/008_artist_delivery.sql, additive)
- artworks.delivery_fee_inr.
- order_requests: delivery_fee_inr (snapshot at request time), delivery_state (none, dispatched, delivered), courier, tracking_id, tracking_url, dispatched_at, delivered_at.
- Functions: artist_mark_dispatched (status confirmed and payment_state received), buyer_mark_delivered (needs dispatched). artist_order_requests and create_order_request extended. No client write grants on order_requests, the same pattern as payments.

## Not defined
- Refund and cancellation terms.
- What happens if the buyer never confirms delivery (no auto-expiry).
- Courier integration and notification emails.

## Preview branch only
The standalone sample page (`/#/delivery-preview`, DeliveryPreview.tsx) exists only on the `artist-delivery-preview` branch. It is not part of main.

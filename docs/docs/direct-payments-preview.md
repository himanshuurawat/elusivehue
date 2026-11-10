# Direct artist payments (preview branch: real-payments)



This branch adds the real direct-payment flow:



- Artists save UPI payment details and a private QR image (owner-only storage).

- When an artist accepts an order request, Elusive Hue snapshots their payment details onto that order.

- The buyer gets an order-specific payment page showing the QR and copyable UPI ID / payee name as captured at acceptance.

- The buyer pays the artist directly in their own UPI app and marks the order as paid.

- The artist verifies receipt in their own UPI app and confirms or flags it.



Elusive Hue only connects buyer and artist. Payment and delivery happen between them; money never passes through the platform.



This file exists to document the preview and to trigger the preview deployment for this branch.

## Verification status (2026-11-10)

Functional and security checks passed on the preview deployment
(https://real-payments.elusivehue.pages.dev), with throwaway TEST accounts,
artwork, order and QR fixtures that were deleted afterwards:

- Full payment-state cycle exercised live against the database:
  none -> buyer_marked -> missing -> buyer_marked -> received, order status
  stays confirmed throughout.
- Snapshot isolation: after the artist replaced their QR, the order page kept
  rendering the QR snapshotted at acceptance.
- Storage policy fix (007): referenced QR delete/overwrite now rejected for
  the artist; buyer can read only the snapshot on their own confirmed order;
  strangers cannot read or delete. Verified with live API calls per role.
- Payment controls render as styled pills (no unstyled native buttons).

Visual verification (2026-11-10): 390px mobile and 1440px desktop renders of
the buyer payment page (retry, waiting and received states) and the artist
order-answer view, plus short interaction videos, captured with a local
browser harness against this branch's built code with mocked backend
responses (TEST data only, no live accounts). This is visual/layout evidence,
not an additional live end-to-end run. prefers-reduced-motion is honored:
entry animations are disabled under reduce (checked programmatically and in
pixels).

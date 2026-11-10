# Direct artist payments (preview branch: real-payments)



This branch adds the real direct-payment flow:



- Artists save UPI payment details and a private QR image (owner-only storage).

- When an artist accepts an order request, Elusive Hue snapshots their payment details onto that order.

- The buyer gets an order-specific payment page showing the QR and copyable UPI ID / payee name as captured at acceptance.

- The buyer pays the artist directly in their own UPI app and marks the order as paid.

- The artist verifies receipt in their own UPI app and confirms or flags it.



Elusive Hue only connects buyer and artist. Payment and delivery happen between them; money never passes through the platform.



This file exists to document the preview and to trigger the preview deployment for this branch.

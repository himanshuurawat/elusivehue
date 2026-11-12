# Sold out (local proposal, not live)

An artist can mark a listed artwork as sold out by hand.

- One new column, `artworks.sold_out` (migration `backend/012_sold_out.sql`, not applied anywhere).
- Sold out artworks stay visible with a "Sold out" label and take no new order requests or offers.
- Orders already placed are not changed. The artist can still confirm, decline or refund them.
- Marking available again reopens the artwork. There is no stock count and nothing is automatic.
- Not decided: quantities or editions, automatic sold out when an order is confirmed, reservation while a request is pending.

Preview: the branch sold-out-preview is hosted as a Cloudflare Pages preview for testing. Migration 012 is applied to the live Supabase project (2026-11-12, with the user's approval).

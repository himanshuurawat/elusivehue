# Cancel and refund before dispatch (proposal, not live)

Status: implemented. Migrations 009, 010 and 011 were applied once each to the live Supabase project on 2026-11-11 with the user's approval (the 'PROPOSED, not applied' header comments inside the SQL files predate that and were left unchanged so the files match what was run). Wording in the UI is proposed, not final published terms.

## Implemented
- Buyer can cancel a confirmed order before dispatch.
- A refund is requested ONLY after the artist confirmed receiving the payment (user-approved rule). The buyer gives a UPI ID and the artist is asked to refund artwork price + delivery fee.
- While the artist is still checking a payment the buyer marked, cancelling is blocked until the artist answers. If no payment was confirmed (none/not found), the order is just cancelled with no refund obligation.
- A buyer with an open refund on an artwork cannot start a new order for it until the refund is settled (database trigger).
- Artist sees the cancel, the buyer's UPI ID, and marks "Refund sent" after paying from their own UPI app. Dispatch is blocked after cancel.
- Buyer confirms "Refund received" or "I haven't received it".
- The site never holds, sends or verifies money.

## Undecided (no policy invented)
- Help when a refund never arrives, and what happens if an artist ignores a refund.
- After "not received" the artist cannot re-mark sent in this SQL (dead end).
- If an artist never answers a marked payment, the buyer cannot cancel (stuck). Policy choice.
- Rollback: backend/rollback_009_cancel_refund.sql refuses to run once any cancelled/refund row exists; after that, roll forward only.
- Old production bundle shows a cancelled order only as a generic 'Cancelled' badge with no refund info, so ship the frontend with the migration.
- Collecting the buyer's UPI ID is a design assumption.
- Legal applicability of consumer rules to the site is unresolved.

## Missing refund help

After a buyer marks a refund as not received, the buyer screen shows himanshurawathiki@gmail.com as a help contact (user approved this contact for site support, 2026-11-11). Elusive Hue does not send the refund and makes no promise about a result or a time. There is no automatic action when an artist ignores a refund. Never ask for a UPI PIN or OTP.

## Preview hosting

This branch is built as a Cloudflare Pages preview (branch alias refund-cancel-preview). The preview uses the same Supabase project as production. Not merged to main until the user approves release.

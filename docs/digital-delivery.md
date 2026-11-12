# Digital delivery (local preview)

For digital artworks the existing delivery steps are reused. No schema change.
- Digital order = order with a buyer email (physical orders never store one).
- After payment is confirmed, the artist emails the file from their own email and taps "Mark file as sent" (stored as courier "Email", tracking "FILE-SENT").
- The buyer sees "File sent" and taps "I received the file".
- Badges and progress read File sent / File received. No file is stored or sent by the site.

Preview: branch digital-delivery-preview is hosted as a Cloudflare Pages preview. No database change.

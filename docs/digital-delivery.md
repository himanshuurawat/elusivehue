# Digital delivery

For digital artworks the existing delivery steps are reused. No schema change.
- Digital order = order with a buyer email (physical orders never store one).
- After payment is confirmed, the artist emails the file from their own email and taps "Mark file as sent" (stored as courier "Email", tracking "FILE-SENT").
- The buyer sees "File sent" and taps "I received the file".
- Badges and progress read File sent / File received. No file is stored or sent by the site.

Database tests (synthetic, rolled back): payment must be confirmed by the artist before the file can be marked sent; only the artist can mark it sent and only the buyer can mark it received.

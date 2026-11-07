# Elusive Hue

An art marketplace project, starting with the frontend experience.

## Project vision

A place for artists to show physical artwork and digital editions, with a separate second-hand shelf for personal belongings. These are planned product directions, not live marketplace services.

## Design direction

- Put the artwork first, with clear product presentation.
- Use black, white and neutral surfaces. Keep colour restrained so artwork, graphics and movement lead.
- Explore expressive graphics and purposeful motion, with smooth mobile use as a design goal.
- Offer light and dark themes and a product-colour preview.
- Keep the art collection separate from resale listings.

Midnight Gallery is the selected direction. The frontend opens directly into its quieter gallery layout and retains its layered scroll animation.

## Current status

Work in progress. The frontend demos use dummy artwork, artists, prices and listings. They are for design review, not real inventory or offers.

This is not yet a working buying or selling platform. There is no seller account system, checkout, payment processing, order handling or inventory backend. Those need a later implementation phase.

## Repository workflow

The main branch starts with this project overview. Frontend work belongs on a separate branch and is reviewed before merging. Runnable frontend source is on the frontend-demos branch. Nothing has been merged or deployed.

Private inspiration recordings and project notes are not included in this public repository.

## Run the frontend demos

On the `frontend-demos` branch, install Node.js 20.19+ or 22.12+, then run:

```sh
npm ci
npm run dev
```

Open the local URL printed in the terminal. `npm run build` type-checks and builds the project; `npm run preview` shows the built version locally.

The selected gallery uses one scroll surface. Foreground artwork, middle artwork, backdrop and type retain their original depth movement. Reduced-motion users receive a still composition. Real-phone performance has not yet been measured.

The public source uses system fonts and original placeholder images. The compressed WebP placeholder images are embedded in `artwork.ts` and `artwork-extra.ts`; these are original demo assets, not third-party reference recordings. The source files sit together in the repository root. It contains no private inspiration recordings or project notes. No services or secret keys are required.

## Current frontend interactions

Collection navigation, physical/digital filtering, same-artwork full/angle/detail views, light/dark theme and a separate resale shelf. Artwork details include clearly marked sample dimensions and art media. A local bargaining demo supports offer requests, simulated artist replies and buyer-specific agreements without changing the public sample price.

The artist studio demo lets you choose a local photo or sample artwork, enter title, medium, size, dimensions and asking price, then inspect and edit a buyer-facing listing preview. Photos are not uploaded. Drafts are held in memory and cleared when the studio closes. There is no publish action. These controls change local presentation only, with no real listings, accounts, orders or payments.

## Motion continuation

The upper depth sequence completes on a pinned track, then its foreground moves upward to reveal the lower scene already underneath. The lower three-artwork spread remains scroll-linked and reversible, followed by collection reveals and the crop-to-full-image feature transition.

The earlier separate decorative paper strip has been removed. One scroll surface drives the upper sequence, the connecting handoff and the lower spread directly, without competing transition timers or extra animation dependencies. Reduced-motion preference presents both scenes as static content. This is still a visual prototype, not a physical-device performance guarantee.

## Account/profile work in progress

`account-profile-work` is a separate, non-deployment branch. Do not merge it or
point production hosting at it before review. The accepted `frontend-demos`
branch is unchanged.

`#/account` defaults to a visual-only design preview. Without explicitly enabled
Supabase environment configuration, no client is created and form submissions
only show a preview notice. Google sign-in is disabled. Do not enter a real
password in the design preview. Guarded email sign-in/signup and own-profile
read/save code are prepared, but have not been run against real accounts.
Password recovery sending stays disabled until its return page is configured.

The new isolated Supabase project has the schema in
`backend/001_accounts_artworks.sql`. Both public tables have row-level security.
Profile reads/writes are owner-only. Artwork drafts are owner-only; published
artwork records and their associated images can be read publicly. The image
bucket is private, accepts JPG/PNG/WebP up to 8MB, and limits mutations to the
user's own UUID folder. Owner/id/timestamp columns are not client-updatable.

Before connecting the account UI:
- Review the visual design.
- Configure the project's public browser key and URL through environment values.
  Never use the service-role key or database password in frontend code.
- Resolve the email sender and exact signup/recovery callback origin.
- Configure Google OAuth separately, including its client and exact callback.
- Review privacy/terms, confirmation and account recovery flows before public signup.
- Get approval for temporary test accounts/data, then test two-user isolation,
  auth confirmation/recovery, photo ownership and signed-URL behavior end to end.
- Cloudflare deployment and a main merge remain separate, paused steps.

Preparatory service configuration (not active in the design preview):
`VITE_ENABLE_AUTH=true`, `VITE_SUPABASE_URL`, and
`VITE_SUPABASE_PUBLISHABLE_KEY`. Leave these unset while reviewing visuals.

The service module supports own-profile read/save, own-artwork lists and drafts,
explicit-field artwork edits, photo upload and short-lived preview URLs. There
is no public publish action, payment flow, or email/Google setup in this branch.
Signed URLs can remain usable until their five-minute expiry after unpublishing;
this must be explained and tested before a public release.

## Accounts: staged setup

The account page includes the accepted rounded sign-in design and first-tap surface wave. Authentication is disabled unless `VITE_ENABLE_AUTH=true` and the approved Supabase URL/publishable key are supplied at build time. Without those settings it makes no auth requests and labels itself a design preview. Google sign-in and password recovery remain unavailable until their configuration and return flows are complete. No service-role key or database password belongs in this frontend.

Profile and own-artwork service code and the database migration are included for integration testing. The public gallery, sample artwork, local-only artist listing preview and bargaining demo are not real inventory, saved listings, offers or purchases. Live account/data-isolation testing is a separate release gate.

### Google sign-in staging (not released)

`VITE_ENABLE_GOOGLE_AUTH` is a separate opt-in and defaults OFF. Keep it unset in Production. Set it to `true` only on the approved auth-preview build after the separate Elusive Hue OAuth client and provider are ready for the approved test. `VITE_ENABLE_AUTH` and the same-origin `VITE_AUTH_RETURN_URL` remain required. Google requests only openid, email and profile; no Gmail or Drive scopes. Never put the OAuth client secret in Vite configuration or browser source. The secret belongs only in Supabase's Google provider configuration.

A Google login without an existing profile opens the editable profile form with an empty username for the user to choose. It does not auto-publish a profile or artwork. Actual Google testing creates an auth user and needs its own test-data approval and cleanup. Merge, production flag changes, Google app publication and a public release remain separate gates.

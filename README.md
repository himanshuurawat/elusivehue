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

Collection navigation, physical/digital filtering, artwork detail previews, full-image/detail-crop controls, light/dark theme and a separate resale shelf. These controls only change local presentation. There are no real listings, accounts, orders or payments. The specific product-showcase motion reference is awaiting clarification and is not claimed implemented.

## Motion continuation

The upper depth sequence completes on a pinned track, then its foreground moves upward to reveal the lower scene already underneath. The lower three-artwork spread remains scroll-linked and reversible, followed by collection reveals and the crop-to-full-image feature transition.

The earlier separate decorative paper strip has been removed. One scroll surface drives the upper sequence, the connecting handoff and the lower spread directly, without competing transition timers or extra animation dependencies. Reduced-motion preference presents both scenes as static content. This is still a visual prototype, not a physical-device performance guarantee.

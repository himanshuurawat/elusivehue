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

Three visual directions are being explored: Midnight Gallery, Kinetic Poster and Raw Signal. A final direction has not been selected.

## Current status

Work in progress. The frontend demos use dummy artwork, artists, prices and listings. They are for design review, not real inventory or offers.

This is not yet a working buying or selling platform. There is no seller account system, checkout, payment processing, order handling or inventory backend. Those need a later implementation phase.

## Repository workflow

The main branch starts with this project overview. Frontend work belongs on a separate branch and is reviewed before merging. Setup commands will accompany runnable code on that branch.

Private inspiration recordings and project notes are not included in this public repository.

## Run the frontend demos

On the `frontend-demos` branch, install Node.js 20.19+ or 22.12+, then run:

```sh
npm ci
npm run dev
```

Open the local URL printed in the terminal. `npm run build` type-checks and builds the project; `npm run preview` shows the built version locally.

The gallery depth effect uses a labelled internal scroll scene. Foreground artwork, middle artwork, backdrop and type move at different rates. Reduced-motion users receive a still composition. Real-phone performance has not yet been measured.

The public source uses system fonts and original placeholder images. The compressed WebP placeholder images are embedded in `artwork.ts` and `artwork-extra.ts`; these are original demo assets, not third-party reference recordings. The source files sit together in the repository root. It contains no private inspiration recordings or project notes. No services or secret keys are required.

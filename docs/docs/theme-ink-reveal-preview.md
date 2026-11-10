# Theme ink reveal (preview only, not on main)

Light/Dark button on the home gallery grows the new theme out of the tapped button through an ink-shaped mask (about 2.2 s, softer edge). Both directions.

- Uses the View Transitions API with one mask animation on the new-theme layer. No canvas, no per-frame JS.
- Reduced motion or no API support: instant switch, as before.
- Files: theme-reveal.ts, public/ink-mask.svg, style.css (end of file), App.tsx (button handler).
- Checked locally on mobile (touch) and desktop: both directions, rapid double tap, navigating to the account page mid-reveal. No stuck overlay, no page errors.
- Not checked: real phone smoothness. Not merged, not deployed.

# Resale detail and 3D preview

Preview-only work. Main production release is held for separate approval.

## Scope

- Three existing dummy shelf cards open item detail routes.
- Photo-first detail page, no real seller listings, ordering or new backend.
- Optional rotatable 3D model, loaded only on request, with photo fallback and a return-to-photo control.
- Reduced-motion preference disables auto-rotate and entrance motion.
- The sample model is an antique camera, not the Volt 35mm SLR. The page says so explicitly.

## Asset

Khronos glTF Sample Assets, AntiqueCamera. CC0-1.0, Maximillan Kamps / UX3D (2018).

Source metadata: https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/AntiqueCamera/metadata.json

Original source: https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/AntiqueCamera

Optimized from 17,540,348 bytes to 1,291,800 bytes using glTF Transform 4.5.1: WebP textures capped at 1024px, no geometry simplification, no mesh compression or external decoder. Lazy loading and a visible 1.3 MB size remain.

## Verification

- TypeScript and Vite build pass; build-smoke tests: 3 passed.
- Mobile and desktop video captures show shelf -> detail -> rotating 3D.
- Reduced-motion run loads the model without auto-rotation.
- Return-to-photo tested after loading the model.
- Optimized model visually checked at 390px; model loads and materials remain intact.
- Every remote source blob and binary is compared with local Git hashes before preview deployment.

All prices, seller names, item descriptions and product photos remain illustrative demo content. No real purchase is enabled. This is a usable preview, not a complete resale marketplace or a production-readiness claim. A real-device check remains desirable before a later approved production release.

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

## Deployed preview verification

Preview PR: https://github.com/himanshuurawat/elusivehue/pull/26

Cloudflare Pages deployment for auth-preview commit 7bddceb8 succeeded. Verified on November 10, 2026:

https://auth-preview.elusivehue.pages.dev/#/resale/volt-35mm-slr

Live browser checks at 390px and 1440px: shelf navigation, photo-first state, zero model requests before tapping 3D, model loaded successfully after one request, return-to-photo, and no page errors. Reduced-motion run has no auto-rotate. Both other item routes and unknown-item fallback render. Deployed model byte-compared against the optimized local asset. Final live motion videos and mobile/desktop pixels were inspected. Main remained 44223df during verification.

The preview conflict resolution preserves the older payment-demo route. Any separately approved main release must use the clean resale-only changes, not merge this preview branch wholesale.

## Local smoother-motion refinement, November 10

User liked the persistent-camera direction at 16:29 and requested smoother motion at 16:30. Recovered local source after the temporary workspace reset. No deployment or merge approval. Added a 1.65-second scene travel timeline with fifth-order pose easing, gentler copy fades, time-based settling, continuous mobile x placement, and manual-input cancellation. Reduced motion still selects fixed scenes; model remains on demand with retry. Recovery testing uses the existing auth-preview checkout only and is not a main-release branch. Keep main unchanged and assemble only resale changes onto main if a future release is explicitly approved.

## Preview hosting approved, November 10, 18:14 IST

The user approved hosting the smoother study for hands-on motion and orbit review, with main explicitly unchanged. The new preview is isolated on resale-smooth-preview; it is not permission to merge or release main. Camera route only; no schema, new service or test fixtures. The scene study uses the 775,232-byte camera-body derivative of the credited CC0 asset. Existing full sample is preserved.

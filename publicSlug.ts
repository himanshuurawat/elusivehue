// Shared slug helper used by both the gallery modal (App.tsx) and the
// public pages chunk (PublicPages.tsx) so slugs stay in sync without
// pulling the lazy public-pages chunk into the main bundle.
export function slugFor(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

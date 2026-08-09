# UI component architecture

The frontend uses Astro for reusable static composition and strict TypeScript for browser behavior:

- `app/layouts/Layout.astro` owns metadata, structured data, shared chrome, and global assets.
- `app/components/Header.astro` and `Footer.astro` are reusable accessible landmarks.
- `app/scripts/ui.ts` owns escaped rendering, status panels, busy buttons, and toast behavior.
- `app/scripts/site.ts` owns navigation, filters, form submission, and service-worker registration.
- `app/scripts/pages.ts` owns page-specific data composition and loading, empty, and error states.
- `app/scripts/data.ts` is the typed data boundary for Supabase, JSON fallbacks, and `/api/submit`.
- `app/scripts/admin.ts` owns the typed officer portal while preserving the existing API and table contracts.

Page metadata is constrained by the `PageId` and `PageMeta` types in `app/lib/page-meta.ts`. Runtime data is treated as `unknown` at the network boundary and normalized before rendering.

Every async content region should render a loading state, a meaningful empty state, and a recoverable error state. Generated content must be escaped, keyboard focus must remain visible, and reduced-motion users must not depend on animation.

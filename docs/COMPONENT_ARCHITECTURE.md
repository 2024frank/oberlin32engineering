# UI component architecture

The public site is framework-free, but it follows a reusable component model:

- `site.css` owns design tokens and shared primitives.
- `components.js` owns async status panels and busy-button behavior.
- `site.js` owns global navigation, filters, and form submission.
- `pages.js` owns page-specific data composition.
- `data-service.js` is the only data-access boundary and supports Supabase plus JSON fallbacks.

`window.O32Components` exposes `statusPanel({ type, title, message })` for loading, empty, and error states, plus `setBusy(button, true|false, label)` for accessible async actions.

Every async content region should render a loading state, a meaningful empty state, and a recoverable error state. Generated content must be escaped, keyboard focus must remain visible, and reduced-motion users must not depend on animation.

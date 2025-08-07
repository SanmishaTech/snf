# SNF Landing Module

A frontend-only, modern landing experience for a grocery shopping app, mounted at `/snf`. This module is fully client-side with mock data, responsive, accessible, and lazy-loaded.

Features

- Independent landing page at /snf via React Router, code-split with React.lazy and Suspense.
- Sticky header with logo, search, cart badge, and account entry.
- Promotional hero with responsive images and CTA.
- Category filters, sorting, and search with client-side state.
- Product grid with ProductCard: image, title, description, price, discount badge, rating, and add-to-cart button.
- Loading skeletons, hover/focus micro-interactions, and lazy-loading for images.
- Accessible semantics: alt text, ARIA labels, keyboard navigability.
- No backend calls; static mock data only.

Structure

- modules/SNF/SNFLandingPage.tsx
- modules/SNF/components/
  - Header.tsx, Footer.tsx, Hero.tsx
  - CategoryFilters.tsx, SortControls.tsx
  - ProductGrid.tsx, LoadingSkeleton.tsx
- modules/SNF/data/
  - products.ts, categories.ts
- modules/SNF/lib/
  - filtering.ts (pure functions)
- modules/SNF/**tests**/
  - filtering.test.ts (example using Vitest; optional if vitest is present in project)

Routing

- The route is registered in App.tsx as a lazy-loaded element:
  - path: /snf
  - Suspense fallback uses a skeleton grid.

Run locally

1. Start the dev server from project root:
   npm run dev

2. Visit:
   http://localhost:5173/snf (or your Vite dev server port)

Adjust mock data

- Edit products at: src/modules/SNF/data/products.ts
  - Fields: id, title, description, image, price, discountPct?, rating, popularity, category
- Edit categories at: src/modules/SNF/data/categories.ts

Styling and UI

- Uses Tailwind + shadcn/ui tokens from the existing project.
- Components follow accessible patterns: focus-visible rings, aria-labels, aria-pressed for toggles, alt text for images.
- Images use loading="lazy", decoding="async", and responsive srcSet/sizes hints.

Tests

- Example tests for pure filtering logic at: src/modules/SNF/**tests**/filtering.test.ts
- If your project does not include Vitest yet, you may ignore or remove this example, or install Vitest:
  npm i -D vitest @types/node jsdom
  Add a basic vitest config if needed and run:
  npx vitest

Notes

- This module does not perform any API calls and does not modify backend code.
- You can extend this module by adding a DealsCarousel component or Recently Viewed section and import it in SNFLandingPage.tsx.

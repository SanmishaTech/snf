# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

Project summary

- Frontend: React 19 + Vite + TypeScript + TailwindCSS + shadcn/ui (Radix-based)
- State/data: @tanstack/react-query
- Testing: Vitest + @testing-library/react (jsdom env)
- Linting: ESLint (flat config: eslint.config.js)
- Build tool: Vite
- Path aliases: @ -> ./src

Common commands

- Install deps
  - npm ci (preferred when package-lock.json present)
  - npm install (if not using CI-style install)
- Start dev server
  - npm run dev
  - Optional: set backend URL (overrides config.ts auto-detect)
    - VITE_BACKEND_URL=https://www.indraai.in npm run dev
    - Notes: vite.config.ts proxies /api -> https://www.indraai.in; config.ts also uses VITE_BACKEND_URL or current host.
- Build production bundle
  - npm run build
- Static preview of production build
  - npm run preview
- Lint
  - npm run lint
  - With autofix: npx eslint . --fix
- Tests (Vitest)
  - Run all tests: npx vitest
  - Watch mode: npx vitest --watch
  - Single test file: npx vitest run src/modules/SNF/**tests**/ProductGrid.test.tsx
  - Single test by name: npx vitest run src/modules/SNF/**tests**/ProductGrid.test.tsx -t "should render products with pricing information"

Environment and configuration

- Environment variables (Vite, exposed as import.meta.env.\*)
  - VITE_APP_NAME: document title and branding (default: "SNF")
  - VITE_BACKEND_URL: base server URL (without trailing /api). If unset, dev uses https://www.indraai.in and prod derives from window.location.hostname.
  - VITE_ALLOW_REGISTRATION: "true" to enable registration paths
- HTTP layer
  - src/services/apiService.ts creates an axios instance with baseURL from backendUrl (config.ts). It ensures URLs are prefixed with /api, adds Authorization: Bearer <token> from localStorage, and intercepts 401/403 to redirect to login (except on auth pages and certain landing calls).
- Path aliases
  - @ -> ./src (configured in tsconfig.json and vite.config.ts)

High-level architecture

- Application boot
  - src/main.tsx: Initializes React app, includes global styles, and wraps the app in QueryClientProvider (@tanstack/react-query) for data fetching/caching.
- Routing and layouts
  - src/App.tsx defines all routes using react-router-dom with three major layout patterns:
    - AuthLayout: login/registration/reset flows
    - MemberLayout: public/member-facing pages (landing, static pages, member products, wallet, addresses, subscriptions)
    - MainLayout within AdminProtectedRoute: admin-only routes for managing users, vendors, agencies, supervisors, orders, purchases, payments, transfers, categories, cities, locations, areas, depots, banners, teams, SNF orders, and reports
  - Several SNF pages (landing, category, product, checkout, address, debug) are lazy-loaded wrappers (e.g., SNFWrapper, SNFCheckoutWrapper, SNFProductDetailWrapper) to code-split the SNF experience.
- Theming and mobile behavior
  - src/providers/theme-provider.tsx uses next-themes. On mobile, theme is forced to light and maintained on resize. MobileThemeEnforcer component further enforces mobile-specific UI adjustments.
- Feature modules (selected examples)
  - src/modules/SNF: customer-facing shopping experience
    - components/: Header, Footer, ProductGrid, filters, pincode entry, cart debug pages, etc.
    - context/ and contexts/: PricingContext and related reducers; hooks for location, depot selection, product retrieval, and real-time pricing
    - services/: thin client-side services (api.ts, batchedApi.ts, cartValidation.ts, depotMapping.ts, geolocation.ts)
    - data/: seed-like static data for banners, categories, products (for UI scaffolding/demo)
    - **tests**/: unit tests with a shared setup.ts mocking browser APIs
  - src/modules/\*: admin and business flows broken into domain-focused folders (Users, Vendors, Orders, Purchase, Wastage, Wallet, Agency Delivery, Masters like Category/City/Location/Area/Depot, etc.). Each module typically provides List, Create, Edit pages and related components.
- Shared services and utilities
  - src/services/\*: REST API wrappers per domain (e.g., productService.ts, order services, location/area/city masters, subscriptions, wallet, etc.) using the central apiService axios instance.
  - src/utils/_ and src/lib/_: cross-cutting utilities, validation/format helpers, error handling.
- UI system
  - TailwindCSS 4 + shadcn/ui components (src/components/ui/_) and project-specific components (src/components/_, src/components/common/\*).
  - components.json defines shadcn aliases and base style.

Testing model

- Vitest configured in vitest.config.ts
  - environment: jsdom
  - setupFiles: src/modules/SNF/**tests**/setup.ts (mocks matchMedia, storage, fetch, geolocation, permissions, ResizeObserver, IntersectionObserver, URL APIs; suppresses console noise during tests)
- Example test: src/modules/SNF/**tests**/ProductGrid.test.tsx covers grid rendering, pricing display, discount badges, OOS behavior, accessible labels, responsive classes, and interactions.

Local dev against backend

- vite.config.ts defines a dev server proxy for /api -> https://www.indraai.in
- src/config.ts will default backendUrl to https://www.indraai.in in dev; in prod, it prefers VITE_BACKEND_URL or derives from window.location.hostname
- To point at a different backend in dev: VITE_BACKEND_URL=http://127.0.0.1:8080 npm run dev

Repository notes

- Lint configuration: eslint.config.js (flat config) is the active setup for TypeScript + React hooks + refresh; a legacy .eslintrc.js exists but the flat config is authoritative.
- Tailwind theme extensions live in tailwind.config.js; content scans ./src/\*_/_.{ts,tsx,js,jsx}
- Dist assets are generated in /dist; avoid editing.

Troubleshooting quick checks

- Dev server starts but API 401/403 with unexpected redirects: ensure authToken is present in localStorage or you’re on an auth route. The interceptor may redirect otherwise.
- Path import errors like "@/..." not resolved: ensure tsconfig.json and vite.config.ts alias @ -> ./src are intact, and your editor uses the workspace TypeScript.
- Tests failing due to missing browser APIs: confirm setup file path in vitest.config.ts matches src/modules/SNF/**tests**/setup.ts.

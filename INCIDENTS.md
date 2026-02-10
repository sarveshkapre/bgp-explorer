# Incidents And Learnings

## Entry Schema
- Date
- Trigger
- Impact
- Root Cause
- Fix
- Prevention Rule
- Evidence
- Commit
- Confidence

## Entries

### 2026-02-10: `/bgp` Build Failure From Missing Suspense Boundary
- Date: 2026-02-10
- Trigger: `npm run build` failed while prerendering `/bgp` after introducing `useSearchParams()` in the route.
- Impact: Local build failure; caught before pushing a broken commit.
- Root Cause: App Router requires `useSearchParams()` usage to be wrapped in a Suspense boundary to handle CSR bailouts.
- Fix: Split `/bgp` into a server component wrapper (`src/app/bgp/page.tsx`) with `<Suspense>` and a client component (`src/app/bgp/ui.tsx`).
- Prevention Rule: When adding `useSearchParams` / other client-only navigation hooks to a route, run `npm run build` and ensure the client code is wrapped by a Suspense boundary at the page/segment level.
- Evidence: `npm run build` then successful rebuild after fix.
- Commit: `c282510`
- Confidence: high

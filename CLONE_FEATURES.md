# Clone Feature Tracker

## Context Sources
- README and docs
- TODO/FIXME markers in code
- Test and build failures
- Gaps found during codebase exploration

## Candidate Features To Do

Scoring lens: impact, effort, strategic fit, differentiation, risk, confidence.

- [ ] Add entity pages (`/asn/:asn`, `/prefix/:prefix`) with relationships and evidence (origins, peers, RPKI posture, reporting peers). (impact: high, effort: high, fit: high, diff: medium, risk: medium, confidence: medium)
- [ ] Add evidence capture to storage (persist results keyed by query+timestamp) and an “evidence permalink”. (impact: high, effort: high, fit: high, diff: high, risk: medium, confidence: low)
- [ ] Add time-travel UI primitives (compare two timestamps, diff summary) once we have stored snapshots. (impact: high, effort: high, fit: high, diff: high, risk: medium, confidence: low)
- [ ] Add input affordances: example chips, query history, and a “copy evidence” button (stable JSON export). (impact: medium, effort: medium, fit: high, diff: medium, risk: low, confidence: medium)
- [ ] Add a small server-side cache with bounded TTL to reduce upstream load while keeping “evidence timestamps” clear. (impact: medium, effort: medium, fit: medium, diff: low, risk: low, confidence: medium)

## Implemented

- 2026-02-10: Replace dead `api.bgpview.io` with RouteViews + RIPEstat, with evidence URLs and timestamps. Evidence: `src/app/api/bgp/lookup/route.ts`, `src/lib/safeFetch.ts`, smoke curl to `http://localhost:3000/api/bgp/lookup`. (commit: `c282510`)
- 2026-02-10: Fix broken navigation/branding and add `/bgp` route; `/` redirects to `/bgp`. Evidence: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/bgp/page.tsx`, `src/app/bgp/ui.tsx`. (commit: `c282510`)
- 2026-02-10: Add org-name suggestion flow using RIPEstat search completion and shareable `?q=` lookups. Evidence: `src/app/bgp/ui.tsx`, `src/app/api/bgp/lookup/route.ts`. (commit: `c282510`)
- 2026-02-10: Add `npm run typecheck` and Vitest unit tests for parsing/normalization. Evidence: `vitest.config.ts`, `src/lib/*.test.ts`, `src/lib/bgpQuery.ts`. (commit: `fadcf35`)

## Insights

Market scan (bounded) sources and baseline expectations:

- `bgp.tools`: search supports prefixes, ASNs, and other identifiers; strong emphasis on “single search box” and rich entity pages. https://bgp.tools/ ; docs: https://bgp.tools/kb/api
- RouteViews provides a public JSON API for prefix and ASN lookups; prefix results include AS paths, reporting peers, RPKI state, and peer timestamps which can be used as evidence. https://api.routeviews.org/
- RIPEstat provides a public Data API suitable for IP-to-covering-prefix and “searchcomplete” style disambiguation; responses include a server-side `time` field. https://stat.ripe.net/docs/data_api

## Notes
- This file is maintained by the autonomous clone loop.

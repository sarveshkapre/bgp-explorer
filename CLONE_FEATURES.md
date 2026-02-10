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
- [ ] Add abuse protection: simple per-IP rate limiting (best-effort) for `/api/bgp/lookup` to reduce accidental upstream overload. (impact: medium, effort: medium, fit: medium, diff: low, risk: low, confidence: medium)
- [ ] Add structured rendering for ASN/prefix results (tables + top relationships) so users don’t have to parse raw JSON. (impact: medium, effort: medium, fit: high, diff: medium, risk: low, confidence: medium)

## Implemented

- 2026-02-10: Add GitHub Actions CI workflow to run `lint`, `typecheck`, `test`, and `build` on pushes/PRs. Evidence: `.github/workflows/ci.yml`, `gh workflow list`, `gh run watch`. (commit: `b4dafe7`)
- 2026-02-10: Add bounded upstream fetch cache (TTL) and surface cache hits in evidence. Evidence: `src/lib/safeFetch.ts`, `src/app/api/bgp/lookup/route.ts`, `src/app/bgp/ui.tsx`, smoke `curl http://localhost:3011/api/bgp/lookup?q=8.8.8.8` twice shows `cached: true`. (commit: `2cf2cc2`)
- 2026-02-10: Add UX affordances: example chips, local query history, and copy/download buttons for raw JSON evidence export. Evidence: `src/app/bgp/ui.tsx`. (commit: `aa9fc7e`)
- 2026-02-10: Improve IP normalization: support bracketed IPv6 with port (e.g. `[2001:db8::1]:443`) and add tests. Evidence: `src/lib/ip.ts`, `src/lib/ip.test.ts`. (commit: `7e06d46`)
- 2026-02-10: Replace dead `api.bgpview.io` with RouteViews + RIPEstat, with evidence URLs and timestamps. Evidence: `src/app/api/bgp/lookup/route.ts`, `src/lib/safeFetch.ts`, smoke curl to `http://localhost:3000/api/bgp/lookup`. (commit: `c282510`)
- 2026-02-10: Fix broken navigation/branding and add `/bgp` route; `/` redirects to `/bgp`. Evidence: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/bgp/page.tsx`, `src/app/bgp/ui.tsx`. (commit: `c282510`)
- 2026-02-10: Add org-name suggestion flow using RIPEstat search completion and shareable `?q=` lookups. Evidence: `src/app/bgp/ui.tsx`, `src/app/api/bgp/lookup/route.ts`. (commit: `c282510`)
- 2026-02-10: Add `npm run typecheck` and Vitest unit tests for parsing/normalization. Evidence: `vitest.config.ts`, `src/lib/*.test.ts`, `src/lib/bgpQuery.ts`. (commit: `fadcf35`)

## Insights

Market scan (bounded) sources and baseline expectations:

- `bgp.tools`: search supports prefixes, ASNs, and other identifiers; strong emphasis on “single search box” and rich entity pages. https://bgp.tools/ ; docs: https://bgp.tools/kb/api
- `bgp.he.net`: classic entity pages for ASNs/prefixes with upstream/downstream relationships and whois context. https://bgp.he.net/
- RouteViews provides a public JSON API for prefix and ASN lookups; prefix results include AS paths, reporting peers, RPKI state, and peer timestamps which can be used as evidence. https://api.routeviews.org/
- RIPEstat provides a public Data API suitable for IP-to-covering-prefix and “searchcomplete” style disambiguation; responses include a server-side `time` field. https://stat.ripe.net/docs/data_api
- `PeeringDB`: optional enrichment source for IXP/facility/org metadata once entity pages exist. https://www.peeringdb.com/

Gap map (as of 2026-02-10):
- Missing: dedicated entity pages (ASN/prefix), evidence permalinks/snapshots, time-travel/diff, anomaly detection, richer enrichment (PeeringDB/WHOIS/RDAP).
- Weak: structured presentation of upstream data (tables/graphs), abuse protection/rate limiting, deeper disambiguation for org searches.
- Parity: single search box, actionable suggestions, raw JSON access, upstream evidence URLs/timestamps.
- Differentiator opportunities: first-class evidence capture (permalinks + export), “changes over time” UX once snapshots exist.

## Notes
- This file is maintained by the autonomous clone loop.

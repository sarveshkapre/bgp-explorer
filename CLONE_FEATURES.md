# Clone Feature Tracker

## Context Sources
- README and docs
- TODO/FIXME markers in code
- Test and build failures
- Gaps found during codebase exploration

## Candidate Features To Do

Scoring lens: impact, effort, strategic fit, differentiation, risk, confidence.

- [ ] Add entity pages (`/asn/:asn`, `/prefix/:prefix`) with richer relationship views and evidence timelines. (impact: high, effort: high, fit: high, diff: medium, risk: medium, confidence: medium)
- [ ] Add evidence capture to local storage/db (keyed by query+timestamp) and an evidence permalink route. (impact: high, effort: high, fit: high, diff: high, risk: medium, confidence: low)
- [ ] Add time-travel diff UI between two snapshots (origin change, peer churn, RPKI changes). (impact: high, effort: high, fit: high, diff: high, risk: medium, confidence: low)
- [ ] Add optional WHOIS/RDAP enrichment panel for ASN and prefix ownership context. (impact: medium, effort: medium, fit: medium, diff: medium, risk: medium, confidence: medium)
- [ ] Add PeeringDB enrichment for ASNs (IX presence, facilities, org metadata). (impact: medium, effort: medium, fit: medium, diff: medium, risk: medium, confidence: low)
- [ ] Add resilient fallback providers for prefix/asn lookups when RouteViews is degraded. (impact: high, effort: high, fit: high, diff: medium, risk: medium, confidence: low)
- [ ] Add request observability hooks (request id, latency buckets, upstream error counters). (impact: medium, effort: medium, fit: high, diff: low, risk: low, confidence: medium)
- [ ] Add API contract tests for `/api/bgp/lookup` response shape across IP/prefix/ASN/search modes. (impact: medium, effort: medium, fit: high, diff: low, risk: low, confidence: medium)
- [ ] Add a lightweight “compare two queries” view (e.g., two prefixes or two ASNs) for quick operator triage. (impact: medium, effort: high, fit: medium, diff: medium, risk: medium, confidence: low)

## Implemented

- 2026-02-11: Add best-effort per-IP lookup rate limiting with explicit `429` metadata (`retryAfterSec`, reset window) and `Retry-After` header. Evidence: `src/lib/rateLimit.ts`, `src/app/api/bgp/lookup/route.ts`, smoke `BGP_RATE_LIMIT_MAX_REQUESTS=2` then three calls to `/api/bgp/lookup?q=1.1.1.1` returned `200,200,429`. (commit: `853cf1d`)
- 2026-02-11: Add bounded, evicting fetch cache controls (`BGP_CACHE_MAX_ENTRIES`) and LRU-style overflow pruning. Evidence: `src/lib/safeFetch.ts`, `src/lib/safeFetch.test.ts`, `npm test` (safe fetch cache tests pass). (commit: `853cf1d`)
- 2026-02-11: Tighten parsing correctness for strict IP validation (`node:net isIP`) and ASN range checks (0..4294967295), with edge-case tests. Evidence: `src/lib/ip.ts`, `src/lib/ip.test.ts`, `src/lib/bgpQuery.ts`, `src/lib/bgpQuery.test.ts`. (commit: `853cf1d`)
- 2026-02-11: Add structured result cards for IP/prefix/ASN lookups (RPKI/origin/peer/path metrics and pivot buttons) while retaining raw evidence export. Evidence: `src/app/bgp/ui.tsx`, smoke calls to `/api/bgp/lookup?q=8.8.8.8|8.8.8.0/24|AS15169`. (commit: `9019876`)
- 2026-02-11: Add targeted reliability tests for rate limiting and cache behavior. Evidence: `src/lib/rateLimit.test.ts`, `src/lib/safeFetch.test.ts`, `npm test` (24 tests passed). (commit: `853cf1d`)
- 2026-02-10: Add GitHub Actions CI workflow to run `lint`, `typecheck`, `test`, and `build` on pushes/PRs. Evidence: `.github/workflows/ci.yml`, `gh workflow list`, `gh run watch`. (commit: `b4dafe7`)
- 2026-02-10: Add bounded upstream fetch cache (TTL) and surface cache hits in evidence. Evidence: `src/lib/safeFetch.ts`, `src/app/api/bgp/lookup/route.ts`, `src/app/bgp/ui.tsx`, smoke `curl http://localhost:3011/api/bgp/lookup?q=8.8.8.8` twice shows `cached: true`. (commit: `2cf2cc2`)
- 2026-02-10: Add UX affordances: example chips, local query history, and copy/download buttons for raw JSON evidence export. Evidence: `src/app/bgp/ui.tsx`. (commit: `aa9fc7e`)
- 2026-02-10: Improve IP normalization: support bracketed IPv6 with port (e.g. `[2001:db8::1]:443`) and add tests. Evidence: `src/lib/ip.ts`, `src/lib/ip.test.ts`. (commit: `7e06d46`)
- 2026-02-10: Replace dead `api.bgpview.io` with RouteViews + RIPEstat, with evidence URLs and timestamps. Evidence: `src/app/api/bgp/lookup/route.ts`, `src/lib/safeFetch.ts`, smoke curl to `http://localhost:3000/api/bgp/lookup`. (commit: `c282510`)
- 2026-02-10: Fix broken navigation/branding and add `/bgp` route; `/` redirects to `/bgp`. Evidence: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/bgp/page.tsx`, `src/app/bgp/ui.tsx`. (commit: `c282510`)
- 2026-02-10: Add org-name suggestion flow using RIPEstat search completion and shareable `?q=` lookups. Evidence: `src/app/bgp/ui.tsx`, `src/app/api/bgp/lookup/route.ts`. (commit: `c282510`)
- 2026-02-10: Add `npm run typecheck` and Vitest unit tests for parsing/normalization. Evidence: `vitest.config.ts`, `src/lib/*.test.ts`, `src/lib/bgpQuery.ts`. (commit: `fadcf35`)
- 2026-02-10: Refactor: de-duplicate JSON traversal and RouteViews evidence parsing helpers; add unit tests. Evidence: `src/lib/json.ts`, `src/lib/routeViews.ts`, `npm test`. (commit: `6ac0506`)

## Insights

Market scan (bounded, 2026-02-11) sources and baseline expectations:

- `bgp.tools`: emphasizes API-backed, search-centric workflows and richer detail pages (note: blocks generic/bot user agents unless a descriptive agent is provided). https://bgp.tools/ ; docs: https://bgp.tools/kb/api
- `bgp.he.net`: established ASN/prefix entity pages with relationship-heavy navigation patterns. https://bgp.he.net/
- RouteViews API documentation exposes prefix/ASN and adjacent route metadata endpoints suitable for evidence-oriented UI. https://api.routeviews.org/docs
- RIPEstat `network-info` endpoint documents IP to covering-prefix/ASN mapping and response fields. https://stat.ripe.net/docs/data-api/api-endpoints/network-info
- RIPEstat `searchcomplete` endpoint supports disambiguation suggestions for org-like input. https://stat.ripe.net/docs/data-api/api-endpoints/searchcomplete

Gap map (as of 2026-02-11):
- Missing: dedicated entity pages (ASN/prefix), evidence permalinks/snapshots, time-travel/diff, anomaly detection, richer enrichment (PeeringDB/WHOIS/RDAP).
- Weak: deeper disambiguation for org searches, fallback data-provider strategy, request-level observability.
- Parity: single search box, actionable suggestions, raw JSON access, upstream evidence URLs/timestamps.
- Differentiator opportunities: first-class evidence capture (permalinks + export), “changes over time” UX once snapshots exist.

## Notes
- This file is maintained by the autonomous clone loop.

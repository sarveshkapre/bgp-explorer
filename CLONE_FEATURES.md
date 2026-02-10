# Clone Feature Tracker

## Context Sources
- README and docs
- TODO/FIXME markers in code
- Test and build failures
- Gaps found during codebase exploration

## Candidate Features To Do

Scoring lens: impact, effort, strategic fit, differentiation, risk, confidence.

- [x] Replace dead `api.bgpview.io` dependency with live sources (RouteViews + RIPEstat), and return timestamped evidence (upstream URL, upstream timestamp, local fetchedAt). (impact: high, effort: medium, fit: high, diff: medium, risk: low, confidence: high)
- [x] Fix broken navigation and branding: ensure `/bgp` exists, remove/replace links to non-existent routes, and align metadata/title to “BGP Explorer”. (impact: high, effort: low, fit: high, diff: low, risk: low, confidence: high)
- [x] Add “org name” search fallback using RIPEstat search completion, and render suggestions in the UI to disambiguate queries. (impact: medium, effort: medium, fit: high, diff: low, risk: low, confidence: medium)
- [x] Make lookups shareable and reproducible: sync query to `?q=...`, auto-run when present, and keep raw evidence stable (no client-side munging). (impact: medium, effort: low, fit: high, diff: medium, risk: low, confidence: high)
- [x] Add developer safety rails: `npm run typecheck` and minimal unit tests for parsing/routing logic; keep network calls mocked. (impact: medium, effort: medium, fit: high, diff: low, risk: low, confidence: medium)
- [x] Add runnable local smoke path and record exact verification evidence in `PROJECT_MEMORY.md`. (impact: medium, effort: low, fit: high, diff: low, risk: low, confidence: high)

- [ ] Add entity pages (`/asn/:asn`, `/prefix/:prefix`) with relationships and evidence (origins, peers, RPKI posture, reporting peers). (impact: high, effort: high, fit: high, diff: medium, risk: medium, confidence: medium)
- [ ] Add time-travel UI primitives (compare two timestamps, diff summary) once we have stored snapshots. (impact: high, effort: high, fit: high, diff: high, risk: medium, confidence: low)
- [ ] Add evidence capture to storage (persist results keyed by query+timestamp) and an “evidence permalink”. (impact: high, effort: high, fit: high, diff: high, risk: medium, confidence: low)

## Implemented

## Insights

Market scan (bounded) sources and baseline expectations:

- `bgp.tools`: search supports prefixes, ASNs, and other identifiers; strong emphasis on “single search box” and rich entity pages. https://bgp.tools/ ; docs: https://bgp.tools/kb/api
- RouteViews provides a public JSON API for prefix and ASN lookups; prefix results include AS paths, reporting peers, RPKI state, and peer timestamps which can be used as evidence. https://api.routeviews.org/
- RIPEstat provides a public Data API suitable for IP-to-covering-prefix and “searchcomplete” style disambiguation; responses include a server-side `time` field. https://stat.ripe.net/docs/data_api

## Notes
- This file is maintained by the autonomous clone loop.

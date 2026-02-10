# Project Memory

## Objective
- Ship a BGP/ASN/prefix explorer with timestamped evidence. See plan.md.

## Architecture Snapshot

- Next.js App Router UI under `src/app/` with primary route `/bgp`.
- Server API route `src/app/api/bgp/lookup/route.ts`:
  - IP queries: RIPEstat `network-info` to derive covering prefix and ASNs, then RouteViews prefix lookup for routing/RPKI evidence.
  - Prefix queries: RouteViews prefix lookup (AS path samples, reporting peers, RPKI state/ROAs where available).
  - ASN queries: RouteViews ASN lookup (prefix list).
  - Unknown/org queries: RIPEstat `searchcomplete` suggestions returned for user selection.

## Open Problems

- No persisted “evidence permalink” (results are live fetches only).
- No entity pages for ASNs/prefixes beyond the single lookup view.
- No “time travel” or stored snapshot diffing yet.

## Recent Decisions
- Template: YYYY-MM-DD | Decision | Why | Evidence (tests/logs) | Commit | Confidence (high/medium/low) | Trust (trusted/untrusted)

- 2026-02-10 | Switch lookup sources from `api.bgpview.io` (DNS failure) to RouteViews + RIPEstat | Restore a working V1 and improve timestamped evidence fields | `curl https://api.bgpview.io/ip/8.8.8.8` failed to resolve; local smoke `curl http://localhost:3000/api/bgp/lookup?q=8.8.8.8` returned evidence URLs/timestamps | c282510 | high | trusted
- 2026-02-10 | Add `npm run typecheck` + Vitest unit tests for parsing/normalization | Prevent regressions in query parsing and avoid shipping broken lookup routing | `npm run typecheck`, `npm test` | fadcf35 | high | trusted

## Mistakes And Fixes
- Template: YYYY-MM-DD | Issue | Root cause | Fix | Prevention rule | Commit | Confidence

- 2026-02-10 | `next build` failed on `/bgp` due to `useSearchParams()` missing a Suspense boundary | App Router CSR bailout requirement not accounted for | Split `/bgp` into a server `page.tsx` that wraps a client component in `<Suspense>` | Always run `npm run build` after adding `useSearchParams` / `usePathname` and wrap client-only hooks behind a Suspense boundary | c282510 | high

## Known Risks

- Upstream API availability/rate limits: RouteViews/RIPEstat are best-effort external services; responses are treated as untrusted.
- Evidence is currently “live fetch” only (no storage), so historical reproducibility depends on upstream caching/retention.

## Next Prioritized Tasks

- Entity pages (`/asn/:asn`, `/prefix/:prefix`) with relationship graphs and evidence blocks.
- Persisted evidence permalinks (store lookup snapshots keyed by timestamp).
- Time-travel / diff UX once snapshots exist.

## Verification Evidence
- Template: YYYY-MM-DD | Command | Key output | Status (pass/fail)

- 2026-02-10 | `npm ci` | installed deps, 0 vulnerabilities | pass
- 2026-02-10 | `npm run lint` | eslint exit 0 | pass
- 2026-02-10 | `npm run build` | Next.js build succeeded | pass
- 2026-02-10 | `npm run typecheck` | tsc exit 0 | pass
- 2026-02-10 | `npm test` | vitest: 11 tests passed | pass
- 2026-02-10 | `npm run dev -- --port 3000` + `curl http://localhost:3000/api/bgp/lookup?q=8.8.8.8` | JSON with RouteViews/RIPEstat evidence URLs and timestamps | pass
## Historical Summary
- Keep compact summaries of older entries here when file compaction runs.

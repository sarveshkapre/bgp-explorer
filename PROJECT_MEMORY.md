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
- No “time travel” or stored snapshot diffing yet.

## Recent Decisions
- Template: YYYY-MM-DD | Decision | Why | Evidence (tests/logs) | Commit | Confidence (high/medium/low) | Trust (trusted/untrusted)

- 2026-02-11 | Add canonical entity routes for ASN and prefix with locked-query lookup views | Improve shareability and operator navigation by giving ASNs/prefixes stable URLs while preserving existing evidence UI | Local smoke: `/asn/15169` and `/prefix/8.8.8.0/24` returned HTTP 200 and rendered canonical headers | a73f3b3 | high | trusted
- 2026-02-11 | Add request-level observability metadata and response headers for `/api/bgp/lookup` | Make request tracing and latency/debug signals explicit in API and UI without external observability infra | `curl -I /api/bgp/lookup?q=8.8.8.8` showed `x-request-id` + `x-response-time-ms`; `meta` surfaced in JSON and summary panel | a73f3b3 | high | trusted
- 2026-02-11 | Add API contract tests for lookup modes and upstream failure | Prevent response-shape drift as features evolve and lock key behavior for IP/prefix/ASN/search flows | `src/app/api/bgp/lookup/route.test.ts` added; `npm test` reported 29 passing tests | a73f3b3 | high | trusted
- 2026-02-11 | Expand bounded market scan inputs with topology/time-series baseline UX from Cloudflare Radar routing | Calibrate roadmap toward timeline and route-change visual expectations while treating external claims as untrusted signals | `https://radar.cloudflare.com/routing`, `https://bgp.he.net/`, `https://bgp.tools/` | n/a | medium | untrusted
- 2026-02-11 | Add best-effort in-memory per-IP rate limiting for `/api/bgp/lookup` and return explicit `429` metadata | Prevent accidental upstream overload and make throttling behavior observable to users | Local smoke with `BGP_RATE_LIMIT_MAX_REQUESTS=2`: three API calls returned `200, 200, 429` and `retryAfterSec` | 853cf1d | high | trusted
- 2026-02-11 | Add bounded fetch cache (`BGP_CACHE_MAX_ENTRIES`) with stale + LRU-style eviction | Prevent unbounded memory growth while preserving short TTL cache benefits | `npm test` includes `src/lib/safeFetch.test.ts` validating cache hit and eviction behavior | 853cf1d | high | trusted
- 2026-02-11 | Tighten parser correctness (strict `isIP` validation and ASN range bound) | Avoid false-positive IP parsing and invalid ASN lookups | `src/lib/ip.test.ts` and `src/lib/bgpQuery.test.ts` cover `:::` and `AS4294967296` rejection | 853cf1d | high | trusted
- 2026-02-11 | Add structured result rendering with pivot lookups for IP/prefix/ASN | Improve operator UX by surfacing key routing relationships without raw JSON parsing | `src/app/bgp/ui.tsx`, local smoke lookups for `8.8.8.8`, `8.8.8.0/24`, `AS15169` | 9019876 | high | trusted
- 2026-02-11 | Keep market scan bounded to official docs/homepages of adjacent tools and treat findings as product signals only | Baseline competitor expectations without importing proprietary assets/code | `https://api.routeviews.org/docs`, `https://stat.ripe.net/docs/data-api/api-endpoints/network-info`, `https://bgp.tools/kb/api` | n/a | medium | untrusted
- 2026-02-10 | Switch lookup sources from `api.bgpview.io` (DNS failure) to RouteViews + RIPEstat | Restore a working V1 and improve timestamped evidence fields | `curl https://api.bgpview.io/ip/8.8.8.8` failed to resolve; local smoke `curl http://localhost:3000/api/bgp/lookup?q=8.8.8.8` returned evidence URLs/timestamps | c282510 | high | trusted
- 2026-02-10 | Add `npm run typecheck` + Vitest unit tests for parsing/normalization | Prevent regressions in query parsing and avoid shipping broken lookup routing | `npm run typecheck`, `npm test` | fadcf35 | high | trusted
- 2026-02-10 | Add GitHub Actions CI workflow for `lint`/`typecheck`/`test`/`build` | Catch regressions on pushes and make CI signals visible | `gh run watch` for workflow `ci` completed successfully | b4dafe7 | high | trusted
- 2026-02-10 | Add bounded upstream fetch cache (TTL) and surface cache hits in evidence | Reduce accidental upstream load while keeping timestamps explicit | Local smoke: two consecutive `curl http://localhost:3011/api/bgp/lookup?q=8.8.8.8` responses showed `sources[].cached: true` on the second call | 2cf2cc2 | medium | trusted
- 2026-02-10 | Add query history + copy/download JSON export | Improve UX and make exporting timestamped evidence a one-click action | `npm run build` succeeded; UI updates in `src/app/bgp/ui.tsx` | aa9fc7e | high | trusted
- 2026-02-10 | Improve IP normalization to accept bracketed IPv6 with port | Make pasted inputs like `[2001:db8::1]:443` work | `npm test` added coverage for this case | 7e06d46 | high | trusted
- 2026-02-10 | De-duplicate “untrusted JSON” traversal and RouteViews parsing helpers into `src/lib/` + add unit tests | Reduce copy/paste parsing drift between API + UI; lock behavior for evidence derivation | `npm run lint && npm run typecheck && npm test && npm run build` | 6ac0506 | high | trusted

## Mistakes And Fixes
- Template: YYYY-MM-DD | Issue | Root cause | Fix | Prevention rule | Commit | Confidence

- 2026-02-11 | `tsc`/build parse failure in `src/app/bgp/ui.tsx` during initial entity-route refactor | Mixed `??` and `||` without explicit grouping in one expression | Wrapped nullish expression in parentheses before fallback OR | During refactors, run `npm run typecheck` before full build and avoid mixing nullish + logical operators without explicit grouping | a73f3b3 | high
- 2026-02-10 | `next build` failed on `/bgp` due to `useSearchParams()` missing a Suspense boundary | App Router CSR bailout requirement not accounted for | Split `/bgp` into a server `page.tsx` that wraps a client component in `<Suspense>` | Always run `npm run build` after adding `useSearchParams` / `usePathname` and wrap client-only hooks behind a Suspense boundary | c282510 | high

## Known Risks

- Upstream API availability/rate limits: RouteViews/RIPEstat are best-effort external services; responses are treated as untrusted.
- Evidence is currently “live fetch” only (no storage), so historical reproducibility depends on upstream caching/retention.

## Next Prioritized Tasks

- Persisted evidence permalinks (store lookup snapshots keyed by query+timestamp).
- Time-travel / diff UX once snapshots exist.
- Fallback provider strategy for prefix/asn lookups when RouteViews is degraded.
- Timeline-style UX for route-change context (origin/peer churn) informed by snapshots.
- Expand entity pages with enrichment panels (WHOIS/RDAP, PeeringDB).

## Verification Evidence
- Template: YYYY-MM-DD | Command | Key output | Status (pass/fail)

- 2026-02-10 | `npm ci` | installed deps, 0 vulnerabilities | pass
- 2026-02-10 | `npm run lint` | eslint exit 0 | pass
- 2026-02-10 | `npm run build` | Next.js build succeeded | pass
- 2026-02-10 | `npm run typecheck` | tsc exit 0 | pass
- 2026-02-10 | `npm test` | vitest: 11 tests passed | pass
- 2026-02-10 | `npm run dev -- --port 3000` + `curl http://localhost:3000/api/bgp/lookup?q=8.8.8.8` | JSON with RouteViews/RIPEstat evidence URLs and timestamps | pass
- 2026-02-10 | `npm run lint && npm run typecheck && npm test && npm run build` | all commands exit 0; vitest 12 tests passed | pass
- 2026-02-10 | `npm run dev -- --port 3011` + `curl http://localhost:3011/api/bgp/lookup?q=8.8.8.8` (twice) | second response contained `sources[].cached: true` | pass
- 2026-02-10 | `gh run watch 21865523458 --exit-status` | CI workflow completed successfully | pass
- 2026-02-10 | `npm run lint && npm run typecheck && npm test && npm run build` | eslint/tsc exit 0; vitest 18 tests passed; Next build succeeded | pass
- 2026-02-11 | `gh issue list --limit 100 --json number,title,author,state,labels,createdAt,updatedAt` | returned `[]` (no open owner/bot issues) | pass
- 2026-02-11 | `gh run list --limit 10 --json databaseId,displayTitle,headBranch,headSha,status,conclusion,event,createdAt,updatedAt,url` | all recent runs on `main` concluded `success` | pass
- 2026-02-11 | `npm run lint` | eslint exit 0 | pass
- 2026-02-11 | `npm run typecheck` | tsc exit 0 | pass
- 2026-02-11 | `npm test` | vitest: 24 tests passed | pass
- 2026-02-11 | `npm run build` | Next.js build succeeded; routes `/`, `/bgp`, `/api/bgp/lookup` emitted | pass
- 2026-02-11 | `BGP_RATE_LIMIT_MAX_REQUESTS=50 npm run dev -- --port 3023` + `curl /api/bgp/lookup?q=8.8.8.8|8.8.8.0/24|AS15169` | returned `kind` values `ip/prefix/asn`, prefix and ASN fields present | pass
- 2026-02-11 | `BGP_RATE_LIMIT_MAX_REQUESTS=2 npm run dev -- --port 3024` + 3x `curl /api/bgp/lookup?q=1.1.1.1` | HTTP sequence `200,200,429`; body included `error=rate limit exceeded` and `retryAfterSec` | pass
- 2026-02-11 | `gh run watch 21893830124 --exit-status` | CI run for commit `627684e` completed successfully (`lint`, `typecheck`, `test`, `build`) | pass
- 2026-02-11 | `gh issue list --limit 100 --json number,title,author,state,labels,createdAt,updatedAt,url` | returned `[]` (no open owner/bot issues) | pass
- 2026-02-11 | `gh run list --limit 20 --json databaseId,displayTitle,headBranch,headSha,status,conclusion,event,createdAt,updatedAt,url` | latest run for `a73f3b3` queued then executed; previous completed runs were `success` | pass
- 2026-02-11 | `npm run lint && npm run typecheck && npm test && npm run build` | all commands exited 0; vitest 29 tests passed; build emitted `/asn/[asn]` and `/prefix/[addr]/[mask]` routes | pass
- 2026-02-11 | `npm run dev -- --port 3036` + `curl /api/bgp/lookup?q=8.8.8.8|8.8.8.0/24|AS15169` | live upstream responses returned `kind=ip/prefix/asn`, source evidence URLs, and `meta` fields | pass
- 2026-02-11 | `npm run dev -- --port 3036` + `curl -o /tmp/asn-page.html -w '%{http_code}' /asn/15169` + `curl -o /tmp/prefix-page.html -w '%{http_code}' /prefix/8.8.8.0/24` | both canonical entity routes returned `200` and rendered route-specific titles/descriptions | pass
- 2026-02-11 | `npm run dev -- --port 3037` + `curl -I /api/bgp/lookup?q=8.8.8.8` | response headers included `x-request-id` and `x-response-time-ms` | pass
- 2026-02-11 | `gh run watch 21894030556 --exit-status` | CI run for commit `a73f3b3` completed successfully (`lint`, `typecheck`, `test`, `build`) | pass
## Historical Summary
- Keep compact summaries of older entries here when file compaction runs.

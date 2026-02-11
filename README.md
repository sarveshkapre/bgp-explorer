# BGP Explorer

Search IP/prefix/ASN and explore ownership and routing context.

See `plan.md` for the full spec and roadmap.

## Run

```bash
npm install
npm run dev
```

Open `http://localhost:3000/bgp` (or `/` which redirects) and try:
- `8.8.8.8` (IP)
- `8.8.8.0/24` (prefix)
- `15169` / `AS15169` (ASN)
- `google` (org name suggestions)

The UI keeps a small local query history and can copy/download the raw JSON evidence.
Structured cards surface origin ASN, RPKI state, top peers/paths, and prefix samples with one-click pivot lookups.
Canonical entity routes are available at `/asn/:asn` and `/prefix/:addr/:mask` (example: `/asn/15169`, `/prefix/8.8.8.0/24`).

## Data sources
- RouteViews API (prefix + ASN lookups, including RPKI state where available)
- RIPEstat Data API (IP to covering prefix, and search suggestions)

Optional: set `BGP_CACHE_TTL_MS` (default `30000`) to cache upstream responses briefly; cache hits are surfaced in the evidence block. Set `0` to disable.
Optional: set `BGP_CACHE_MAX_ENTRIES` (default `256`) to cap in-memory cache size.

API abuse guardrails (best effort, in-memory):
- `BGP_RATE_LIMIT_MAX_REQUESTS` (default `40`)
- `BGP_RATE_LIMIT_WINDOW_MS` (default `10000`)
- `BGP_RATE_LIMIT_MAX_KEYS` (default `2000`)

Observability metadata:
- `/api/bgp/lookup` responses include `meta.requestId`, `meta.durationMs`, `meta.cacheHits`, and `meta.upstreamErrors`.
- Response headers include `X-Request-Id` and `X-Response-Time-Ms`.

## Checks
```bash
npm run lint
npm run typecheck
npm test
npm run build
```

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

## Data sources
- RouteViews API (prefix + ASN lookups, including RPKI state where available)
- RIPEstat Data API (IP to covering prefix, and search suggestions)

Optional: set `BGP_CACHE_TTL_MS` (default `30000`) to cache upstream responses briefly; cache hits are surfaced in the evidence block. Set `0` to disable.

## Checks
```bash
npm run lint
npm run typecheck
npm test
npm run build
```

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

## Data sources
- RouteViews API (prefix + ASN lookups, including RPKI state where available)
- RIPEstat Data API (IP to covering prefix, and search suggestions)

## Checks
```bash
npm run lint
npm run typecheck
npm test
npm run build
```

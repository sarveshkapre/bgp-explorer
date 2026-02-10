# BGP Explorer: plan

BGP/ASN/prefix explorer (bgp.tools-like). This is a data product: the UI is only as good as the datasets and query model.

## Core UX

- Search accepts: IP, prefix, ASN, org name.
- Entity pages:
  - ASN page: announced prefixes, upstreams/downstreams, peers, geo distribution, IRR/RPKI, visibility.
  - Prefix page: origin ASNs, more/less specifics, ROAs, route leak suspicion.
  - IP page: covering prefix, origin ASN, path samples.
- Time travel: changes over time (announcements/withdrawals, origin changes).

## Data needed (target spec)

- BGP RIBs + updates (RouteViews, RIPE RIS).
- IRR data.
- RPKI validated ROAs.
- PeeringDB enrichment.
- WHOIS/RDAP.

## V1 implementation in this repo

- Uses BGPView API via `/api/bgp/lookup` for fast lookups.
- UI shows summary + raw JSON with timestamp and source.

## V2+

- Ingest MRT dumps + live updates.
- Add routing anomaly detection + RPKI posture.
- Add export/API tokens.

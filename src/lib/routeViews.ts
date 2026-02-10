import { asRecord } from "@/lib/json";

function routeViewsFirstEntry(v: unknown): Record<string, unknown> | null {
  if (!Array.isArray(v) || v.length < 1) return null;
  return asRecord(v[0]);
}

export function routeViewsOriginAsn(v: unknown): string | null {
  const r = routeViewsFirstEntry(v);
  if (!r) return null;
  const o = r["origin_asn"];
  if (typeof o === "number" || typeof o === "string") return String(o);
  return null;
}

export function routeViewsRPKIState(v: unknown): string | null {
  const r = routeViewsFirstEntry(v);
  if (!r) return null;
  const s = r["rpki_state"];
  if (typeof s === "string" && s) return s;
  return null;
}

export function routeViewsReportingPeersCount(v: unknown): number | null {
  const r = routeViewsFirstEntry(v);
  if (!r) return null;
  const peers = r["reporting_peers"];
  if (!Array.isArray(peers)) return null;
  return peers.length;
}

export function routeViewsLatestPeerTimestamp(prefixInfo: unknown): string | undefined {
  // RouteViews prefix payload is typically an array with one object containing `reporting_peers[] {timestamp}`.
  if (!Array.isArray(prefixInfo) || prefixInfo.length === 0) return undefined;
  const first = asRecord(prefixInfo[0]);
  const peers = first ? first["reporting_peers"] : undefined;
  if (!Array.isArray(peers)) return undefined;
  let best = "";
  for (const p of peers) {
    const r = asRecord(p);
    const ts = r ? String(r["timestamp"] ?? "") : "";
    if (ts && ts > best) best = ts;
  }
  return best || undefined;
}


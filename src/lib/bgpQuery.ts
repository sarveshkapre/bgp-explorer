import { normalizeIp } from "@/lib/ip";
import { normalizePrefix } from "@/lib/prefix";

export type BgpQueryKind = "ip" | "prefix" | "asn" | "unknown";

function normalizeAsn(raw: string): string | null {
  const q = raw.trim().replace(/^AS\s*/i, "");
  if (!/^[0-9]{1,10}$/.test(q)) return null;
  return q;
}

export function parseBgpQuery(raw: string): { kind: BgpQueryKind; ip?: string; prefix?: string; asn?: string } {
  const q = raw.trim();
  if (!q) return { kind: "unknown" };

  const ip = normalizeIp(q);
  if (ip) return { kind: "ip", ip };

  const prefix = normalizePrefix(q);
  if (prefix) return { kind: "prefix", prefix };

  const asn = normalizeAsn(q);
  if (asn) return { kind: "asn", asn };

  return { kind: "unknown" };
}


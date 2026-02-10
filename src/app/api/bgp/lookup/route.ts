import { NextRequest } from "next/server";
import { normalizeIp } from "@/lib/ip";
import { safeJsonFetch } from "@/lib/safeFetch";

type BgpViewGeneric = Record<string, unknown>;

function isAsn(q: string): boolean {
  return /^[0-9]{1,10}$/.test(q);
}

function isPrefix(q: string): boolean {
  // Minimal CIDR check.
  if (!q.includes("/")) return false;
  const [addr, mask] = q.split("/", 2);
  if (!addr || !mask) return false;
  const m = Number(mask);
  if (!Number.isFinite(m)) return false;
  if (addr.includes(":")) return m >= 0 && m <= 128;
  return m >= 0 && m <= 32;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const raw = (searchParams.get("q") ?? "").trim();
  if (!raw) {
    return Response.json({ error: "missing query parameter q" }, { status: 400 });
  }

  const q = raw.replace(/^AS/i, "");

  let kind: "ip" | "prefix" | "asn" | "unknown" = "unknown";
  let url = "";

  const ip = normalizeIp(q);
  if (ip) {
    kind = "ip";
    url = `https://api.bgpview.io/ip/${encodeURIComponent(ip)}`;
  } else if (isPrefix(q)) {
    kind = "prefix";
    url = `https://api.bgpview.io/prefix/${encodeURIComponent(q)}`;
  } else if (isAsn(q)) {
    kind = "asn";
    url = `https://api.bgpview.io/asn/${encodeURIComponent(q)}`;
  }

  if (kind === "unknown") {
    return Response.json(
      {
        error: "unrecognized query",
        hint: "Try an IP (8.8.8.8), prefix (8.8.8.0/24), or ASN (15169).",
      },
      { status: 400 },
    );
  }

  const res = await safeJsonFetch<BgpViewGeneric>(url, { timeoutMs: 5000 });
  if (!res.ok) {
    return Response.json(
      {
        kind,
        query: raw,
        source: "bgpview.io",
        fetchedAt: res.fetchedAt,
        error: res.error,
        trust: "untrusted",
      },
      { status: 502 },
    );
  }

  return Response.json({
    kind,
    query: raw,
    source: "bgpview.io",
    fetchedAt: res.fetchedAt,
    data: res.value,
    trust: "untrusted",
    notes: ["Data is best-effort external enrichment; treat as approximate."],
  });
}


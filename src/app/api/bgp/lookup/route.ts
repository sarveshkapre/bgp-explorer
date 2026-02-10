import { NextRequest } from "next/server";
import { parseBgpQuery } from "@/lib/bgpQuery";
import { getPath } from "@/lib/json";
import { routeViewsLatestPeerTimestamp } from "@/lib/routeViews";
import { safeJsonFetch } from "@/lib/safeFetch";

type JsonRecord = Record<string, unknown>;

type SourceEvidence = {
  name: "routeviews" | "ripestat";
  url: string;
  fetchedAt: string;
  status?: number;
  ok: boolean;
  upstreamTime?: string;
  cached?: boolean;
  cacheAgeMs?: number;
  error?: string;
};

function routeViewsPrefixUrl(prefix: string): string {
  return `https://api.routeviews.org/prefix/${encodeURIComponent(prefix)}`;
}

function routeViewsAsnUrl(asn: string): string {
  return `https://api.routeviews.org/asn/${encodeURIComponent(asn)}`;
}

function ripeNetworkInfoUrl(resource: string): string {
  return `https://stat.ripe.net/data/network-info/data.json?resource=${encodeURIComponent(resource)}`;
}

function ripeSearchCompleteUrl(resource: string): string {
  return `https://stat.ripe.net/data/searchcomplete/data.json?resource=${encodeURIComponent(resource)}`;
}

function cacheTtlMs(): number {
  const raw = process.env.BGP_CACHE_TTL_MS;
  if (raw === undefined) return 30_000;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.floor(n);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const raw = (searchParams.get("q") ?? "").trim();
  if (!raw) {
    return Response.json({ error: "missing query parameter q" }, { status: 400 });
  }

  const sources: SourceEvidence[] = [];
  const startedAt = new Date().toISOString();
  const ttlMs = cacheTtlMs();

  const parsed = parseBgpQuery(raw);
  const ip = parsed.kind === "ip" ? parsed.ip ?? null : null;
  const prefix = parsed.kind === "prefix" ? parsed.prefix ?? null : null;
  const asn = parsed.kind === "asn" ? parsed.asn ?? null : null;

  if (parsed.kind === "ip" && ip) {
    const netRes = await safeJsonFetch<JsonRecord>(ripeNetworkInfoUrl(ip), { timeoutMs: 8000, cacheTtlMs: ttlMs });
    sources.push({
      name: "ripestat",
      url: netRes.url,
      fetchedAt: netRes.fetchedAt,
      status: netRes.status,
      ok: netRes.ok,
      upstreamTime: netRes.ok ? String(netRes.value["time"] ?? "") : undefined,
      cached: netRes.cached,
      cacheAgeMs: netRes.cacheAgeMs,
      error: netRes.ok ? undefined : netRes.error,
    });
    if (!netRes.ok) {
      return Response.json(
        {
          kind: "ip",
          query: raw,
          fetchedAt: startedAt,
          trust: "untrusted",
          sources,
          error: netRes.error,
        },
        { status: 502 },
      );
    }

    const coveringPrefix = String(get(netRes.value, ["data", "prefix"]) ?? "");
    const asns = get(netRes.value, ["data", "asns"]);
    const asnList = Array.isArray(asns) ? asns.map(String).filter(Boolean) : [];

    let prefixInfo: unknown = null;
    let partial = false;
    if (coveringPrefix) {
      const prefRes = await safeJsonFetch<unknown>(routeViewsPrefixUrl(coveringPrefix), {
        timeoutMs: 8000,
        cacheTtlMs: ttlMs,
      });
      sources.push({
        name: "routeviews",
        url: prefRes.url,
        fetchedAt: prefRes.fetchedAt,
        status: prefRes.status,
        ok: prefRes.ok,
        upstreamTime: prefRes.ok ? routeViewsLatestPeerTimestamp(prefRes.value) : undefined,
        cached: prefRes.cached,
        cacheAgeMs: prefRes.cacheAgeMs,
        error: prefRes.ok ? undefined : prefRes.error,
      });
      if (prefRes.ok) {
        prefixInfo = prefRes.value;
      } else {
        partial = true;
      }
    } else {
      partial = true;
    }

    return Response.json({
      kind: "ip",
      query: raw,
      fetchedAt: startedAt,
      trust: "untrusted",
      sources,
      partial,
      data: {
        ip,
        coveringPrefix: coveringPrefix || null,
        asns: asnList,
        networkInfo: netRes.value,
        coveringPrefixInfo: prefixInfo,
      },
      notes: [
        "External enrichment is best-effort and should be treated as approximate.",
        "Evidence includes upstream URLs and timestamps when available.",
      ],
    });
  }

  if (parsed.kind === "prefix" && prefix) {
    const prefRes = await safeJsonFetch<unknown>(routeViewsPrefixUrl(prefix), { timeoutMs: 8000, cacheTtlMs: ttlMs });
    sources.push({
      name: "routeviews",
      url: prefRes.url,
      fetchedAt: prefRes.fetchedAt,
      status: prefRes.status,
      ok: prefRes.ok,
      upstreamTime: prefRes.ok ? routeViewsLatestPeerTimestamp(prefRes.value) : undefined,
      cached: prefRes.cached,
      cacheAgeMs: prefRes.cacheAgeMs,
      error: prefRes.ok ? undefined : prefRes.error,
    });
    if (!prefRes.ok) {
      return Response.json(
        {
          kind: "prefix",
          query: raw,
          fetchedAt: startedAt,
          trust: "untrusted",
          sources,
          error: prefRes.error,
        },
        { status: 502 },
      );
    }

    return Response.json({
      kind: "prefix",
      query: raw,
      fetchedAt: startedAt,
      trust: "untrusted",
      sources,
      data: {
        prefix,
        prefixInfo: prefRes.value,
      },
      notes: [
        "External enrichment is best-effort and should be treated as approximate.",
        "Evidence includes upstream URLs and timestamps when available.",
      ],
    });
  }

  if (parsed.kind === "asn" && asn) {
    const asnRes = await safeJsonFetch<unknown>(routeViewsAsnUrl(asn), { timeoutMs: 8000, cacheTtlMs: ttlMs });
    sources.push({
      name: "routeviews",
      url: asnRes.url,
      fetchedAt: asnRes.fetchedAt,
      status: asnRes.status,
      ok: asnRes.ok,
      cached: asnRes.cached,
      cacheAgeMs: asnRes.cacheAgeMs,
      error: asnRes.ok ? undefined : asnRes.error,
    });
    if (!asnRes.ok) {
      return Response.json(
        {
          kind: "asn",
          query: raw,
          fetchedAt: startedAt,
          trust: "untrusted",
          sources,
          error: asnRes.error,
        },
        { status: 502 },
      );
    }

    const prefixes = Array.isArray(asnRes.value) ? asnRes.value.map(String).filter(Boolean) : [];

    return Response.json({
      kind: "asn",
      query: raw,
      fetchedAt: startedAt,
      trust: "untrusted",
      sources,
      data: {
        asn,
        prefixes,
        prefixCount: prefixes.length,
        prefixSample: prefixes.slice(0, 25),
      },
      notes: [
        "External enrichment is best-effort and should be treated as approximate.",
        "Evidence includes upstream URLs and timestamps when available.",
      ],
    });
  }

  // Fallback: try search completion for org-name / ambiguous queries.
  const searchRes = await safeJsonFetch<JsonRecord>(ripeSearchCompleteUrl(raw), { timeoutMs: 8000, cacheTtlMs: ttlMs });
  sources.push({
    name: "ripestat",
    url: searchRes.url,
    fetchedAt: searchRes.fetchedAt,
    status: searchRes.status,
    ok: searchRes.ok,
    upstreamTime: searchRes.ok ? String(searchRes.value["time"] ?? "") : undefined,
    cached: searchRes.cached,
    cacheAgeMs: searchRes.cacheAgeMs,
    error: searchRes.ok ? undefined : searchRes.error,
  });
  if (!searchRes.ok) {
    return Response.json(
      {
        error: "unrecognized query",
        hint: "Try an IP (8.8.8.8), prefix (8.8.8.0/24), ASN (15169), or an org name (google).",
        fetchedAt: startedAt,
        trust: "untrusted",
        sources,
      },
      { status: 400 },
    );
  }

  return Response.json({
    kind: "search",
    query: raw,
    fetchedAt: startedAt,
    trust: "untrusted",
    sources,
    data: {
      search: searchRes.value,
    },
    notes: [
      "Search results are suggestions; click an item to run an exact lookup.",
      "External enrichment is best-effort and should be treated as approximate.",
    ],
  });
}

const get = getPath;

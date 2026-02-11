import { NextRequest } from "next/server";
import { parseBgpQuery } from "@/lib/bgpQuery";
import { getPath } from "@/lib/json";
import { normalizeIp } from "@/lib/ip";
import { consumeRateLimit } from "@/lib/rateLimit";
import { routeViewsLatestPeerTimestamp } from "@/lib/routeViews";
import { safeJsonFetch, type SafeFetchResult } from "@/lib/safeFetch";

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

const get = getPath;
const UPSTREAM_TIMEOUT_MS = 8000;
const LOOKUP_NOTES = [
  "External enrichment is best-effort and should be treated as approximate.",
  "Evidence includes upstream URLs and timestamps when available.",
];
const SEARCH_NOTES = [
  "Search results are suggestions; click an item to run an exact lookup.",
  "External enrichment is best-effort and should be treated as approximate.",
];

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

function readPositiveEnvInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(n);
}

function cacheTtlMs(): number {
  const raw = process.env.BGP_CACHE_TTL_MS;
  if (raw === undefined) return 30_000;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.floor(n);
}

function cacheMaxEntries(): number {
  return readPositiveEnvInt("BGP_CACHE_MAX_ENTRIES", 256);
}

function rateLimitWindowMs(): number {
  return readPositiveEnvInt("BGP_RATE_LIMIT_WINDOW_MS", 10_000);
}

function rateLimitMaxRequests(): number {
  return readPositiveEnvInt("BGP_RATE_LIMIT_MAX_REQUESTS", 40);
}

function rateLimitMaxKeys(): number {
  return readPositiveEnvInt("BGP_RATE_LIMIT_MAX_KEYS", 2_000);
}

function pushSourceEvidence<T>(
  sources: SourceEvidence[],
  name: SourceEvidence["name"],
  result: SafeFetchResult<T>,
  upstreamTime?: string,
) {
  sources.push({
    name,
    url: result.url,
    fetchedAt: result.fetchedAt,
    status: result.status,
    ok: result.ok,
    upstreamTime,
    cached: result.cached,
    cacheAgeMs: result.cacheAgeMs,
    error: result.ok ? undefined : result.error,
  });
}

function buildFetchOptions(cacheTtlMs: number, cacheMaxEntries: number) {
  return {
    timeoutMs: UPSTREAM_TIMEOUT_MS,
    cacheTtlMs,
    cacheMaxEntries,
  };
}

function sourceUpstreamTime(result: SafeFetchResult<JsonRecord>): string | undefined {
  if (!result.ok) return undefined;
  return String(result.value["time"] ?? "");
}

function clientRateLimitKey(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  const ip = normalizeIp(forwarded) ?? normalizeIp(realIp) ?? "anon";
  return `ip:${ip}`;
}

export async function GET(req: NextRequest) {
  const startedAtMs = Date.now();
  const startedAt = new Date(startedAtMs).toISOString();
  const requestId = crypto.randomUUID();
  const sources: SourceEvidence[] = [];

  function responseMeta() {
    return {
      requestId,
      durationMs: Math.max(0, Date.now() - startedAtMs),
      upstreamErrors: sources.filter((s) => !s.ok).length,
      cacheHits: sources.filter((s) => Boolean(s.cached)).length,
    };
  }

  function jsonResponse(payload: Record<string, unknown>, init?: ResponseInit) {
    const headers = new Headers(init?.headers);
    headers.set("X-Request-Id", requestId);
    headers.set("X-Response-Time-Ms", String(Math.max(0, Date.now() - startedAtMs)));
    return Response.json({ ...payload, meta: responseMeta() }, { ...init, headers });
  }

  const rateLimit = consumeRateLimit(clientRateLimitKey(req), {
    windowMs: rateLimitWindowMs(),
    maxRequests: rateLimitMaxRequests(),
    maxKeys: rateLimitMaxKeys(),
  });
  if (!rateLimit.allowed) {
    const headers = new Headers();
    if (rateLimit.retryAfterSec) {
      headers.set("Retry-After", String(rateLimit.retryAfterSec));
    }
    return jsonResponse(
      {
        error: "rate limit exceeded",
        hint: "Please retry shortly; lookup requests are rate-limited to protect upstream data providers.",
        fetchedAt: startedAt,
        trust: "trusted",
        rateLimit,
      },
      { status: 429, headers },
    );
  }

  const { searchParams } = new URL(req.url);
  const raw = (searchParams.get("q") ?? "").trim();
  if (!raw) {
    return jsonResponse(
      {
        error: "missing query parameter q",
        fetchedAt: startedAt,
        trust: "trusted",
        rateLimit,
      },
      { status: 400 },
    );
  }

  const ttlMs = cacheTtlMs();
  const maxEntries = cacheMaxEntries();
  const fetchOptions = buildFetchOptions(ttlMs, maxEntries);

  const parsed = parseBgpQuery(raw);
  const ip = parsed.kind === "ip" ? parsed.ip ?? null : null;
  const prefix = parsed.kind === "prefix" ? parsed.prefix ?? null : null;
  const asn = parsed.kind === "asn" ? parsed.asn ?? null : null;

  if (parsed.kind === "ip" && ip) {
    const netRes = await safeJsonFetch<JsonRecord>(ripeNetworkInfoUrl(ip), fetchOptions);
    pushSourceEvidence(sources, "ripestat", netRes, sourceUpstreamTime(netRes));
    if (!netRes.ok) {
      return jsonResponse(
        {
          kind: "ip",
          query: raw,
          fetchedAt: startedAt,
          trust: "untrusted",
          rateLimit,
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
      const prefRes = await safeJsonFetch<unknown>(routeViewsPrefixUrl(coveringPrefix), fetchOptions);
      pushSourceEvidence(
        sources,
        "routeviews",
        prefRes,
        prefRes.ok ? routeViewsLatestPeerTimestamp(prefRes.value) : undefined,
      );
      if (prefRes.ok) {
        prefixInfo = prefRes.value;
      } else {
        partial = true;
      }
    } else {
      partial = true;
    }

    return jsonResponse({
      kind: "ip",
      query: raw,
      fetchedAt: startedAt,
      trust: "untrusted",
      rateLimit,
      sources,
      partial,
      data: {
        ip,
        coveringPrefix: coveringPrefix || null,
        asns: asnList,
        networkInfo: netRes.value,
        coveringPrefixInfo: prefixInfo,
      },
      notes: LOOKUP_NOTES,
    });
  }

  if (parsed.kind === "prefix" && prefix) {
    const prefRes = await safeJsonFetch<unknown>(routeViewsPrefixUrl(prefix), fetchOptions);
    pushSourceEvidence(sources, "routeviews", prefRes, prefRes.ok ? routeViewsLatestPeerTimestamp(prefRes.value) : undefined);
    if (!prefRes.ok) {
      return jsonResponse(
        {
          kind: "prefix",
          query: raw,
          fetchedAt: startedAt,
          trust: "untrusted",
          rateLimit,
          sources,
          error: prefRes.error,
        },
        { status: 502 },
      );
    }

    return jsonResponse({
      kind: "prefix",
      query: raw,
      fetchedAt: startedAt,
      trust: "untrusted",
      rateLimit,
      sources,
      data: {
        prefix,
        prefixInfo: prefRes.value,
      },
      notes: LOOKUP_NOTES,
    });
  }

  if (parsed.kind === "asn" && asn) {
    const asnRes = await safeJsonFetch<unknown>(routeViewsAsnUrl(asn), fetchOptions);
    pushSourceEvidence(sources, "routeviews", asnRes);
    if (!asnRes.ok) {
      return jsonResponse(
        {
          kind: "asn",
          query: raw,
          fetchedAt: startedAt,
          trust: "untrusted",
          rateLimit,
          sources,
          error: asnRes.error,
        },
        { status: 502 },
      );
    }

    const prefixes = Array.isArray(asnRes.value) ? asnRes.value.map(String).filter(Boolean) : [];

    return jsonResponse({
      kind: "asn",
      query: raw,
      fetchedAt: startedAt,
      trust: "untrusted",
      rateLimit,
      sources,
      data: {
        asn,
        prefixes,
        prefixCount: prefixes.length,
        prefixSample: prefixes.slice(0, 25),
      },
      notes: LOOKUP_NOTES,
    });
  }

  // Fallback: try search completion for org-name / ambiguous queries.
  const searchRes = await safeJsonFetch<JsonRecord>(ripeSearchCompleteUrl(raw), fetchOptions);
  pushSourceEvidence(sources, "ripestat", searchRes, sourceUpstreamTime(searchRes));
  if (!searchRes.ok) {
    return jsonResponse(
      {
        error: "unrecognized query",
        hint: "Try an IP (8.8.8.8), prefix (8.8.8.0/24), ASN (15169), or an org name (google).",
        fetchedAt: startedAt,
        trust: "untrusted",
        rateLimit,
        sources,
      },
      { status: 400 },
    );
  }

  return jsonResponse({
    kind: "search",
    query: raw,
    fetchedAt: startedAt,
    trust: "untrusted",
    rateLimit,
    sources,
    data: {
      search: searchRes.value,
    },
    notes: SEARCH_NOTES,
  });
}

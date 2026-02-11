import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
import { GET } from "./route";
import { __resetRateLimitState } from "@/lib/rateLimit";

type JsonBody = Record<string, unknown>;

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function req(q: string, ip = "198.51.100.10"): NextRequest {
  return new Request(`http://localhost:3000/api/bgp/lookup?q=${encodeURIComponent(q)}`, {
    headers: {
      "x-forwarded-for": ip,
    },
  }) as NextRequest;
}

async function readJson(res: Response): Promise<JsonBody> {
  return (await res.json()) as JsonBody;
}

describe("/api/bgp/lookup contract", () => {
  const oldEnv = {
    cacheTtl: process.env.BGP_CACHE_TTL_MS,
    cacheMaxEntries: process.env.BGP_CACHE_MAX_ENTRIES,
    rateMax: process.env.BGP_RATE_LIMIT_MAX_REQUESTS,
    rateWindow: process.env.BGP_RATE_LIMIT_WINDOW_MS,
    rateMaxKeys: process.env.BGP_RATE_LIMIT_MAX_KEYS,
  };

  beforeEach(() => {
    __resetRateLimitState();
    process.env.BGP_CACHE_TTL_MS = "0";
    process.env.BGP_CACHE_MAX_ENTRIES = "256";
    process.env.BGP_RATE_LIMIT_MAX_REQUESTS = "100";
    process.env.BGP_RATE_LIMIT_WINDOW_MS = "60000";
    process.env.BGP_RATE_LIMIT_MAX_KEYS = "2000";
  });

  afterEach(() => {
    __resetRateLimitState();
    vi.unstubAllGlobals();
    if (oldEnv.cacheTtl === undefined) delete process.env.BGP_CACHE_TTL_MS;
    else process.env.BGP_CACHE_TTL_MS = oldEnv.cacheTtl;
    if (oldEnv.cacheMaxEntries === undefined) delete process.env.BGP_CACHE_MAX_ENTRIES;
    else process.env.BGP_CACHE_MAX_ENTRIES = oldEnv.cacheMaxEntries;
    if (oldEnv.rateMax === undefined) delete process.env.BGP_RATE_LIMIT_MAX_REQUESTS;
    else process.env.BGP_RATE_LIMIT_MAX_REQUESTS = oldEnv.rateMax;
    if (oldEnv.rateWindow === undefined) delete process.env.BGP_RATE_LIMIT_WINDOW_MS;
    else process.env.BGP_RATE_LIMIT_WINDOW_MS = oldEnv.rateWindow;
    if (oldEnv.rateMaxKeys === undefined) delete process.env.BGP_RATE_LIMIT_MAX_KEYS;
    else process.env.BGP_RATE_LIMIT_MAX_KEYS = oldEnv.rateMaxKeys;
  });

  it("returns ip lookup payload and observability metadata", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("network-info")) {
        return jsonResponse({
          time: "2026-02-11T00:00:00Z",
          data: { prefix: "8.8.8.0/24", asns: [15169] },
        });
      }
      if (url.includes("/prefix/8.8.8.0%2F24")) {
        return jsonResponse([
          {
            origin_asn: 15169,
            rpki_state: "valid",
            reporting_peers: [{ timestamp: "2026-02-11T01:02:03Z", peer_asn: 3356 }],
          },
        ]);
      }
      throw new Error(`unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const res = await GET(req("8.8.8.8"));
    const body = await readJson(res);

    expect(res.status).toBe(200);
    expect(body["kind"]).toBe("ip");
    expect(body["query"]).toBe("8.8.8.8");
    expect(((body["data"] as JsonBody)["coveringPrefix"] as string) ?? "").toBe("8.8.8.0/24");
    expect((body["sources"] as unknown[]).length).toBe(2);

    const meta = body["meta"] as JsonBody;
    expect(typeof meta["requestId"]).toBe("string");
    expect(typeof meta["durationMs"]).toBe("number");
    expect(meta["upstreamErrors"]).toBe(0);
    expect(meta["cacheHits"]).toBe(0);
    expect(res.headers.get("X-Request-Id")).toBe(String(meta["requestId"]));
    expect(Number(res.headers.get("X-Response-Time-Ms"))).toBeGreaterThanOrEqual(0);
  });

  it("returns prefix lookup payload", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/prefix/8.8.8.0%2F24")) {
        return jsonResponse([
          {
            origin_asn: 15169,
            rpki_state: "valid",
            reporting_peers: [{ timestamp: "2026-02-11T02:00:00Z" }],
          },
        ]);
      }
      throw new Error(`unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const res = await GET(req("8.8.8.0/24"));
    const body = await readJson(res);

    expect(res.status).toBe(200);
    expect(body["kind"]).toBe("prefix");
    expect(((body["data"] as JsonBody)["prefix"] as string) ?? "").toBe("8.8.8.0/24");
    expect((body["sources"] as unknown[]).length).toBe(1);
  });

  it("returns asn lookup payload", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/asn/15169")) {
        return jsonResponse(["8.8.4.0/24", "8.8.8.0/24"]);
      }
      throw new Error(`unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const res = await GET(req("AS15169"));
    const body = await readJson(res);

    expect(res.status).toBe(200);
    expect(body["kind"]).toBe("asn");
    expect(((body["data"] as JsonBody)["asn"] as string) ?? "").toBe("15169");
    expect(((body["data"] as JsonBody)["prefixCount"] as number) ?? -1).toBe(2);
  });

  it("falls back to search suggestions for non-exact input", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("searchcomplete")) {
        return jsonResponse({
          time: "2026-02-11T03:00:00Z",
          data: {
            categories: [
              {
                category: "ASNs",
                suggestions: [{ value: "15169", label: "AS15169 Google" }],
              },
            ],
          },
        });
      }
      throw new Error(`unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const res = await GET(req("google"));
    const body = await readJson(res);

    expect(res.status).toBe(200);
    expect(body["kind"]).toBe("search");
    expect(body["query"]).toBe("google");
  });

  it("returns 502 with source evidence when upstream lookup fails", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/prefix/203.0.113.0%2F24")) {
        return jsonResponse({ message: "upstream down" }, 503);
      }
      throw new Error(`unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const res = await GET(req("203.0.113.0/24"));
    const body = await readJson(res);

    expect(res.status).toBe(502);
    expect(body["kind"]).toBe("prefix");
    expect(body["error"]).toBe("HTTP 503");
    const meta = body["meta"] as JsonBody;
    expect(meta["upstreamErrors"]).toBe(1);
  });

  it("falls back to safe defaults when numeric env config is invalid", async () => {
    process.env.BGP_CACHE_TTL_MS = "-1";
    process.env.BGP_CACHE_MAX_ENTRIES = "NaN";
    process.env.BGP_RATE_LIMIT_MAX_REQUESTS = "wat";
    process.env.BGP_RATE_LIMIT_WINDOW_MS = "0";
    process.env.BGP_RATE_LIMIT_MAX_KEYS = "nope";

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/prefix/8.8.8.0%2F24")) {
        return jsonResponse([{ origin_asn: 15169 }]);
      }
      throw new Error(`unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const res = await GET(req("8.8.8.0/24"));
    const body = await readJson(res);
    const rateLimit = body["rateLimit"] as JsonBody;

    expect(res.status).toBe(200);
    expect(rateLimit["limit"]).toBe(40);
    expect(rateLimit["windowMs"]).toBe(10_000);
  });
});

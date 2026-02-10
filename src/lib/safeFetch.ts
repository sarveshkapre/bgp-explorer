export type SafeFetchResult<T> =
  | {
      ok: true;
      value: T;
      fetchedAt: string;
      url: string;
      status: number;
      cached?: boolean;
      cacheAgeMs?: number;
    }
  | {
      ok: false;
      error: string;
      fetchedAt: string;
      url: string;
      status?: number;
      cached?: boolean;
      cacheAgeMs?: number;
    };

type CacheEntry = {
  storedAtMs: number;
  fetchedAt: string;
  status: number;
  value: unknown;
};

function getGlobalCache(): Map<string, CacheEntry> {
  const g = globalThis as unknown as { __bgpSafeFetchCache?: Map<string, CacheEntry> };
  if (!g.__bgpSafeFetchCache) g.__bgpSafeFetchCache = new Map();
  return g.__bgpSafeFetchCache;
}

export async function safeJsonFetch<T>(
  url: string,
  opts?: {
    timeoutMs?: number;
    headers?: Record<string, string>;
    cacheTtlMs?: number;
  },
): Promise<SafeFetchResult<T>> {
  const fetchedAt = new Date().toISOString();
  const cacheTtlMs = Number(opts?.cacheTtlMs ?? 0);
  const shouldCache = Number.isFinite(cacheTtlMs) && cacheTtlMs > 0;
  const nowMs = Date.now();
  const cache = shouldCache ? getGlobalCache() : null;

  if (cache) {
    const hit = cache.get(url);
    if (hit && nowMs - hit.storedAtMs < cacheTtlMs) {
      return {
        ok: true,
        value: hit.value as T,
        fetchedAt: hit.fetchedAt,
        url,
        status: hit.status,
        cached: true,
        cacheAgeMs: nowMs - hit.storedAtMs,
      };
    }
  }

  const controller = new AbortController();
  const timeoutMs = opts?.timeoutMs ?? 5000;
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: opts?.headers,
      // Never send cookies/credentials to third parties from server routes.
      credentials: "omit",
      cache: "no-store",
    });
    const status = res.status;
    if (!res.ok) {
      return { ok: false, error: `HTTP ${status}`, fetchedAt, url, status };
    }
    const json = (await res.json()) as T;
    if (cache) {
      cache.set(url, { storedAtMs: Date.now(), fetchedAt, status, value: json });
    }
    return { ok: true, value: json, fetchedAt, url, status };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg, fetchedAt, url };
  } finally {
    clearTimeout(t);
  }
}

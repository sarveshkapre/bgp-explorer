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
  lastAccessedMs: number;
  fetchedAt: string;
  status: number;
  value: unknown;
};

function getGlobalCache(): Map<string, CacheEntry> {
  const g = globalThis as unknown as { __bgpSafeFetchCache?: Map<string, CacheEntry> };
  if (!g.__bgpSafeFetchCache) g.__bgpSafeFetchCache = new Map();
  return g.__bgpSafeFetchCache;
}

function clampPositiveInt(v: number, fallback: number): number {
  if (!Number.isFinite(v) || v <= 0) return fallback;
  return Math.floor(v);
}

function defaultCacheMaxEntries(): number {
  return clampPositiveInt(Number(process.env.BGP_CACHE_MAX_ENTRIES ?? 256), 256);
}

function pruneCache(cache: Map<string, CacheEntry>, nowMs: number, cacheTtlMs: number, maxEntries: number) {
  // Drop expired entries first when TTL is active.
  if (cacheTtlMs > 0) {
    for (const [k, entry] of cache.entries()) {
      if (nowMs - entry.storedAtMs >= cacheTtlMs) cache.delete(k);
    }
  }

  if (cache.size <= maxEntries) return;

  // If still oversized, evict least recently accessed entries.
  const ordered = [...cache.entries()].sort((a, b) => a[1].lastAccessedMs - b[1].lastAccessedMs);
  const overflow = cache.size - maxEntries;
  for (let i = 0; i < overflow; i += 1) {
    const key = ordered[i]?.[0];
    if (key) cache.delete(key);
  }
}

export async function safeJsonFetch<T>(
  url: string,
  opts?: {
    timeoutMs?: number;
    headers?: Record<string, string>;
    cacheTtlMs?: number;
    cacheMaxEntries?: number;
  },
): Promise<SafeFetchResult<T>> {
  const fetchedAt = new Date().toISOString();
  const cacheTtlMs = Number(opts?.cacheTtlMs ?? 0);
  const shouldCache = Number.isFinite(cacheTtlMs) && cacheTtlMs > 0;
  const cacheMaxEntries = clampPositiveInt(Number(opts?.cacheMaxEntries ?? defaultCacheMaxEntries()), 256);
  const nowMs = Date.now();
  const cache = shouldCache ? getGlobalCache() : null;

  if (cache) {
    pruneCache(cache, nowMs, cacheTtlMs, cacheMaxEntries);
    const hit = cache.get(url);
    if (hit && nowMs - hit.storedAtMs < cacheTtlMs) {
      hit.lastAccessedMs = nowMs;
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
      const storedAtMs = Date.now();
      cache.set(url, { storedAtMs, lastAccessedMs: storedAtMs, fetchedAt, status, value: json });
      pruneCache(cache, storedAtMs, cacheTtlMs, cacheMaxEntries);
    }
    return { ok: true, value: json, fetchedAt, url, status };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg, fetchedAt, url };
  } finally {
    clearTimeout(t);
  }
}

export function __resetSafeFetchCache() {
  getGlobalCache().clear();
}

type RateLimitEntry = {
  windowStartMs: number;
  count: number;
  lastSeenMs: number;
};

export type RateLimitDecision = {
  allowed: boolean;
  limit: number;
  remaining: number;
  windowMs: number;
  retryAfterSec?: number;
  resetAt: string;
};

function getGlobalRateLimitMap(): Map<string, RateLimitEntry> {
  const g = globalThis as unknown as { __bgpRateLimit?: Map<string, RateLimitEntry> };
  if (!g.__bgpRateLimit) g.__bgpRateLimit = new Map();
  return g.__bgpRateLimit;
}

function clampPositiveInt(v: number, fallback: number): number {
  if (!Number.isFinite(v) || v <= 0) return fallback;
  return Math.floor(v);
}

function pruneRateLimitMap(map: Map<string, RateLimitEntry>, nowMs: number, windowMs: number, maxKeys: number) {
  // Drop stale keys first.
  for (const [key, entry] of map.entries()) {
    if (nowMs - entry.lastSeenMs > windowMs * 2) {
      map.delete(key);
    }
  }

  if (map.size <= maxKeys) return;

  // If still over capacity, drop least recently seen keys.
  const byAge = [...map.entries()].sort((a, b) => a[1].lastSeenMs - b[1].lastSeenMs);
  const overflow = map.size - maxKeys;
  for (let i = 0; i < overflow; i += 1) {
    const k = byAge[i]?.[0];
    if (k) map.delete(k);
  }
}

export function consumeRateLimit(
  key: string,
  opts?: {
    windowMs?: number;
    maxRequests?: number;
    maxKeys?: number;
    nowMs?: number;
  },
): RateLimitDecision {
  const map = getGlobalRateLimitMap();
  const windowMs = clampPositiveInt(Number(opts?.windowMs ?? 10_000), 10_000);
  const maxRequests = clampPositiveInt(Number(opts?.maxRequests ?? 40), 40);
  const maxKeys = clampPositiveInt(Number(opts?.maxKeys ?? 2_000), 2_000);
  const nowMs = clampPositiveInt(Number(opts?.nowMs ?? Date.now()), Date.now());
  const rateLimitKey = key.trim() || "anon";

  pruneRateLimitMap(map, nowMs, windowMs, maxKeys);

  const existing = map.get(rateLimitKey);
  const needsReset = !existing || nowMs - existing.windowStartMs >= windowMs;
  const next: RateLimitEntry = needsReset
    ? { windowStartMs: nowMs, count: 1, lastSeenMs: nowMs }
    : {
        windowStartMs: existing.windowStartMs,
        count: existing.count + 1,
        lastSeenMs: nowMs,
      };

  map.set(rateLimitKey, next);

  const resetAtMs = next.windowStartMs + windowMs;
  if (next.count > maxRequests) {
    const retryAfterSec = Math.max(1, Math.ceil((resetAtMs - nowMs) / 1000));
    return {
      allowed: false,
      limit: maxRequests,
      remaining: 0,
      windowMs,
      retryAfterSec,
      resetAt: new Date(resetAtMs).toISOString(),
    };
  }

  return {
    allowed: true,
    limit: maxRequests,
    remaining: Math.max(0, maxRequests - next.count),
    windowMs,
    resetAt: new Date(resetAtMs).toISOString(),
  };
}

export function __resetRateLimitState() {
  getGlobalRateLimitMap().clear();
}

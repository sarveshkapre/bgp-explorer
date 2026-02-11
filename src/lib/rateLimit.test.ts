import { afterEach, describe, expect, it } from "vitest";
import { __resetRateLimitState, consumeRateLimit } from "./rateLimit";

describe("consumeRateLimit", () => {
  afterEach(() => {
    __resetRateLimitState();
  });

  it("allows requests until the configured limit then blocks", () => {
    const opts = { windowMs: 1_000, maxRequests: 2, maxKeys: 10, nowMs: 100 };

    const first = consumeRateLimit("ip:1.2.3.4", opts);
    const second = consumeRateLimit("ip:1.2.3.4", opts);
    const third = consumeRateLimit("ip:1.2.3.4", opts);

    expect(first.allowed).toBe(true);
    expect(first.remaining).toBe(1);
    expect(second.allowed).toBe(true);
    expect(second.remaining).toBe(0);
    expect(third.allowed).toBe(false);
    expect(third.retryAfterSec).toBe(1);
  });

  it("resets counters after the window elapses", () => {
    const base = { windowMs: 1_000, maxRequests: 1, maxKeys: 10 };
    const first = consumeRateLimit("ip:8.8.8.8", { ...base, nowMs: 5_000 });
    const blocked = consumeRateLimit("ip:8.8.8.8", { ...base, nowMs: 5_500 });
    const nextWindow = consumeRateLimit("ip:8.8.8.8", { ...base, nowMs: 6_050 });

    expect(first.allowed).toBe(true);
    expect(blocked.allowed).toBe(false);
    expect(nextWindow.allowed).toBe(true);
    expect(nextWindow.remaining).toBe(0);
  });

  it("evicts old keys when maxKeys is exceeded", () => {
    const base = { windowMs: 60_000, maxRequests: 2, maxKeys: 2 };
    consumeRateLimit("ip:a", { ...base, nowMs: 100 });
    consumeRateLimit("ip:b", { ...base, nowMs: 200 });
    consumeRateLimit("ip:c", { ...base, nowMs: 300 });

    // "ip:a" should have been evicted and starts fresh.
    const afterEviction = consumeRateLimit("ip:a", { ...base, nowMs: 400 });
    expect(afterEviction.allowed).toBe(true);
    expect(afterEviction.remaining).toBe(1);
  });
});

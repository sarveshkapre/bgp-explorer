import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { __resetSafeFetchCache, safeJsonFetch } from "./safeFetch";

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("safeJsonFetch cache behavior", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-11T00:00:00.000Z"));
    __resetSafeFetchCache();
  });

  afterEach(() => {
    __resetSafeFetchCache();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("serves cached responses inside TTL", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ value: 1 }));
    vi.stubGlobal("fetch", fetchMock);

    const first = await safeJsonFetch<{ value: number }>("https://example.test/a", {
      cacheTtlMs: 2_000,
      cacheMaxEntries: 8,
    });
    vi.setSystemTime(new Date("2026-02-11T00:00:00.900Z"));
    const second = await safeJsonFetch<{ value: number }>("https://example.test/a", {
      cacheTtlMs: 2_000,
      cacheMaxEntries: 8,
    });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(second.cached).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("evicts least-recently-used entries when cache reaches max size", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ id: "a" }))
      .mockResolvedValueOnce(jsonResponse({ id: "b" }))
      .mockResolvedValueOnce(jsonResponse({ id: "c" }))
      .mockResolvedValueOnce(jsonResponse({ id: "a-again" }));
    vi.stubGlobal("fetch", fetchMock);

    await safeJsonFetch("https://example.test/a", { cacheTtlMs: 60_000, cacheMaxEntries: 2 });
    await safeJsonFetch("https://example.test/b", { cacheTtlMs: 60_000, cacheMaxEntries: 2 });
    await safeJsonFetch("https://example.test/c", { cacheTtlMs: 60_000, cacheMaxEntries: 2 });
    const aAgain = await safeJsonFetch<{ id: string }>("https://example.test/a", {
      cacheTtlMs: 60_000,
      cacheMaxEntries: 2,
    });

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(aAgain.ok).toBe(true);
    if (aAgain.ok) expect(aAgain.value.id).toBe("a-again");
  });
});

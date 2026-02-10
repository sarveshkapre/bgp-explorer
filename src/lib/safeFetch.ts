export type SafeFetchResult<T> =
  | { ok: true; value: T; fetchedAt: string; url: string; status: number }
  | { ok: false; error: string; fetchedAt: string; url: string; status?: number };

export async function safeJsonFetch<T>(
  url: string,
  opts?: {
    timeoutMs?: number;
    headers?: Record<string, string>;
  },
): Promise<SafeFetchResult<T>> {
  const fetchedAt = new Date().toISOString();
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
    return { ok: true, value: json, fetchedAt, url, status };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg, fetchedAt, url };
  } finally {
    clearTimeout(t);
  }
}

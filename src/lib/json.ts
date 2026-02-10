export type JsonRecord = Record<string, unknown>;

export function asRecord(v: unknown): JsonRecord | null {
  // Intentionally treats arrays as objects, matching prior inlined helpers.
  if (!v || typeof v !== "object") return null;
  return v as JsonRecord;
}

export function getPath(v: unknown, path: string[]): unknown {
  let cur: unknown = v;
  for (const p of path) {
    const r = asRecord(cur);
    if (!r) return undefined;
    cur = r[p];
  }
  return cur;
}


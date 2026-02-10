"use client";

import { useMemo, useState } from "react";

type LookupResponse = Record<string, unknown>;

function prettyJson(v: unknown) {
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

export default function BgpPage() {
  const [q, setQ] = useState("8.8.8.8");
  const [data, setData] = useState<LookupResponse | null>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    setErr("");
    setData(null);
    try {
      const res = await fetch(`/api/bgp/lookup?q=${encodeURIComponent(q.trim())}`, { cache: "no-store" });
      const json = (await res.json()) as LookupResponse;
      if (!res.ok) {
        throw new Error((json["error"] as string) || `HTTP ${res.status}`);
      }
      setData(json);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const summary = useMemo(() => summarizeBgpView(data), [data]);

  return (
    <div className="grid gap-6">
      <header className="grid gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-white">BGP Explorer</h1>
        <p className="max-w-3xl text-sm leading-6 text-white/65">
          Search an IP, prefix (CIDR), or ASN. Data is best-effort external enrichment and should be treated
          as approximate.
        </p>
      </header>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5 ring-1 ring-white/10">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <input
            className="w-full rounded-xl border border-white/15 bg-black/20 px-4 py-3 text-sm text-white/90 outline-none placeholder:text-white/35 focus:border-sky-300/40"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="8.8.8.8 | 8.8.8.0/24 | 15169"
          />
          <button
            className="shrink-0 rounded-xl bg-sky-400/20 px-4 py-3 text-sm font-semibold text-sky-100 ring-1 ring-sky-300/30 hover:bg-sky-400/25 disabled:opacity-50"
            onClick={() => void run()}
            disabled={loading || !q.trim()}
          >
            {loading ? "Searching…" : "Lookup"}
          </button>
        </div>
        {err ? (
          <div className="mt-3 rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200">
            {err}
          </div>
        ) : null}
      </section>

      {summary ? (
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Panel title="Summary">
            <div className="grid gap-2 text-sm text-white/75">
              {summary.items.map((it) => (
                <div key={it.k} className="flex items-start justify-between gap-4">
                  <div className="text-white/55">{it.k}</div>
                  <div className="text-right font-mono text-xs text-white/85">{it.v}</div>
                </div>
              ))}
            </div>
          </Panel>
          <Panel title="Notes">
            <ul className="list-disc space-y-1 pl-5 text-sm text-white/65">
              <li>Every result includes a timestamp.</li>
              <li>Future v2: real time travel, anomalies, RPKI posture, and evidence links.</li>
            </ul>
          </Panel>
        </section>
      ) : null}

      {data ? (
        <section className="rounded-2xl border border-white/10 bg-white/5 p-5 ring-1 ring-white/10">
          <div className="text-sm font-semibold text-white/90">Raw result</div>
          <pre className="mt-3 max-h-[520px] overflow-auto rounded-xl bg-black/30 p-4 text-xs leading-5 text-white/80 ring-1 ring-white/10">
            {prettyJson(data)}
          </pre>
        </section>
      ) : null}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 ring-1 ring-white/10">
      <div className="text-sm font-semibold text-white/90">{title}</div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function summarizeBgpView(data: LookupResponse | null) {
  if (!data) return null;
  const kind = String(data["kind"] ?? "");
  const fetchedAt = String(data["fetchedAt"] ?? "");
  const d = data["data"];

  const items: Array<{ k: string; v: string }> = [
    { k: "kind", v: kind || "-" },
    { k: "source", v: String(data["source"] ?? "-") },
    { k: "fetchedAt", v: fetchedAt || "-" },
  ];

  if (kind === "ip") {
    items.push({ k: "prefix", v: String(get(d, ["data", "prefix"]) ?? "-") });
    items.push({ k: "asn", v: String(get(d, ["data", "asn", "asn"]) ?? "-") });
    items.push({ k: "org", v: String(get(d, ["data", "asn", "name"]) ?? "-") });
  } else if (kind === "prefix") {
    items.push({ k: "prefix", v: String(get(d, ["data", "prefix"]) ?? "-") });
    const origins = get(d, ["data", "asns"]);
    const originList = Array.isArray(origins) ? origins : [];
    const originAsns = originList
      .map((x) => get(x, ["asn"]))
      .filter((x): x is string | number => typeof x === "string" || typeof x === "number")
      .join(", ");
    items.push({ k: "origin ASNs", v: originAsns || "-" });
  } else if (kind === "asn") {
    const asnVal =
      get(d, ["data", "asn"]) ?? get(d, ["data", "asn_number"]) ?? get(d, ["data", "asn", "asn"]) ?? "-";
    items.push({ k: "asn", v: String(asnVal) });
    items.push({ k: "name", v: String(get(d, ["data", "name"]) ?? "-") });
    items.push({ k: "country", v: String(get(d, ["data", "country_code"]) ?? "-") });
    const prefixes = get(d, ["data", "prefixes"]);
    items.push({ k: "prefixes", v: String(Array.isArray(prefixes) ? prefixes.length : "-") });
  }

  return { items };
}

function asRecord(v: unknown): Record<string, unknown> | null {
  if (!v || typeof v !== "object") return null;
  return v as Record<string, unknown>;
}

function get(v: unknown, path: string[]): unknown {
  let cur: unknown = v;
  for (const p of path) {
    const r = asRecord(cur);
    if (!r) return undefined;
    cur = r[p];
  }
  return cur;
}

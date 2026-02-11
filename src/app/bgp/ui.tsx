"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { asRecord, getPath } from "@/lib/json";
import { routeViewsOriginAsn, routeViewsReportingPeersCount, routeViewsRPKIState } from "@/lib/routeViews";

type LookupResponse = Record<string, unknown>;
type SummaryItem = { k: string; v: string };
type SummarySource = {
  name: string;
  url: string;
  fetchedAt: string;
  status: number;
  ok: boolean;
  upstreamTime?: string;
  cached: boolean;
  cacheAgeMs: number;
};

type StructuredView =
  | {
      kind: "ip";
      ip: string;
      coveringPrefix: string;
      asns: string[];
    }
  | {
      kind: "prefix";
      prefix: string;
      rpki: string;
      originAsn: string;
      reportingPeers: number;
      uniqueAsPaths: number;
      peers: Array<{ peerAsn: string; collector: string; asPath: string; timestamp: string }>;
    }
  | {
      kind: "asn";
      asn: string;
      prefixCount: number;
      prefixSample: string[];
    };

function prettyJson(v: unknown) {
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

const HISTORY_KEY = "bgpExplorer.history.v1";
const HISTORY_MAX = 12;
const get = getPath;

function formatAge(ms: number | undefined) {
  if (!ms || !Number.isFinite(ms) || ms < 0) return "";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  return `${Math.round(ms / 60_000)}m`;
}

function loadHistory(): string[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map(String).map((s) => s.trim()).filter(Boolean).slice(0, HISTORY_MAX);
  } catch {
    return [];
  }
}

function saveHistory(list: string[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, HISTORY_MAX)));
  } catch {
    // ignore (storage may be disabled)
  }
}

function addToHistory(prev: string[], q: string): string[] {
  const next = [q, ...prev.filter((x) => x !== q)];
  return next.slice(0, HISTORY_MAX);
}

function safeFilename(s: string): string {
  return s
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 120);
}

export default function BgpClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const qParam = (searchParams.get("q") ?? "").trim();
  const [q, setQ] = useState(qParam || "8.8.8.8");
  const [data, setData] = useState<LookupResponse | null>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [copied, setCopied] = useState<"" | "json" | "link">("");

  const didAutoRun = useRef(false);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  const run = async (nextQ?: string) => {
    const query = (nextQ ?? q).trim();
    if (!query) return;

    setLoading(true);
    setErr("");
    setData(null);
    try {
      const res = await fetch(`/api/bgp/lookup?q=${encodeURIComponent(query)}`, { cache: "no-store" });
      const json = (await res.json()) as LookupResponse;
      if (!res.ok) {
        const base = (json["error"] as string) || `HTTP ${res.status}`;
        const retryAfter = Number(get(json, ["rateLimit", "retryAfterSec"]) ?? NaN);
        if (Number.isFinite(retryAfter) && retryAfter > 0) {
          throw new Error(`${base}. Retry in ~${Math.ceil(retryAfter)}s.`);
        }
        throw new Error(base);
      }
      setData(json);
      const sp = new URLSearchParams(searchParams.toString());
      sp.set("q", query);
      router.replace(`${pathname}?${sp.toString()}`, { scroll: false });

      setHistory((prev) => {
        const next = addToHistory(prev, query);
        saveHistory(next);
        return next;
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (didAutoRun.current) return;
    if (!qParam) return;
    didAutoRun.current = true;
    setQ(qParam);
    void run(qParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qParam]);

  const summary = useMemo(() => summarizeLookup(data), [data]);
  const structuredView = useMemo(() => extractStructuredView(data), [data]);
  const suggestions = useMemo(() => extractSuggestions(data), [data]);
  const examples = useMemo(() => ["8.8.8.8", "8.8.8.0/24", "AS15169", "cloudflare", "google"], []);

  return (
    <div className="grid gap-6">
      <header className="grid gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-white">BGP Explorer</h1>
        <p className="max-w-3xl text-sm leading-6 text-white/65">
          Search an IP, prefix (CIDR), ASN, or org name. Results are timestamped and include upstream evidence
          links when available.
        </p>
      </header>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5 ring-1 ring-white/10">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <input
            className="w-full rounded-xl border border-white/15 bg-black/20 px-4 py-3 text-sm text-white/90 outline-none placeholder:text-white/35 focus:border-sky-300/40"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void run();
            }}
            placeholder="8.8.8.8 | 8.8.8.0/24 | 15169 | google"
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

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-white/60">
          <div className="mr-1">Examples:</div>
          {examples.map((ex) => (
            <button
              key={ex}
              className="rounded-full bg-white/8 px-3 py-1 font-mono text-[11px] text-white/75 ring-1 ring-white/10 hover:bg-white/12"
              onClick={() => {
                setQ(ex);
                void run(ex);
              }}
            >
              {ex}
            </button>
          ))}
        </div>

        {history.length ? (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-white/60">
            <div className="mr-1">Recent:</div>
            {history.map((h) => (
              <button
                key={h}
                className="rounded-full bg-black/25 px-3 py-1 font-mono text-[11px] text-white/70 ring-1 ring-white/10 hover:bg-black/30"
                onClick={() => {
                  setQ(h);
                  void run(h);
                }}
              >
                {h}
              </button>
            ))}
            <button
              className="rounded-full bg-white/5 px-3 py-1 text-[11px] text-white/60 ring-1 ring-white/10 hover:bg-white/8"
              onClick={() => {
                saveHistory([]);
                setHistory([]);
              }}
            >
              Clear
            </button>
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
          <Panel title="Evidence">
            <div className="grid gap-2 text-sm text-white/70">
              {summary.sources.length ? (
                summary.sources.map((s) => (
                  <div
                    key={`${s.name}:${s.url}`}
                    className="grid gap-1 rounded-xl border border-white/10 bg-black/20 p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-white/80">{s.name}</div>
                      <div className="font-mono text-xs text-white/60">{s.ok ? `HTTP ${s.status}` : "error"}</div>
                    </div>
                    <div className="break-all font-mono text-[11px] leading-4 text-white/70">{s.url}</div>
                    <div className="flex items-center justify-between gap-3 font-mono text-[11px] text-white/55">
                      <div>fetchedAt: {s.fetchedAt}</div>
                      <div className="flex items-center gap-3">
                        {s.cached ? <div>cached: {formatAge(s.cacheAgeMs) || "hit"}</div> : null}
                        {s.upstreamTime ? <div>upstream: {s.upstreamTime}</div> : null}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-white/60">No upstream evidence recorded.</div>
              )}
              <div className="text-xs text-white/55">
                Tip: share this lookup by copying the page URL (it includes <span className="font-mono">?q=</span>).
              </div>
            </div>
          </Panel>
        </section>
      ) : null}

      {structuredView ? (
        <Panel title="Structured View">
          <StructuredViewPanel
            view={structuredView}
            onLookup={(next) => {
              setQ(next);
              void run(next);
            }}
          />
        </Panel>
      ) : null}

      {suggestions.length ? (
        <Panel title="Suggestions">
          <div className="grid gap-2">
            {suggestions.map((s) => (
              <button
                key={`${s.category}:${s.value}`}
                className="flex w-full items-start justify-between gap-4 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-left hover:bg-black/25"
                onClick={() => {
                  setQ(s.value);
                  void run(s.value);
                }}
              >
                <div className="grid gap-1">
                  <div className="text-sm font-semibold text-white/85">{s.label}</div>
                  {s.description ? <div className="text-xs text-white/55">{s.description}</div> : null}
                </div>
                <div className="shrink-0 rounded-full bg-white/10 px-3 py-1 text-xs text-white/65">{s.category}</div>
              </button>
            ))}
          </div>
        </Panel>
      ) : null}

      {data ? (
        <section className="rounded-2xl border border-white/10 bg-white/5 p-5 ring-1 ring-white/10">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="text-sm font-semibold text-white/90">Raw result</div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                className="rounded-full bg-white/8 px-3 py-1 text-xs text-white/75 ring-1 ring-white/10 hover:bg-white/12"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(prettyJson(data));
                    setCopied("json");
                    setTimeout(() => setCopied(""), 900);
                  } catch {
                    // ignore
                  }
                }}
              >
                Copy JSON{copied === "json" ? " (copied)" : ""}
              </button>
              <button
                className="rounded-full bg-white/8 px-3 py-1 text-xs text-white/75 ring-1 ring-white/10 hover:bg-white/12"
                onClick={() => {
                  try {
                    const kind = String(data["kind"] ?? "lookup");
                    const query = String(data["query"] ?? q).trim();
                    const fetchedAt = String(data["fetchedAt"] ?? new Date().toISOString());
                    const filename = `bgp-${safeFilename(kind)}-${safeFilename(query)}-${safeFilename(fetchedAt)}.json`;
                    const blob = new Blob([prettyJson(data)], { type: "application/json" });
                    const u = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = u;
                    a.download = filename;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    URL.revokeObjectURL(u);
                  } catch {
                    // ignore
                  }
                }}
              >
                Download JSON
              </button>
              <button
                className="rounded-full bg-white/8 px-3 py-1 text-xs text-white/75 ring-1 ring-white/10 hover:bg-white/12"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(window.location.href);
                    setCopied("link");
                    setTimeout(() => setCopied(""), 900);
                  } catch {
                    // ignore
                  }
                }}
              >
                Copy link{copied === "link" ? " (copied)" : ""}
              </button>
            </div>
          </div>
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

function summarizeLookup(data: LookupResponse | null) {
  if (!data) return null;

  const kind = String(data["kind"] ?? "");
  const fetchedAt = String(data["fetchedAt"] ?? "");
  const partial = Boolean(data["partial"] ?? false);

  const items: SummaryItem[] = [
    { k: "kind", v: kind || "-" },
    { k: "fetchedAt", v: fetchedAt || "-" },
    { k: "partial", v: partial ? "true" : "false" },
  ];
  const rateRemaining = Number(get(data, ["rateLimit", "remaining"]) ?? NaN);
  const rateLimit = Number(get(data, ["rateLimit", "limit"]) ?? NaN);
  if (Number.isFinite(rateRemaining) && Number.isFinite(rateLimit)) {
    items.push({ k: "rate_limit_remaining", v: `${rateRemaining}/${rateLimit}` });
  }

  const d = data["data"];

  if (kind === "ip") {
    items.push({ k: "ip", v: String(get(d, ["ip"]) ?? "-") });
    items.push({ k: "coveringPrefix", v: String(get(d, ["coveringPrefix"]) ?? "-") });
    const asns = get(d, ["asns"]);
    const asnList = Array.isArray(asns) ? asns.map(String).filter(Boolean).join(", ") : "";
    items.push({ k: "asns", v: asnList || "-" });

    const pinfo = get(d, ["coveringPrefixInfo"]);
    const rpki = routeViewsRPKIState(pinfo);
    if (rpki) items.push({ k: "rpki", v: rpki });
    const origin = routeViewsOriginAsn(pinfo);
    if (origin) items.push({ k: "origin_asn", v: origin });
  }

  if (kind === "prefix") {
    items.push({ k: "prefix", v: String(get(d, ["prefix"]) ?? "-") });
    const pinfo = get(d, ["prefixInfo"]);
    const rpki = routeViewsRPKIState(pinfo);
    if (rpki) items.push({ k: "rpki", v: rpki });
    const origin = routeViewsOriginAsn(pinfo);
    if (origin) items.push({ k: "origin_asn", v: origin });
    const peerCount = routeViewsReportingPeersCount(pinfo);
    if (peerCount !== null) items.push({ k: "reporting_peers", v: String(peerCount) });
  }

  if (kind === "asn") {
    items.push({ k: "asn", v: String(get(d, ["asn"]) ?? "-") });
    items.push({ k: "prefixCount", v: String(get(d, ["prefixCount"]) ?? "-") });
  }

  if (kind === "search") {
    items.push({ k: "hint", v: "Select a suggestion to run an exact lookup." });
  }

  const sourcesRaw = data["sources"];
  const sources: SummarySource[] = Array.isArray(sourcesRaw)
    ? sourcesRaw
        .map((s) => asRecord(s))
        .filter((s): s is Record<string, unknown> => Boolean(s))
        .map((s) => ({
          name: String(s["name"] ?? "-"),
          url: String(s["url"] ?? "-"),
          fetchedAt: String(s["fetchedAt"] ?? "-"),
          status: Number.isFinite(Number(s["status"])) ? Number(s["status"]) : 0,
          ok: Boolean(s["ok"]),
          upstreamTime: String(s["upstreamTime"] ?? "") || undefined,
          cached: Boolean(s["cached"] ?? false),
          cacheAgeMs: Number.isFinite(Number(s["cacheAgeMs"])) ? Number(s["cacheAgeMs"]) : 0,
        }))
    : [];

  return { items, sources };
}

function StructuredViewPanel({
  view,
  onLookup,
}: {
  view: StructuredView;
  onLookup: (query: string) => void;
}) {
  if (view.kind === "ip") {
    return (
      <div className="grid gap-3 text-sm text-white/75">
        <div className="font-mono text-xs text-white/65">IP: {view.ip}</div>
        <div className="flex flex-wrap items-center gap-2">
          {view.coveringPrefix ? (
            <button
              className="rounded-full bg-sky-400/20 px-3 py-1 font-mono text-xs text-sky-100 ring-1 ring-sky-300/30 hover:bg-sky-400/25"
              onClick={() => onLookup(view.coveringPrefix)}
            >
              Prefix: {view.coveringPrefix}
            </button>
          ) : (
            <div className="text-white/55">No covering prefix found.</div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {view.asns.length ? (
            view.asns.map((asn) => (
              <button
                key={asn}
                className="rounded-full bg-white/10 px-3 py-1 font-mono text-xs text-white/80 ring-1 ring-white/10 hover:bg-white/15"
                onClick={() => onLookup(`AS${asn}`)}
              >
                AS{asn}
              </button>
            ))
          ) : (
            <div className="text-white/55">No origin ASN suggestions returned.</div>
          )}
        </div>
      </div>
    );
  }

  if (view.kind === "prefix") {
    return (
      <div className="grid gap-4">
        <div className="grid grid-cols-2 gap-2 text-xs text-white/70 md:grid-cols-5">
          <Metric k="prefix" v={view.prefix} />
          <Metric k="rpki" v={view.rpki || "-"} />
          <Metric k="origin_asn" v={view.originAsn ? `AS${view.originAsn}` : "-"} />
          <Metric k="reporting_peers" v={String(view.reportingPeers)} />
          <Metric k="unique_as_paths" v={String(view.uniqueAsPaths)} />
        </div>

        <div className="flex flex-wrap gap-2">
          {view.originAsn ? (
            <button
              className="rounded-full bg-white/10 px-3 py-1 font-mono text-xs text-white/80 ring-1 ring-white/10 hover:bg-white/15"
              onClick={() => onLookup(`AS${view.originAsn}`)}
            >
              Pivot to AS{view.originAsn}
            </button>
          ) : null}
          <button
            className="rounded-full bg-white/10 px-3 py-1 font-mono text-xs text-white/80 ring-1 ring-white/10 hover:bg-white/15"
            onClick={() => onLookup(view.prefix)}
          >
            Refresh prefix lookup
          </button>
        </div>

        {view.peers.length ? (
          <div className="overflow-auto rounded-xl border border-white/10 bg-black/20">
            <table className="w-full min-w-[720px] text-left text-xs text-white/80">
              <thead className="border-b border-white/10 text-white/55">
                <tr>
                  <th className="px-3 py-2 font-medium">peer_asn</th>
                  <th className="px-3 py-2 font-medium">collector</th>
                  <th className="px-3 py-2 font-medium">as_path</th>
                  <th className="px-3 py-2 font-medium">timestamp</th>
                </tr>
              </thead>
              <tbody>
                {view.peers.map((peer) => (
                  <tr key={`${peer.collector}:${peer.peerAsn}:${peer.timestamp}`} className="border-b border-white/5">
                    <td className="px-3 py-2">
                      <button
                        className="font-mono text-sky-200 hover:text-sky-100"
                        onClick={() => onLookup(`AS${peer.peerAsn}`)}
                      >
                        AS{peer.peerAsn}
                      </button>
                    </td>
                    <td className="px-3 py-2 font-mono text-[11px] text-white/70">{peer.collector || "-"}</td>
                    <td className="px-3 py-2 font-mono text-[11px] text-white/70">{peer.asPath || "-"}</td>
                    <td className="px-3 py-2 font-mono text-[11px] text-white/70">{peer.timestamp || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-sm text-white/55">No reporting peer rows were returned for this prefix.</div>
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-2 text-xs text-white/70 md:grid-cols-3">
        <Metric k="asn" v={`AS${view.asn}`} />
        <Metric k="prefix_count" v={String(view.prefixCount)} />
        <Metric k="sampled_prefixes" v={String(view.prefixSample.length)} />
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          className="rounded-full bg-white/10 px-3 py-1 font-mono text-xs text-white/80 ring-1 ring-white/10 hover:bg-white/15"
          onClick={() => onLookup(`AS${view.asn}`)}
        >
          Refresh AS{view.asn}
        </button>
      </div>
      {view.prefixSample.length ? (
        <div className="flex flex-wrap gap-2">
          {view.prefixSample.map((prefix) => (
            <button
              key={prefix}
              className="rounded-full bg-sky-400/20 px-3 py-1 font-mono text-xs text-sky-100 ring-1 ring-sky-300/30 hover:bg-sky-400/25"
              onClick={() => onLookup(prefix)}
            >
              {prefix}
            </button>
          ))}
        </div>
      ) : (
        <div className="text-sm text-white/55">No prefix sample returned for this ASN.</div>
      )}
    </div>
  );
}

function Metric({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-white/50">{k}</div>
      <div className="mt-1 truncate font-mono text-[11px] text-white/85">{v}</div>
    </div>
  );
}

function extractStructuredView(data: LookupResponse | null): StructuredView | null {
  if (!data) return null;
  const kind = String(data["kind"] ?? "");

  if (kind === "ip") {
    const ip = String(get(data, ["data", "ip"]) ?? "");
    const coveringPrefix = String(get(data, ["data", "coveringPrefix"]) ?? "");
    const asnsRaw = get(data, ["data", "asns"]);
    const asns = Array.isArray(asnsRaw) ? asnsRaw.map(String).filter(Boolean).slice(0, 12) : [];
    if (!ip) return null;
    return { kind: "ip", ip, coveringPrefix, asns };
  }

  if (kind === "prefix") {
    const prefix = String(get(data, ["data", "prefix"]) ?? "");
    const prefixInfo = get(data, ["data", "prefixInfo"]);
    const first = Array.isArray(prefixInfo) ? asRecord(prefixInfo[0]) : null;
    const peerRaw = first?.["reporting_peers"];
    const peers = Array.isArray(peerRaw)
      ? peerRaw
          .map((peer) => asRecord(peer))
          .filter((peer): peer is Record<string, unknown> => Boolean(peer))
          .map((peer) => ({
            peerAsn: String(peer["peer_asn"] ?? "").trim(),
            collector: String(peer["collector"] ?? "").trim(),
            asPath: String(peer["as_path"] ?? "").trim(),
            timestamp: String(peer["timestamp"] ?? "").trim(),
          }))
          .filter((peer) => peer.peerAsn)
          .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
          .slice(0, 12)
      : [];
    const uniqueAsPaths = new Set(peers.map((peer) => peer.asPath).filter(Boolean)).size;
    if (!prefix) return null;
    return {
      kind: "prefix",
      prefix,
      rpki: routeViewsRPKIState(prefixInfo) ?? "",
      originAsn: routeViewsOriginAsn(prefixInfo) ?? "",
      reportingPeers: routeViewsReportingPeersCount(prefixInfo) ?? peers.length,
      uniqueAsPaths,
      peers,
    };
  }

  if (kind === "asn") {
    const asn = String(get(data, ["data", "asn"]) ?? "");
    if (!asn) return null;
    const prefixCount = Number(get(data, ["data", "prefixCount"]) ?? 0);
    const sampleRaw = get(data, ["data", "prefixSample"]);
    const prefixSample = Array.isArray(sampleRaw) ? sampleRaw.map(String).filter(Boolean).slice(0, 24) : [];
    return {
      kind: "asn",
      asn,
      prefixCount: Number.isFinite(prefixCount) ? prefixCount : prefixSample.length,
      prefixSample,
    };
  }

  return null;
}

function extractSuggestions(data: LookupResponse | null) {
  if (!data) return [];
  if (String(data["kind"] ?? "") !== "search") return [];
  const search = get(data, ["data", "search"]);
  const categories = get(search, ["data", "categories"]);
  if (!Array.isArray(categories)) return [];

  const out: Array<{ category: string; label: string; value: string; description?: string }> = [];
  for (const c of categories) {
    const r = asRecord(c);
    if (!r) continue;
    const category = String(r["category"] ?? "");
    if (!category) continue;
    // Keep the suggestion list focused on actionable lookups.
    if (category !== "ASNs" && category !== "Prefixes") continue;
    const suggestions = r["suggestions"];
    if (!Array.isArray(suggestions)) continue;
    for (const s of suggestions.slice(0, 10)) {
      const sr = asRecord(s);
      if (!sr) continue;
      const value = String(sr["value"] ?? "").trim();
      if (!value) continue;
      const label = String(sr["label"] ?? value).trim();
      const description = String(sr["description"] ?? "").trim();
      out.push({ category, value, label, description: description || undefined });
    }
  }

  return out.slice(0, 20);
}

// No UI-only RouteViews helpers are currently needed beyond `src/lib/routeViews.ts`.

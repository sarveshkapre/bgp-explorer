import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BgpClient from "@/app/bgp/ui";
import { normalizePrefix } from "@/lib/prefix";

type PrefixPageParams = { addr: string; mask: string };

type PrefixPageProps = {
  params: Promise<PrefixPageParams>;
};

function parsePrefixOrNull(addr: string, mask: string): string | null {
  return normalizePrefix(`${decodeURIComponent(addr)}/${decodeURIComponent(mask)}`);
}

export async function generateMetadata({ params }: PrefixPageProps): Promise<Metadata> {
  const { addr, mask } = await params;
  const prefix = parsePrefixOrNull(addr, mask);
  return {
    title: prefix ? `Prefix ${prefix} | BGP Explorer` : "Prefix | BGP Explorer",
    description: "Canonical prefix route with timestamped BGP lookup evidence.",
  };
}

export default async function PrefixPage({ params }: PrefixPageProps) {
  const { addr, mask } = await params;
  const prefix = parsePrefixOrNull(addr, mask);
  if (!prefix) notFound();

  return (
    <Suspense
      fallback={
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 ring-1 ring-white/10">
          <div className="text-sm font-semibold text-white/90">Loading prefix…</div>
        </div>
      }
    >
      <BgpClient
        presetQuery={prefix}
        lockQuery
        pageTitle={`Prefix ${prefix}`}
        pageDescription="Canonical prefix detail route with timestamped evidence and pivot lookups."
      />
    </Suspense>
  );
}

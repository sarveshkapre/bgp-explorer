import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BgpClient from "@/app/bgp/ui";
import { parseBgpQuery } from "@/lib/bgpQuery";

type AsnPageParams = { asn: string };

type AsnPageProps = {
  params: Promise<AsnPageParams>;
};

function parseAsnOrNull(raw: string): string | null {
  const parsed = parseBgpQuery(raw);
  if (parsed.kind !== "asn" || !parsed.asn) return null;
  return parsed.asn;
}

export async function generateMetadata({ params }: AsnPageProps): Promise<Metadata> {
  const { asn } = await params;
  const normalizedAsn = parseAsnOrNull(decodeURIComponent(asn));
  return {
    title: normalizedAsn ? `ASN AS${normalizedAsn} | BGP Explorer` : "ASN | BGP Explorer",
    description: "Canonical ASN route with timestamped BGP lookup evidence.",
  };
}

export default async function AsnPage({ params }: AsnPageProps) {
  const { asn } = await params;
  const normalizedAsn = parseAsnOrNull(decodeURIComponent(asn));
  if (!normalizedAsn) notFound();

  return (
    <Suspense
      fallback={
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 ring-1 ring-white/10">
          <div className="text-sm font-semibold text-white/90">Loading ASN…</div>
        </div>
      }
    >
      <BgpClient
        presetQuery={`AS${normalizedAsn}`}
        lockQuery
        pageTitle={`ASN AS${normalizedAsn}`}
        pageDescription="Canonical ASN detail route with timestamped evidence and pivot lookups."
      />
    </Suspense>
  );
}

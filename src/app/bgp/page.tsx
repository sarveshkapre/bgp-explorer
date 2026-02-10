import { Suspense } from "react";
import BgpClient from "./ui";

export default function BgpPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 ring-1 ring-white/10">
          <div className="text-sm font-semibold text-white/90">Loading…</div>
        </div>
      }
    >
      <BgpClient />
    </Suspense>
  );
}


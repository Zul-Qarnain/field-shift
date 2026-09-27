"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Map as MapIcon } from "lucide-react";
import type { FarmPack } from "@/lib/data";

const MapLive = dynamic(() => import("./MapLive").then((m) => m.MapLive), {
  ssr: false,
  loading: () => <div className="h-[360px] w-full animate-pulse rounded-xl border border-line bg-inset" />,
});

export function MapPanel({ pack }: { pack: FarmPack }) {
  const [mode, setMode] = useState<"unknown" | "ask" | "live">("unknown");

  useEffect(() => {
    setMode(window.matchMedia("(max-width: 640px)").matches ? "ask" : "live");
  }, []);

  if (mode === "ask") {
    return (
      <div className="flex h-[240px] flex-col items-center justify-center gap-3 rounded-xl border border-line bg-inset text-center">
        <MapIcon className="h-6 w-6 text-lime" />
        <p className="px-6 text-sm text-ink-mid">
          {pack.district} · <span className="font-mono text-xs">{pack.lat.toFixed(4)}°N {pack.lon.toFixed(4)}°E</span> · {pack.areaHa} ha
        </p>
        <button
          onClick={() => setMode("live")}
          className="rounded-lg border border-action px-4 py-2 text-sm font-semibold text-link hover:bg-action/10"
        >
          Load interactive map
        </button>
        <p className="text-[10px] text-ink-low">Skipped on phones by default to keep the page fast.</p>
      </div>
    );
  }
  if (mode === "unknown") {
    return <div className="h-[360px] w-full rounded-xl border border-line bg-inset" />;
  }
  return <MapLive pack={pack} />;
}

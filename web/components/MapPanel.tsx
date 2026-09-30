"use client";

import { useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { Map as MapIcon } from "lucide-react";
import type { FarmPack } from "@/lib/data";

const MapLive = dynamic(() => import("./MapLive").then((m) => m.MapLive), {
  ssr: false,
  loading: () => <div className="h-[360px] w-full animate-pulse rounded-xl border border-line bg-inset" />,
});

const subscribe = (cb: () => void) => {
  const mq = window.matchMedia("(max-width: 640px)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
const getSnapshot = () => window.matchMedia("(max-width: 640px)").matches;
const getServerSnapshot = () => false;

const subscribeHash = (cb: () => void) => {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
};
const getHashSnapshot = () => window.location.hash === "#map";
const getHashServerSnapshot = () => false;

export function MapPanel({ pack }: { pack: FarmPack }) {
  const isMobile = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const anchoredByHash = useSyncExternalStore(subscribeHash, getHashSnapshot, getHashServerSnapshot);
  const [forced, setForced] = useState(false);

  return (
    <div id="map" className="scroll-mt-20">
      {isMobile && !forced && !anchoredByHash ? (
        <div className="flex h-[240px] flex-col items-center justify-center gap-3 rounded-xl border border-line bg-inset text-center">
          <MapIcon className="h-6 w-6 text-lime" />
          <p className="px-6 text-sm text-ink-mid">
            {pack.district} · <span className="font-mono text-xs">{pack.lat.toFixed(4)}°N {pack.lon.toFixed(4)}°E</span> · {pack.areaHa} ha
          </p>
          <button
            onClick={() => setForced(true)}
            className="rounded-lg border border-action px-4 py-2 text-sm font-semibold text-link hover:bg-action/10"
          >
            Load interactive map
          </button>
          <p className="text-[10px] text-ink-low">Skipped on phones by default to keep the page fast.</p>
        </div>
      ) : (
        <MapLive key={pack.id} pack={pack} />
      )}
    </div>
  );
}

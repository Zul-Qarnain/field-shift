"use client";

import { useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { Map as MapIcon } from "lucide-react";
import { districtName, type FarmPack } from "@/lib/data";
import { useLang } from "@/lib/lang";
import { fmtNum, t } from "@/lib/i18n";

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
  const { lang } = useLang();
  const isMobile = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const anchoredByHash = useSyncExternalStore(subscribeHash, getHashSnapshot, getHashServerSnapshot);
  const [forced, setForced] = useState(false);

  return (
    <div id="map" className="scroll-mt-20">
      {isMobile && !forced && !anchoredByHash ? (
        <div className="flex h-[240px] flex-col items-center justify-center gap-3 rounded-xl border border-line bg-inset text-center">
          <MapIcon className="h-6 w-6 text-lime" />
          <p className="px-6 text-sm text-ink-mid">
            {districtName(pack, lang)} · <span className="font-mono text-xs">{fmtNum(pack.lat.toFixed(4), lang)}°N {fmtNum(pack.lon.toFixed(4), lang)}°E</span> · {fmtNum(pack.areaHa, lang)} {t("unit_ha", lang)}
          </p>
          <button
            onClick={() => setForced(true)}
            className="rounded-lg border border-action px-4 py-2 text-sm font-semibold text-link hover:bg-action/10"
          >
            {t("map_load", lang)}
          </button>
          <p className="text-[10px] text-ink-low">{t("map_skip_note", lang)}</p>
        </div>
      ) : (
        <MapLive key={pack.id} pack={pack} />
      )}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { Map as MlMap, Marker, NavigationControl, ScaleControl, setWorkerUrl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { LatLng, PrecomputedPoint } from "@/lib/locate";
import { useLang } from "@/lib/lang";
import { t, tf } from "@/lib/i18n";

setWorkerUrl("/maplibre-gl-worker.mjs");

const BANGLADESH_CENTER: [number, number] = [90.35, 23.68];
const BANGLADESH_ZOOM = 6.4;
const STYLE_TIMEOUT_MS = 12000;
const POINT_COLOR = "#4ea8de";
const PICK_COLOR = "#d4f94e";

/** The 70 precomputed points as small dots; clicking anywhere else drops the pin you asked for. */
export function LocateMap({
  points, picked, onPick,
}: {
  points: PrecomputedPoint[];
  picked: LatLng | null;
  onPick: (lat: number, lon: number) => void;
}) {
  const { lang } = useLang();
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const pickRef = useRef<Marker | null>(null);
  const onPickRef = useRef(onPick);
  const [phase, setPhase] = useState<"loading" | "ready" | "offline">("loading");

  useEffect(() => {
    onPickRef.current = onPick;
  }, [onPick]);

  useEffect(() => {
    if (!container.current || mapRef.current) return;
    const map = new MlMap({
      container: container.current,
      style: "https://tiles.openfreemap.org/styles/liberty",
      center: BANGLADESH_CENTER,
      zoom: BANGLADESH_ZOOM,
      attributionControl: false,
    });
    map.addControl(new NavigationControl({ showCompass: false }), "top-left");
    map.addControl(new ScaleControl({ maxWidth: 120, unit: "metric" }), "bottom-right");

    let settled = false;
    const giveUp = setTimeout(() => {
      if (!settled) setPhase("offline");
    }, STYLE_TIMEOUT_MS);

    map.on("error", () => {
      if (settled) return;
      settled = true;
      clearTimeout(giveUp);
      setPhase("offline");
    });
    map.on("load", () => {
      settled = true;
      clearTimeout(giveUp);
      for (const point of points) {
        const dot = document.createElement("div");
        dot.style.width = point.kind === "farm" ? "11px" : "8px";
        dot.style.height = dot.style.width;
        dot.style.borderRadius = "9999px";
        dot.style.background = point.kind === "farm" ? PICK_COLOR : POINT_COLOR;
        dot.style.border = "1px solid rgba(0,0,0,0.45)";
        dot.title = point.name_en;
        new Marker({ element: dot, anchor: "center" }).setLngLat([point.lon, point.lat]).addTo(map);
      }
      map.on("click", (event) => onPickRef.current(event.lngLat.lat, event.lngLat.lng));
      setPhase("ready");
    });
    mapRef.current = map;

    return () => {
      clearTimeout(giveUp);
      map.remove();
      mapRef.current = null;
      pickRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || phase !== "ready") return;
    if (!picked) {
      pickRef.current?.remove();
      pickRef.current = null;
      return;
    }
    const lngLat = [picked.lon, picked.lat] as [number, number];
    if (pickRef.current) pickRef.current.setLngLat(lngLat);
    else pickRef.current = new Marker({ color: PICK_COLOR }).setLngLat(lngLat).addTo(map);
    map.easeTo({ center: lngLat, duration: 600 });
  }, [picked, phase]);

  return (
    <div className="relative overflow-hidden rounded-xl border border-line bg-inset">
      <div ref={container} data-testid="locate-map" data-phase={phase} className="h-[380px] w-full bg-inset" />
      <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-white/5" />
      {phase !== "ready" && (
        <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 rounded-xl bg-inset px-6 text-center">
          <p className="max-w-sm text-xs leading-relaxed text-ink-mid">
            {phase === "loading" ? t("map_loading", lang) : t("locate_map_offline", lang)}
          </p>
        </div>
      )}
      {phase === "ready" && (
        <p className="pointer-events-none absolute left-3 top-3 z-10 max-w-[18rem] rounded-md bg-canvas/85 px-2 py-1 text-[10px] leading-snug text-ink-mid backdrop-blur">
          {tf("locate_map_hint", lang, { n: points.length })}
        </p>
      )}
      <p className="pointer-events-none absolute bottom-2 right-2 z-10 rounded-md bg-canvas/85 px-2 py-0.5 font-mono text-[9px] text-ink-low backdrop-blur">
        Basemap © OpenFreeMap · OpenStreetMap contributors
      </p>
    </div>
  );
}

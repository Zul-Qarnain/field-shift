"use client";

import { useEffect, useRef, useState } from "react";
import { Map as MlMap, Marker, NavigationControl, ScaleControl, setWorkerUrl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Layers } from "lucide-react";
import type { FarmPack } from "@/lib/data";

setWorkerUrl("/maplibre-gl-worker.mjs");

const LAYERS = [
  { id: "truecolor", label: "True Color (satellite)" },
  { id: "ndvi", label: "NDVI (vegetation)" },
  { id: "moisture", label: "Soil moisture" },
  { id: "lst", label: "Land surface temp." },
  { id: "precip", label: "Precipitation" },
];

export function MapLive({ pack }: { pack: FarmPack }) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<Set<string>>(new Set(["truecolor"]));

  const addTrueColor = (map: MlMap) => {
    if (map.getSource("gibs")) return;
    map.addSource("gibs", {
      type: "raster",
      tiles: ["https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_NOAA20_CorrectedReflectance_TrueColor/default/2026-09-20/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg"],
      tileSize: 256,
      maxzoom: 8,
      attribution: "NASA GIBS",
    });
    map.addLayer({ id: "gibs-layer", type: "raster", source: "gibs", paint: { "raster-opacity": 0.9 } }, "field-fill");
  };

  useEffect(() => {
    if (!container.current || mapRef.current) return;
    const map = new MlMap({
      container: container.current,
      style: "https://tiles.openfreemap.org/styles/liberty",
      center: [pack.lon, pack.lat],
      zoom: 13.5,
      attributionControl: false,
    });
    map.addControl(new NavigationControl({ showCompass: false }), "top-left");
    map.addControl(new ScaleControl({ maxWidth: 120, unit: "metric" }), "bottom-right");
    map.on("load", () => {
      map.addSource("field", { type: "geojson", data: { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [pack.polygon] } } });
      map.addLayer({ id: "field-fill", type: "fill", source: "field", paint: { "fill-color": "#d4f94e", "fill-opacity": 0.18 } });
      map.addLayer({ id: "field-line", type: "line", source: "field", paint: { "line-color": "#d4f94e", "line-width": 2 } });
      new Marker({ color: "#d4f94e" }).setLngLat([pack.lon, pack.lat]).addTo(map);
      if (active.has("truecolor")) addTrueColor(map);
    });
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pack.id]);

  const toggle = (id: string) => {
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      const map = mapRef.current;
      if (map && map.getSource("gibs")) {
        if (next.has("truecolor")) { if (!map.getLayer("gibs-layer")) map.addLayer({ id: "gibs-layer", type: "raster", source: "gibs", paint: { "raster-opacity": 0.9 } }, "field-fill"); }
        else if (map.getLayer("gibs-layer")) map.removeLayer("gibs-layer");
      } else if (next.has("truecolor") && map && map.isStyleLoaded()) {
        addTrueColor(map);
      }
      return next;
    });
  };

  return (
    <div className="relative overflow-hidden rounded-xl border border-line">
      <div ref={container} className="map-dark h-[360px] w-full" />
      <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-white/5" />
      <button
        onClick={() => setOpen((o) => !o)}
        className="absolute bottom-4 left-3 z-10 flex items-center gap-2 rounded-lg border border-line bg-canvas/90 px-3 py-2 text-xs font-medium text-ink-hi backdrop-blur hover:border-action"
      >
        <Layers className="h-3.5 w-3.5" /> Layers
      </button>
      {open && (
        <div className="absolute bottom-14 left-3 z-20 w-60 rounded-xl border border-line bg-elevated/95 p-2 shadow-drawer backdrop-blur fade-up">
          {LAYERS.map((l) => (
            <button
              key={l.id}
              onClick={() => toggle(l.id)}
              className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs text-ink-mid hover:bg-surface"
            >
              {l.label}
              <span className={`relative h-4 w-7 rounded-full transition-colors ${active.has(l.id) ? "bg-action" : "bg-line"}`}>
                <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all ${active.has(l.id) ? "left-3.5" : "left-0.5"}`} />
              </span>
            </button>
          ))}
          <p className="px-2.5 pb-1.5 pt-1 text-[10px] leading-snug text-ink-low">
            True Color streams NASA GIBS when online. Other layers arrive with the data pipeline (pre-tiled PMTiles).
          </p>
        </div>
      )}
    </div>
  );
}

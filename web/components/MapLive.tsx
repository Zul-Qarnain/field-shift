"use client";

import { useEffect, useRef, useState } from "react";
import { Map as MlMap, Marker, NavigationControl, ScaleControl, setWorkerUrl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Layers } from "lucide-react";
import type { FarmPack } from "@/lib/data";

setWorkerUrl("/maplibre-gl-worker.mjs");

// NASA GIBS publishes this layer on the GoogleMapsCompatible_Level9 tile matrix set,
// whose deepest matrix is zoom 9 (~306 m per pixel: ScaleDenominator 1091957.5 × the
// standard 0.28 mm pixel). Deeper requests get an OGC exception back, so the source
// declares maxzoom 9 and MapLibre overzooms instead of asking for tiles that exist
// nowhere.
const GIBS_DATE = "2026-09-20";
const GIBS_MAX_ZOOM = 9;
const GIBS_TILE_URL = `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_NOAA20_CorrectedReflectance_TrueColor/default/${GIBS_DATE}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`;
const GIBS_FADE_ZOOM = 11.5;
const FIELD_COLOR = "#d4f94e";
const STYLE_TIMEOUT_MS = 15000;

const LAYERS = [
  { id: "truecolor", label: "True Color (satellite)", ready: true },
  { id: "ndvi", label: "NDVI (vegetation)", ready: false },
  { id: "moisture", label: "Soil moisture", ready: false },
  { id: "lst", label: "Land surface temp.", ready: false },
  { id: "precip", label: "Precipitation", ready: false },
];

export function MapLive({ pack }: { pack: FarmPack }) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const [open, setOpen] = useState(false);
  const [trueColorOn, setTrueColorOn] = useState(true);
  const [phase, setPhase] = useState<"loading" | "ready" | "failed">("loading");

  useEffect(() => {
    if (!container.current || mapRef.current) return;
    const map = new MlMap({
      container: container.current,
      style: "https://tiles.openfreemap.org/styles/liberty",
      center: [pack.lon, pack.lat],
      zoom: GIBS_MAX_ZOOM,
      attributionControl: false,
    });
    map.addControl(new NavigationControl({ showCompass: false }), "top-left");
    map.addControl(new ScaleControl({ maxWidth: 120, unit: "metric" }), "bottom-right");

    let settled = false;
    let styleParsed = false;
    const giveUp = setTimeout(() => {
      if (!settled) {
        settled = true;
        setPhase("failed");
      }
    }, STYLE_TIMEOUT_MS);
    const fail = () => {
      if (settled || styleParsed) return;
      settled = true;
      clearTimeout(giveUp);
      setPhase("failed");
    };

    map.on("error", fail);
    map.on("styledata", () => {
      styleParsed = true;
    });
    map.on("load", () => {
      settled = true;
      clearTimeout(giveUp);
      map.addSource("field", { type: "geojson", data: { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [pack.polygon] } } });
      map.addLayer({ id: "field-fill", type: "fill", source: "field", paint: { "fill-color": FIELD_COLOR, "fill-opacity": 0.18 } });
      map.addLayer({ id: "field-line", type: "line", source: "field", paint: { "line-color": FIELD_COLOR, "line-width": 2 } });
      map.addSource("gibs", {
        type: "raster",
        tiles: [GIBS_TILE_URL],
        tileSize: 256,
        maxzoom: GIBS_MAX_ZOOM,
        attribution: "NASA GIBS",
      });
      map.addLayer(
        {
          id: "gibs-layer",
          type: "raster",
          source: "gibs",
          paint: {
            // Satellite pixels run out at zoom 9, so hand the view back to the vector
            // basemap instead of stretching the imagery past its resolution. Opaque
            // below that ceiling — any blending with the basemap would shift the colours.
            "raster-opacity": [
              "interpolate",
              ["linear"],
              ["zoom"],
              0, 1,
              GIBS_MAX_ZOOM, 1,
              GIBS_FADE_ZOOM, 0,
            ],
          },
        },
        "field-fill"
      );
      new Marker({ color: FIELD_COLOR }).setLngLat([pack.lon, pack.lat]).addTo(map);
      setPhase("ready");
    });
    mapRef.current = map;
    return () => {
      clearTimeout(giveUp);
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pack.id]);

  useEffect(() => {
    const map = mapRef.current;
    if (phase !== "ready" || !map?.getLayer("gibs-layer")) return;
    map.setLayoutProperty("gibs-layer", "visibility", trueColorOn ? "visible" : "none");
  }, [trueColorOn, phase]);

  return (
    <div className="relative overflow-hidden rounded-xl border border-line bg-inset">
      <div ref={container} className="h-[360px] w-full bg-inset" />
      <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-white/5" />
      {phase !== "ready" && (
        <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 rounded-xl bg-inset text-center">
          {phase === "loading" ? (
            <>
              <div className="flex w-full max-w-xs flex-col gap-2 px-6">
                <div className="h-3 w-2/3 animate-pulse rounded bg-surface" />
                <div className="h-24 w-full animate-pulse rounded bg-surface" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-surface" />
              </div>
              <p className="text-xs text-ink-mid">Loading satellite view…</p>
            </>
          ) : (
            <p className="max-w-xs px-6 text-xs leading-relaxed text-ink-mid">
              Map needs internet — satellite tiles could not load
            </p>
          )}
        </div>
      )}
      {phase === "ready" && (
        <p className="pointer-events-none absolute right-2 top-2 z-10 max-w-[16rem] rounded-md bg-canvas/85 px-2 py-1 text-right font-mono text-[10px] leading-snug text-ink-mid backdrop-blur">
          {trueColorOn && (
            <>
              NASA GIBS VIIRS NOAA-20 true colour · {GIBS_DATE} · ≈306 m pixels, native to zoom {GIBS_MAX_ZOOM}, fades past zoom 10
              <br />
            </>
          )}
          Basemap © OpenFreeMap · OpenStreetMap contributors
        </p>
      )}
      {phase === "ready" && (
        <button
          onClick={() => setOpen((o) => !o)}
          className="absolute bottom-4 left-3 z-10 flex items-center gap-2 rounded-lg border border-line bg-canvas/90 px-3 py-2 text-xs font-medium text-ink-hi backdrop-blur hover:border-action"
        >
          <Layers className="h-3.5 w-3.5" /> Layers
        </button>
      )}
      {open && (
        <div className="absolute bottom-14 left-3 z-20 w-60 rounded-xl border border-line bg-elevated/95 p-2 shadow-drawer backdrop-blur fade-up">
          {LAYERS.map((l) => (
            l.ready ? (
              <button
                key={l.id}
                onClick={() => setTrueColorOn((on) => !on)}
                className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs text-ink-mid hover:bg-surface"
              >
                {l.label}
                <span className={`relative h-4 w-7 rounded-full transition-colors ${trueColorOn ? "bg-action" : "bg-line"}`}>
                  <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all ${trueColorOn ? "left-3.5" : "left-0.5"}`} />
                </span>
              </button>
            ) : (
              <button
                key={l.id}
                disabled
                aria-disabled="true"
                className="flex w-full cursor-not-allowed items-center justify-between rounded-lg px-2.5 py-2 text-xs text-ink-low opacity-50"
              >
                {l.label}
                <span className="rounded border border-line px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide">coming soon</span>
              </button>
            )
          ))}
          <p className="px-2.5 pb-1.5 pt-1 text-[10px] leading-snug text-ink-low">
            Only True Color works today, streamed from NASA GIBS when online. The other layers are placeholders — they
            arrive with the data pipeline (pre-tiled PMTiles).
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * The 70 points this build already has NASA POWER data for: the six demo farms (web/lib/data.ts) and
 * the 64 district points geoBoundaries' representative point placed inside each ADM2 polygon
 * (web/public/data/districts.json — the same coordinates scripts/build_packs.py requested).
 */
import districtsJson from "../public/data/districts.json";
import { FARMS } from "./data";

export interface LatLng {
  lat: number;
  lon: number;
}

export interface DistrictEntry {
  slug: string;
  gbName: string;
  name_en: string;
  name_bn: string;
  division: string;
  division_bn: string;
  centroid: LatLng;
  /** Where that district's POWER data pack was built — inside the polygon, not necessarily the centroid. */
  point: LatLng;
}

export interface PrecomputedPoint extends LatLng {
  id: string;
  kind: "farm" | "district";
  name_en: string;
  name_bn: string;
}

export const DISTRICTS: DistrictEntry[] = [...(districtsJson.districts as DistrictEntry[])].sort((a, b) =>
  a.name_en.localeCompare(b.name_en),
);

export const districtBySlug = (slug: string): DistrictEntry | undefined =>
  DISTRICTS.find((d) => d.slug === slug);

const FARMS_BY_ID = FARMS.reduce<Record<string, (typeof FARMS)[number]>>((acc, f) => ({ ...acc, [f.id]: f }), {});

/** The district slug a demo farm sits in, when the geoBoundaries register carries that name. */
export function districtSlugForFarmId(farmId: string): string | null {
  const farm = FARMS_BY_ID[farmId];
  if (!farm) return null;
  const needle = farm.district.trim().toLowerCase();
  const match = DISTRICTS.find(
    (d) => d.name_en.toLowerCase() === needle || d.gbName.toLowerCase() === needle || d.slug === needle,
  );
  return match?.slug ?? null;
}

export const PRECOMPUTED_POINTS: PrecomputedPoint[] = [
  ...FARMS.map((f) => ({ id: f.id, kind: "farm" as const, name_en: f.name_en, name_bn: f.name_bn, lat: f.lat, lon: f.lon })),
  ...DISTRICTS.map((d) => ({
    id: d.slug,
    kind: "district" as const,
    name_en: d.name_en,
    name_bn: d.name_bn,
    lat: d.point.lat,
    lon: d.point.lon,
  })),
];

const EARTH_RADIUS_KM = 6371;
const rad = (deg: number) => (deg * Math.PI) / 180;

export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Bangladesh, generous enough to include every district point and the coastal edge. */
export const BANGLADESH_BBOX = { minLat: 20.5, maxLat: 26.7, minLon: 88.0, maxLon: 92.7 };

export function inBangladeshBBox(lat: number, lon: number): boolean {
  return lat >= BANGLADESH_BBOX.minLat && lat <= BANGLADESH_BBOX.maxLat && lon >= BANGLADESH_BBOX.minLon && lon <= BANGLADESH_BBOX.maxLon;
}

export interface NearestMatch {
  point: PrecomputedPoint;
  distanceKm: number;
}

export function nearestPoint(lat: number, lon: number): NearestMatch {
  const from = { lat, lon };
  let best = PRECOMPUTED_POINTS[0];
  let bestKm = Number.POSITIVE_INFINITY;
  for (const candidate of PRECOMPUTED_POINTS) {
    const km = haversineKm(from, candidate);
    if (km < bestKm) {
      best = candidate;
      bestKm = km;
    }
  }
  return { point: best, distanceKm: bestKm };
}

/** Past this distance the snapped point stops describing the caller's own field. */
export const SNAP_CAUTION_KM = 40;

export const km1 = (value: number) => (Math.round(value * 10) / 10).toFixed(1);

/** Divisions in alphabetical order, each with its districts sorted by name. */
export function districtsByDivision(): { division: string; division_bn: string; districts: DistrictEntry[] }[] {
  const byDivision = new Map<string, { division_bn: string; districts: DistrictEntry[] }>();
  for (const d of DISTRICTS) {
    const group = byDivision.get(d.division) ?? { division_bn: d.division_bn, districts: [] };
    group.districts.push(d);
    byDivision.set(d.division, group);
  }
  return [...byDivision.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([division, group]) => ({ division, division_bn: group.division_bn, districts: group.districts }));
}

import type { Lang } from "./i18n";

export type Tier = "NASA" | "Partner" | "Open" | "You";
export type Source = "fixture" | "cache" | "live";

export interface ProvEntry {
  id: string;
  name: string;
  detail: string;
  version: string;
  retrieved: string;
  tier: Tier;
  url: string;
}

export type SalinityClass = "S1" | "S2" | "S3" | "S4" | "S5";

/**
 * Soil salinity of the farm's UPZILA from SRDI (2010) "Saline Soils of Bangladesh", Appendix-2
 * "Upazila wise Soil salinity class and area in coastal saline belt", pp. 31-36. Dry-season figures:
 * the survey ran in May 2009 and EC was measured on a 1:5 soil-water extract (SRDI 2010 p.2).
 * Built by src/acquire/salinity.py into public/data/salinity.json, which carries the citation,
 * the retrieval date and the per-district rollup; the values below are copied from that output.
 */
export interface SalinityBlock {
  /** SRDI's printed upazila name, or the geoBoundaries ADM3 name when the farm is outside the survey. */
  upazila: string;
  district: string;
  /** ha of the upazila in each salinity class, exactly as printed (null when the upazila was not surveyed). */
  classAreasHa: Record<SalinityClass, number> | null;
  /** saline_ha / total_ha of the upazila. SRDI's total area includes uncultivated land, so this is a lower bound. */
  salineShare: number;
  /** Share of the SALINE area held by each class; null when there is no surveyed saline area. */
  classShares: Record<SalinityClass, number> | null;
  /** Area-weighted class midpoint over the saline area (S5 uses its 16.0 dS/m lower bound) — derived from SRDI class areas. */
  repECe: number | null;
  salineHa: number | null;
  totalHa: number | null;
  source: string;
  /** Date the SRDI PDF was fetched and Appendix-2 read — also the date an outside upazila was confirmed absent from it. */
  retrieved: string;
  /** False when the farm's upazila falls outside the SRDI coastal saline survey: the value is absent, not zero-by-measurement. */
  cited: boolean;
  note: string;
}

export interface FarmPack {
  id: string;
  name_en: string;
  name_bn: string;
  district: string;
  district_bn: string;
  division: string;
  division_bn: string;
  lat: number;
  lon: number;
  areaHa: number;
  crop_en: string;
  crop_bn: string;
  growthStage: string;
  soilType: string;
  elevationM: number;
  context: string;
  polygon: [number, number][];
  onset: {
    currentMedianDOY: number;
    historicalMedianDOY: number;
    shiftDays: number;
    pValue: number;
    eraA: number[];
    eraB: number[];
    threshold: string;
  };
  metrics: {
    rainfallTrendPctPerDecade: number;
    heatDays: number;
    heatDaysDelta: number;
    soilMoisturePct: number;
    soilMoistureDelta: number;
    tempC: number;
    tempDelta: number;
    ndvi: number;
    ndviDelta: number;
  };
  season: { current: number[]; previous: number[]; historical: number[] };
  waterAvail: { aman: number; rabi: number; pre: number };
  heatExposure: { aman: number; rabi: number; pre: number };
  soil: { ph: number; texture: string; socPct: number; cec: number; source: "SoilGrids (modeled)" };
  floodProneIndex: number;
  /** 0–1 share of dry-season water demand this farm can cover by pumping. ESTIMATE — demo value per farm, pending citation. */
  irrigation: number;
  salinity: SalinityBlock;
  dataQuality: { smapEra: boolean; soilModeled: boolean; ndviRecordYears: number };
  provenance: ProvEntry[];
}

const DAYS = (base: number, spread: number, n: number, seed: number) =>
  Array.from({ length: n }, (_, i) => {
    const x = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453;
    return Math.round(base + (((x - Math.floor(x)) * 2 - 1) + Math.sin(i + seed) * 0.5) * spread);
  });

const NOT_RETRIEVED = "not yet (demo fixture)";

const PROV = (place: string): ProvEntry[] => [
  { id: "power", name: "NASA POWER", detail: "Daily rainfall, T2M, solar — this farm", version: "API 2.0", retrieved: NOT_RETRIEVED, tier: "NASA", url: "https://power.larc.nasa.gov" },
  { id: "imerg", name: "GPM IMERG", detail: "Gridded precipitation cross-check", version: "v07 Final", retrieved: NOT_RETRIEVED, tier: "NASA", url: "https://gpm.nasa.gov/data/imerg" },
  { id: "smap", name: "SMAP L4", detail: "Root-zone soil moisture", version: "SPL4SMGP.008", retrieved: NOT_RETRIEVED, tier: "NASA", url: "https://smap.jpl.nasa.gov" },
  { id: "modis", name: "MODIS + VIIRS NDVI", detail: "Greenness archive 2000–present", version: "MOD13Q1 061", retrieved: NOT_RETRIEVED, tier: "NASA", url: "https://lpdaac.usgs.gov" },
  { id: "soilgrids", name: "SoilGrids 2.0", detail: `Modeled soil properties — ${place}`, version: "2020 release", retrieved: NOT_RETRIEVED, tier: "Open", url: "https://soilgrids.org" },
  { id: "method", name: "Onset detection", detail: "Deterministic rule, stated in Method", version: "v1.0", retrieved: "—", tier: "Open", url: "/method" },
];

/** Date the SRDI PDF was downloaded and Appendix-2 transcribed — the same date src/acquire/salinity.py writes into public/data/salinity.json. */
const SRDI_RETRIEVED = "2026-09-30";

/** Representative ECe for each SRDI class = midpoint of the printed bounds (S1 2.0–4.0 … S4 12.1–16.0 dS/m);
 *  S5 is ">16.0" so its lower bound 16.0 is used, which makes the derived ECe a lower estimate there.
 *  Mirrors CLASS_REP_ECE in src/acquire/salinity.py, which also publishes it in public/data/salinity.json. */
export const SALINITY_CLASS_ECE: Record<SalinityClass, number> = { S1: 3.0, S2: 6.05, S3: 10.05, S4: 14.05, S5: 16.0 };
export const SALINITY_CLASSES: SalinityClass[] = ["S1", "S2", "S3", "S4", "S5"];
/** The ECe ranges printed in the Appendix-2 header (dS/m); S5 has no upper bound. */
export const SALINITY_CLASS_BOUNDS: Record<SalinityClass, string> = {
  S1: "2.0–4.0",
  S2: "4.1–8.0",
  S3: "8.1–12.0",
  S4: "12.1–16.0",
  S5: ">16.0",
};

/** A surveyed upazila: the class areas are SRDI's printed ha; shares and ECe are derived from them here. */
const srdiSurveyed = (
  district: string,
  upazila: string,
  page: number,
  totalHa: number,
  salineHa: number,
  classAreasHa: Record<SalinityClass, number>,
): SalinityBlock => {
  const classShares = Object.fromEntries(
    SALINITY_CLASSES.map((c) => [c, classAreasHa[c] / salineHa]),
  ) as Record<SalinityClass, number>;
  const repECe = Math.round(SALINITY_CLASSES.reduce((a, c) => a + classShares[c] * SALINITY_CLASS_ECE[c], 0) * 100) / 100;
  return {
    upazila,
    district,
    classAreasHa,
    salineShare: salineHa / totalHa,
    classShares,
    repECe,
    salineHa,
    totalHa,
    source: `SRDI (2010) Saline Soils of Bangladesh, Appendix-2 p.${page} — ${district}/${upazila}`,
    retrieved: SRDI_RETRIEVED,
    cited: true,
    note: "Dry-season classes from the May 2009 survey; salineShare divides by SRDI's total upazila area (which includes uncultivated land), repECe is derived from SRDI class areas.",
  };
};

/** An upazila SRDI never mapped: no value, and never a 0 that reads like a measurement. */
const notSurveyed = (district: string, upazila: string): SalinityBlock => ({
  upazila,
  district,
  classAreasHa: null,
  salineShare: 0,
  classShares: null,
  repECe: null,
  salineHa: null,
  totalHa: null,
  source: "SRDI (2010) Appendix-2 — this upazila is outside the coastal saline survey",
  retrieved: SRDI_RETRIEVED,
  cited: false,
  note: "outside SRDI coastal saline survey area — no measured value exists for this upazila, so salinity is excluded from the score, not scored as zero risk",
});

/**
 * Demo farm packs. ESTIMATE — irrigation access per farm is a hand-set demo value, not a
 * survey figure: Rangpur 0.8 (dense shallow tubewells), Rajshahi 0.7 (Barind deep tubewells,
 * water table falling), Tangail 0.6, Sylhet 0.5, Barishal 0.35 (surface water, tidal),
 * Khulna 0.2 (saline groundwater, unusable in the dry season).
 */
export const FARMS: FarmPack[] = [
  {
    id: "farm-12", name_en: "Farm-12", name_bn: "খামার-১২", district: "Tangail", district_bn: "টাঙ্গাইল", division: "Dhaka Division", division_bn: "ঢাকা বিভাগ",
    lat: 24.2514, lon: 89.9152, areaHa: 2.4, crop_en: "Rice (Aman)", crop_bn: "ধান (আমন)", growthStage: "Vegetative",
    soilType: "Clay Loam", elevationM: 12, context: "Monsoon-fed lowland",
    polygon: [[89.9052, 24.2471], [89.9221, 24.2451], [89.9262, 24.2574], [89.9123, 24.2602], [89.9052, 24.2471]],
    onset: { currentMedianDOY: 178, historicalMedianDOY: 185, shiftDays: -7, pValue: 0.011, eraA: DAYS(185, 9, 12, 3), eraB: DAYS(178, 9, 12, 7), threshold: "7-day window ≥ 20 mm, dry spell ≤ 7 days" },
    metrics: { rainfallTrendPctPerDecade: -3.1, heatDays: 14, heatDaysDelta: 6, soilMoisturePct: 68, soilMoistureDelta: 12, tempC: 26.4, tempDelta: 0.8, ndvi: 0.72, ndviDelta: 0.06 },
    season: { current: [0.12, 0.24, 0.41, 0.58, 0.66, 0.72, 0.69, 0.61, 0.52], previous: [0.1, 0.2, 0.34, 0.5, 0.6, 0.66, 0.64, 0.58, 0.5], historical: [0.11, 0.21, 0.35, 0.52, 0.61, 0.67, 0.65, 0.59, 0.51] },
    waterAvail: { aman: 0.82, rabi: 0.44, pre: 0.5 }, heatExposure: { aman: 0.35, rabi: 0.55, pre: 0.75 },
    soil: { ph: 6.3, texture: "Clay Loam", socPct: 1.1, cec: 18, source: "SoilGrids (modeled)" },
    floodProneIndex: 0.45, irrigation: 0.6, salinity: notSurveyed("Tangail", "Tangail Sadar"), dataQuality: { smapEra: true, soilModeled: true, ndviRecordYears: 24 },
    provenance: PROV("Tangail"),
  },
  {
    id: "rajshahi-07", name_en: "Farm-07", name_bn: "খামার-০৭", district: "Rajshahi", district_bn: "রাজশাহী", division: "Rajshahi Division", division_bn: "রাজশাহী বিভাগ",
    lat: 24.3636, lon: 88.3277, areaHa: 1.7, crop_en: "Rice (Aman)", crop_bn: "ধান (আমন)", growthStage: "Tillering",
    soilType: "Sandy Loam", elevationM: 18, context: "Dry tract — Barind",
    polygon: [[88.3195, 24.3601], [88.3341, 24.3577], [88.3377, 24.3692], [88.3226, 24.3713], [88.3195, 24.3601]],
    onset: { currentMedianDOY: 189, historicalMedianDOY: 178, shiftDays: 11, pValue: 0.008, eraA: DAYS(178, 8, 12, 11), eraB: DAYS(189, 8, 12, 5), threshold: "7-day window ≥ 20 mm, dry spell ≤ 7 days" },
    metrics: { rainfallTrendPctPerDecade: -5.4, heatDays: 21, heatDaysDelta: 9, soilMoisturePct: 41, soilMoistureDelta: -8, tempC: 27.6, tempDelta: 1.1, ndvi: 0.58, ndviDelta: -0.04 },
    season: { current: [0.08, 0.16, 0.3, 0.44, 0.5, 0.55, 0.52, 0.47, 0.41], previous: [0.1, 0.19, 0.33, 0.47, 0.55, 0.6, 0.57, 0.52, 0.45], historical: [0.11, 0.2, 0.36, 0.5, 0.58, 0.63, 0.6, 0.55, 0.48] },
    waterAvail: { aman: 0.62, rabi: 0.3, pre: 0.34 }, heatExposure: { aman: 0.5, rabi: 0.7, pre: 0.9 },
    soil: { ph: 7.4, texture: "Sandy Loam", socPct: 0.7, cec: 12, source: "SoilGrids (modeled)" },
    floodProneIndex: 0.08, irrigation: 0.7, salinity: notSurveyed("Rajshahi", "no ADM3 polygon contains this point"), dataQuality: { smapEra: true, soilModeled: true, ndviRecordYears: 24 },
    provenance: PROV("Rajshahi"),
  },
  {
    id: "barishal-03", name_en: "Farm-03", name_bn: "খামার-০৩", district: "Barishal", district_bn: "বরিশাল", division: "Barishal Division", division_bn: "বরিশাল বিভাগ",
    lat: 22.8486, lon: 90.2512, areaHa: 1.2, crop_en: "Rice (Aman)", crop_bn: "ধান (আমন)", growthStage: "Vegetative",
    soilType: "Silty Clay", elevationM: 3, context: "Coastal wet south",
    polygon: [[90.2444, 22.8441], [90.2578, 22.8421], [90.2614, 22.8552], [90.2471, 22.8571], [90.2444, 22.8441]],
    onset: { currentMedianDOY: 174, historicalMedianDOY: 179, shiftDays: -5, pValue: 0.09, eraA: DAYS(179, 7, 12, 13), eraB: DAYS(174, 7, 12, 17), threshold: "7-day window ≥ 20 mm, dry spell ≤ 7 days" },
    metrics: { rainfallTrendPctPerDecade: 2.2, heatDays: 9, heatDaysDelta: 3, soilMoisturePct: 81, soilMoistureDelta: 4, tempC: 26.1, tempDelta: 0.6, ndvi: 0.76, ndviDelta: 0.02 },
    season: { current: [0.14, 0.28, 0.47, 0.62, 0.7, 0.76, 0.72, 0.66, 0.58], previous: [0.13, 0.26, 0.44, 0.6, 0.68, 0.74, 0.7, 0.64, 0.56], historical: [0.12, 0.25, 0.43, 0.58, 0.66, 0.72, 0.69, 0.63, 0.55] },
    waterAvail: { aman: 0.95, rabi: 0.55, pre: 0.62 }, heatExposure: { aman: 0.22, rabi: 0.4, pre: 0.6 },
    soil: { ph: 6.8, texture: "Silty Clay", socPct: 1.6, cec: 24, source: "SoilGrids (modeled)" },
    floodProneIndex: 0.86, irrigation: 0.35,
    salinity: srdiSurveyed("Barisal", "Wazirpur", 32, 24841, 2000, { S1: 1600, S2: 400, S3: 0, S4: 0, S5: 0 }),
    dataQuality: { smapEra: true, soilModeled: true, ndviRecordYears: 24 },
    provenance: PROV("Barishal"),
  },
  {
    id: "khulna-09", name_en: "Farm-09", name_bn: "খামার-০৯", district: "Khulna", district_bn: "খুলনা", division: "Khulna Division", division_bn: "খুলনা বিভাগ",
    lat: 22.8029, lon: 89.4018, areaHa: 2.0, crop_en: "Rice (Aman)", crop_bn: "ধান (আমন)", growthStage: "Flowering",
    soilType: "Silty Clay Loam", elevationM: 4, context: "Salinity-prone coastal",
    polygon: [[89.3942, 22.7984], [89.4084, 22.7965], [89.4122, 22.8095], [89.3971, 22.8114], [89.3942, 22.7984]],
    onset: { currentMedianDOY: 181, historicalMedianDOY: 184, shiftDays: -3, pValue: 0.21, eraA: DAYS(184, 8, 12, 19), eraB: DAYS(181, 8, 12, 23), threshold: "7-day window ≥ 20 mm, dry spell ≤ 7 days" },
    metrics: { rainfallTrendPctPerDecade: -1.2, heatDays: 12, heatDaysDelta: 4, soilMoisturePct: 71, soilMoistureDelta: 2, tempC: 26.6, tempDelta: 0.7, ndvi: 0.64, ndviDelta: -0.01 },
    season: { current: [0.12, 0.24, 0.4, 0.55, 0.63, 0.68, 0.65, 0.6, 0.52], previous: [0.12, 0.23, 0.39, 0.53, 0.61, 0.66, 0.63, 0.58, 0.5], historical: [0.11, 0.22, 0.38, 0.52, 0.6, 0.65, 0.62, 0.57, 0.49] },
    waterAvail: { aman: 0.85, rabi: 0.42, pre: 0.5 }, heatExposure: { aman: 0.3, rabi: 0.5, pre: 0.72 },
    soil: { ph: 7.1, texture: "Silty Clay Loam", socPct: 1.2, cec: 20, source: "SoilGrids (modeled)" },
    floodProneIndex: 0.64, irrigation: 0.2,
    salinity: srdiSurveyed("Khulna", "Dumuria", 31, 44797, 30610, { S1: 6530, S2: 7010, S3: 7110, S4: 5850, S5: 4110 }),
    dataQuality: { smapEra: true, soilModeled: true, ndviRecordYears: 24 },
    provenance: PROV("Khulna"),
  },
  {
    id: "rangpur-21", name_en: "Farm-21", name_bn: "খামার-২১", district: "Rangpur", district_bn: "রংপুর", division: "Rangpur Division", division_bn: "রংপুর বিভাগ",
    lat: 25.6486, lon: 89.3517, areaHa: 1.9, crop_en: "Rice (Aman)", crop_bn: "ধান (আমন)", growthStage: "Vegetative",
    soilType: "Loam", elevationM: 34, context: "Cooler north",
    polygon: [[89.3438, 25.6438], [89.3584, 25.6417], [89.3622, 25.6552], [89.3468, 25.6572], [89.3438, 25.6438]],
    onset: { currentMedianDOY: 176, historicalMedianDOY: 180, shiftDays: -4, pValue: 0.16, eraA: DAYS(180, 7, 12, 29), eraB: DAYS(176, 7, 12, 31), threshold: "7-day window ≥ 20 mm, dry spell ≤ 7 days" },
    metrics: { rainfallTrendPctPerDecade: -0.8, heatDays: 7, heatDaysDelta: 2, soilMoisturePct: 66, soilMoistureDelta: 3, tempC: 25.4, tempDelta: 0.5, ndvi: 0.7, ndviDelta: 0.03 },
    season: { current: [0.13, 0.25, 0.43, 0.58, 0.66, 0.71, 0.68, 0.62, 0.55], previous: [0.12, 0.24, 0.41, 0.56, 0.64, 0.69, 0.66, 0.6, 0.53], historical: [0.12, 0.23, 0.4, 0.55, 0.63, 0.68, 0.65, 0.59, 0.52] },
    waterAvail: { aman: 0.78, rabi: 0.48, pre: 0.55 }, heatExposure: { aman: 0.2, rabi: 0.35, pre: 0.55 },
    soil: { ph: 5.9, texture: "Loam", socPct: 1.3, cec: 17, source: "SoilGrids (modeled)" },
    floodProneIndex: 0.3, irrigation: 0.8, salinity: notSurveyed("Rangpur", "Mitha Pukur"), dataQuality: { smapEra: true, soilModeled: true, ndviRecordYears: 24 },
    provenance: PROV("Rangpur"),
  },
  {
    id: "sylhet-15", name_en: "Farm-15", name_bn: "খামার-১৫", district: "Sylhet", district_bn: "সিলেট", division: "Sylhet Division", division_bn: "সিলেট বিভাগ",
    lat: 24.8026, lon: 92.0521, areaHa: 1.5, crop_en: "Rice (Aman)", crop_bn: "ধান (আমন)", growthStage: "Vegetative",
    soilType: "Clay Loam", elevationM: 22, context: "High-rainfall northeast",
    polygon: [[92.0438, 24.7978], [92.0584, 24.7957], [92.0622, 24.8092], [92.0468, 24.8112], [92.0438, 24.7978]],
    onset: { currentMedianDOY: 169, historicalMedianDOY: 176, shiftDays: -7, pValue: 0.04, eraA: DAYS(176, 8, 12, 37), eraB: DAYS(169, 8, 12, 41), threshold: "7-day window ≥ 20 mm, dry spell ≤ 7 days" },
    metrics: { rainfallTrendPctPerDecade: 1.8, heatDays: 8, heatDaysDelta: 2, soilMoisturePct: 78, soilMoistureDelta: 5, tempC: 25.7, tempDelta: 0.6, ndvi: 0.74, ndviDelta: 0.01 },
    season: { current: [0.14, 0.27, 0.45, 0.6, 0.68, 0.74, 0.7, 0.64, 0.57], previous: [0.13, 0.25, 0.43, 0.58, 0.66, 0.72, 0.68, 0.62, 0.55], historical: [0.12, 0.24, 0.42, 0.56, 0.64, 0.7, 0.67, 0.61, 0.54] },
    waterAvail: { aman: 0.92, rabi: 0.58, pre: 0.66 }, heatExposure: { aman: 0.24, rabi: 0.38, pre: 0.58 },
    soil: { ph: 5.4, texture: "Clay Loam", socPct: 1.8, cec: 22, source: "SoilGrids (modeled)" },
    floodProneIndex: 0.52, irrigation: 0.5, salinity: notSurveyed("Sylhet", "Golabganj"), dataQuality: { smapEra: true, soilModeled: true, ndviRecordYears: 24 },
    provenance: PROV("Sylhet"),
  },
];

export type SeasonKey = "aman" | "rabi" | "pre";

/**
 * Soil-salinity tolerance from FAO Irrigation and Drainage Paper 29 Rev.1 (Ayers & Westcot 1985),
 * Table 4 "Crop tolerance and yield potential of selected crops as influenced by soil salinity (ECe)",
 * which is Maas & Hoffman (1977) / Maas (1984). Table 4 prints ECe in dS/m at 100 / 90 / 75 / 50 / 0
 * percent yield; the paper's own equation (10) is Y = 100 − b·(ECe − a), so
 *   thresholdECe  = a  = the Table 4 100%-column, and
 *   slopePctPerDs = b  = 100 / (ECe-at-0%-yield − a).
 * Cross-check against the printed intermediate columns: for rice b = 12.5 puts 90% at 3.8 dS/m
 * (published 3.8) and 50% at 7.0 (published 7.2, rounding in the table).
 */
export interface SaltTolerance {
  thresholdECe: number;
  slopePctPerDs: number;
  source: string;
}

/** Crops FAO-29 gives no number for — the reason is recorded so the UI can say so instead of guessing. */
export const SALT_UNCITED: Record<string, string> = {
  mustard: "FAO-29 Table 4 has no mustard row and Table 5 does not list it; Brassica relatives (cabbage 1.8, turnip 0.9 dS/m) are not substituted.",
  lentil: "FAO-29 Table 4 and Table 5 do not list lentil.",
  mungbean: "FAO-29 lists cowpea (Vigna unguiculata) but not mungbean (Vigna radiata).",
  sesame: "FAO-29 Table 5 rates sesame (Sesamum indicum) SENSITIVE but publishes no ECe for it, and the paper gives no numeric curve per class.",
  jute: "FAO-29 Table 4 and Table 5 do not list jute (Corchorus).",
  fallow: "Fallow is idle land, not a crop — no tolerance applies.",
};

const FAO29 = (crop: string, a: number, zero: number) =>
  `FAO Irrigation & Drainage Paper 29 Rev.1 (Ayers & Westcot 1985) Table 4 — ${crop}: ECe ${a} dS/m at 100% yield, ${zero} dS/m at 0% → slope 100/(${zero}−${a})`;

export interface Crop {
  id: string;
  name_en: string;
  name_bn: string;
  /** Botanical family; "none" marks idle fallow, which is not a crop. */
  family: string;
  season: SeasonKey;
  /** Growing days; 0 for fallow, which consumes no part of the season. ESTIMATE — demo durations. */
  durationDays: number;
  /** ESTIMATE — demo food & income value of growing this crop for one season (0–1, idea: BBS yield × farm price, not yet cited). */
  yieldValue: number;
  waterDemand: number;
  heatTol: number;
  floodTol: number;
  nDemand: number;
  nFixing: boolean;
  residueIndex: number;
  phRange: [number, number];
  rootDeep: boolean;
  /** Null where FAO-29 cites no number for the crop (see SALT_UNCITED) — the engine then skips the penalty and says why. */
  salt: SaltTolerance | null;
}

/** ESTIMATE — demo trait values (durations, water demand, tolerances, N and residue indices, yieldValue) pending citation.
 *  The one cited field is `salt`: FAO-29 Table 4 numbers where the paper publishes them, null where it does not. */
export const CROPS: Crop[] = [
  { id: "aman", name_en: "Rice (Aman)", name_bn: "ধান (আমন)", family: "Poaceae", season: "aman", durationDays: 125, yieldValue: 0.8, waterDemand: 0.9, heatTol: 0.55, floodTol: 0.75, nDemand: 0.8, nFixing: false, residueIndex: 0.85, phRange: [5.5, 7.5], rootDeep: false, salt: { thresholdECe: 3.0, slopePctPerDs: 12.5, source: FAO29("Rice (paddy), Oryza sativa", 3.0, 11) } },
  { id: "boro", name_en: "Rice (Boro)", name_bn: "ধান (বোরো)", family: "Poaceae", season: "rabi", durationDays: 140, yieldValue: 0.95, waterDemand: 0.95, heatTol: 0.45, floodTol: 0.4, nDemand: 0.85, nFixing: false, residueIndex: 0.8, phRange: [5.5, 7.5], rootDeep: false, salt: { thresholdECe: 3.0, slopePctPerDs: 12.5, source: FAO29("Rice (paddy), Oryza sativa", 3.0, 11) } },
  { id: "wheat", name_en: "Wheat", name_bn: "গম", family: "Poaceae", season: "rabi", durationDays: 115, yieldValue: 0.7, waterDemand: 0.6, heatTol: 0.35, floodTol: 0.1, nDemand: 0.7, nFixing: false, residueIndex: 0.55, phRange: [6.0, 7.5], rootDeep: true, salt: { thresholdECe: 6.0, slopePctPerDs: 7.14, source: FAO29("Wheat, Triticum aestivum", 6.0, 20) } },
  { id: "maize", name_en: "Maize", name_bn: "ভুট্টা", family: "Poaceae", season: "rabi", durationDays: 120, yieldValue: 0.85, waterDemand: 0.65, heatTol: 0.5, floodTol: 0.15, nDemand: 0.8, nFixing: false, residueIndex: 0.9, phRange: [5.8, 7.5], rootDeep: true, salt: { thresholdECe: 1.7, slopePctPerDs: 12.05, source: FAO29("Corn (maize), Zea mays", 1.7, 10) } },
  { id: "mustard", name_en: "Mustard", name_bn: "সরিষা", family: "Brassicaceae", season: "rabi", durationDays: 90, yieldValue: 0.5, waterDemand: 0.4, heatTol: 0.5, floodTol: 0.1, nDemand: 0.5, nFixing: false, residueIndex: 0.35, phRange: [6.0, 7.5], rootDeep: false, salt: null },
  { id: "lentil", name_en: "Lentil", name_bn: "মসুর", family: "Fabaceae", season: "rabi", durationDays: 105, yieldValue: 0.55, waterDemand: 0.35, heatTol: 0.45, floodTol: 0.1, nDemand: 0.2, nFixing: true, residueIndex: 0.3, phRange: [6.0, 7.8], rootDeep: false, salt: null },
  // ESTIMATE — demo trait values pending citation (duration, demand and tolerances are hand-set).
  { id: "aus", name_en: "Rice (Aus)", name_bn: "ধান (আউশ)", family: "Poaceae", season: "pre", durationDays: 105, yieldValue: 0.6, waterDemand: 0.7, heatTol: 0.6, floodTol: 0.4, nDemand: 0.75, nFixing: false, residueIndex: 0.8, phRange: [5.5, 7.5], rootDeep: false, salt: { thresholdECe: 3.0, slopePctPerDs: 12.5, source: FAO29("Rice (paddy), Oryza sativa — aus is rice", 3.0, 11) } },
  { id: "mungbean", name_en: "Mungbean", name_bn: "মুগ", family: "Fabaceae", season: "pre", durationDays: 70, yieldValue: 0.5, waterDemand: 0.35, heatTol: 0.6, floodTol: 0.15, nDemand: 0.2, nFixing: true, residueIndex: 0.3, phRange: [5.8, 7.5], rootDeep: false, salt: null },
  { id: "sesame", name_en: "Sesame", name_bn: "তিল", family: "Pedaliaceae", season: "pre", durationDays: 85, yieldValue: 0.45, waterDemand: 0.3, heatTol: 0.75, floodTol: 0.2, nDemand: 0.35, nFixing: false, residueIndex: 0.3, phRange: [5.5, 7.5], rootDeep: true, salt: null },
  { id: "jute", name_en: "Jute", name_bn: "পাট", family: "Malvaceae", season: "pre", durationDays: 110, yieldValue: 0.65, waterDemand: 0.8, heatTol: 0.7, floodTol: 0.7, nDemand: 0.6, nFixing: false, residueIndex: 0.95, phRange: [5.5, 7.5], rootDeep: true, salt: null },
  { id: "potato", name_en: "Potato", name_bn: "আলু", family: "Solanaceae", season: "rabi", durationDays: 95, yieldValue: 0.85, waterDemand: 0.6, heatTol: 0.3, floodTol: 0.05, nDemand: 0.6, nFixing: false, residueIndex: 0.25, phRange: [5.0, 6.5], rootDeep: false, salt: { thresholdECe: 1.7, slopePctPerDs: 12.05, source: FAO29("Potato, Solanum tuberosum", 1.7, 10) } },
  // ESTIMATE — idle land, not a crop: it consumes no season days and no water, so fit traits are
  // neutral (0.5) and the engine prices it with an explicit idle-land penalty instead.
  { id: "fallow", name_en: "Fallow", name_bn: "পতিত", family: "none", season: "pre", durationDays: 0, yieldValue: 0.0, waterDemand: 0, heatTol: 0.5, floodTol: 0.5, nDemand: 0, nFixing: false, residueIndex: 0, phRange: [4.5, 8.5], rootDeep: false, salt: null },
];

export const getFarm = (id: string) => FARMS.find((f) => f.id === id) ?? FARMS[0];

export const farmName = (f: FarmPack, lang: Lang) => (lang === "bn" ? f.name_bn : f.name_en);
export const districtName = (f: FarmPack, lang: Lang) => (lang === "bn" ? f.district_bn : f.district);
export const divisionName = (f: FarmPack, lang: Lang) => (lang === "bn" ? f.division_bn : f.division);
export const cropName = (c: Crop, lang: Lang) => (lang === "bn" ? c.name_bn : c.name_en);

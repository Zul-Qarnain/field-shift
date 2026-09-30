import type { Lang } from "./i18n";

export type Tier = "NASA" | "Partner" | "Open" | "You";
export type Source = "fixture" | "cache" | "live";

export interface ProvEntry {
  id: string;
  name: string;
  detail: string;
  detail_bn: string;
  version: string;
  retrieved: string;
  tier: Tier;
  url: string;
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
  context_bn: string;
  polygon: [number, number][];
  onset: {
    currentMedianDOY: number;
    historicalMedianDOY: number;
    shiftDays: number;
    pValue: number;
    eraA: number[];
    eraB: number[];
    threshold: string;
    threshold_bn: string;
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
  dataQuality: { smapEra: boolean; soilModeled: boolean; ndviRecordYears: number };
  provenance: ProvEntry[];
}

const DAYS = (base: number, spread: number, n: number, seed: number) =>
  Array.from({ length: n }, (_, i) => {
    const x = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453;
    return Math.round(base + (((x - Math.floor(x)) * 2 - 1) + Math.sin(i + seed) * 0.5) * spread);
  });

const NOT_RETRIEVED = "not yet (demo fixture)";
/** Onset definition v2 (see docs/science/onset.md). It replaces the fixed 7-day/20 mm rule, which measured as censored in 50–91% of years. */
const ONSET_RULE = "5-day rainfall ≥ local Jun–Sep mean (2001–2025), no break ≥ 10 days under 5 mm";
const ONSET_RULE_BN = "৫ দিনের বৃষ্টি ≥ স্থানীয় জুন–সেপ্টেম্বর গড় (২০০১–২০২৫), পরে ১০ দিনের মধ্যে ৫ মিমির কম বৃষ্টির বিরতি নয়";

const PROV = (place: string): ProvEntry[] => [
  { id: "power", name: "NASA POWER", detail: "Daily rainfall, T2M, solar — this farm", detail_bn: "দৈনিক বৃষ্টি, T2M, সৌর — এই খামার", version: "API 2.0", retrieved: NOT_RETRIEVED, tier: "NASA", url: "https://power.larc.nasa.gov" },
  { id: "imerg", name: "GPM IMERG", detail: "Gridded precipitation cross-check", detail_bn: "গ্রিডেড বৃষ্টিপাতের যাচাই", version: "v07 Final", retrieved: NOT_RETRIEVED, tier: "NASA", url: "https://gpm.nasa.gov/data/imerg" },
  { id: "smap", name: "SMAP L4", detail: "Root-zone soil moisture", detail_bn: "মূল-অঞ্চলের মাটির আর্দ্রতা", version: "SPL4SMGP.008", retrieved: NOT_RETRIEVED, tier: "NASA", url: "https://smap.jpl.nasa.gov" },
  { id: "modis", name: "MODIS + VIIRS NDVI", detail: "Greenness archive 2000–present", detail_bn: "সবুজাভতার সংরক্ষণাগার ২০০০–এখন", version: "MOD13Q1 061", retrieved: NOT_RETRIEVED, tier: "NASA", url: "https://lpdaac.usgs.gov" },
  { id: "soilgrids", name: "SoilGrids 2.0", detail: `Modeled soil properties — ${place}`, detail_bn: `মডেল করা মাটির বৈশিষ্ট্য — ${place}`, version: "2020 release", retrieved: NOT_RETRIEVED, tier: "Open", url: "https://soilgrids.org" },
  { id: "method", name: "Onset detection", detail: "Deterministic rule, stated in Method", detail_bn: "নির্ধারিত নিয়ম, পদ্ধতি পাতায় লেখা", version: "v1.0", retrieved: "—", tier: "Open", url: "/method" },
];

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
    soilType: "Clay Loam", elevationM: 12, context: "Monsoon-fed lowland", context_bn: "বর্ষা-নির্ভর নিচু জমি",
    polygon: [[89.9052, 24.2471], [89.9221, 24.2451], [89.9262, 24.2574], [89.9123, 24.2602], [89.9052, 24.2471]],
    onset: { currentMedianDOY: 178, historicalMedianDOY: 185, shiftDays: -7, pValue: 0.011, eraA: DAYS(185, 9, 12, 3), eraB: DAYS(178, 9, 12, 7), threshold: ONSET_RULE, threshold_bn: ONSET_RULE_BN },
    metrics: { rainfallTrendPctPerDecade: -3.1, heatDays: 14, heatDaysDelta: 6, soilMoisturePct: 68, soilMoistureDelta: 12, tempC: 26.4, tempDelta: 0.8, ndvi: 0.72, ndviDelta: 0.06 },
    season: { current: [0.12, 0.24, 0.41, 0.58, 0.66, 0.72, 0.69, 0.61, 0.52], previous: [0.1, 0.2, 0.34, 0.5, 0.6, 0.66, 0.64, 0.58, 0.5], historical: [0.11, 0.21, 0.35, 0.52, 0.61, 0.67, 0.65, 0.59, 0.51] },
    waterAvail: { aman: 0.82, rabi: 0.44, pre: 0.5 }, heatExposure: { aman: 0.35, rabi: 0.55, pre: 0.75 },
    soil: { ph: 6.3, texture: "Clay Loam", socPct: 1.1, cec: 18, source: "SoilGrids (modeled)" },
    floodProneIndex: 0.45, irrigation: 0.6, dataQuality: { smapEra: true, soilModeled: true, ndviRecordYears: 24 },
    provenance: PROV("Tangail"),
  },
  {
    id: "rajshahi-07", name_en: "Farm-07", name_bn: "খামার-০৭", district: "Rajshahi", district_bn: "রাজশাহী", division: "Rajshahi Division", division_bn: "রাজশাহী বিভাগ",
    lat: 24.3636, lon: 88.3277, areaHa: 1.7, crop_en: "Rice (Aman)", crop_bn: "ধান (আমন)", growthStage: "Tillering",
    soilType: "Sandy Loam", elevationM: 18, context: "Dry tract — Barind", context_bn: "শুকনো অঞ্চল — বারেন্ড",
    polygon: [[88.3195, 24.3601], [88.3341, 24.3577], [88.3377, 24.3692], [88.3226, 24.3713], [88.3195, 24.3601]],
    onset: { currentMedianDOY: 189, historicalMedianDOY: 178, shiftDays: 11, pValue: 0.008, eraA: DAYS(178, 8, 12, 11), eraB: DAYS(189, 8, 12, 5), threshold: ONSET_RULE, threshold_bn: ONSET_RULE_BN },
    metrics: { rainfallTrendPctPerDecade: -5.4, heatDays: 21, heatDaysDelta: 9, soilMoisturePct: 41, soilMoistureDelta: -8, tempC: 27.6, tempDelta: 1.1, ndvi: 0.58, ndviDelta: -0.04 },
    season: { current: [0.08, 0.16, 0.3, 0.44, 0.5, 0.55, 0.52, 0.47, 0.41], previous: [0.1, 0.19, 0.33, 0.47, 0.55, 0.6, 0.57, 0.52, 0.45], historical: [0.11, 0.2, 0.36, 0.5, 0.58, 0.63, 0.6, 0.55, 0.48] },
    waterAvail: { aman: 0.62, rabi: 0.3, pre: 0.34 }, heatExposure: { aman: 0.5, rabi: 0.7, pre: 0.9 },
    soil: { ph: 7.4, texture: "Sandy Loam", socPct: 0.7, cec: 12, source: "SoilGrids (modeled)" },
    floodProneIndex: 0.08, irrigation: 0.7, dataQuality: { smapEra: true, soilModeled: true, ndviRecordYears: 24 },
    provenance: PROV("Rajshahi"),
  },
  {
    id: "barishal-03", name_en: "Farm-03", name_bn: "খামার-০৩", district: "Barishal", district_bn: "বরিশাল", division: "Barishal Division", division_bn: "বরিশাল বিভাগ",
    lat: 22.8486, lon: 90.2512, areaHa: 1.2, crop_en: "Rice (Aman)", crop_bn: "ধান (আমন)", growthStage: "Vegetative",
    soilType: "Silty Clay", elevationM: 3, context: "Coastal wet south", context_bn: "আর্দ্র দক্ষিণ উপকূল",
    polygon: [[90.2444, 22.8441], [90.2578, 22.8421], [90.2614, 22.8552], [90.2471, 22.8571], [90.2444, 22.8441]],
    onset: { currentMedianDOY: 174, historicalMedianDOY: 179, shiftDays: -5, pValue: 0.09, eraA: DAYS(179, 7, 12, 13), eraB: DAYS(174, 7, 12, 17), threshold: ONSET_RULE, threshold_bn: ONSET_RULE_BN },
    metrics: { rainfallTrendPctPerDecade: 2.2, heatDays: 9, heatDaysDelta: 3, soilMoisturePct: 81, soilMoistureDelta: 4, tempC: 26.1, tempDelta: 0.6, ndvi: 0.76, ndviDelta: 0.02 },
    season: { current: [0.14, 0.28, 0.47, 0.62, 0.7, 0.76, 0.72, 0.66, 0.58], previous: [0.13, 0.26, 0.44, 0.6, 0.68, 0.74, 0.7, 0.64, 0.56], historical: [0.12, 0.25, 0.43, 0.58, 0.66, 0.72, 0.69, 0.63, 0.55] },
    waterAvail: { aman: 0.95, rabi: 0.55, pre: 0.62 }, heatExposure: { aman: 0.22, rabi: 0.4, pre: 0.6 },
    soil: { ph: 6.8, texture: "Silty Clay", socPct: 1.6, cec: 24, source: "SoilGrids (modeled)" },
    floodProneIndex: 0.86, irrigation: 0.35, dataQuality: { smapEra: true, soilModeled: true, ndviRecordYears: 24 },
    provenance: PROV("Barishal"),
  },
  {
    id: "khulna-09", name_en: "Farm-09", name_bn: "খামার-০৯", district: "Khulna", district_bn: "খুলনা", division: "Khulna Division", division_bn: "খুলনা বিভাগ",
    lat: 22.8029, lon: 89.4018, areaHa: 2.0, crop_en: "Rice (Aman)", crop_bn: "ধান (আমন)", growthStage: "Flowering",
    soilType: "Silty Clay Loam", elevationM: 4, context: "Salinity-prone coastal", context_bn: "লবণাক্ততা-ঝুঁকিপূর্ণ উপকূল",
    polygon: [[89.3942, 22.7984], [89.4084, 22.7965], [89.4122, 22.8095], [89.3971, 22.8114], [89.3942, 22.7984]],
    onset: { currentMedianDOY: 181, historicalMedianDOY: 184, shiftDays: -3, pValue: 0.21, eraA: DAYS(184, 8, 12, 19), eraB: DAYS(181, 8, 12, 23), threshold: ONSET_RULE, threshold_bn: ONSET_RULE_BN },
    metrics: { rainfallTrendPctPerDecade: -1.2, heatDays: 12, heatDaysDelta: 4, soilMoisturePct: 71, soilMoistureDelta: 2, tempC: 26.6, tempDelta: 0.7, ndvi: 0.64, ndviDelta: -0.01 },
    season: { current: [0.12, 0.24, 0.4, 0.55, 0.63, 0.68, 0.65, 0.6, 0.52], previous: [0.12, 0.23, 0.39, 0.53, 0.61, 0.66, 0.63, 0.58, 0.5], historical: [0.11, 0.22, 0.38, 0.52, 0.6, 0.65, 0.62, 0.57, 0.49] },
    waterAvail: { aman: 0.85, rabi: 0.42, pre: 0.5 }, heatExposure: { aman: 0.3, rabi: 0.5, pre: 0.72 },
    soil: { ph: 7.1, texture: "Silty Clay Loam", socPct: 1.2, cec: 20, source: "SoilGrids (modeled)" },
    floodProneIndex: 0.64, irrigation: 0.2, dataQuality: { smapEra: true, soilModeled: true, ndviRecordYears: 24 },
    provenance: PROV("Khulna"),
  },
  {
    id: "rangpur-21", name_en: "Farm-21", name_bn: "খামার-২১", district: "Rangpur", district_bn: "রংপুর", division: "Rangpur Division", division_bn: "রংপুর বিভাগ",
    lat: 25.6486, lon: 89.3517, areaHa: 1.9, crop_en: "Rice (Aman)", crop_bn: "ধান (আমন)", growthStage: "Vegetative",
    soilType: "Loam", elevationM: 34, context: "Cooler north", context_bn: "শীতল উত্তর",
    polygon: [[89.3438, 25.6438], [89.3584, 25.6417], [89.3622, 25.6552], [89.3468, 25.6572], [89.3438, 25.6438]],
    onset: { currentMedianDOY: 176, historicalMedianDOY: 180, shiftDays: -4, pValue: 0.16, eraA: DAYS(180, 7, 12, 29), eraB: DAYS(176, 7, 12, 31), threshold: ONSET_RULE, threshold_bn: ONSET_RULE_BN },
    metrics: { rainfallTrendPctPerDecade: -0.8, heatDays: 7, heatDaysDelta: 2, soilMoisturePct: 66, soilMoistureDelta: 3, tempC: 25.4, tempDelta: 0.5, ndvi: 0.7, ndviDelta: 0.03 },
    season: { current: [0.13, 0.25, 0.43, 0.58, 0.66, 0.71, 0.68, 0.62, 0.55], previous: [0.12, 0.24, 0.41, 0.56, 0.64, 0.69, 0.66, 0.6, 0.53], historical: [0.12, 0.23, 0.4, 0.55, 0.63, 0.68, 0.65, 0.59, 0.52] },
    waterAvail: { aman: 0.78, rabi: 0.48, pre: 0.55 }, heatExposure: { aman: 0.2, rabi: 0.35, pre: 0.55 },
    soil: { ph: 5.9, texture: "Loam", socPct: 1.3, cec: 17, source: "SoilGrids (modeled)" },
    floodProneIndex: 0.3, irrigation: 0.8, dataQuality: { smapEra: true, soilModeled: true, ndviRecordYears: 24 },
    provenance: PROV("Rangpur"),
  },
  {
    id: "sylhet-15", name_en: "Farm-15", name_bn: "খামার-১৫", district: "Sylhet", district_bn: "সিলেট", division: "Sylhet Division", division_bn: "সিলেট বিভাগ",
    lat: 24.8026, lon: 92.0521, areaHa: 1.5, crop_en: "Rice (Aman)", crop_bn: "ধান (আমন)", growthStage: "Vegetative",
    soilType: "Clay Loam", elevationM: 22, context: "High-rainfall northeast", context_bn: "প্রচুর বৃষ্টির উত্তর-পূর্বাঞ্চল",
    polygon: [[92.0438, 24.7978], [92.0584, 24.7957], [92.0622, 24.8092], [92.0468, 24.8112], [92.0438, 24.7978]],
    onset: { currentMedianDOY: 169, historicalMedianDOY: 176, shiftDays: -7, pValue: 0.04, eraA: DAYS(176, 8, 12, 37), eraB: DAYS(169, 8, 12, 41), threshold: ONSET_RULE, threshold_bn: ONSET_RULE_BN },
    metrics: { rainfallTrendPctPerDecade: 1.8, heatDays: 8, heatDaysDelta: 2, soilMoisturePct: 78, soilMoistureDelta: 5, tempC: 25.7, tempDelta: 0.6, ndvi: 0.74, ndviDelta: 0.01 },
    season: { current: [0.14, 0.27, 0.45, 0.6, 0.68, 0.74, 0.7, 0.64, 0.57], previous: [0.13, 0.25, 0.43, 0.58, 0.66, 0.72, 0.68, 0.62, 0.55], historical: [0.12, 0.24, 0.42, 0.56, 0.64, 0.7, 0.67, 0.61, 0.54] },
    waterAvail: { aman: 0.92, rabi: 0.58, pre: 0.66 }, heatExposure: { aman: 0.24, rabi: 0.38, pre: 0.58 },
    soil: { ph: 5.4, texture: "Clay Loam", socPct: 1.8, cec: 22, source: "SoilGrids (modeled)" },
    floodProneIndex: 0.52, irrigation: 0.5, dataQuality: { smapEra: true, soilModeled: true, ndviRecordYears: 24 },
    provenance: PROV("Sylhet"),
  },
];

export type SeasonKey = "aman" | "rabi" | "pre";

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
  /**
   * ESTIMATE — demo staple-food share of this crop's season (0–1): how much of the household's own
   * food base it puts on the table rather than on the market. Rice seasons sit on top because milled
   * rice is the Bangladeshi calorie base and Boro is the highest-yielding rice season of the three
   * (a cash crop like potato or jute earns money but does not fill the family store); pulses carry a
   * mid-range credit as the staple dal protein; oilseeds and fibre score low. The intended source is
   * BBS crop production and household-expenditure statistics — not retrieved in this build (see /data).
   */
  stapleIndex: number;
  waterDemand: number;
  heatTol: number;
  floodTol: number;
  nDemand: number;
  nFixing: boolean;
  residueIndex: number;
  phRange: [number, number];
  rootDeep: boolean;
}

/** ESTIMATE — demo trait values (durations, water demand, tolerances, N and residue indices, yieldValue, stapleIndex) pending citation. */
export const CROPS: Crop[] = [
  { id: "aman", name_en: "Rice (Aman)", name_bn: "ধান (আমন)", family: "Poaceae", season: "aman", durationDays: 125, yieldValue: 0.8, stapleIndex: 0.9, waterDemand: 0.9, heatTol: 0.55, floodTol: 0.75, nDemand: 0.8, nFixing: false, residueIndex: 0.85, phRange: [5.5, 7.5], rootDeep: false },
  // Boro sits at the top of this demo income table: it is the highest-yielding rice season, the one the
  // irrigated north actually plants first, and it is both the household's grain base and a marketable surplus.
  { id: "boro", name_en: "Rice (Boro)", name_bn: "ধান (বোরো)", family: "Poaceae", season: "rabi", durationDays: 140, yieldValue: 1.0, stapleIndex: 1.0, waterDemand: 0.95, heatTol: 0.45, floodTol: 0.4, nDemand: 0.85, nFixing: false, residueIndex: 0.8, phRange: [5.5, 7.5], rootDeep: false },
  { id: "wheat", name_en: "Wheat", name_bn: "গম", family: "Poaceae", season: "rabi", durationDays: 115, yieldValue: 0.7, stapleIndex: 0.5, waterDemand: 0.6, heatTol: 0.35, floodTol: 0.1, nDemand: 0.7, nFixing: false, residueIndex: 0.55, phRange: [6.0, 7.5], rootDeep: true },
  { id: "maize", name_en: "Maize", name_bn: "ভুট্টা", family: "Poaceae", season: "rabi", durationDays: 120, yieldValue: 0.7, stapleIndex: 0.4, waterDemand: 0.65, heatTol: 0.5, floodTol: 0.15, nDemand: 0.8, nFixing: false, residueIndex: 0.9, phRange: [5.8, 7.5], rootDeep: true },
  { id: "mustard", name_en: "Mustard", name_bn: "সরিষা", family: "Brassicaceae", season: "rabi", durationDays: 90, yieldValue: 0.5, stapleIndex: 0.2, waterDemand: 0.4, heatTol: 0.5, floodTol: 0.1, nDemand: 0.5, nFixing: false, residueIndex: 0.35, phRange: [6.0, 7.5], rootDeep: false },
  { id: "lentil", name_en: "Lentil", name_bn: "মসুর", family: "Fabaceae", season: "rabi", durationDays: 105, yieldValue: 0.55, stapleIndex: 0.5, waterDemand: 0.35, heatTol: 0.45, floodTol: 0.1, nDemand: 0.2, nFixing: true, residueIndex: 0.3, phRange: [6.0, 7.8], rootDeep: false },
  // ESTIMATE — demo trait values pending citation (duration, demand and tolerances are hand-set).
  { id: "aus", name_en: "Rice (Aus)", name_bn: "ধান (আউশ)", family: "Poaceae", season: "pre", durationDays: 105, yieldValue: 0.6, stapleIndex: 0.7, waterDemand: 0.7, heatTol: 0.6, floodTol: 0.4, nDemand: 0.75, nFixing: false, residueIndex: 0.8, phRange: [5.5, 7.5], rootDeep: false },
  { id: "mungbean", name_en: "Mungbean", name_bn: "মুগ", family: "Fabaceae", season: "pre", durationDays: 70, yieldValue: 0.5, stapleIndex: 0.45, waterDemand: 0.35, heatTol: 0.6, floodTol: 0.15, nDemand: 0.2, nFixing: true, residueIndex: 0.3, phRange: [5.8, 7.5], rootDeep: false },
  { id: "sesame", name_en: "Sesame", name_bn: "তিল", family: "Pedaliaceae", season: "pre", durationDays: 85, yieldValue: 0.45, stapleIndex: 0.15, waterDemand: 0.3, heatTol: 0.75, floodTol: 0.2, nDemand: 0.35, nFixing: false, residueIndex: 0.3, phRange: [5.5, 7.5], rootDeep: true },
  { id: "jute", name_en: "Jute", name_bn: "পাট", family: "Malvaceae", season: "pre", durationDays: 110, yieldValue: 0.65, stapleIndex: 0.0, waterDemand: 0.8, heatTol: 0.7, floodTol: 0.7, nDemand: 0.6, nFixing: false, residueIndex: 0.95, phRange: [5.5, 7.5], rootDeep: true },
  // Potato keeps a solid cash-crop income but the lowest staple credit of the food crops: it is grown for
  // the market and the cold chain, not as the household's grain base.
  { id: "potato", name_en: "Potato", name_bn: "আলু", family: "Solanaceae", season: "rabi", durationDays: 95, yieldValue: 0.75, stapleIndex: 0.2, waterDemand: 0.6, heatTol: 0.3, floodTol: 0.05, nDemand: 0.6, nFixing: false, residueIndex: 0.25, phRange: [5.0, 6.5], rootDeep: false },
  // ESTIMATE — idle land, not a crop: it consumes no season days and no water, so fit traits are
  // neutral (0.5) and the engine prices it with an explicit idle-land penalty instead.
  { id: "fallow", name_en: "Fallow", name_bn: "পতিত", family: "none", season: "pre", durationDays: 0, yieldValue: 0.0, stapleIndex: 0.0, waterDemand: 0, heatTol: 0.5, floodTol: 0.5, nDemand: 0, nFixing: false, residueIndex: 0, phRange: [4.5, 8.5], rootDeep: false },
];

export const getFarm = (id: string) => FARMS.find((f) => f.id === id) ?? FARMS[0];

export const farmName = (f: FarmPack, lang: Lang) => (lang === "bn" ? f.name_bn : f.name_en);
export const districtName = (f: FarmPack, lang: Lang) => (lang === "bn" ? f.district_bn : f.district);
export const divisionName = (f: FarmPack, lang: Lang) => (lang === "bn" ? f.division_bn : f.division);
export const cropName = (c: Crop, lang: Lang) => (lang === "bn" ? c.name_bn : c.name_en);
export const farmContext = (f: FarmPack, lang: Lang) => (lang === "bn" ? f.context_bn : f.context);
export const onsetRule = (f: FarmPack, lang: Lang) => (lang === "bn" ? f.onset.threshold_bn : f.onset.threshold);
export const provDetail = (p: ProvEntry, lang: Lang) => (lang === "bn" ? p.detail_bn : p.detail);

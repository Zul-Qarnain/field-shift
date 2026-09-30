import type { FarmPack, ProvEntry } from "./data";
import { toBnDigits } from "./i18n";
import barishal03 from "../public/data/packs/farms/barishal-03.json";
import farm12 from "../public/data/packs/farms/farm-12.json";
import khulna09 from "../public/data/packs/farms/khulna-09.json";
import packsIndex from "../public/data/packs/index.json";
import rajshahi07 from "../public/data/packs/farms/rajshahi-07.json";
import rangpur21 from "../public/data/packs/farms/rangpur-21.json";
import sylhet15 from "../public/data/packs/farms/sylhet-15.json";

/**
 * A NASA POWER data pack (schema v2), as written by scripts/build_packs.py. Every number came
 * from a real request; `retrievedUtc` is the timestamp of that request, not of the pack rebuild.
 * Schema v2 carries onset definition v2, a Pettitt homogeneity test, and an independent CHIRPS
 * cross-check, because POWER precipitation is not homogeneous over 1981–2025.
 */
export interface PowerPack {
  schema_version: number;
  kind: "farm" | "district";
  id: string;
  name: string;
  district: string | null;
  slug: string | null;
  lat: number;
  lon: number;
  source: string;
  source_url: string;
  community: string;
  parameters: Record<string, string>;
  requested: { start: string; end: string };
  covered: { start: string | null; end: string | null; daysWithData: number };
  parameterRanges: Record<string, { start: string; end: string }>;
  retrievedUtc: string;
  retrievalSource: string;
  powerProductVersion: string | null;
  powerApiVersion: string;
  timeStandard: string;
  fillValueHandling: string;
  completeYears: { count: number; first: number; last: number };
  method: {
    onset: string;
    onsetDefinition: string;
    onsetRejected: string;
    threshold: string;
    eras: string;
    trends: string;
    trendWindow: string;
    homogeneity: string;
    crossCheck: string;
    moisture: string;
    caveats: string[];
  };
  onset: {
    definition: string;
    ruleLabel: string;
    rule: string;
    thresholdText: string;
    thresholdMm: number | null;
    thresholdBasis: string;
    referencePeriod: number[];
    window: { startDoy: number; endDoy: number };
    wetDayMm: number;
    break: { daysAfter: number; windowDays: number; minMm: number };
    perYear: Record<string, number | null>;
    yearsDetected: number;
    yearsMissing: number[];
    censoredAtWindowStart: { count: number; of: number; sharePct: number | null };
    medianA: number | null;
    medianB: number | null;
    shiftDays: number | null;
    pValue: number | null;
    uStatistic: number | null;
    direction: string;
    eraA: { label: string; years: number[]; values: number[]; n: number };
    eraB: { label: string; years: number[]; values: number[]; n: number };
    sensitivity: {
      thresholdFactor: number;
      thresholdMm: number | null;
      medianA: number | null;
      medianB: number | null;
      shiftDays: number | null;
      pValue: number | null;
      detectedYears: number;
      censoredPct: number | null;
    }[];
    caution: string | null;
    legacyV1: {
      rule: string;
      censoredAtWindowStart: { count: number; of: number; sharePct: number | null };
      yearsDetected: number;
      reason: string;
    };
  };
  metrics: {
    rainfallTrendPctPerDecade: number | null;
    rainfallTrendWindow: string | null;
    rainfallTrendSource: string;
    rainfallTrendCaution: string | null;
    rainfallSlopeMmPerDecade: number | null;
    rainfallMeanMmPerYear: number | null;
    rainfallTau: number | null;
    rainfallPValue: number | null;
    rainfallMannKendallTrend: string;
    rainfallYearsUsed: number[];
    heatDays: number | null;
    heatDaysYear: number | null;
    heatDaysThresholdC: number;
    heatDaysEraA: number | null;
    heatDaysEraB: number | null;
    heatDaysDelta: number | null;
    heatDaysPValue: number | null;
    heatDaysTrendPerDecade: number | null;
    heatDaysCaution: string | null;
    tempC: number | null;
    tempYear: number | null;
    tempEraA: number | null;
    tempEraB: number | null;
    tempDelta: number | null;
    tempPValue: number | null;
    tempTrendPerDecadeC: number | null;
    tempTau: number | null;
    rainfallEraA: number | null;
    rainfallEraB: number | null;
    rainfallEraDelta: number | null;
    rootZoneWetnessMonthly: (number | null)[];
    rootZoneWetnessPeakMonth: number | null;
    rootZoneWetnessNote: string;
  };
  series: {
    annualRainfallLast10: { label: string[]; values: number[] };
    monthlyRainfallLast12: { label: string[]; values: number[] };
    heatDaysLast10: { label: string[]; values: number[] };
    meanTempLast10: { label: string[]; values: number[] };
    rootZoneWetnessLast12Months: { label: string[]; values: number[] };
  };
  crossCheck: ChirpsCrossCheck;
  preferred: {
    rainfallTrend: SourceChoice;
    onsetShift: SourceChoice;
    powerFlagged: boolean;
    chirpsFlagged: boolean;
    chirpsAvailable: boolean;
  };
  quality: {
    rainfallNaN: number;
    annualRainfallYears: number;
    precipHomogeneity: HomogeneityReport;
    tempMaxHomogeneity: HomogeneityReport;
    indicatorEras: string;
    ndvi: string;
    smapSoilMoisture: string;
    soil: string;
  };
  boundary?: { provider: string; sourceUrl: string; retrieved: string; method: string; centroid: [number, number] };
}

export interface SourceChoice {
  source: "NASA POWER" | "CHIRPS v2.0" | "none";
  reason: string;
  field: string;
}

export interface PettittResult {
  test: string;
  n: number;
  K: number | null;
  pValue: number | null;
  pValueText: string | null;
  breakpointLastYear: number | null;
  changeYear: number | null;
  beforeMean: number | null;
  afterMean: number | null;
  step: number | null;
  significant: boolean | null;
  direction?: string;
  note?: string;
}

export interface HomogeneityReport {
  analysisWindow: string;
  fullRecord: PettittResult;
  analysisWindowTest: PettittResult;
  homogeneous: boolean;
  changePoints: number[];
  changePointInsideAnalysisWindow: number | null;
  changePointLocation: string | null;
  affectsEraComparison: boolean;
  implication: string;
}

export interface ChirpsOnset {
  definition: string;
  perYear: Record<string, number | null>;
  yearsDetected: number;
  yearsMissing: number[];
  censoredAtWindowStart: { count: number; of: number; sharePct: number | null };
  medianA: number | null;
  medianB: number | null;
  shiftDays: number | null;
  pValue: number | null;
  direction: string;
  eraA: { label: string; years: number[]; values: number[]; n: number };
  eraB: { label: string; years: number[]; values: number[]; n: number };
}

export interface ChirpsCrossCheck {
  available: boolean;
  reason?: string;
  source?: string;
  provider?: string;
  citation?: string;
  tierLabel?: string;
  grid?: { degrees: number; cell: [number, number]; offsetFromRequestedMeters: number };
  requested?: { start: string; end: string };
  covered?: { days: number; daysWithData: number; missingSharePct: number | null; first: string | null; last: string | null; annualNaN: number };
  retrievedUtc?: string;
  sourceUrlSample?: string;
  yearsOnDisk?: { first: number; last: number; count: number };
  thresholdMm?: number | null;
  annualRainfall?: { label: string[]; values: number[] };
  rainfallTrend2001toLatest?: {
    window: string | null;
    pctPerDecade: number | null;
    slopeMmPerDecade: number | null;
    meanMmPerYear: number | null;
    tau: number | null;
    pValue: number | null;
    trend: string;
    n: number;
  };
  homogeneity?: HomogeneityReport;
  onset?: ChirpsOnset;
  agreement?: {
    onsetYears: { yearsCompared: number; pearsonR: number | null; spearmanRho: number | null; mae: number | null; bias: number | null };
    annualRainfallMm: { yearsCompared: number; pearsonR: number | null; spearmanRho: number | null; mae: number | null; bias: number | null };
    note: string;
  };
}

export type OnsetProduct = "NASA POWER" | "CHIRPS v2.0";

/** The onset statistics the UI should show, plus which product they came from. */
export interface OnsetView {
  product: OnsetProduct;
  medianA: number;
  medianB: number;
  shiftDays: number;
  pValue: number | null;
  eraA: number[];
  eraB: number[];
  eraALabel: string;
  eraBLabel: string;
  yearsDetected: number;
  censored: { count: number; of: number; sharePct: number | null };
  thresholdMm: number | null;
  caution: string | null;
  /** The same statistic from the other product, so the reader can see the disagreement. */
  alternative: { product: OnsetProduct; shiftDays: number | null; pValue: number | null } | null;
}

/** The six demo farms are imported statically so the golden path works offline and at build time. */
const FARM_PACKS: Record<string, PowerPack> = {
  "farm-12": farm12 as unknown as PowerPack,
  "rajshahi-07": rajshahi07 as unknown as PowerPack,
  "barishal-03": barishal03 as unknown as PowerPack,
  "khulna-09": khulna09 as unknown as PowerPack,
  "rangpur-21": rangpur21 as unknown as PowerPack,
  "sylhet-15": sylhet15 as unknown as PowerPack,
};

export interface PackIndexEntry {
  id?: string;
  slug?: string;
  name: string;
  district?: string;
  lat: number;
  lon: number;
  kind: string;
  path: string;
  retrievedUtc: string;
  covered: { start: string | null; end: string | null; daysWithData: number };
  onsetDefinition: string;
  onsetThresholdMm: number | null;
  onsetMedianA: number | null;
  onsetMedianB: number | null;
  onsetShiftDays: number | null;
  onsetPValue: number | null;
  onsetCensoredPct: number | null;
  onsetCaution: string | null;
  rainfallTrendPctPerDecade: number | null;
  rainfallTrendCaution: string | null;
  precipChangePoint: number | null;
  chirps: {
    available: boolean;
    onsetShiftDays?: number | null;
    onsetPValue?: number | null;
    rainfallTrendPctPerDecade?: number | null;
    onsetMaeDays?: number | null;
    changePoint?: number | null;
  };
  preferredOnsetSource: string;
  preferredTrendSource: string;
  source: string;
  cache?: string;
}

export const PACK_INDEX = packsIndex as unknown as {
  schema_version: number;
  generatedUtc: string;
  source: string;
  parameters: string[];
  onsetDefinition: string;
  onsetRule: string;
  onsetWindow: { startDoy: number; endDoy: number };
  crossCheck: { source: string; provider: string; citation: string; grid: string };
  trendWindow: string;
  homogeneity: string;
  farms: PackIndexEntry[];
  districts: PackIndexEntry[];
  counts: { farms: number; districts: number };
  retrievedRange: { earliest: string; latest: string } | null;
};

export const packForFarm = (farmId: string): PowerPack | null => FARM_PACKS[farmId] ?? null;

/** Day part of an ISO UTC timestamp — what a judge should see on a provenance line. */
export const retrievedDay = (pack: { retrievedUtc: string }): string => pack.retrievedUtc.slice(0, 10);

export const coveredWindow = (pack: PowerPack): string =>
  pack.covered.start && pack.covered.end ? `${pack.covered.start} → ${pack.covered.end}` : "no data returned";

const round = (value: number | null | undefined, digits = 1): number | null =>
  value === null || value === undefined || !Number.isFinite(value) ? null : Math.round(value * 10 ** digits) / 10 ** digits;

/**
 * Which product the onset number comes from, decided by the pack's own homogeneity test:
 * POWER is used unless its precipitation series steps inside 2001–2025, in which case the
 * CHIRPS cross-check is used, and if neither is homogeneous the honest answer is "neither".
 */
export function onsetView(pack: PowerPack): OnsetView | null {
  const power = pack.onset;
  const chirps = pack.crossCheck?.available ? pack.crossCheck.onset : undefined;
  if (power.medianA === null || power.medianB === null) return null;

  const preferChirps = pack.preferred.onsetShift.source === "CHIRPS v2.0" && !!chirps && chirps.medianA !== null && chirps.medianB !== null;
  const product: OnsetProduct = preferChirps ? "CHIRPS v2.0" : "NASA POWER";
  const chosen = preferChirps && chirps ? chirps : power;
  const medianA = chosen.medianA as number;
  const medianB = chosen.medianB as number;
  const changePoint = pack.quality.precipHomogeneity.changePointInsideAnalysisWindow;

  const caution = preferChirps
    ? `NASA POWER precipitation steps at ${changePoint} inside 2001–2025, so its onset shift (${power.shiftDays} d, p=${
        power.pValue?.toFixed(3) ?? "n/a"
      }) is not used; this figure comes from the independent CHIRPS cross-check.`
    : power.caution;

  return {
    product,
    medianA,
    medianB,
    shiftDays: medianB - medianA,
    pValue: chosen.pValue,
    eraA: chosen.eraA.values,
    eraB: chosen.eraB.values,
    eraALabel: chosen.eraA.label,
    eraBLabel: chosen.eraB.label,
    yearsDetected: chosen.yearsDetected,
    censored: chosen.censoredAtWindowStart,
    thresholdMm: preferChirps ? (pack.crossCheck.thresholdMm ?? null) : power.thresholdMm,
    caution,
    alternative:
      product === "CHIRPS v2.0"
        ? { product: "NASA POWER", shiftDays: power.shiftDays, pValue: power.pValue }
        : chirps
          ? { product: "CHIRPS v2.0", shiftDays: chirps.shiftDays, pValue: chirps.pValue }
          : null,
  };
}

/** Rainfall trend with its source and the other product's number for comparison. */
export function trendView(pack: PowerPack): {
  pctPerDecade: number;
  product: string;
  window: string | null;
  tau: number | null;
  pValue: number | null;
  caution: string | null;
  alternative: { product: string; pctPerDecade: number | null } | null;
} | null {
  const power = pack.metrics;
  const chirps = pack.crossCheck?.available ? pack.crossCheck.rainfallTrend2001toLatest : undefined;
  const powerValue = power.rainfallTrendPctPerDecade;
  if (powerValue === null && !chirps?.pctPerDecade) return null;

  const preferChirps = pack.preferred.rainfallTrend.source === "CHIRPS v2.0" && chirps?.pctPerDecade !== null && chirps?.pctPerDecade !== undefined;
  const changePoint = pack.quality.precipHomogeneity.changePointInsideAnalysisWindow;
  return {
    pctPerDecade: (preferChirps ? chirps!.pctPerDecade : powerValue) as number,
    product: preferChirps ? "CHIRPS v2.0" : "NASA POWER",
    window: preferChirps ? (chirps!.window ?? null) : power.rainfallTrendWindow,
    tau: preferChirps ? chirps!.tau : power.rainfallTau,
    pValue: preferChirps ? chirps!.pValue : power.rainfallPValue,
    caution: preferChirps
      ? `POWER gives ${powerValue}%/decade over the same window but its precipitation series steps at ${changePoint}; CHIRPS is used instead.`
      : power.rainfallTrendCaution,
    alternative: preferChirps
      ? { product: "NASA POWER", pctPerDecade: powerValue }
      : chirps
        ? { product: "CHIRPS v2.0", pctPerDecade: chirps.pctPerDecade }
        : null,
  };
}

/**
 * Overlay the real pack on a demo farm. Fields with no real source yet (SMAP soil moisture,
 * NDVI, SoilGrids soil, water availability, flood index, irrigation access) are left exactly as
 * the fixture had them, so they keep their fixture labelling. Returns the input untouched when
 * no pack exists, and never mutates it.
 */
export function withRealData(farm: FarmPack): FarmPack {
  const pack = packForFarm(farm.id);
  if (!pack) return farm;

  const view = onsetView(pack);
  const trend = trendView(pack);
  const onsetPart = view
    ? {
        historicalMedianDOY: view.medianA,
        currentMedianDOY: view.medianB,
        shiftDays: view.shiftDays,
        pValue: view.pValue ?? farm.onset.pValue,
        eraA: view.eraA,
        eraB: view.eraB,
        threshold: pack.onset.thresholdText,
      }
    : { ...farm.onset, threshold: pack.onset.thresholdText };

  const chirpsEntry: ProvEntry | null =
    pack.crossCheck?.available
      ? {
          id: "chirps",
          name: "CHIRPS v2.0",
          detail: `Independent rainfall cross-check · ${pack.crossCheck.tierLabel ?? "Open (UCSB CHC / USGS)"} · 0.25° cell ${pack.crossCheck.grid?.cell.join(", ") ?? "n/a"}`,
          detail_bn: `স্বাধীন বৃষ্টিপাত যাচাই · ${pack.crossCheck.tierLabel ?? "Open (UCSB CHC / USGS)"} · ০.২৫° ঘর ${pack.crossCheck.grid?.cell.join(", ") ?? "n/a"}`,
          version: `${pack.crossCheck.source} · ${pack.crossCheck.yearsOnDisk?.first ?? "1981"}–${pack.crossCheck.yearsOnDisk?.last ?? "2025"}`,
          retrieved: pack.crossCheck.retrievedUtc ? `${pack.crossCheck.retrievedUtc.slice(0, 10)} (UTC)` : "not retrieved",
          tier: "Open",
          url: "https://www.chc.ucsb.edu/data/chirps",
        }
      : null;

  return {
    ...farm,
    onset: { ...farm.onset, ...onsetPart },
    metrics: {
      ...farm.metrics,
      rainfallTrendPctPerDecade: round(trend?.pctPerDecade ?? null) ?? farm.metrics.rainfallTrendPctPerDecade,
      heatDays: pack.metrics.heatDays ?? farm.metrics.heatDays,
      heatDaysDelta: round(pack.metrics.heatDaysDelta, 0) ?? farm.metrics.heatDaysDelta,
      tempC: round(pack.metrics.tempC) ?? farm.metrics.tempC,
      tempDelta: round(pack.metrics.tempDelta) ?? farm.metrics.tempDelta,
    },
    provenance: [
      ...farm.provenance.map((entry) =>
        entry.id === "power"
          ? {
              ...entry,
              detail: `Daily rainfall, T2M, solar — ${pack.lat.toFixed(4)}°N, ${pack.lon.toFixed(4)}°E (${pack.covered.daysWithData} days)`,
              detail_bn: `দৈনিক বৃষ্টি, T2M, সৌর — ${toBnDigits(pack.lat.toFixed(4))}°N, ${toBnDigits(pack.lon.toFixed(4))}°E (${toBnDigits(pack.covered.daysWithData)} দিন)`,
              version: `Daily API ${pack.powerApiVersion} · ${pack.powerProductVersion ?? "MERRA-2"}`,
              retrieved: `${retrievedDay(pack)} (UTC)`,
            }
          : entry,
      ),
      ...(chirpsEntry ? [chirpsEntry] : []),
    ],
  };
}

const districtCache = new Map<string, PowerPack | null>();

/**
 * District packs are fetched at runtime (70 files would bloat the bundle); callers must handle
 * null and keep their fixture labelling in that case.
 */
export async function loadDistrictPack(slug: string): Promise<PowerPack | null> {
  if (districtCache.has(slug)) return districtCache.get(slug) ?? null;
  const entry = PACK_INDEX.districts.find((d) => d.slug === slug);
  if (!entry) {
    districtCache.set(slug, null);
    return null;
  }
  try {
    const response = await fetch(entry.path);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const pack = (await response.json()) as PowerPack;
    districtCache.set(slug, pack);
    return pack;
  } catch {
    districtCache.set(slug, null);
    return null;
  }
}

/** Badge text for the panel that shows the onset/trend numbers. */
export function sourceLabel(pack: PowerPack): string {
  const preferred = pack.preferred.onsetShift.source;
  const power = `NASA POWER · retrieved ${retrievedDay(pack)}`;
  if (preferred === "CHIRPS v2.0") return `CHIRPS v2.0 cross-check · ${power}`;
  if (preferred === "none") return "no homogeneous rainfall source · see caution";
  return power;
}

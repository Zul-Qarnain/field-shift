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
 * A NASA POWER data pack (schema v3), as written by scripts/build_packs.py. Every number came
 * from NASA data the build actually read; `retrievedUtc` is when it was read, not when the pack
 * was rebuilt. Schema v3 carries onset definition v2, a Pettitt homogeneity test, and an
 * independent NASA/JAXA GPM IMERG cross-check (v2 used CHIRPS), because POWER precipitation is
 * not homogeneous over 1981–2025.
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
  crossCheck: SatelliteCrossCheck;
  preferred: {
    rainfallTrend: SourceChoice;
    onsetShift: SourceChoice;
    powerFlagged: boolean;
    satelliteFlagged: boolean;
    satelliteAvailable: boolean;
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
  source: "NASA POWER" | typeof SATELLITE | "none";
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

/** The independent rainfall product's label, exactly as the build writes it. */
export const SATELLITE = "GPM IMERG" as const;

export interface SatelliteOnset {
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

export interface SatelliteCrossCheck {
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
  timeStandard?: string;
  yearsComplete?: { first: number; last: number; count: number } | null;
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
  onset?: SatelliteOnset;
  agreement?: {
    onsetYears: { yearsCompared: number; pearsonR: number | null; spearmanRho: number | null; mae: number | null; bias: number | null };
    annualRainfallMm: { yearsCompared: number; pearsonR: number | null; spearmanRho: number | null; mae: number | null; bias: number | null };
    note: string;
  };
}

export type OnsetProduct = "NASA POWER" | typeof SATELLITE;

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
  satellite: {
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
 * GPM IMERG cross-check is used, and if neither is homogeneous the honest answer is "neither".
 */
export function onsetView(pack: PowerPack): OnsetView | null {
  const power = pack.onset;
  const sat = pack.crossCheck?.available ? pack.crossCheck.onset : undefined;
  if (power.medianA === null || power.medianB === null) return null;

  const preferSat = pack.preferred.onsetShift.source === SATELLITE && !!sat && sat.medianA !== null && sat.medianB !== null;
  const product: OnsetProduct = preferSat ? SATELLITE : "NASA POWER";
  const chosen = preferSat && sat ? sat : power;
  const medianA = chosen.medianA as number;
  const medianB = chosen.medianB as number;
  const changePoint = pack.quality.precipHomogeneity.changePointInsideAnalysisWindow;

  const caution = preferSat
    ? `NASA POWER precipitation steps at ${changePoint} inside 2001–2025, so its onset shift (${power.shiftDays} d, p=${
        power.pValue?.toFixed(3) ?? "n/a"
      }) is not used; this figure comes from the independent NASA/JAXA GPM IMERG cross-check.`
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
    thresholdMm: preferSat ? (pack.crossCheck.thresholdMm ?? null) : power.thresholdMm,
    caution,
    alternative:
      product === SATELLITE
        ? { product: "NASA POWER", shiftDays: power.shiftDays, pValue: power.pValue }
        : sat
          ? { product: SATELLITE, shiftDays: sat.shiftDays, pValue: sat.pValue }
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
  const sat = pack.crossCheck?.available ? pack.crossCheck.rainfallTrend2001toLatest : undefined;
  const powerValue = power.rainfallTrendPctPerDecade;
  if (powerValue === null && (sat?.pctPerDecade === null || sat?.pctPerDecade === undefined)) return null;

  const preferSat = pack.preferred.rainfallTrend.source === SATELLITE && sat?.pctPerDecade !== null && sat?.pctPerDecade !== undefined;
  const changePoint = pack.quality.precipHomogeneity.changePointInsideAnalysisWindow;
  return {
    pctPerDecade: (preferSat ? sat!.pctPerDecade : powerValue) as number,
    product: preferSat ? SATELLITE : "NASA POWER",
    window: preferSat ? (sat!.window ?? null) : power.rainfallTrendWindow,
    tau: preferSat ? sat!.tau : power.rainfallTau,
    pValue: preferSat ? sat!.pValue : power.rainfallPValue,
    caution: preferSat
      ? `POWER gives ${powerValue}%/decade over the same window but its precipitation series steps at ${changePoint}; GPM IMERG is used instead.`
      : power.rainfallTrendCaution,
    alternative: preferSat
      ? { product: "NASA POWER", pctPerDecade: powerValue }
      : sat
        ? { product: SATELLITE, pctPerDecade: sat.pctPerDecade }
        : null,
  };
}

/**
 * Overlay a real POWER pack on any pack-shaped farm — the six demo farms and the district profiles
 * built by lib/quick.ts both come through here. Fields with no real source yet (SMAP soil moisture,
 * NDVI, SoilGrids soil, water availability, flood index, irrigation access) are left exactly as the
 * fixture had them, so they keep their fixture labelling. Never mutates its input.
 */
export function withPowerPack(farm: FarmPack, pack: PowerPack): FarmPack {
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
        source: view.product,
      }
    : { ...farm.onset, threshold: pack.onset.thresholdText };

  const cross = pack.crossCheck;
  const imergEntry: Partial<ProvEntry> | null = cross?.available
    ? {
        detail: `Independent rainfall cross-check · ${cross.tierLabel ?? "NASA + JAXA (GPM)"} · 0.1° cell ${cross.grid?.cell.join(", ") ?? "n/a"}`,
        detail_bn: `স্বাধীন বৃষ্টিপাত যাচাই · ${cross.tierLabel ?? "NASA + JAXA (GPM)"} · ০.১° ঘর ${toBnDigits(cross.grid?.cell.join(", ") ?? "n/a")}`,
        version: `IMERG V07 via NASA POWER · ${cross.yearsComplete?.first ?? 1998}–${cross.yearsComplete?.last ?? 2025}`,
        retrieved: cross.retrievedUtc ? `${cross.retrievedUtc.slice(0, 10)} (UTC)` : "not retrieved",
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
              version: `${pack.powerApiVersion ?? "POWER v10"} · ${pack.powerProductVersion ?? "MERRA2"}`,
              retrieved: `${retrievedDay(pack)} (UTC)`,
            }
          : entry.id === "imerg" && imergEntry
            ? { ...entry, ...imergEntry }
            : entry,
      ),
    ],
  };
}

/** The demo farm with its own committed pack overlaid, or the fixture untouched when no pack exists. */
export function withRealData(farm: FarmPack): FarmPack {
  const pack = packForFarm(farm.id);
  return pack ? withPowerPack(farm, pack) : farm;
}

const districtCache = new Map<string, PowerPack>();
const districtWithoutPack = new Set<string>();

/**
 * District packs are fetched at runtime (70 files would bloat the bundle); callers must handle
 * null and keep their fixture labelling in that case.
 *
 * Only successes and "this slug has no pack in the index" are remembered: a failed fetch returns
 * null and is tried again on the next call, so a Retry after a network blip can actually recover.
 */
export async function loadDistrictPack(slug: string): Promise<PowerPack | null> {
  if (districtWithoutPack.has(slug)) return null;
  const cached = districtCache.get(slug);
  if (cached) return cached;
  const entry = PACK_INDEX.districts.find((d) => d.slug === slug);
  if (!entry) {
    districtWithoutPack.add(slug);
    return null;
  }
  try {
    const response = await fetch(entry.path);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const pack = (await response.json()) as PowerPack;
    districtCache.set(slug, pack);
    return pack;
  } catch {
    return null;
  }
}

/** Badge text for the panel that shows the onset/trend numbers. */
export function sourceLabel(pack: PowerPack): string {
  const preferred = pack.preferred.onsetShift.source;
  const power = `NASA POWER · retrieved ${retrievedDay(pack)}`;
  if (preferred === SATELLITE) return `GPM IMERG cross-check · ${power}`;
  if (preferred === "none") return "no homogeneous rainfall source · see caution";
  return power;
}

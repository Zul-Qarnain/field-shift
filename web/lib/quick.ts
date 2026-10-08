/**
 * Quick answer: a district-level profile the rotation engine can rank today, plus the score shown as
 * its parts.
 *
 * A district profile takes the six demo farms' un-cited fixture inputs (soil, water availability,
 * heat exposure, flood index, irrigation access, data-quality flags) from the NEAREST demo farm — and
 * says which farm and how far — then overlays that district's real NASA POWER pack and its own SRDI
 * district rollup. District soil and irrigation layers arrive in the next phase; nothing here invents them.
 */
import { CROPS, FARMS, SALINITY_CLASSES, type FarmPack, type SalinityBlock, type SalinityClass } from "./data";
import {
  DEFAULT_PRIORITIES,
  DEFAULT_SCENARIO,
  generateRotations,
  type Priorities,
  type RotationResult,
} from "./engine";
import { haversineKm, type DistrictEntry, type LatLng } from "./locate";
import { withPowerPack, type PowerPack } from "./packs";
import type { StringKey } from "./i18n";

export interface SalinityDistrictAggregate {
  status: string;
  upazilas?: number;
  total_ha?: number;
  saline_ha?: number;
  salineShare: number | null;
  classShares?: Partial<Record<SalinityClass, number>> | null;
  repECe: number | null;
}

export interface SalinityJson {
  citation: string;
  url: string;
  retrieved: string;
  measured?: string;
  derivation?: string;
  districtNote?: string;
  districts: Record<string, SalinityDistrictAggregate>;
}

export const QUICK_CROPS = CROPS.filter((c) => c.family !== "none");

export const QUICK_PRIORITIES = ["balanced", "water", "soilHealth", "stability", "riskSafety"] as const;
export type QuickPriority = (typeof QUICK_PRIORITIES)[number];

export const PRIORITY_LABEL: Record<QuickPriority, StringKey> = {
  balanced: "pri_balanced",
  water: "pri_water",
  soilHealth: "pri_soil",
  stability: "pri_stable",
  riskSafety: "pri_risk",
};

/** Balanced keeps the planner's default sliders; every other preset pushes its own axis to 100 and rests at 25. */
export function prioritiesFor(key: QuickPriority): Priorities {
  if (key === "balanced") return DEFAULT_PRIORITIES;
  const rest = { water: 25, soilHealth: 25, stability: 25, riskSafety: 25 };
  return { ...rest, [key]: 100 } as Priorities;
}

export const isQuickPriority = (value: string | null): value is QuickPriority =>
  (QUICK_PRIORITIES as readonly string[]).includes(value ?? "");

export const isCropId = (value: string | null): boolean =>
  QUICK_CROPS.some((c) => c.id === value);

/** The demo farm whose fixture inputs a district borrows, and how far its point sits from that farm. */
export function nearestDemoFarm(point: LatLng): { farm: FarmPack; km: number } {
  let best = FARMS[0];
  let km = Number.POSITIVE_INFINITY;
  for (const farm of FARMS) {
    const d = haversineKm(point, farm);
    if (d < km) {
      best = farm;
      km = d;
    }
  }
  return { farm: best, km };
}

/** SRDI's district rollup, keyed by the geoBoundaries ADM2 name the survey printed. */
export function districtSalinity(district: DistrictEntry, salinity: SalinityJson): SalinityBlock {
  const row = salinity.districts[district.gbName];
  const base = {
    district: district.gbName,
    scope: "district" as const,
    classAreasHa: null,
    retrieved: salinity.retrieved,
  };
  if (!row || row.salineShare === null || !row.classShares || row.total_ha === undefined || row.saline_ha === undefined) {
    return {
      ...base,
      upazila: "outside the SRDI coastal saline survey",
      salineShare: 0,
      classShares: null,
      repECe: null,
      salineHa: null,
      totalHa: null,
      source: "SRDI (2010) Appendix-2 — this district is outside the coastal saline survey",
      cited: false,
      note: "outside SRDI coastal saline survey — the district carries no SRDI value, so salinity is excluded from the score, not scored as zero risk",
    };
  }
  const upazilas = row.upazilas ?? 0;
  return {
    ...base,
    upazila: `${upazilas} upazilas rolled up`,
    salineShare: row.salineShare,
    classShares: Object.fromEntries(
      SALINITY_CLASSES.map((c) => [c, row.classShares?.[c] ?? 0]),
    ) as Record<SalinityClass, number>,
    repECe: row.repECe ?? null,
    salineHa: row.saline_ha,
    totalHa: row.total_ha,
    source: `SRDI (2010) Saline Soils of Bangladesh, Appendix-2 — ${district.gbName} district rollup (${upazilas} upazilas)`,
    cited: true,
    note: "Dry-season classes from the May 2009 survey, area-weighted over the district's SRDI upazilas; salineShare divides by SRDI's printed district total, repECe is derived from SRDI class areas.",
  };
}

export interface DistrictProfile {
  pack: FarmPack;
  fromFarmId: string;
  fromFarmNameEn: string;
  fromFarmNameBn: string;
  distanceKm: number;
  salinityCited: boolean;
  salinityScope: "district";
  powerBacked: boolean;
}

export function districtProfile(
  district: DistrictEntry,
  powerPack: PowerPack | null,
  salinity: SalinityJson,
): DistrictProfile {
  const { farm, km } = nearestDemoFarm(district.point);
  const salinityBlock = districtSalinity(district, salinity);
  // With no POWER pack this point has no measured onset. The borrowed demo farm's era test is that
  // farm's own story, so the block is neutralised instead: shift 0, p 1 (not significant), no eras.
  const onset: FarmPack["onset"] = powerPack
    ? farm.onset
    : { ...farm.onset, currentMedianDOY: 0, historicalMedianDOY: 0, shiftDays: 0, pValue: 1, eraA: [], eraB: [], source: "none" };
  const base: FarmPack = {
    ...farm,
    id: `district-${district.slug}`,
    name_en: `${district.name_en} district`,
    name_bn: `${district.name_bn} জেলা`,
    district: district.name_en,
    district_bn: district.name_bn,
    division: district.division,
    division_bn: district.division_bn,
    lat: district.point.lat,
    lon: district.point.lon,
    onset,
    salinity: salinityBlock,
    // A district has no field outline: the polygon stays empty rather than drawing an invented one.
    polygon: [],
  };
  return {
    pack: powerPack ? withPowerPack(base, powerPack) : base,
    fromFarmId: farm.id,
    fromFarmNameEn: farm.name_en,
    fromFarmNameBn: farm.name_bn,
    distanceKm: km,
    salinityCited: salinityBlock.cited,
    salinityScope: "district",
    powerBacked: powerPack !== null,
  };
}

/** The ranked rotations that keep the current crop — each crop belongs to one season, so this keeps it in its season. */
export function quickAnswer(pack: FarmPack, cropId: string, priority: QuickPriority, limit = 3): RotationResult[] {
  const all = new Set(CROPS.map((c) => c.id));
  return generateRotations(pack, prioritiesFor(priority), DEFAULT_SCENARIO, all)
    .filter((r) => r.crops.some((c) => c.id === cropId))
    .slice(0, limit);
}

const roundTo = (value: number, digits: number) => {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
};

export interface ScoreSegment {
  key: string;
  label: string;
  label_bn: string;
  value: number;
  weight: number;
  /** Points this component contributed before display rounding: 100 · weight · value. */
  raw: number;
  /** The rounded figure on screen — the eight of these add up to the total exactly. */
  display: number;
}

export interface ScoreBreakdown {
  segments: ScoreSegment[];
  partsRaw: number;
  partsDisplay: number;
  penalties: { rule: string; rule_bn: string; amount: number }[];
  penaltyRaw: number;
  penaltyDisplay: number;
  creditRaw: number;
  creditDisplay: number;
  total: number;
}

/**
 * Split `result.total` back into the eight component contributions, the penalty subtraction and the
 * early-onset credit. Each part is shown to one decimal, corrected by largest remainder so the printed
 * parts, penalties and credit add up to the printed total to the last digit.
 */
export function scoreBreakdown(result: RotationResult): ScoreBreakdown {
  const segments = result.components.map((c) => ({
    key: c.key,
    label: c.label,
    label_bn: c.label_bn,
    value: c.value,
    weight: c.weight,
    raw: 100 * c.weight * c.value,
    display: 0,
  }));
  const penaltyRaw = result.penalties.reduce((a, p) => a + p.amount, 0);
  const creditRaw = result.earlyCredit;
  const penaltyDisplay = roundTo(penaltyRaw, 1);
  const creditDisplay = roundTo(creditRaw, 1);

  const targetTenths = Math.round((result.total + penaltyDisplay - creditDisplay) * 10);
  const tenths = segments.map((s) => Math.floor(s.raw * 10));
  let remainder = targetTenths - tenths.reduce((a, b) => a + b, 0);
  const byFraction = segments
    .map((s, i) => ({ i, fraction: s.raw * 10 - Math.floor(s.raw * 10) }))
    .sort((a, b) => b.fraction - a.fraction);
  let cursor = 0;
  while (remainder > 0 && byFraction.length > 0) {
    tenths[byFraction[cursor % byFraction.length].i] += 1;
    remainder -= 1;
    cursor += 1;
  }
  const reverse = [...byFraction].reverse();
  cursor = 0;
  while (remainder < 0 && reverse.length > 0) {
    tenths[reverse[cursor % reverse.length].i] -= 1;
    remainder += 1;
    cursor += 1;
  }
  segments.forEach((s, i) => {
    s.display = tenths[i] / 10;
  });

  return {
    segments,
    partsRaw: segments.reduce((a, s) => a + s.raw, 0),
    partsDisplay: tenths.reduce((a, b) => a + b, 0) / 10,
    penalties: result.penalties.map((p) => ({ rule: p.rule.en, rule_bn: p.rule.bn, amount: p.amount })),
    penaltyRaw,
    penaltyDisplay,
    creditRaw,
    creditDisplay,
    total: result.total,
  };
}

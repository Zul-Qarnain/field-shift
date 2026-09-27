import { CROPS, type Crop, type FarmPack, type SeasonKey } from "./data";

export interface Priorities {
  water: number;
  soilHealth: number;
  stability: number;
  riskSafety: number;
}

export interface Scenario {
  rainfallPct: number;
  tempDeltaC: number;
  onsetShiftDays: number;
  phOverride: number | null;
}

export const DEFAULT_PRIORITIES: Priorities = { water: 50, soilHealth: 50, stability: 50, riskSafety: 50 };
export const DEFAULT_SCENARIO: Scenario = { rainfallPct: 0, tempDeltaC: 0, onsetShiftDays: 0, phOverride: null };

export interface ComponentScore {
  key: string;
  label: string;
  value: number;
  weight: number;
}

export interface RotationResult {
  id: string;
  crops: Crop[];
  total: number;
  components: ComponentScore[];
  penalties: { rule: string; amount: number; source: string }[];
  confidence: "high" | "medium" | "low";
  why: string[];
  risks: string[];
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

const waterAvail = (pack: FarmPack, season: SeasonKey, sc: Scenario) =>
  clamp01(pack.waterAvail[season] * (1 + sc.rainfallPct / 100));

const heatExposure = (pack: FarmPack, season: SeasonKey, sc: Scenario) =>
  clamp01(pack.heatExposure[season] * (1 + sc.tempDeltaC * 0.18));

const phFit = (crop: Crop, pack: FarmPack, sc: Scenario) => {
  const ph = sc.phOverride ?? pack.soil.ph;
  const [lo, hi] = crop.phRange;
  if (ph >= lo && ph <= hi) return 1;
  const dist = ph < lo ? lo - ph : ph - hi;
  return clamp01(1 - dist / 1.2);
};

function scoreCropSeason(crop: Crop, pack: FarmPack, season: SeasonKey, sc: Scenario) {
  const w = waterAvail(pack, season, sc);
  const s1 = clamp01(1 - Math.max(0, crop.waterDemand - w) * 1.8);
  const heat = heatExposure(pack, season, sc);
  const s2 = clamp01(crop.heatTol * 0.75 + (1 - heat) * 0.25);
  const s3 = phFit(crop, pack, sc);
  return { s1, s2, s3 };
}

export function generateRotations(pack: FarmPack, priorities: Priorities, sc: Scenario, pool: Set<string>): RotationResult[] {
  const order: SeasonKey[] = ["aman", "rabi", "pre"];
  const available = CROPS.filter((c) => pool.has(c.id));
  const seqs: Crop[][] = [];
  const walk = (i: number, acc: Crop[]) => {
    if (i === order.length) {
      seqs.push([...acc]);
      return;
    }
    for (const c of available.filter((c) => c.season === order[i])) {
      const prev = acc[acc.length - 1];
      if (prev && prev.family === c.family) continue;
      walk(i + 1, [...acc, c]);
    }
  };
  walk(0, []);

  const wWater = 0.2 + (priorities.water / 100) * 0.5;
  const wSoil = 0.2 + (priorities.soilHealth / 100) * 0.5;
  const wStab = 0.15 + (priorities.stability / 100) * 0.35;
  const wRisk = 0.1 + (priorities.riskSafety / 100) * 0.3;

  const results: RotationResult[] = seqs.map((crops, idx) => {
    const seasonScores = crops.map((c, i) => scoreCropSeason(c, pack, order[i], sc));
    const s1 = seasonScores.reduce((a, s) => a + s.s1, 0) / seasonScores.length;
    const s2 = seasonScores.reduce((a, s) => a + s.s2, 0) / seasonScores.length;
    const s3 = seasonScores.reduce((a, s) => a + s.s3, 0) / seasonScores.length;
    const nFixCount = crops.filter((c) => c.nFixing).length;
    const residue = crops.reduce((a, c) => a + c.residueIndex, 0) / crops.length;
    const nBalance = clamp01(0.25 + nFixCount * 0.3 + residue * 0.3 - crops.reduce((a, c) => a + c.nDemand, 0) / (crops.length * 3));
    const s4 = clamp01(0.4 * nBalance + 0.3 * residue + 0.3 * (nFixCount > 0 ? 1 : 0.3));
    const families = new Set(crops.map((c) => c.family)).size;
    const rootAlt = crops.filter((c, i) => i > 0 && c.rootDeep !== crops[i - 1].rootDeep).length;
    const s5 = clamp01(0.5 * (families / 3) + 0.5 * (rootAlt / Math.max(1, crops.length - 1)));
    const floodPenalty = pack.floodProneIndex * (1 - crops[0].floodTol) * 0.25;
    const lateHeat = clamp01((heatExposure(pack, "rabi", sc) - 0.5) * (1 - crops.find((c) => c.season === "rabi")!.heatTol)) * 0.2;
    const rainStress = clamp01(Math.max(0, 0.45 - waterAvail(pack, "rabi", sc))) * 0.3;
    const s6 = clamp01(1 - floodPenalty * 2 - lateHeat - rainStress);

    const raw = { s1: wWater, s2: wStab * 0.5, s3: 0.12, s4: wSoil, s5: 0.08, s6: wRisk + wStab * 0.5 };
    const rawSum = Object.values(raw).reduce((a, b) => a + b, 0);
    const weights = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, v / rawSum])) as Record<keyof typeof raw, number>;
    const total100 =
      100 *
      (s1 * weights.s1 + s2 * weights.s2 + s3 * weights.s3 + s4 * weights.s4 + s5 * weights.s5 + s6 * weights.s6) -
      floodPenalty * 40 -
      lateHeat * 40;

    const penalties: RotationResult["penalties"] = [];
    if (floodPenalty > 0.02) penalties.push({ rule: "Flood exposure in Aman (field flood-proneness × crop tolerance)", amount: Math.round(floodPenalty * 40 * 10) / 10, source: "computed from farm flood index + crop trait" });
    if (lateHeat > 0.01) penalties.push({ rule: "Terminal-heat exposure for winter crop", amount: Math.round(lateHeat * 40 * 10) / 10, source: "POWER heat-day trend + crop heat tolerance" });
    if (rainStress > 0.01) penalties.push({ rule: "Winter water stress (supply below crop need)", amount: Math.round(rainStress * 40 * 10) / 10, source: "POWER/IMERG supply vs FAO-56 demand" });

    const components: ComponentScore[] = [
      { key: "s1", label: "Water adequacy", value: s1, weight: weights.s1 },
      { key: "s2", label: "Thermal fit", value: s2, weight: weights.s2 },
      { key: "s3", label: "Soil compatibility", value: s3, weight: weights.s3 },
      { key: "s4", label: "Soil health balance", value: s4, weight: weights.s4 },
      { key: "s5", label: "Diversity & break", value: s5, weight: weights.s5 },
      { key: "s6", label: "Resilience", value: s6, weight: weights.s6 },
    ];

    const dq = pack.dataQuality;
    const confidence = dq.smapEra && !dq.soilModeled ? "high" : dq.smapEra ? "medium" : "low";

    const sorted = [...components].sort((a, b) => b.value * b.weight - a.value * a.weight);
    const why = [
      `Water adequacy ${(s1 * 100).toFixed(0)}/100 across the sequence (supply vs FAO-56 demand, NASA POWER + SMAP).`,
      `${nFixCount > 0 ? "A legume improves the nitrogen balance" : "Residue return keeps organic balance"} — soil health ${(s4 * 100).toFixed(0)}/100.`,
      `Soil compatibility ${(s3 * 100).toFixed(0)}/100 (modeled pH ${pack.soil.ph}${sc.phOverride ? `, corrected to ${sc.phOverride}` : ""}).`,
    ].concat(sorted[0].key === "s6" ? [`Resilience ${(s6 * 100).toFixed(0)}/100 under current flood/heat exposure.`] : []);

    const risks: string[] = [];
    if (lateHeat > 0.01) risks.push("Terminal heat can cut winter-crop yield if planting slips");
    if (pack.floodProneIndex > 0.6) risks.push("Field is flood-prone — Aman drainage matters");
    if (sc.phOverride === null && (pack.soil.ph < 5.8 || pack.soil.ph > 7.6)) risks.push("Modeled soil pH is near tolerance edges — verify with a field test");
    if (rainStress > 0.01) risks.push("Winter crop likely needs irrigation on this farm");

    return {
      id: `${pack.id}-rot-${idx}`,
      crops,
      total: Math.round(total100 * 10) / 10,
      components,
      penalties,
      confidence,
      why,
      risks,
    };
  });

  return results.sort((a, b) => b.total - a.total);
}

export function advisoryText(pack: FarmPack, top: RotationResult, lang: "en" | "bn"): string {
  const seq = top.crops.map((c) => (lang === "en" ? c.name_en : c.name_bn)).join(" → ");
  if (lang === "en") {
    return `${pack.onset.shiftDays >= 0 ? `Usable-rainfall onset is ${pack.onset.shiftDays} days later` : `Usable-rainfall onset is ${Math.abs(pack.onset.shiftDays)} days earlier`} than 2001–2012 on this farm (POWER, p=${pack.onset.pValue.toFixed(3)}). Best-fit rotation: ${seq} — score ${top.total}/100.`;
  }
  const shift = pack.onset.shiftDays >= 0
    ? `ব্যবহারযোগ্য বর্ষার শুরু ২০০১–২০১২ এর তুলনায় ${Math.abs(pack.onset.shiftDays)} দিন পরে`
    : `ব্যবহারযোগ্য বর্ষার শুরু ২০০১–২০১২ এর তুলনায় ${Math.abs(pack.onset.shiftDays)} দিন আগে`;
  return `${shift} হয়েছে (POWER, p=${pack.onset.pValue.toFixed(3)})। সেরা ফসল-পর্যায়: ${seq} — স্কোর ${top.total}/১০০।`;
}

export function smsText(pack: FarmPack, top: RotationResult, lang: "en" | "bn"): string {
  const seq = top.crops.map((c) => c.name_en.split(" ")[0]).join(">");
  if (lang === "en") return `FieldShift ${pack.name_en}: onset ${pack.onset.shiftDays >= 0 ? "+" : ""}${pack.onset.shiftDays}d. Try: ${seq}. Score ${top.total}/100. Details: method page.`;
  return `ফিল্ডশিফট ${pack.name_bn}: শুরু ${pack.onset.shiftDays >= 0 ? "+" : ""}${pack.onset.shiftDays} দিন। ফসল: ${top.crops.map((c) => c.name_bn).join(">")}। স্কোর ${top.total}/১০০।`;
}

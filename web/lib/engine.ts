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
  label_bn: string;
  value: number;
  weight: number;
}

export type Confidence = "high" | "medium" | "low";

export interface Penalty {
  rule: string;
  amount: number;
  source: string;
}

export interface RotationResult {
  id: string;
  crops: Crop[];
  total: number;
  components: ComponentScore[];
  penalties: Penalty[];
  confidence: Confidence;
  why: string[];
  risks: string[];
  /** Mean dry-season water demand that usable rainfall cannot cover (0–1). */
  irrigationShare: number;
  /** Crop durations + turnarounds + this season's onset shift, in days. */
  calendarDays: number;
}

export function confidenceFromQuality(dq: FarmPack["dataQuality"]): Confidence {
  if (!dq.smapEra) return "low";
  return dq.soilModeled ? "medium" : "high";
}

/**
 * ESTIMATE — every number in this block is a demo coefficient chosen to make the rules
 * bite in the right direction, not a cited agronomic value. The shape of each rule
 * (which inputs matter, and which way they push) is the explainable part; the scale is
 * not yet calibrated against a crop register or an irrigation survey. See /method.
 */
const YEAR_DAYS = 365;
const TURNAROUND_DAYS = 10;
const WATER_MARGIN_SCALE = 0.2;
const DRY_SUPPLY_CAP = 1.5;
const PUMP_SHARE_SCALE = 0.6;
const DRY_SPELL_SCALE = 0.5;
const N_FIX_CREDIT = 0.05;
const ONSET_HEAT_DAYS = 15;
const RISK_POINTS = 16;
const ONSET_POINTS = 36;
const FLOOD_FLOOR = 0.02;
const HEAT_FLOOR = 0.25;
const ONSET_FLOOR = 0.03;
const CEREAL_SEQUENCE_POINTS = 2.0;
const LEGUME_SEQUENCE_POINTS = 1;
const SAME_FAMILY_POINTS = 1.5;
const CEREAL_SEQUENCE_SOIL_HIT = 0.07;
const LEGUME_SEQUENCE_SOIL_HIT = 0.03;
const SAME_FAMILY_SOIL_HIT = 0.05;
const IDLE_FALLLOW_POINTS = 4;
const IDLE_FALLLOW_SOIL_HIT = 0.08;
const FALLLOW_BREAK_CREDIT = 0.08;
const EARLY_ONSET_CREDIT_RATE = 4;
const EARLY_ONSET_MAX_POINTS = 3;
/** A season fully watered and fully valued would score 1; this reference keeps the income bar in the same band as the other components. */
const YIELD_REFERENCE = 0.8;

/** Component weight shapes: each slider moves the components it speaks to, then the block is normalised to sum to 1. */
const WATER_WEIGHT_BASE = 0.2;
const WATER_WEIGHT_RISE = 0.5;
const PUMP_WEIGHT_BASE = 0.03;
const PUMP_WEIGHT_RISE = 0.16;
const SOIL_WEIGHT_BASE = 0.13;
const SOIL_WEIGHT_RISE = 0.28;
const THERMAL_WEIGHT_BASE = 0.05;
const THERMAL_WEIGHT_RISE = 0.25;
const INCOME_WEIGHT_BASE = 0.1;
const INCOME_WEIGHT_RISE = 3.5;
const RESIL_RISK_WEIGHT = 0.85;
const RESIL_STAB_WEIGHT = 0.15;
const PH_WEIGHT = 0.25;
const DIVERSITY_WEIGHT = 0.1;

const SEQUENCE: SeasonKey[] = ["aman", "rabi", "pre"];

const FAMILY_GROUP: Record<string, string> = {
  Poaceae: "cereal",
  Fabaceae: "legume",
  Brassicaceae: "brassica",
  Malvaceae: "mallow",
  Pedaliaceae: "sesame",
  Solanaceae: "nightshade",
};

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const mean = (xs: number[]) => (xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length);
const points = (x: number) => Math.round(x * 10) / 10;

/** Farm-observed onset shift plus any what-if shift the user selected. Positive = later monsoon. */
export function effectiveOnsetShift(pack: FarmPack, sc: Scenario) {
  return pack.onset.shiftDays + sc.onsetShiftDays;
}

const rainSupply = (pack: FarmPack, season: SeasonKey, sc: Scenario) =>
  clamp01(pack.waterAvail[season] * (1 + sc.rainfallPct / 100));

/** Monsoon rice lives on rain; dry-season crops can be topped up by the farm's irrigation access. */
const waterSupply = (pack: FarmPack, season: SeasonKey, sc: Scenario) => {
  const rain = rainSupply(pack, season, sc);
  return season === "aman" ? rain : Math.min(DRY_SUPPLY_CAP, rain + pack.irrigation);
};

const heatExposure = (pack: FarmPack, season: SeasonKey, sc: Scenario) =>
  clamp01(pack.heatExposure[season] * (1 + sc.tempDeltaC * 0.18));

const phFit = (crop: Crop, pack: FarmPack, sc: Scenario) => {
  const ph = sc.phOverride ?? pack.soil.ph;
  const [lo, hi] = crop.phRange;
  if (ph >= lo && ph <= hi) return 1;
  const dist = ph < lo ? lo - ph : ph - hi;
  return clamp01(1 - dist / 1.2);
};

/** Smooth supply−demand margin: a bigger safety buffer scores slightly higher and nothing ties at 1.0. */
const waterAdequacy = (supply: number, demand: number) =>
  1 / (1 + Math.exp((demand - supply) / WATER_MARGIN_SCALE));

/** ESTIMATE — a later monsoon pushes dry-season sowing into the hot end of the year. */
function onsetHeatRisk(crop: Crop, shift: number) {
  if (crop.family === "none" || shift <= 0) return 0;
  return clamp01((shift / ONSET_HEAT_DAYS) * (1 - crop.heatTol) * (crop.durationDays / 120));
}

/** Days the sequence needs in the year: every crop's duration, the turnarounds, and the onset shift. */
export function calendarDaysNeeded(crops: Crop[], shift: number) {
  const durations = crops.reduce((a, c) => a + c.durationDays, 0);
  return durations + TURNAROUND_DAYS * (crops.length - 1) + shift;
}

export function calendarFits(crops: Crop[], shift: number) {
  return calendarDaysNeeded(crops, shift) <= YEAR_DAYS;
}

function sequenceRules(crops: Crop[]) {
  const listed: Penalty[] = [];
  let soilHit = 0;
  for (let i = 1; i < crops.length; i++) {
    const prev = crops[i - 1];
    const cur = crops[i];
    if (prev.family === "none" || cur.family === "none" || prev.family !== cur.family) continue;
    const group = FAMILY_GROUP[cur.family] ?? cur.family;
    if (cur.family === "Fabaceae") {
      listed.push({
        rule: "Same-family sequence (legume after legume) — shared root pathogens carry over",
        amount: LEGUME_SEQUENCE_POINTS,
        source: "ESTIMATE — demo carryover coefficient for repeating a crop family",
      });
      soilHit += LEGUME_SEQUENCE_SOIL_HIT;
    } else if (cur.family === "Poaceae") {
      listed.push({
        rule: "Same-family sequence (cereal after cereal) — pest/disease carryover, soil N drain",
        amount: CEREAL_SEQUENCE_POINTS,
        source: "ESTIMATE — demo carryover coefficient for repeating a crop family",
      });
      soilHit += CEREAL_SEQUENCE_SOIL_HIT;
    } else {
      listed.push({
        rule: `Same-family sequence (${group} after ${group}) — pest/disease carryover`,
        amount: SAME_FAMILY_POINTS,
        source: "ESTIMATE — demo carryover coefficient for repeating a crop family",
      });
      soilHit += SAME_FAMILY_SOIL_HIT;
    }
  }
  if (crops.some((c) => c.family === "none")) {
    listed.push({
      rule: "Idle fallow season — bare soil, no residue return, weed seed bank builds",
      amount: IDLE_FALLLOW_POINTS,
      source: "ESTIMATE — demo penalty for leaving land uncropped",
    });
    soilHit += IDLE_FALLLOW_SOIL_HIT;
  }
  return { listed, soilHit };
}

export function generateRotations(pack: FarmPack, priorities: Priorities, sc: Scenario, pool: Set<string>): RotationResult[] {
  const shift = effectiveOnsetShift(pack, sc);
  const available = CROPS.filter((c) => pool.has(c.id));
  const seqs: Crop[][] = [];
  const walk = (i: number, acc: Crop[]) => {
    if (i === SEQUENCE.length) {
      if (calendarFits(acc, shift)) seqs.push([...acc]);
      return;
    }
    for (const crop of available.filter((c) => c.season === SEQUENCE[i])) {
      const prev = acc[acc.length - 1];
      if (prev && prev.id === crop.id) continue;
      walk(i + 1, [...acc, crop]);
    }
  };
  walk(0, []);

  const wStab = 0.15 + (priorities.stability / 100) * 0.35;
  const wRisk = 0.1 + (priorities.riskSafety / 100) * 0.3;

  const results: RotationResult[] = seqs.map((crops, idx) => {
    const perSeason = crops.map((crop, i) => {
      const season = SEQUENCE[i];
      const rain = rainSupply(pack, season, sc);
      return {
        season,
        crop,
        adequacy: waterAdequacy(waterSupply(pack, season, sc), crop.waterDemand),
        thermal: clamp01(crop.heatTol * 0.75 + (1 - heatExposure(pack, season, sc)) * 0.25),
        ph: phFit(crop, pack, sc),
        rainDeficit: season === "aman" ? 0 : Math.max(0, crop.waterDemand - rain),
        irrigating: season !== "aman" && crop.waterDemand > rain,
        onsetHeat: onsetHeatRisk(crop, shift),
      };
    });    const dry = perSeason.filter((p) => p.season !== "aman");

    const s1 = mean(perSeason.map((p) => p.adequacy));
    const s2 = mean(perSeason.map((p) => p.thermal));
    const s3 = mean(perSeason.map((p) => p.ph));
    const irrigationShare = mean(dry.map((p) => p.rainDeficit));
    const s7 = clamp01(1 - irrigationShare / PUMP_SHARE_SCALE);
    // Food & income: a thirsty crop that this farm cannot water earns little, so yield is graded by the season's water adequacy.
    const s8 = clamp01(mean(perSeason.map((p) => p.crop.yieldValue * p.adequacy)) / YIELD_REFERENCE);

    const real = crops.filter((c) => c.family !== "none");
    const nFixCount = real.filter((c) => c.nFixing).length;
    const residue = mean(crops.map((c) => c.residueIndex));
    const rules = sequenceRules(crops);
    const nBalance = clamp01(0.4 + nFixCount * N_FIX_CREDIT + residue * 0.3 - crops.reduce((a, c) => a + c.nDemand, 0) / (crops.length * 3));
    const s4 = clamp01(0.35 * nBalance + 0.45 * residue + 0.05 * (nFixCount > 0 ? 1 : 0.3) - rules.soilHit);

    const familyMix = new Set(real.map((c) => c.family)).size / Math.max(1, real.length);
    const rootAlt = real.filter((c, i) => i > 0 && c.rootDeep !== real[i - 1].rootDeep).length / Math.max(1, real.length - 1);
    const s5 = clamp01(0.5 * familyMix + 0.5 * rootAlt + (real.length < crops.length ? FALLLOW_BREAK_CREDIT : 0));

    const [amanCrop] = crops;
    const floodRisk = pack.floodProneIndex * (1 - amanCrop.floodTol);
    const heatRisk = mean(dry.map((p) => heatExposure(pack, p.season, sc) * (1 - p.crop.heatTol)));
    const drySpellRisk = clamp01(irrigationShare / DRY_SPELL_SCALE);
    const onsetRisk = mean(dry.map((p) => p.onsetHeat));
    const s6 = clamp01(1 - 0.4 * floodRisk - 0.25 * heatRisk - 0.1 * drySpellRisk - 0.3 * onsetRisk);

    const raw = {
      s1: WATER_WEIGHT_BASE + (priorities.water / 100) * WATER_WEIGHT_RISE,
      s2: THERMAL_WEIGHT_BASE + wStab * THERMAL_WEIGHT_RISE,
      s3: PH_WEIGHT,
      s4: SOIL_WEIGHT_BASE + (priorities.soilHealth / 100) * SOIL_WEIGHT_RISE,
      s5: DIVERSITY_WEIGHT,
      s6: wRisk * RESIL_RISK_WEIGHT + wStab * RESIL_STAB_WEIGHT,
      s7: PUMP_WEIGHT_BASE + (priorities.water / 100) * PUMP_WEIGHT_RISE,
      s8: INCOME_WEIGHT_BASE + wStab * INCOME_WEIGHT_RISE,
    };
    const rawSum = Object.values(raw).reduce((a, b) => a + b, 0);
    const weights = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, v / rawSum])) as Record<keyof typeof raw, number>;

    // Continuous, floor-then-slope penalties: no cliff where a threshold flip would reorder plans.
    const penalties = [...rules.listed];
    const floodPoints = Math.max(0, floodRisk - FLOOD_FLOOR) * RISK_POINTS;
    if (floodPoints > 0.05) {
      penalties.push({
        rule: "Flood exposure in Aman (field flood-proneness × crop tolerance)",
        amount: points(floodPoints),
        source: "computed from farm flood index + crop trait",
      });
    }
    const heatPoints = Math.max(0, heatRisk - HEAT_FLOOR) * RISK_POINTS;
    if (heatPoints > 0.05) {
      penalties.push({
        rule: "Heat exposure in the dry seasons (season heat × crop tolerance)",
        amount: points(heatPoints),
        source: "POWER T2M_MAX trend + crop heat tolerance (demo fixture)",
      });
    }
    const onsetPoints = Math.max(0, onsetRisk - ONSET_FLOOR) * ONSET_POINTS;
    if (onsetPoints > 0.05) {
      penalties.push({
        rule: `Late monsoon onset (+${shift} days) pushes winter sowing into terminal heat`,
        amount: points(onsetPoints),
        source: "farm onset shift from the fixture + scenario shift you set; ESTIMATE scaling",
      });
    }
    // An earlier onset widens the window, which is worth a small credit to long-duration crops.
    const longest = Math.max(...dry.map((p) => p.crop.durationDays));
    const earlyCredit = shift < 0 ? Math.min(EARLY_ONSET_MAX_POINTS, (-shift / ONSET_HEAT_DAYS) * (longest / 120) * EARLY_ONSET_CREDIT_RATE) : 0;

    const penaltyTotal = penalties.reduce((a, p) => a + p.amount, 0);
    const total100 =
      100 * (s1 * weights.s1 + s2 * weights.s2 + s3 * weights.s3 + s4 * weights.s4 + s5 * weights.s5 + s6 * weights.s6 + s7 * weights.s7 + s8 * weights.s8) -
      penaltyTotal +
      earlyCredit;

    const components: ComponentScore[] = [
      { key: "s1", label: "Water adequacy", label_bn: "পানির প্রাপ্যতা", value: s1, weight: weights.s1 },
      { key: "s2", label: "Thermal fit", label_bn: "তাপগত উপযুক্ততা", value: s2, weight: weights.s2 },
      { key: "s3", label: "Soil compatibility", label_bn: "মাটির সাথে সামঞ্জস্য", value: s3, weight: weights.s3 },
      { key: "s4", label: "Soil health balance", label_bn: "মাটির স্বাস্থ্যের ভারসাম্য", value: s4, weight: weights.s4 },
      { key: "s5", label: "Diversity & break", label_bn: "বৈচিত্র্য ও ব্রেক ফসল", value: s5, weight: weights.s5 },
      { key: "s6", label: "Resilience", label_bn: "সহনশীলতা", value: s6, weight: weights.s6 },
      { key: "s7", label: "Low irrigation reliance", label_bn: "কম সেচ-নির্ভরতা", value: s7, weight: weights.s7 },
      { key: "s8", label: "Food & income", label_bn: "খাদ্য ও আয়", value: s8, weight: weights.s8 },
    ];

    const confidence = confidenceFromQuality(pack.dataQuality);
    const sorted = [...components].sort((a, b) => b.value * b.weight - a.value * a.weight);
    const used = calendarDaysNeeded(crops, shift);
    const why = [
      `Water adequacy ${(s1 * 100).toFixed(0)}/100 across the sequence — supply vs crop demand (planned sources NASA POWER + SMAP + FAO-56, demo fixture values today; dry-season supply includes this farm's demo irrigation access).`,
      `${nFixCount > 0 ? "A legume improves the nitrogen balance" : "Residue return keeps organic balance"} — soil health ${(s4 * 100).toFixed(0)}/100.`,
      `Soil compatibility ${(s3 * 100).toFixed(0)}/100 (modeled pH ${pack.soil.ph}${sc.phOverride ? `, corrected to ${sc.phOverride}` : ""}).`,
      `Fits the ${YEAR_DAYS}-day calendar: ${used} days used (${crops.map((c) => c.durationDays).join(" + ")} plus ${TURNAROUND_DAYS}-day turnarounds${shift >= 0 ? ` and +${shift}-day onset` : ` and ${shift}-day onset`}), ${YEAR_DAYS - used} days spare.`,
    ].concat(
      sorted[0].key === "s6" ? [`Resilience ${(s6 * 100).toFixed(0)}/100: Aman flood exposure, dry-season heat and rain deficit.`] : [],
      sorted[0].key === "s8" || sorted[1].key === "s8"
        ? [`Food & income ${(s8 * 100).toFixed(0)}/100: each season's yield value graded by the water that season can actually deliver (ESTIMATE — demo yield values, not BBS figures).`]
        : [],
      dry.some((p) => p.irrigating)
        ? [`At least one dry-season crop depends on pumping here — irrigation reliance ${(s7 * 100).toFixed(0)}/100 (demo access ${pack.irrigation}).`]
        : [],
      onsetPoints > 0.05
        ? [`Late onset (+${shift} days) costs this sequence ${points(onsetPoints)} points — short-duration, heat-tolerant dry-season crops lose less.`]
        : [],
      earlyCredit > 0.5
        ? [`An earlier onset (${shift} days) widens the growing window, so the longest dry-season crop (${longest} days) gains ${points(earlyCredit)} points.`]
        : [],
    );

    const risks: string[] = [];
    if (heatPoints > 0.05) risks.push("Dry-season heat can cut yield for the less tolerant crops here");
    if (onsetPoints > 0.05) risks.push(`Late onset (+${shift} days) squeezes the winter window — short-duration crops are the safer pick`);
    if (pack.floodProneIndex > 0.6) risks.push("Field is flood-prone — Aman drainage matters");
    if (sc.phOverride === null && (pack.soil.ph < 5.8 || pack.soil.ph > 7.6)) risks.push("Modeled soil pH is near tolerance edges — verify with a field test");
    if (dry.some((p) => p.irrigating)) risks.push("Winter crop likely needs irrigation on this farm");
    if (real.length < crops.length) risks.push("Idle season leaves the field bare — weeds and erosion take the foothold");

    return {
      id: `${pack.id}-rot-${idx}`,
      crops,
      total: Math.round(total100 * 10) / 10,
      components,
      penalties,
      confidence,
      why,
      risks,
      irrigationShare: Math.round(irrigationShare * 1000) / 1000,
      calendarDays: used,
    };
  });

  return results.sort((a, b) => b.total - a.total);
}

export function advisoryText(pack: FarmPack, top: RotationResult, lang: "en" | "bn"): string {
  const seq = top.crops.map((c) => (lang === "en" ? c.name_en : c.name_bn)).join(" → ");
  const shift = effectiveOnsetShift(pack, { rainfallPct: 0, tempDeltaC: 0, onsetShiftDays: 0, phOverride: null });
  const pump = Math.round(top.irrigationShare * 100);
  const onset = top.penalties.find((p) => p.rule.startsWith("Late monsoon onset"));
  if (lang === "en") {
    const onsetLine = shift >= 0 ? `Usable-rainfall onset is ${shift} days later` : `Usable-rainfall onset is ${Math.abs(shift)} days earlier`;
    const irrigated = pump > 0
      ? `Dry-season demand runs ${pump}/100 above usable rainfall on the demo water scale, so this plan relies on pumping (farm irrigation access ${pack.irrigation}, demo estimate).`
      : `This plan needs no dry-season pumping at this farm's rainfall.`;
    return `${onsetLine} than 2001–2012 on this farm (POWER, p=${pack.onset.pValue.toFixed(3)}). Best-fit rotation: ${seq} — score ${top.total}/100. ${irrigated}${onset ? ` ${onset.rule} costs ${onset.amount} points.` : ""}`;
  }
  const bnShift = shift >= 0
    ? `ব্যবহারযোগ্য বর্ষার শুরু ২০০১–২০১২ এর তুলনায় ${Math.abs(shift)} দিন পরে`
    : `ব্যবহারযোগ্য বর্ষার শুরু ২০০১–২০১২ এর তুলনায় ${Math.abs(shift)} দিন আগে`;
  const bnIrrig = pump > 0
    ? `শুষ্ক মৌসুমে ফসলের পানির চাহিদা ব্যবহারযোগ্য বৃষ্টি থেকে ${pump}/১০০ বেশি (ডেমো স্কেল) — তাই সেচ লাগবে; খামারের সেচ-প্রবেশাধিকার ${pack.irrigation} (ডেমো)।`
    : `এই পরিকল্পনায় শুষ্ক মৌসুমে সেচ লাগবে না।`;
  const bnOnset = onset ? `বর্ষার দেরিতে শুরু স্কোরে ${onset.amount} পয়েন্ট কেটেছে।` : "";
  return `${bnShift} হয়েছে (POWER, p=${pack.onset.pValue.toFixed(3)})। সেরা ফসল-পর্যায়: ${seq} — স্কোর ${top.total}/১০০। ${bnIrrig}${bnOnset}`;
}

export function smsText(pack: FarmPack, top: RotationResult, lang: "en" | "bn"): string {
  const seq = top.crops.map((c) => c.name_en).join(">");
  const shift = effectiveOnsetShift(pack, { rainfallPct: 0, tempDeltaC: 0, onsetShiftDays: 0, phOverride: null });
  const pump = Math.round(top.irrigationShare * 100);
  if (lang === "en") return `FieldShift ${pack.name_en}: onset ${shift >= 0 ? "+" : ""}${shift}d. Try: ${seq}. Pump +${pump}/100. Score ${top.total}/100.`;
  return `ফিল্ডশিফট ${pack.name_bn}: শুরু ${shift >= 0 ? "+" : ""}${shift} দিন। ফসল: ${top.crops.map((c) => c.name_bn).join(">")}। সেচ +${pump}/১০০। স্কোর ${top.total}/১০০।`;
}

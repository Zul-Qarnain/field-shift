import { CROPS, type Crop, type FarmPack, type SeasonKey } from "./data";
import { fmtNum, toBnDigits, type BiText } from "./i18n";

export type { BiText };
export { pick } from "./i18n";

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

/** Every reason, risk and penalty rule is returned in both languages with the same numbers inside. */
export interface Penalty {
  rule: BiText;
  amount: number;
  source: BiText;
}

export interface RotationResult {
  id: string;
  crops: Crop[];
  total: number;
  components: ComponentScore[];
  penalties: Penalty[];
  confidence: Confidence;
  why: BiText[];
  risks: BiText[];
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
/** A season fully watered at the top demo income value would score 1; this reference keeps the income bar in the same band as the other components. */
const YIELD_REFERENCE = 0.8;
/**
 * ESTIMATE — weight of the staple-food axis inside S8 (Food & income). Set by the shape it has to
 * reproduce, not by a cited figure: on irrigated northern land the working rotation is Boro → Aman or
 * Boro → Fallow → Aus, so a plan that puts milled rice in two of three seasons has to be able to out-rank
 * a cash-crop plan once the farmer says "food first" (Stable harvest up, Water saving down), while a farm
 * that cannot cover the water need must still prefer frugal pulses. Not calibrated against a
 * household-expenditure survey.
 */
const STAPLE_GAIN = 0.3;
/**
 * ESTIMATE — a season that cannot cover a crop's water need loses more than the missing share of its
 * harvest (rice fails fast when the field goes dry), so the delivered staple share is discounted at this
 * rate per unit of shortfall. The reliability *margin* is a separate question and is priced by S1/S6/S7,
 * not twice here.
 */
const SHORTFALL_COST = 1.5;
/**
 * Days an idle season would have to give back to actually host a crop: the shortest pre-monsoon crop in
 * the pool plus one more turnaround for land prep. The idle-land charge is scaled by how much of the year
 * was still free relative to this, so a fallow the calendar forced is not charged like a fallow the farmer chose.
 */
const IDLE_WINDOW_DAYS = Math.min(...CROPS.filter((c) => c.season === "pre" && c.family !== "none").map((c) => c.durationDays)) + TURNAROUND_DAYS;

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

/** One sentence, two languages. The Bangla text uses Bangla digits, so the value reads identically either way. */
const bi = (en: string, bn: string): BiText => ({ en, bn });
const num = (v: number) => String(v);
const numBn = (v: number) => toBnDigits(v);
/** A 0–1 score shown as 0–100, the way every reason sentence quotes it. */
const pct = (v: number) => Math.round(v * 100);
/** Bangla names for the crop-family groups used in the same-family rule. */
const FAMILY_GROUP_BN: Record<string, string> = {
  cereal: "ধান-গম জাতীয়",
  legume: "বীজগুটি",
  brassica: "সরিষা জাতীয়",
  mallow: "পাট জাতীয়",
  sesame: "তিল",
  nightshade: "আলু-বেগুন জাতীয়",
};

/** Era tests are two-sided Mann-Whitney U; below this p the shift is treated as detected. */
export const ONSET_ALPHA = 0.05;

/**
 * Is this farm's measured era difference statistically distinguishable? A p ≥ 0.05 result is not
 * a detected shift — the two eras could have come from the same distribution — so nothing here may
 * claim the window opened earlier or later, and the engine must not act on the median difference.
 */
export function onsetShiftSignificant(pack: FarmPack): boolean {
  return Number.isFinite(pack.onset.pValue) && pack.onset.pValue < ONSET_ALPHA;
}

/** The measured shift the engine is allowed to act on: the median difference only when significant. */
export function measuredOnsetShift(pack: FarmPack): number {
  return onsetShiftSignificant(pack) ? pack.onset.shiftDays : 0;
}

/** "median −6 days, p = 0.764" — the measured figures, quoted the same way everywhere they are downgraded to 0. */
const shiftText = (pack: FarmPack) =>
  `median ${pack.onset.shiftDays > 0 ? "+" : ""}${num(pack.onset.shiftDays)} days, p = ${fmtNum(pack.onset.pValue.toFixed(3), "en")}`;
const shiftTextBn = (pack: FarmPack) =>
  `মধ্যক ${pack.onset.shiftDays > 0 ? "+" : ""}${numBn(pack.onset.shiftDays)} দিন, p = ${fmtNum(pack.onset.pValue.toFixed(3), "bn")}`;

/** Farm-observed onset shift (significant ones only) plus any what-if shift the user selected. Positive = later monsoon. */
export function effectiveOnsetShift(pack: FarmPack, sc: Scenario) {
  return measuredOnsetShift(pack) + sc.onsetShiftDays;
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

/** Share of a season's staple output that its water can deliver: full while the need is covered, then cut at SHORTFALL_COST per unit missing. */
const deliveredShare = (supply: number, demand: number) =>
  demand <= 0 ? 1 : clamp01(1 - SHORTFALL_COST * Math.max(0, 1 - supply / demand));

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

/**
 * Idle land is only neglect when the year still had room for a crop. `idleScale` is the share of the
 * minimum window that is genuinely free, so the fallow after a long Boro + Aman (about 84 days left at
 * most farms) is charged less than an idle season on a farm that had a whole season spare.
 */
function sequenceRules(crops: Crop[], idleScale: number) {
  const listed: Penalty[] = [];
  let soilHit = 0;
  const familySource = bi(
    "ESTIMATE — demo carryover coefficient for repeating a crop family",
    "ESTIMATE — একই গোত্রের ফসল পুনরাবৃত্তির ডেমো ক্যারিওভার সহগ",
  );
  for (let i = 1; i < crops.length; i++) {
    const prev = crops[i - 1];
    const cur = crops[i];
    if (prev.family === "none" || cur.family === "none" || prev.family !== cur.family) continue;
    const group = FAMILY_GROUP[cur.family] ?? cur.family;
    const groupBn = FAMILY_GROUP_BN[group] ?? group;
    if (cur.family === "Fabaceae") {
      listed.push({
        rule: bi(
          "Same-family sequence (legume after legume) — shared root pathogens carry over",
          "একই গোত্রের ক্রম (বীজগুটির পর বীজগুটি) — একই রোগজীবাণু মাটিতে থেকে যায়",
        ),
        amount: LEGUME_SEQUENCE_POINTS,
        source: familySource,
      });
      soilHit += LEGUME_SEQUENCE_SOIL_HIT;
    } else if (cur.family === "Poaceae") {
      listed.push({
        rule: bi(
          "Same-family sequence (cereal after cereal) — pest/disease carryover, soil N drain",
          "একই গোত্রের ক্রম (ধান-গম জাতীয় ফসলের পর একই জাতীয়) — পোকা-রোগ থেকে যায়, মাটির নাইট্রোজেন কমে",
        ),
        amount: CEREAL_SEQUENCE_POINTS,
        source: familySource,
      });
      soilHit += CEREAL_SEQUENCE_SOIL_HIT;
    } else {
      listed.push({
        rule: bi(
          `Same-family sequence (${group} after ${group}) — pest/disease carryover`,
          `একই গোত্রের ক্রম (${groupBn}-এর পর ${groupBn}) — পোকা-রোগ থেকে যায়`,
        ),
        amount: SAME_FAMILY_POINTS,
        source: familySource,
      });
      soilHit += SAME_FAMILY_SOIL_HIT;
    }
  }
  if (crops.some((c) => c.family === "none") && idleScale > 0) {
    const freePct = Math.round(idleScale * 100);
    listed.push({
      rule: bi(
        `Idle fallow season (${num(freePct)}% of a crop window still free) — bare soil, no residue return, weed seed bank builds`,
        `পতিত মৌসুম (একটি ফসলের জানালার ${numBn(freePct)}% এখনও ফাঁকা) — নগ্ন মাটি, অবশিষ্টাংশ ফেরত নেই, আগাছার বীজ জমছে`,
      ),
      amount: points(IDLE_FALLLOW_POINTS * idleScale),
      source: bi(
        "ESTIMATE — demo penalty for leaving land uncropped, scaled by the calendar room the farm actually had",
        "ESTIMATE — জমি ফাঁকা রাখার ডেমো জরিমানা, খামারের বাস্তব ক্যালেন্ডার-জায়গা অনুযায়ী হার",
      ),
    });
    soilHit += IDLE_FALLLOW_SOIL_HIT * idleScale;
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
      const supply = waterSupply(pack, season, sc);
      return {
        season,
        crop,
        adequacy: waterAdequacy(supply, crop.waterDemand),
        delivered: deliveredShare(supply, crop.waterDemand),
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
    // Food & income has two axes: the cash/income value of each season graded by that season's water
    // reliability margin, plus the staple food the sequence actually puts on the table, graded by how much
    // of the crop's water need the season can cover.
    const s8 = clamp01((mean(perSeason.map((p) => p.crop.yieldValue * p.adequacy)) + STAPLE_GAIN * mean(perSeason.map((p) => p.crop.stapleIndex * p.delivered))) / YIELD_REFERENCE);

    const real = crops.filter((c) => c.family !== "none");
    const nFixCount = real.filter((c) => c.nFixing).length;
    const residue = mean(crops.map((c) => c.residueIndex));
    const idleScale = clamp01((YEAR_DAYS - calendarDaysNeeded(crops, shift)) / IDLE_WINDOW_DAYS);
    const rules = sequenceRules(crops, idleScale);
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
        rule: bi(
          "Flood exposure in Aman (field flood-proneness × crop tolerance)",
          "আমনে বন্যার ঝুঁকি (মাঠের বন্যা-সূচক × ফসলের সহনশীলতা)",
        ),
        amount: points(floodPoints),
        source: bi("computed from farm flood index + crop trait", "খামারের বন্যা-সূচক + ফসলের গুণ থেকে হিসাব"),
      });
    }
    const heatPoints = Math.max(0, heatRisk - HEAT_FLOOR) * RISK_POINTS;
    if (heatPoints > 0.05) {
      penalties.push({
        rule: bi(
          "Heat exposure in the dry seasons (season heat × crop tolerance)",
          "শুষ্ক মৌসুমে তাপের চাপ (মৌসুমের তাপ × ফসলের সহনশীলতা)",
        ),
        amount: points(heatPoints),
        source: bi("POWER T2M_MAX trend + crop heat tolerance (demo fixture)", "POWER T2M_MAX ধারা + ফসলের তাপ-সহনশীলতা (ডেমো ফিক্সচার)"),
      });
    }
    const onsetPoints = Math.max(0, onsetRisk - ONSET_FLOOR) * ONSET_POINTS;
    if (onsetPoints > 0.05) {
      penalties.push({
        rule: bi(
          `Late monsoon onset (+${num(shift)} days) pushes winter sowing into terminal heat`,
          `বর্ষার দেরিতে শুরু (+${numBn(shift)} দিন) — লাগানোর সময় গরমের শেষ দিকে ঠেকছে`,
        ),
        amount: points(onsetPoints),
        source: bi(
          "measured onset shift used only when its era test is significant (p < 0.05), else 0, + scenario shift you set; ESTIMATE scaling",
          "পরিমাপিত শুরুর পরিবর্তন কেবল উল্লেখযোগ্য হলে (p < ০.০৫) ব্যবহার হয়, না-হলে ০, + আপনার বেছে নেওয়া দৃশ্যপট; ESTIMATE স্কেলিং",
        ),
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
    const spare = YEAR_DAYS - used;
    const durations = crops.map((c) => c.durationDays).join(" + ");
    const durationsBn = crops.map((c) => numBn(c.durationDays)).join(" + ");
    const why: BiText[] = [
      bi(
        `Water adequacy ${num(pct(s1))}/100 across the sequence — supply vs crop demand (planned sources NASA POWER + SMAP + FAO-56, demo fixture values today; dry-season supply includes this farm's demo irrigation access).`,
        `পুরো ক্রমে পানির প্রাপ্যতা ${numBn(pct(s1))}/১০০ — সরবরাহ বনাম ফসলের পানির চাহিদা (পরিকল্পিত উৎস NASA POWER + SMAP + FAO-56, তবে আজকের মান ডেমো ফিক্সচার; শুষ্ক মৌসুমের সরবরাহে এই খামারের ডেমো সেচ-প্রবেশাধিকারও হিসাব করা আছে)।`,
      ),
      bi(
        `${nFixCount > 0 ? "A legume improves the nitrogen balance" : "Residue return keeps organic balance"} — soil health ${num(pct(s4))}/100.`,
        `${nFixCount > 0 ? "বীজগুটি ফসল নাইট্রোজেনের ভারসাম্য বাড়ায়" : "ফসলের অবশিষ্টাংশ মাটির জৈবভারসাম্য রাখে"} — মাটির স্বাস্থ্য ${numBn(pct(s4))}/১০০।`,
      ),
      bi(
        `Soil compatibility ${num(pct(s3))}/100 (modeled pH ${num(pack.soil.ph)}${sc.phOverride ? `, corrected to ${num(sc.phOverride)}` : ""}).`,
        `মাটির সাথে সামঞ্জস্য ${numBn(pct(s3))}/১০০ (মডেল করা pH ${numBn(pack.soil.ph)}${sc.phOverride ? `, সংশোধন করে ${numBn(sc.phOverride)}` : ""})।`,
      ),
      bi(
        `Fits the ${num(YEAR_DAYS)}-day calendar: ${num(used)} days used (${durations} plus ${num(TURNAROUND_DAYS)}-day turnarounds${shift >= 0 ? ` and +${num(shift)}-day onset` : ` and ${num(shift)}-day onset`}), ${num(spare)} days spare.`,
        `৩৬৫ দিনের ক্যালেন্ডারে বসছে: ${numBn(used)} দিন লাগছে (${durationsBn} + ${numBn(TURNAROUND_DAYS)} দিনের টার্নঅ্যাউন্ড${shift >= 0 ? ` + ${numBn(shift)} দিনের দেরি-শুরু` : ` ${numBn(shift)} দিনের আগে-শুরু`}), ${numBn(spare)} দিন ফাঁকা থাকছে।`,
      ),
    ].concat(
      pack.onset.shiftDays !== 0 && !onsetShiftSignificant(pack)
        ? [bi(
            `The measured onset shift (${shiftText(pack)}) is not significant, so it is treated as 0 here${sc.onsetShiftDays ? ` — only your ${sc.onsetShiftDays > 0 ? "+" : ""}${num(sc.onsetShiftDays)}-day what-if moves the calendar` : " and the calendar keeps the full year"}.`,
            `পরিমাপিত শুরুর পরিবর্তন (${shiftTextBn(pack)}) উল্লেখযোগ্য নয়, তাই এখানে ০ ধরা হয়েছে${sc.onsetShiftDays ? ` — ক্যালেন্ডারে শুধু আপনার ${sc.onsetShiftDays > 0 ? "+" : ""}${numBn(sc.onsetShiftDays)} দিনের দৃশ্যপটই বসছে` : " — ক্যালেন্ডার পুরো বছরই রাখে"}।`,
          )]
        : [],
      sorted[0].key === "s6"
        ? [bi(
            `Resilience ${num(pct(s6))}/100: Aman flood exposure, dry-season heat and rain deficit.`,
            `সহনশীলতা ${numBn(pct(s6))}/১০০: আমনে বন্যার ঝুঁকি, শুষ্ক মৌসুমে তাপ ও বৃষ্টির ঘাটতি।`,
          )]
        : [],
      sorted[0].key === "s8" || sorted[1].key === "s8"
        ? [bi(
            `Food & income ${num(pct(s8))}/100: each season's income value graded by its water-reliability margin, plus the staple rice this sequence can actually grow, graded by how much of that crop's water need the season covers (ESTIMATE — demo income and staple values, not BBS figures).`,
            `খাদ্য ও আয় ${numBn(pct(s8))}/১০০: প্রতিটি মৌসুমের আয়-মূল্য গুণ করা হয় সেই মৌসুমের পানির নির্ভরযোগ্যতার প্রান্ত দিয়ে, সঙ্গে যোগ হয় এই ক্রমের ধান-নিরাপত্তার অংশ — প্রতি মৌসুমে ফসলের পানির চাহিদা কতটুকু মেটাতে সম্ভব তার ভিত্তিতে (ESTIMATE — ডেমো আয় ও খাদ্য-নিরাপত্তার মান, BBS-এর সংখ্যা নয়)।`,
          )]
        : [],
      dry.some((p) => p.irrigating)
        ? [bi(
            `At least one dry-season crop depends on pumping here — irrigation reliance ${num(pct(s7))}/100 (demo access ${num(pack.irrigation)}).`,
            `এখানে অন্তত একটি শুষ্ক-মৌসুম ফসল সেচের পানির ওপর নির্ভর করে — কম সেচ-নির্ভরতা স্কোর ${numBn(pct(s7))}/১০০ (ডেমো সেচ-প্রবেশাধিকার ${numBn(pack.irrigation)})।`,
          )]
        : [],
      onsetPoints > 0.05
        ? [bi(
            `Late onset (+${num(shift)} days) costs this sequence ${num(points(onsetPoints))} points — short-duration, heat-tolerant dry-season crops lose less.`,
            `বর্ষার দেরিতে শুরু (+${numBn(shift)} দিন) এই ক্রমের ${numBn(points(onsetPoints))} পয়েন্ট কেটেছে — ছোট বর্ধনাকালের, তাপ-সহনশীল শুষ্ক-মৌসুম ফসলের ক্ষতি কম হয়।`,
          )]
        : [],
      earlyCredit > 0.5
        ? [bi(
            `An earlier onset (${num(shift)} days) widens the growing window, so the longest dry-season crop (${num(longest)} days) gains ${num(points(earlyCredit))} points.`,
            `বর্ষার আগে শুরু (${numBn(shift)} দিন) বর্ধনাকালের জানালা চওড়া করে, তাই সবচেয়ে লম্বা শুষ্ক-মৌসুম ফসলটি (${numBn(longest)} দিন) ${numBn(points(earlyCredit))} পয়েন্ট পাচ্ছে।`,
          )]
        : [],
    );

    const risks: BiText[] = [];
    if (heatPoints > 0.05) risks.push(bi("Dry-season heat can cut yield for the less tolerant crops here", "শুষ্ক মৌসুমের তাপে এখানে কম সহনশীল ফসলের ফলন কমতে পারে"));
    if (onsetPoints > 0.05) risks.push(bi(`Late onset (+${num(shift)} days) squeezes the winter window — short-duration crops are the safer pick`, `বর্ষার দেরিতে শুরু (+${numBn(shift)} দিন) রবি মৌসুমের জানালা সংকুচিত করছে — ছোট বর্ধনাকালের ফসলই বেশি নিরাপদ`));
    if (pack.floodProneIndex > 0.6) risks.push(bi("Field is flood-prone — Aman drainage matters", "মাঠ বন্যা-কবলিত — আমনে জলনিষ্কাশন জরুরি"));
    if (sc.phOverride === null && (pack.soil.ph < 5.8 || pack.soil.ph > 7.6)) risks.push(bi("Modeled soil pH is near tolerance edges — verify with a field test", "মডেল করা মাটির pH সহনসীমার কাছে — মাঠে পরীক্ষা করে দেখুন"));
    if (dry.some((p) => p.irrigating)) risks.push(bi("Winter crop likely needs irrigation on this farm", "এই খামারে রবি ফসলে সম্ভবত সেচ লাগবে"));
    if (real.length < crops.length) risks.push(bi("Idle season leaves the field bare — weeds and erosion take the foothold", "মৌসুম ফাঁকা থাকলে মাঠ নগ্ন থাকে — আগাছা ও মাটি ধুয়ে-যাওয়া বাধ পায়"));

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
  const pump = Math.round(top.irrigationShare * 100);
  const onset = top.penalties.find((p) => p.rule.en.startsWith("Late monsoon onset"));
  const v = (x: number | string) => fmtNum(x, lang);
  const p = pack.onset.pValue.toFixed(3);
  const measured = Math.abs(pack.onset.shiftDays);
  const later = pack.onset.shiftDays > 0;
  const product = pack.onset.source ?? "demo fixture";
  const significant = onsetShiftSignificant(pack);

  if (lang === "en") {
    const onsetLine = significant
      ? `Usable-rainfall onset is ${v(measured)} days ${later ? "later" : "earlier"} than 2001–2012 on this farm (${product}, p=${v(p)}).`
      : `No significant onset shift on this farm (${product}, p=${v(p)}; median ${v(later ? "+" : "")}${v(pack.onset.shiftDays)} days) — the calendar treats it as 0.`;
    const irrigated = pump > 0
      ? `Dry-season demand runs ${v(pump)}/100 above usable rainfall on the demo water scale, so this plan relies on pumping (farm irrigation access ${v(pack.irrigation)}, demo estimate).`
      : `This plan needs no dry-season pumping at this farm's rainfall.`;
    return `${onsetLine} Best-fit rotation: ${seq} — score ${v(top.total)}/100. ${irrigated}${onset ? ` ${onset.rule.en} costs ${v(onset.amount)} points.` : ""}`;
  }
  const bnOnset = significant
    ? `ব্যবহারযোগ্য বর্ষার শুরু ২০০১–২০১২-এর তুলনায় ${v(measured)} দিন ${later ? "পরে" : "আগে"} হয়েছে (${product}, p=${v(p)})।`
    : `এই খামারে বর্ষার শুরুর উল্লেখযোগ্য পরিবর্তন ধরা পড়েনি (${product}, p=${v(p)}; মধ্যক ${v(later ? "+" : "")}${v(pack.onset.shiftDays)} দিন) — ক্যালেন্ডারে ০ ধরা হয়েছে।`;
  const bnIrrig = pump > 0
    ? `শুষ্ক মৌসুমে ফসলের পানির চাহিদা ব্যবহারযোগ্য বৃষ্টি থেকে ${v(pump)}/১০০ বেশি (ডেমো স্কেল) — তাই সেচ লাগবে; খামারের সেচ-প্রবেশাধিকার ${v(pack.irrigation)} (ডেমো)।`
    : `এই পরিকল্পনায় শুষ্ক মৌসুমে সেচ লাগবে না।`;
  const bnPenalty = onset ? ` বর্ষার দেরিতে শুরু স্কোরে ${v(onset.amount)} পয়েন্ট কেটেছে।` : "";
  return `${bnOnset} সেরা ফসল-পর্যায়: ${seq} — স্কোর ${v(top.total)}/১০০। ${bnIrrig}${bnPenalty}`;
}

export function smsText(pack: FarmPack, top: RotationResult, lang: "en" | "bn"): string {
  const seq = top.crops.map((c) => c.name_en).join(">");
  const shift = effectiveOnsetShift(pack, { rainfallPct: 0, tempDeltaC: 0, onsetShiftDays: 0, phOverride: null });
  const pump = Math.round(top.irrigationShare * 100);
  const v = (x: number | string) => fmtNum(x, lang);
  const onsetPart = onsetShiftSignificant(pack)
    ? `onset ${shift >= 0 ? "+" : ""}${v(shift)}d`
    : `onset n.s. (p=${v(pack.onset.pValue.toFixed(2))})`;
  const onsetBn = onsetShiftSignificant(pack)
    ? `শুরু ${shift >= 0 ? "+" : ""}${v(shift)} দিন`
    : `শুরু উল্লেখযোগ্য নয় (p=${v(pack.onset.pValue.toFixed(2))})`;
  if (lang === "en") return `FieldShift ${pack.name_en}: ${onsetPart}. Try: ${seq}. Pump +${v(pump)}/100. Score ${v(top.total)}/100.`;
  return `ফিল্ডশিফট ${pack.name_bn}: ${onsetBn}। ফসল: ${top.crops.map((c) => c.name_bn).join(">")}। সেচ +${v(pump)}/১০০। স্কোর ${v(top.total)}/১০০।`;
}

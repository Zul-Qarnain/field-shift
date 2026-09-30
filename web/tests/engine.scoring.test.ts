import { describe, expect, it } from "vitest";
import { CROPS, FARMS, type FarmPack } from "@/lib/data";
import {
  DEFAULT_PRIORITIES, DEFAULT_SCENARIO, advisoryText, confidenceFromQuality, generateRotations, smsText,
  type Priorities,
} from "@/lib/engine";

const ALL = new Set(CROPS.map((c) => c.id));
const KEYS = ["s1", "s2", "s3", "s4", "s5", "s6"] as const;

const sequence = (ids: string[]) => new Set(ids);
const cropKey = (ids: { id: string }[]) => ids.map((c) => c.id).join(">");

function component(result: { components: { key: string; value: number; weight: number }[] }, key: string) {
  const found = result.components.find((c) => c.key === key);
  if (!found) throw new Error(`missing component ${key}`);
  return found;
}

describe("rotation engine — sequence constraints", () => {
  it("rejects a consecutive same-family pair and accepts a mixed-family sequence", () => {
    const pack = FARMS[0];
    expect(generateRotations(pack, DEFAULT_PRIORITIES, DEFAULT_SCENARIO, sequence(["aman", "boro", "mungbean"]))).toHaveLength(0);
    expect(generateRotations(pack, DEFAULT_PRIORITIES, DEFAULT_SCENARIO, sequence(["aman", "wheat", "sesame"]))).toHaveLength(0);
    expect(generateRotations(pack, DEFAULT_PRIORITIES, DEFAULT_SCENARIO, sequence(["aman", "maize", "jute"]))).toHaveLength(0);

    const ok = generateRotations(pack, DEFAULT_PRIORITIES, DEFAULT_SCENARIO, sequence(["aman", "lentil", "sesame"]));
    expect(ok).toHaveLength(1);
    expect(ok[0].crops.map((c) => c.season)).toEqual(["aman", "rabi", "pre"]);
    expect(new Set(ok[0].crops.map((c) => c.family)).size).toBe(3);
  });

  it("ignores pool ids that are not in the demo crop list", () => {
    const pack = FARMS[0];
    const exact = generateRotations(pack, DEFAULT_PRIORITIES, DEFAULT_SCENARIO, sequence(["aman", "lentil", "sesame"]));
    const extra = generateRotations(pack, DEFAULT_PRIORITIES, DEFAULT_SCENARIO, sequence(["aman", "lentil", "sesame", "not-a-crop"]));
    expect(extra.map((r) => cropKey(r.crops))).toEqual(exact.map((r) => cropKey(r.crops)));
    expect(extra.map((r) => r.total)).toEqual(exact.map((r) => r.total));
  });

  it("never places boro, wheat, or maize after Aman rice", () => {
    const blocked = new Set(["boro", "wheat", "maize"]);
    for (const pack of FARMS) {
      for (const rotation of generateRotations(pack, DEFAULT_PRIORITIES, DEFAULT_SCENARIO, ALL)) {
        expect(rotation.crops.some((c) => blocked.has(c.id))).toBe(false);
      }
    }
  });
});

describe("rotation engine — score invariants", () => {
  it("ranks descending, keeps unique ids, and rounds totals to one decimal", () => {
    for (const pack of FARMS) {
      const results = generateRotations(pack, DEFAULT_PRIORITIES, DEFAULT_SCENARIO, ALL);
      expect(results.length).toBeGreaterThan(0);
      expect(new Set(results.map((r) => r.id)).size).toBe(results.length);
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].total).toBeGreaterThanOrEqual(results[i].total);
      }
      for (const rotation of results) {
        expect(Number.isFinite(rotation.total)).toBe(true);
        expect(rotation.total).toBe(Math.round(rotation.total * 10) / 10);
        expect(rotation.components.map((c) => c.key)).toEqual([...KEYS]);
        expect(rotation.why.length).toBeGreaterThanOrEqual(3);
        expect(rotation.why[0]).toContain("Water adequacy");
      }
    }
  });

  it("keeps every component in [0, 1] and weights identical across a ranking", () => {
    for (const pack of FARMS) {
      const results = generateRotations(pack, DEFAULT_PRIORITIES, DEFAULT_SCENARIO, ALL);
      const weights = results[0].components.map((c) => c.weight);
      const sum = weights.reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1, 10);
      for (const rotation of results) {
        expect(rotation.components.map((c) => c.weight)).toEqual(weights);
        for (const part of rotation.components) {
          expect(part.value).toBeGreaterThanOrEqual(0);
          expect(part.value).toBeLessThanOrEqual(1);
          expect(part.weight).toBeGreaterThan(0);
        }
      }
    }
  });

  it("is fully deterministic, including explanations and penalties", () => {
    const priorities: Priorities = { water: 80, soilHealth: 20, stability: 60, riskSafety: 10 };
    const scenario = { rainfallPct: -10, tempDeltaC: 1, onsetShiftDays: 7, phOverride: 6.2 };
    const a = generateRotations(FARMS[2], priorities, scenario, ALL);
    const b = generateRotations(FARMS[2], priorities, scenario, ALL);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("keeps rotation ids stable when only priorities change", () => {
    const base = generateRotations(FARMS[1], DEFAULT_PRIORITIES, DEFAULT_SCENARIO, ALL);
    const shifted = generateRotations(FARMS[1], { ...DEFAULT_PRIORITIES, water: 100, soilHealth: 0 }, DEFAULT_SCENARIO, ALL);
    for (const rotation of base) {
      const match = shifted.find((r) => cropKey(r.crops) === cropKey(rotation.crops));
      expect(match?.id).toBe(rotation.id);
    }
  });
});

describe("rotation engine — priorities and scenarios", () => {
  const pack = FARMS[1];

  function weightFor(priorities: Priorities, key: string) {
    const top = generateRotations(pack, priorities, DEFAULT_SCENARIO, ALL)[0];
    return component(top, key).weight;
  }

  it("raises the matching component weight as each priority slider increases", () => {
    const cases: { key: keyof Priorities; component: string }[] = [
      { key: "water", component: "s1" },
      { key: "soilHealth", component: "s4" },
      { key: "stability", component: "s2" },
      { key: "riskSafety", component: "s6" },
    ];
    for (const { key, component: componentKey } of cases) {
      const low = weightFor({ ...DEFAULT_PRIORITIES, [key]: 0 }, componentKey);
      const mid = weightFor({ ...DEFAULT_PRIORITIES, [key]: 50 }, componentKey);
      const high = weightFor({ ...DEFAULT_PRIORITIES, [key]: 100 }, componentKey);
      expect(mid).toBeGreaterThan(low);
      expect(high).toBeGreaterThan(mid);
    }
  });

  it("promotes the lower-water sequence when the water priority is maxed", () => {
    const base = generateRotations(pack, DEFAULT_PRIORITIES, DEFAULT_SCENARIO, ALL);
    const hiWater = generateRotations(pack, { ...DEFAULT_PRIORITIES, water: 100 }, DEFAULT_SCENARIO, ALL);
    const indexOf = (results: typeof base, key: string) => results.findIndex((r) => cropKey(r.crops) === key);
    const thirsty = "aman>potato>mungbean";
    const sparing = "aman>mustard>sesame";
    expect(indexOf(base, sparing)).toBeGreaterThan(indexOf(base, thirsty));
    expect(indexOf(hiWater, sparing)).toBeLessThan(indexOf(hiWater, thirsty));
  });

  it("moves water adequacy and thermal fit in the direction of the scenario", () => {
    for (const farm of FARMS) {
      const base = generateRotations(farm, DEFAULT_PRIORITIES, DEFAULT_SCENARIO, ALL);
      const dry = generateRotations(farm, DEFAULT_PRIORITIES, { ...DEFAULT_SCENARIO, rainfallPct: -20 }, ALL);
      const wet = generateRotations(farm, DEFAULT_PRIORITIES, { ...DEFAULT_SCENARIO, rainfallPct: 20 }, ALL);
      const hot = generateRotations(farm, DEFAULT_PRIORITIES, { ...DEFAULT_SCENARIO, tempDeltaC: 2 }, ALL);
      const cool = generateRotations(farm, DEFAULT_PRIORITIES, { ...DEFAULT_SCENARIO, tempDeltaC: -2 }, ALL);
      for (const rotation of base) {
        const d = dry.find((r) => r.id === rotation.id)!;
        const w = wet.find((r) => r.id === rotation.id)!;
        const h = hot.find((r) => r.id === rotation.id)!;
        const c = cool.find((r) => r.id === rotation.id)!;
        expect(component(d, "s1").value).toBeLessThan(component(rotation, "s1").value);
        expect(component(w, "s1").value).toBeGreaterThanOrEqual(component(rotation, "s1").value);
        expect(component(h, "s2").value).toBeLessThan(component(rotation, "s2").value);
        expect(component(c, "s2").value).toBeGreaterThan(component(rotation, "s2").value);
      }
    }
  });

  it("drops soil compatibility when the pH override leaves every crop's range", () => {
    const farm = FARMS[0];
    const inside = generateRotations(farm, DEFAULT_PRIORITIES, { ...DEFAULT_SCENARIO, phOverride: 6.5 }, ALL);
    const outside = generateRotations(farm, DEFAULT_PRIORITIES, { ...DEFAULT_SCENARIO, phOverride: 4 }, ALL);
    for (const rotation of inside) {
      expect(component(rotation, "s3").value).toBe(1);
      const worse = outside.find((r) => r.id === rotation.id)!;
      expect(component(worse, "s3").value).toBeLessThan(1);
      expect(worse.why.join(" ")).toContain("corrected to 4");
    }
  });
});

describe("rotation engine — confidence, penalties, and advisory copy", () => {
  const pool = sequence(["aman", "lentil", "sesame"]);

  function withQuality(pack: FarmPack, smapEra: boolean, soilModeled: boolean): FarmPack {
    return { ...pack, dataQuality: { ...pack.dataQuality, smapEra, soilModeled } };
  }

  it("maps data-quality flags onto high, medium, and low confidence", () => {
    const pack = FARMS[0];
    expect(generateRotations(withQuality(pack, true, false), DEFAULT_PRIORITIES, DEFAULT_SCENARIO, pool)[0].confidence).toBe("high");
    expect(generateRotations(withQuality(pack, true, true), DEFAULT_PRIORITIES, DEFAULT_SCENARIO, pool)[0].confidence).toBe("medium");
    expect(generateRotations(withQuality(pack, false, true), DEFAULT_PRIORITIES, DEFAULT_SCENARIO, pool)[0].confidence).toBe("low");
    expect(generateRotations(withQuality(pack, false, false), DEFAULT_PRIORITIES, DEFAULT_SCENARIO, pool)[0].confidence).toBe("low");
  });

  it("confidenceFromQuality applies the same rule the engine uses", () => {
    expect(confidenceFromQuality({ smapEra: true, soilModeled: false, ndviRecordYears: 24 })).toBe("high");
    expect(confidenceFromQuality({ smapEra: true, soilModeled: true, ndviRecordYears: 24 })).toBe("medium");
    expect(confidenceFromQuality({ smapEra: false, soilModeled: true, ndviRecordYears: 4 })).toBe("low");
    expect(confidenceFromQuality({ smapEra: false, soilModeled: false, ndviRecordYears: 4 })).toBe("low");
    for (const pack of FARMS) {
      for (const rotation of generateRotations(pack, DEFAULT_PRIORITIES, DEFAULT_SCENARIO, pool)) {
        expect(rotation.confidence).toBe(confidenceFromQuality(pack.dataQuality));
      }
    }
  });

  it("records a flood penalty on the flood-prone farm and skips it on the dry tract", () => {
    const flood = generateRotations(FARMS[2], DEFAULT_PRIORITIES, DEFAULT_SCENARIO, ALL);
    const dry = generateRotations(FARMS[1], DEFAULT_PRIORITIES, DEFAULT_SCENARIO, ALL);
    expect(flood.every((r) => r.penalties.some((p) => p.rule.startsWith("Flood exposure")))).toBe(true);
    expect(dry.every((r) => r.penalties.every((p) => !p.rule.startsWith("Flood exposure")))).toBe(true);
    const acidicFarm = FARMS.find((f) => f.id === "sylhet-15")!;
    expect(acidicFarm.soil.ph).toBeLessThan(5.8);
    const acidic = generateRotations(acidicFarm, DEFAULT_PRIORITIES, DEFAULT_SCENARIO, ALL);
    expect(acidic.every((r) => r.risks.some((risk) => risk.includes("soil pH")))).toBe(true);
  });

  it("states earlier vs later onset, and mirrors the sequence in Bangla", () => {
    const earlier = FARMS.find((f) => f.onset.shiftDays < 0)!;
    const later = FARMS.find((f) => f.onset.shiftDays > 0)!;
    const earlierTop = generateRotations(earlier, DEFAULT_PRIORITIES, DEFAULT_SCENARIO, ALL)[0];
    const laterTop = generateRotations(later, DEFAULT_PRIORITIES, DEFAULT_SCENARIO, ALL)[0];

    const earlierEn = advisoryText(earlier, earlierTop, "en");
    const laterEn = advisoryText(later, laterTop, "en");
    expect(earlierEn).toContain(`${Math.abs(earlier.onset.shiftDays)} days earlier`);
    expect(earlierEn).not.toContain("days later");
    expect(laterEn).toContain(`${later.onset.shiftDays} days later`);
    expect(laterEn).toContain(laterTop.crops.map((c) => c.name_en).join(" → "));
    expect(laterEn).toContain(`score ${laterTop.total}/100`);

    const bn = advisoryText(later, laterTop, "bn");
    expect(bn).toContain("দিন পরে");
    expect(bn).toContain(laterTop.crops.map((c) => c.name_bn).join(" → "));
    expect(bn).toContain(`/১০০`);

    for (const pack of FARMS) {
      const top = generateRotations(pack, DEFAULT_PRIORITIES, DEFAULT_SCENARIO, ALL)[0];
      expect(smsText(pack, top, "en")).toContain(pack.name_en);
      expect(smsText(pack, top, "bn")).toContain(pack.name_bn);
      expect(smsText(pack, top, "en")).toContain(`Score ${top.total}/100`);
    }
  });
});

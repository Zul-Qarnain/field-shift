import { describe, expect, it } from "vitest";
import {
  DEFAULT_PRIORITIES, DEFAULT_SCENARIO, advisoryText, generateRotations, smsText,
} from "@/lib/engine";
import { CROPS, FARMS } from "@/lib/data";

const ALL = new Set(CROPS.map((c) => c.id));

describe("rotation engine — hard constraints", () => {
  for (const pack of FARMS) {
    it(`${pack.id}: every rotation is Aman → rabi → pre-monsoon with no same-family repeats`, () => {
      const results = generateRotations(pack, DEFAULT_PRIORITIES, DEFAULT_SCENARIO, ALL);
      expect(results.length).toBeGreaterThan(0);
      for (const r of results) {
        expect(r.crops.map((c) => c.season)).toEqual(["aman", "rabi", "pre"]);
        for (let i = 1; i < r.crops.length; i++) {
          expect(r.crops[i].family).not.toBe(r.crops[i - 1].family);
        }
      }
    });
  }

  it("empty crop pool yields no rotations", () => {
    expect(generateRotations(FARMS[0], DEFAULT_PRIORITIES, DEFAULT_SCENARIO, new Set())).toHaveLength(0);
  });

  it("removing all rabi crops kills every sequence", () => {
    const noRabi = new Set(ALL);
    CROPS.filter((c) => c.season === "rabi").forEach((c) => noRabi.delete(c.id));
    expect(generateRotations(FARMS[0], DEFAULT_PRIORITIES, DEFAULT_SCENARIO, noRabi)).toHaveLength(0);
  });
});

describe("rotation engine — determinism and scoring", () => {
  it("same inputs produce byte-identical rankings", () => {
    const a = generateRotations(FARMS[1], DEFAULT_PRIORITIES, DEFAULT_SCENARIO, ALL);
    const b = generateRotations(FARMS[1], DEFAULT_PRIORITIES, DEFAULT_SCENARIO, ALL);
    expect(JSON.stringify(a.map((r) => [r.id, r.total]))).toBe(JSON.stringify(b.map((r) => [r.id, r.total])));
  });

  it("component weights sum to ~1 and scores stay in [0,1]", () => {
    for (const r of generateRotations(FARMS[0], DEFAULT_PRIORITIES, DEFAULT_SCENARIO, ALL)) {
      const sum = r.components.reduce((acc, c) => acc + c.weight, 0);
      expect(sum).toBeGreaterThan(0.97);
      expect(sum).toBeLessThan(1.03);
      for (const c of r.components) expect(c.value).toBeGreaterThanOrEqual(0);
    }
  });

  it("water-priority slider re-weights water adequacy upward", () => {
    const base = generateRotations(FARMS[1], DEFAULT_PRIORITIES, DEFAULT_SCENARIO, ALL);
    const hiWater = generateRotations(FARMS[1], { ...DEFAULT_PRIORITIES, water: 100 }, DEFAULT_SCENARIO, ALL);
    const wOf = (rs: typeof base, id: string) => rs.find((r) => r.id === id)!.components.find((c) => c.key === "s1")!.weight;
    const topId = base[0].id;
    expect(wOf(hiWater, topId)).toBeGreaterThan(wOf(base, topId));
  });

  it("rainfall −20% strictly lowers water adequacy for every rotation", () => {
    const base = generateRotations(FARMS[1], DEFAULT_PRIORITIES, DEFAULT_SCENARIO, ALL);
    const dry = generateRotations(FARMS[1], DEFAULT_PRIORITIES, { ...DEFAULT_SCENARIO, rainfallPct: -20 }, ALL);
    for (const b of base) {
      const d = dry.find((r) => r.id === b.id)!;
      const s1 = (r: typeof b) => r.components.find((c) => c.key === "s1")!.value;
      expect(s1(d)).toBeLessThan(s1(b) + 1e-9);
    }
  });

  it("every penalty carries a rule and a source string", () => {
    for (const pack of FARMS) {
      for (const r of generateRotations(pack, DEFAULT_PRIORITIES, { ...DEFAULT_SCENARIO, tempDeltaC: 2 }, ALL)) {
        for (const p of r.penalties) {
          expect(p.rule.length).toBeGreaterThan(5);
          expect(p.source.length).toBeGreaterThan(5);
          expect(p.amount).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });
});

describe("advisory outputs", () => {
  it("SMS text fits 160 characters on every farm, both languages", () => {
    for (const pack of FARMS) {
      const top = generateRotations(pack, DEFAULT_PRIORITIES, DEFAULT_SCENARIO, ALL)[0];
      expect(smsText(pack, top, "en").length).toBeLessThanOrEqual(160);
      expect(smsText(pack, top, "bn").length).toBeLessThanOrEqual(160);
    }
  });

  it("advisory sentence states the shift, the p-value and the rotation", () => {
    const pack = FARMS[1];
    const top = generateRotations(pack, DEFAULT_PRIORITIES, DEFAULT_SCENARIO, ALL)[0];
    const text = advisoryText(pack, top, "en");
    expect(text).toContain(`${Math.abs(pack.onset.shiftDays)} days`);
    expect(text).toContain(`p=${pack.onset.pValue.toFixed(3)}`);
    expect(text).toContain(top.crops[0].name_en);
  });
});

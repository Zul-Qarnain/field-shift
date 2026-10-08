import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CROPS, FARMS, type FarmPack } from "@/lib/data";
import {
  DEFAULT_PRIORITIES, DEFAULT_SCENARIO, effectiveOnsetShift, generateRotations, measuredOnsetShift, onsetShiftSignificant, salinityPenalty,
  type Priorities, type RotationResult,
} from "@/lib/engine";
import { DISTRICTS, haversineKm, type DistrictEntry } from "@/lib/locate";
import { onsetView, packForFarm, type PowerPack } from "@/lib/packs";
import {
  districtProfile,
  districtSalinity,
  nearestDemoFarm,
  prioritiesFor,
  quickAnswer,
  scoreBreakdown,
  type SalinityJson,
} from "@/lib/quick";

const SALINITY = JSON.parse(readFileSync(new URL("../public/data/salinity.json", import.meta.url), "utf8")) as SalinityJson;
const districtPack = (slug: string): PowerPack =>
  JSON.parse(readFileSync(new URL(`../public/data/packs/districts/${slug}.json`, import.meta.url), "utf8")) as PowerPack;
const all = new Set(CROPS.map((c) => c.id));
const farm = (id: string): FarmPack => FARMS.find((f) => f.id === id)!;
const sequence = (r: RotationResult) => r.crops.map((c) => c.id).join(">");

describe("prioritiesFor", () => {
  it("keeps the planner's balanced default and pushes one axis to 100 for the other presets", () => {
    expect(prioritiesFor("balanced")).toEqual(DEFAULT_PRIORITIES);
    for (const key of ["water", "soilHealth", "stability", "riskSafety"] as const) {
      const preset = prioritiesFor(key);
      expect(preset[key]).toBe(100);
      for (const other of ["water", "soilHealth", "stability", "riskSafety"] as (keyof Priorities)[]) {
        if (other !== key) expect(preset[other]).toBe(25);
      }
    }
  });
});

describe("districtProfile", () => {
  it("builds a rankable pack for all 64 districts", () => {
    for (const district of DISTRICTS) {
      const profile = districtProfile(district, districtPack(district.slug), SALINITY);
      expect(profile.pack.id).toBe(`district-${district.slug}`);
      expect(profile.pack.lat).toBe(district.point.lat);
      expect(profile.pack.lon).toBe(district.point.lon);
      expect(profile.pack.name_en).toContain(district.name_en);
      expect(profile.pack.district_bn).toBe(district.name_bn);
      expect(profile.pack.polygon).toEqual([]);
      expect(profile.powerBacked).toBe(true);
      const ranked = generateRotations(profile.pack, DEFAULT_PRIORITIES, DEFAULT_SCENARIO, all);
      expect(ranked.length, district.slug).toBeGreaterThan(0);
      for (const result of ranked) expect(Number.isFinite(result.total)).toBe(true);
    }
  });

  it("borrows the nearest demo farm's fixture inputs and records which one", () => {
    for (const district of DISTRICTS) {
      const profile = districtProfile(district, null, SALINITY);
      const nearest = nearestDemoFarm(district.point);
      expect(profile.fromFarmId).toBe(nearest.farm.id);
      expect(profile.distanceKm).toBeCloseTo(nearest.km, 6);
      expect(profile.powerBacked).toBe(false);
      // the soil, water and irrigation axes really are the nearest farm's, unchanged
      expect(profile.pack.soil).toEqual(nearest.farm.soil);
      expect(profile.pack.waterAvail).toEqual(nearest.farm.waterAvail);
      expect(profile.pack.irrigation).toBe(nearest.farm.irrigation);
      expect(profile.pack.floodProneIndex).toBe(nearest.farm.floodProneIndex);
    }
  });

  it("overlays the district's own POWER pack the way the farms do", () => {
    const district = DISTRICTS.find((d) => d.slug === "satkhira")!;
    const pack = districtPack("satkhira");
    const profile = districtProfile(district, pack, SALINITY);
    const power = profile.pack.provenance.find((p) => p.id === "power")!;
    expect(power.retrieved).toMatch(/^\d{4}-\d{2}-\d{2} \(UTC\)$/);
    expect(profile.pack.metrics.heatDays).toBe(pack.metrics.heatDays);
  });

  it("marks the salinity scope as the district, and cites only what SRDI surveyed", () => {
    const surveyed = DISTRICTS.find((d) => d.slug === "satkhira")!;
    const unsurveyed = DISTRICTS.find((d) => d.slug === "rangpur")!;
    const sal = districtSalinity(surveyed, SALINITY);
    expect(sal.scope).toBe("district");
    expect(sal.cited).toBe(true);
    expect(sal.salineShare).toBeGreaterThan(0);
    expect(sal.classShares).not.toBeNull();
    expect(sal.classAreasHa).toBeNull();
    expect(sal.source).toContain("Satkhira district rollup");
    expect(sal.retrieved).toBe(SALINITY.retrieved);

    const absent = districtSalinity(unsurveyed, SALINITY);
    expect(absent.scope).toBe("district");
    expect(absent.cited).toBe(false);
    expect(absent.salineShare).toBe(0);
    expect(absent.classShares).toBeNull();
    expect(absent.repECe).toBeNull();
    expect(absent.note).toContain("outside SRDI coastal saline survey");
  });

  it("says district in the engine's salinity sentence, and still says upazila for the farms", () => {
    const satkhira = DISTRICTS.find((d) => d.slug === "satkhira")!;
    const profile = districtProfile(satkhira, districtPack("satkhira"), SALINITY);
    const penalty = salinityPenalty(profile.pack, CROPS.find((c) => c.id === "boro")!)!;
    expect(penalty.source.en).toContain("% of the district saline");
    expect(penalty.source.bn).toContain("জেলার");

    const top = generateRotations(profile.pack, DEFAULT_PRIORITIES, DEFAULT_SCENARIO, all)[0];
    expect(top.why.map((w) => w.en).join(" ")).toContain("of the district saline");
    expect(top.why.map((w) => w.bn).join(" ")).toContain("জেলার");

    const khulna = salinityPenalty(farm("khulna-09"), CROPS.find((c) => c.id === "boro")!)!;
    expect(khulna.source.en).toContain("68.3% of the upazila saline");
    expect(khulna.source.bn).toContain("উপজেলার ৬৮.৩% লবণাক্ত");
    const khulnaTop = generateRotations(farm("khulna-09"), DEFAULT_PRIORITIES, DEFAULT_SCENARIO, all)[0];
    expect(khulnaTop.why.map((w) => w.en).join(" ")).toContain("Khulna/Dumuria (68% of the upazila saline");
    expect(khulnaTop.why.map((w) => w.bn).join(" ")).toContain("Khulna/Dumuria উপজেলার ৬৮%");
  });

  it("leaves an unsurveyed district out of the salinity score entirely", () => {
    const rangpur = DISTRICTS.find((d) => d.slug === "rangpur")!;
    const profile = districtProfile(rangpur, districtPack("rangpur"), SALINITY);
    for (const result of generateRotations(profile.pack, DEFAULT_PRIORITIES, DEFAULT_SCENARIO, all)) {
      expect(result.penalties.some((p) => p.rule.en.startsWith("Soil salinity"))).toBe(false);
    }
  });

  it("keeps the farm-to-district geometry sane", () => {
    for (const district of DISTRICTS) {
      const profile = districtProfile(district, null, SALINITY);
      expect(haversineKm(district.point, { lat: profile.pack.lat, lon: profile.pack.lon })).toBe(0);
    }
  });
});

describe("districtProfile without its POWER pack", () => {
  it("neutralises the borrowed onset so nothing can rank on a demo farm's era test", () => {
    for (const district of DISTRICTS.slice(0, 8)) {
      const profile = districtProfile(district, null, SALINITY);
      expect(profile.powerBacked).toBe(false);
      expect(profile.pack.onset.shiftDays, district.slug).toBe(0);
      expect(profile.pack.onset.pValue, district.slug).toBe(1);
      expect(profile.pack.onset.eraA).toEqual([]);
      expect(profile.pack.onset.eraB).toEqual([]);
      expect(profile.pack.onset.source).toBe("none");
      expect(onsetShiftSignificant(profile.pack)).toBe(false);
      expect(measuredOnsetShift(profile.pack)).toBe(0);
      expect(effectiveOnsetShift(profile.pack, DEFAULT_SCENARIO)).toBe(0);
      // the borrowed farm's own fixture figures are gone, not merely unused
      const borrowed = nearestDemoFarm(district.point).farm;
      expect(profile.pack.onset.pValue).not.toBe(borrowed.onset.pValue);
      expect(profile.pack.onset.eraA).not.toEqual(borrowed.onset.eraA);
    }
  });

  it("brings the measured onset back the moment the pack is supplied", () => {
    const district = DISTRICTS.find((d) => d.slug === "satkhira")!;
    const pack = districtPack("satkhira");
    const view = onsetView(pack)!;
    const profile = districtProfile(district, pack, SALINITY);
    expect(profile.powerBacked).toBe(true);
    expect(profile.pack.onset.source).toBe(view.product);
    expect(profile.pack.onset.shiftDays).toBeCloseTo(view.shiftDays, 6);
    expect(profile.pack.onset.pValue).toBe(view.pValue);
    expect(profile.pack.onset.eraA).toEqual(view.eraA);
  });
});

describe("quickAnswer", () => {
  const district = DISTRICTS.find((d) => d.slug === "tangail")!;
  const profile = districtProfile(district, districtPack("tangail"), SALINITY);

  it("returns at most three rotations, each keeping the current crop in its season", () => {
    for (const cropId of ["aman", "boro", "jute"]) {
      const answers = quickAnswer(profile.pack, cropId, "balanced");
      expect(answers.length).toBeLessThanOrEqual(3);
      for (const answer of answers) {
        expect(answer.crops.some((c) => c.id === cropId), `${cropId} in ${sequence(answer)}`).toBe(true);
      }
      for (let i = 1; i < answers.length; i++) expect(answers[i - 1].total).toBeGreaterThanOrEqual(answers[i].total);
    }
  });

  it("says so when fewer than three rotations can keep the crop", () => {
    const answers = quickAnswer(profile.pack, "wheat", "balanced");
    const every = quickAnswer(profile.pack, "wheat", "balanced", 999);
    if (every.length < 3) expect(answers.length).toBe(every.length);
  });

  it("re-ranks at least one district when the priority changes", () => {
    const moved: string[] = [];
    for (const entry of DISTRICTS.slice(0, 12)) {
      const built = districtProfile(entry, districtPack(entry.slug), SALINITY);
      const balanced = quickAnswer(built.pack, "aman", "balanced").map(sequence);
      const waterFirst = quickAnswer(built.pack, "aman", "water").map(sequence);
      if (balanced[0] !== waterFirst[0]) moved.push(entry.slug);
    }
    expect(moved.length).toBeGreaterThan(0);
  });
});

describe("scoreBreakdown", () => {
  const PRIORITIES: Priorities[] = [
    DEFAULT_PRIORITIES,
    { ...DEFAULT_PRIORITIES, water: 100 },
    { ...DEFAULT_PRIORITIES, stability: 100 },
    { ...DEFAULT_PRIORITIES, soilHealth: 90, riskSafety: 20 },
  ];

  it("adds the raw parts back to the unrounded total, within 0.05, on every farm and priority", () => {
    for (const pack of FARMS) {
      for (const priorities of PRIORITIES) {
        for (const result of generateRotations(pack, priorities, DEFAULT_SCENARIO, all)) {
          const parts = scoreBreakdown(result);
          const rebuilt = parts.partsRaw - parts.penaltyRaw + parts.creditRaw;
          // result.total is that sum rounded to 0.1 (±0.05), and the credit is published to 0.01 (±0.005).
          expect(Math.abs(rebuilt - result.total), `${pack.id} ${result.id}`).toBeLessThanOrEqual(0.055);
        }
      }
    }
  });

  it("prints parts that add up to the displayed total exactly", () => {
    for (const pack of FARMS) {
      for (const priorities of PRIORITIES) {
        for (const result of generateRotations(pack, priorities, DEFAULT_SCENARIO, all)) {
          const parts = scoreBreakdown(result);
          const shown = Number((parts.partsDisplay - parts.penaltyDisplay + parts.creditDisplay).toFixed(1));
          expect(shown, `${pack.id} ${result.id} ${sequence(result)}`).toBe(result.total);
          expect(parts.segments.reduce((a, s) => a + s.display, 0)).toBeCloseTo(parts.partsDisplay, 6);
          for (const segment of parts.segments) expect(segment.display).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  it("exposes the early-onset credit without moving the total", () => {
    const pack = { ...farm("farm-12"), onset: { ...farm("farm-12").onset, pValue: 0.001, shiftDays: -7 } };
    const withCredit = generateRotations(pack, DEFAULT_PRIORITIES, DEFAULT_SCENARIO, all)[0];
    expect(withCredit.earlyCredit).toBeGreaterThan(0);
    expect(withCredit.earlyCredit).toBe(Math.round(withCredit.earlyCredit * 100) / 100);
    const plain = farm("farm-12");
    const unshifted = generateRotations({ ...plain, onset: { ...plain.onset, pValue: 0.9 } }, DEFAULT_PRIORITIES, DEFAULT_SCENARIO, all)[0];
    expect(unshifted.earlyCredit).toBe(0);
  });

  it("keeps every district profile's parts non-negative and its equation honest", () => {
    const sample: DistrictEntry[] = [DISTRICTS[0], DISTRICTS[17], DISTRICTS[63]];
    for (const district of sample) {
      const profile = districtProfile(district, districtPack(district.slug), SALINITY);
      for (const result of generateRotations(profile.pack, DEFAULT_PRIORITIES, DEFAULT_SCENARIO, all).slice(0, 5)) {
        const parts = scoreBreakdown(result);
        expect(Number((parts.partsDisplay - parts.penaltyDisplay + parts.creditDisplay).toFixed(1))).toBe(result.total);
      }
    }
  });
});

describe("the six farms still rank as they did", () => {
  it("their packs are untouched by the district work", () => {
    for (const pack of FARMS) {
      expect(packForFarm(pack.id)).not.toBeNull();
      expect(generateRotations(pack, DEFAULT_PRIORITIES, DEFAULT_SCENARIO, all).length).toBeGreaterThanOrEqual(20);
    }
  });
});

import { describe, expect, it } from "vitest";
import { CROPS, FARMS, type Crop, type FarmPack } from "@/lib/data";
import {
  DEFAULT_PRIORITIES,
  DEFAULT_SCENARIO,
  generateRotations,
  monsoonLeachedECe,
  salinityPenalty,
} from "@/lib/engine";

const crop = (id: string): Crop => CROPS.find((c) => c.id === id)!;
const farm = (id: string): FarmPack => FARMS.find((f) => f.id === id)!;
const ALL = new Set(CROPS.map((c) => c.id));

describe("Bug A — Salinity scoring & uncharacterized crop guard", () => {
  it("mustard, lentil, mungbean, sesame, and jute have explicit cited salt tolerances", () => {
    for (const id of ["mustard", "lentil", "mungbean", "sesame", "jute"]) {
      const c = crop(id);
      expect(c.salt).not.toBeNull();
      expect(c.salt!.thresholdECe).toBeGreaterThan(0);
      expect(c.salt!.slopePctPerDs).toBeGreaterThan(0);
      expect(c.salt!.source).toMatch(/(BARI|BJRI|FAO|Maas)/);
    }
  });

  it("lentil is rated salt-sensitive (threshold 1.4 dS/m) and mungbean moderately sensitive (1.8 dS/m)", () => {
    expect(crop("lentil").salt!.thresholdECe).toBe(1.4);
    expect(crop("lentil").salt!.slopePctPerDs).toBeCloseTo(15.6, 1);
    expect(crop("mungbean").salt!.thresholdECe).toBe(1.8);
    expect(crop("mustard").salt!.thresholdECe).toBe(3.0);
  });

  it("sensitive crops receive substantial salinity penalties on coastal Khulna (Dumuria)", () => {
    const khulna = farm("khulna-09");
    const lentilPen = salinityPenalty(khulna, crop("lentil"));
    const mungPen = salinityPenalty(khulna, crop("mungbean"));
    const mustardPen = salinityPenalty(khulna, crop("mustard"));

    expect(lentilPen).not.toBeNull();
    expect(mungPen).not.toBeNull();
    expect(mustardPen).not.toBeNull();

    // Lentil is more sensitive than mustard (threshold 1.4 vs 3.0), so it incurs greater penalty
    expect(lentilPen!.amount).toBeGreaterThan(mustardPen!.amount);
    expect(mungPen!.amount).toBeGreaterThan(0);
  });

  it("precautionary guard penalizes uncharacterized crops on saline soils", () => {
    const khulna = farm("khulna-09");
    const mockCrop: Crop = {
      ...crop("wheat"),
      id: "mock_mystery_crop",
      name_en: "Mystery Crop",
      name_bn: "অজানা ফসল",
      salt: null, // uncharacterized
    };

    const pen = salinityPenalty(khulna, mockCrop);
    expect(pen).not.toBeNull();
    expect(pen!.amount).toBeGreaterThan(0);
    expect(pen!.rule.en).toContain("precautionary guard");
    expect(pen!.source.en).toContain("Precautionary agronomic guard");
  });
});

describe("Bug B — Aman monsoon salinity leaching", () => {
  it("monsoon leaching attenuates dry-season ECe based on rainfall and drainage", () => {
    const dryECe = 10.0;
    const wellDrained = monsoonLeachedECe(dryECe, 0.0);
    const floodProne = monsoonLeachedECe(dryECe, 0.8);

    // Leached ECe should be significantly lower than dry season 10.0 dS/m
    expect(wellDrained).toBeLessThan(dryECe * 0.5);
    expect(wellDrained).toBeGreaterThanOrEqual(1.5);

    // Poor drainage retains more residual salts
    expect(floodProne).toBeGreaterThan(wellDrained);
  });

  it("Aman yield loss on Khulna is lower than dry season peak and quotes the upper bound", () => {
    const khulna = farm("khulna-09");
    const amanPen = salinityPenalty(khulna, crop("aman"));
    const boroPen = salinityPenalty(khulna, crop("boro"));

    expect(amanPen).not.toBeNull();
    expect(boroPen).not.toBeNull();

    // Aman loss is discounted by monsoon leaching vs dry season Boro
    expect(amanPen!.amount).toBeLessThan(boroPen!.amount);

    // Rule mentions monsoon leaching and cites dry-season peak in both languages
    expect(amanPen!.rule.en).toContain("monsoon leached");
    expect(amanPen!.rule.en).toContain("dry-season peak");
    expect(amanPen!.rule.bn).toContain("বর্ষায় ধৌত");
    expect(amanPen!.rule.bn).toContain("শুষ্ক মৌসুমে সর্বোচ্চ");
    expect(amanPen!.source.en).toContain("Mainuddin et al. 2019");
  });
});

describe("Bug D — Idle fallow penalty direction & onset scenarios", () => {
  it("late onset does NOT shrink the idle fallow penalty", () => {
    const rangpur = farm("rangpur-21");
    const normalRotations = generateRotations(rangpur, DEFAULT_PRIORITIES, DEFAULT_SCENARIO, ALL);
    const lateRotations = generateRotations(rangpur, DEFAULT_PRIORITIES, { ...DEFAULT_SCENARIO, onsetShiftDays: 15 }, ALL);

    const normalFallow = normalRotations.find((r) => r.crops.some((c) => c.id === "fallow" && r.crops[1].id === "mustard"));
    const lateFallow = lateRotations.find((r) => r.crops.some((c) => c.id === "fallow" && r.crops[1].id === "mustard"));

    expect(normalFallow).toBeDefined();
    expect(lateFallow).toBeDefined();

    const normalIdle = normalFallow!.penalties.find((p) => p.rule.en.startsWith("Idle fallow"));
    const lateIdle = lateFallow!.penalties.find((p) => p.rule.en.startsWith("Idle fallow"));

    expect(normalIdle).toBeDefined();
    expect(lateIdle).toBeDefined();

    // The idle penalty for chosen fallow must NOT drop from 4.0 to 3.2
    expect(normalIdle!.amount).toBe(4.0);
    expect(lateIdle!.amount).toBe(4.0);
  });

  it("calendar-forced fallow receives appropriate proportion of full window", () => {
    const rangpur = farm("rangpur-21");
    const rotations = generateRotations(rangpur, DEFAULT_PRIORITIES, DEFAULT_SCENARIO, ALL);
    const boroFallow = rotations.find((r) => r.crops.map((c) => c.id).join(">") === "aman>boro>fallow");
    const mustardFallow = rotations.find((r) => r.crops.map((c) => c.id).join(">") === "aman>mustard>fallow");

    expect(boroFallow).toBeDefined();
    expect(mustardFallow).toBeDefined();

    const boroIdle = boroFallow!.penalties.find((p) => p.rule.en.startsWith("Idle fallow"))!;
    const mustardIdle = mustardFallow!.penalties.find((p) => p.rule.en.startsWith("Idle fallow"))!;

    expect(mustardIdle.amount).toBe(4.0);
    // Boro has ~80 free days out of 90 required, so its penalty is ~3.6 (< 4.0)
    expect(boroIdle.amount).toBeLessThan(mustardIdle.amount);
    expect(boroIdle.amount).toBeGreaterThan(3.0);
  });
});

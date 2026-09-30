import { describe, expect, it } from "vitest";
import { CROPS, FARMS } from "@/lib/data";

describe("data pack contracts", () => {
  for (const pack of FARMS) {
    it(`${pack.id}: NASA data is the compulsory foundation (≥3 NASA-tier sources)`, () => {
      const nasa = pack.provenance.filter((p) => p.tier === "NASA");
      expect(nasa.length).toBeGreaterThanOrEqual(3);
    });

    it(`${pack.id}: every provenance entry has id, url, version and an honest retrieval status`, () => {
      for (const p of pack.provenance) {
        expect(p.id).toMatch(/^[a-z0-9-]+$/);
        expect(p.url).toMatch(/^(https?:\/\/|\/)/);
        expect(p.version.length).toBeGreaterThan(0);
        expect(p.retrieved.length).toBeGreaterThan(0);
        expect(p.retrieved).toMatch(/^(—|not yet)/);
      }
    });

    it(`${pack.id}: onset shift equals the difference of era medians`, () => {
      expect(pack.onset.shiftDays).toBe(pack.onset.currentMedianDOY - pack.onset.historicalMedianDOY);
      expect(pack.onset.eraA).toHaveLength(12);
      expect(pack.onset.eraB).toHaveLength(12);
    });

    it(`${pack.id}: coordinates are inside the Bangladesh bounding box`, () => {
      expect(pack.lat).toBeGreaterThanOrEqual(20);
      expect(pack.lat).toBeLessThanOrEqual(27);
      expect(pack.lon).toBeGreaterThanOrEqual(88);
      expect(pack.lon).toBeLessThanOrEqual(93);
      expect(pack.polygon.length).toBeGreaterThanOrEqual(4);
    });
  }
});

describe("demo crop trait contracts", () => {
  it("every crop trait value is bounded and has a season", () => {
    for (const c of CROPS) {
      expect(["aman", "rabi", "pre"]).toContain(c.season);
      expect(c.durationDays).toBeGreaterThan(40);
      expect(c.durationDays).toBeLessThan(180);
      for (const v of [c.waterDemand, c.heatTol, c.floodTol, c.nDemand, c.residueIndex]) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
      const [lo, hi] = c.phRange;
      expect(lo).toBeLessThan(hi);
    }
  });

  it("at least one N-fixing legume exists for every farm's rabi/pre seasons", () => {
    const legumes = CROPS.filter((c) => c.nFixing);
    expect(legumes.some((c) => c.season === "rabi")).toBe(true);
    expect(legumes.some((c) => c.season === "pre")).toBe(true);
  });

  it("crop ids are unique", () => {
    expect(new Set(CROPS.map((c) => c.id)).size).toBe(CROPS.length);
  });
});

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

    it(`${pack.id}: irrigation access is a bounded demo estimate the engine can read`, () => {
      expect(pack.irrigation).toBeGreaterThanOrEqual(0);
      expect(pack.irrigation).toBeLessThanOrEqual(1);
      expect(Number.isFinite(pack.irrigation)).toBe(true);
    });
  }

  it("irrigation access ranks north-irrigated above saline-coastal", () => {
    const rangpur = FARMS.find((f) => f.id === "rangpur-21")!;
    const khulna = FARMS.find((f) => f.id === "khulna-09")!;
    expect(rangpur.irrigation).toBeGreaterThan(khulna.irrigation);
  });
});

describe("demo crop trait contracts", () => {
  it("every crop trait value is bounded and has a season", () => {
    for (const c of CROPS) {
      expect(["aman", "rabi", "pre"]).toContain(c.season);
      if (c.family === "none") {
        expect(c.durationDays).toBe(0);
        expect(c.waterDemand).toBe(0);
        expect(c.nFixing).toBe(false);
      } else {
        expect(c.durationDays).toBeGreaterThan(40);
        expect(c.durationDays).toBeLessThan(180);
      }
      for (const v of [c.waterDemand, c.heatTol, c.floodTol, c.nDemand, c.residueIndex]) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
      const [lo, hi] = c.phRange;
      expect(lo).toBeLessThan(hi);
    }
  });

  it("the pool covers all three seasons and includes aus rice and idle fallow", () => {
    const aus = CROPS.find((c) => c.id === "aus");
    expect(aus?.season).toBe("pre");
    expect(aus?.name_en).toBe("Rice (Aus)");
    expect(aus?.durationDays).toBeGreaterThanOrEqual(100);
    expect(aus?.durationDays).toBeLessThanOrEqual(110);
    const fallow = CROPS.find((c) => c.id === "fallow");
    expect(fallow?.season).toBe("pre");
    expect(fallow?.family).toBe("none");
    for (const season of ["rabi", "pre"] as const) {
      expect(CROPS.filter((c) => c.season === season).length).toBeGreaterThanOrEqual(2);
    }
    expect(CROPS.filter((c) => c.season === "aman").length).toBeGreaterThanOrEqual(1);
  });

  it("at least one N-fixing legume exists for every farm's rabi/pre seasons", () => {
    const legumes = CROPS.filter((c) => c.nFixing);
    expect(legumes.some((c) => c.season === "rabi")).toBe(true);
    expect(legumes.some((c) => c.season === "pre")).toBe(true);
  });

  it("yieldValue is a bounded demo food-and-income ranking with idle land worth nothing", () => {
    for (const c of CROPS) {
      expect(c.yieldValue).toBeGreaterThanOrEqual(0);
      expect(c.yieldValue).toBeLessThanOrEqual(1);
    }
    const value = (id: string) => CROPS.find((c) => c.id === id)!.yieldValue;
    expect(value("fallow")).toBe(0);
    expect(value("boro")).toBeGreaterThan(value("lentil"));
    expect(value("boro")).toBeGreaterThan(value("sesame"));
    expect(value("potato")).toBeGreaterThan(value("mustard"));
  });

  it("stapleIndex is a bounded demo food-security ranking that puts rice on top and fibre at zero", () => {
    const staple = (id: string) => CROPS.find((c) => c.id === id)!.stapleIndex;
    for (const c of CROPS) {
      expect(c.stapleIndex).toBeGreaterThanOrEqual(0);
      expect(c.stapleIndex).toBeLessThanOrEqual(1);
    }
    expect(staple("boro")).toBe(1);
    expect(staple("boro")).toBeGreaterThan(staple("potato"));
    expect(staple("boro")).toBeGreaterThan(staple("maize"));
    expect(staple("aus")).toBeGreaterThan(staple("mustard"));
    expect(staple("jute")).toBe(0);
    expect(staple("fallow")).toBe(0);
  });

  it("crop ids are unique", () => {
    expect(new Set(CROPS.map((c) => c.id)).size).toBe(CROPS.length);
  });
});

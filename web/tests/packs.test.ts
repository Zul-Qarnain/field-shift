import { describe, expect, it } from "vitest";
import { FARMS, type FarmPack } from "@/lib/data";
import {
  PACK_INDEX, coveredWindow, onsetView, packForFarm, retrievedDay, sourceLabel, trendView, withRealData,
} from "@/lib/packs";

const FARM_IDS = ["farm-12", "rajshahi-07", "barishal-03", "khulna-09", "rangpur-21", "sylhet-15"];
const RULE_TEXT = "5-day rainfall ≥ local Jun–Sep mean (2001–2025), no break ≥ 10 days under 5 mm";

describe("NASA POWER data packs (schema v2)", () => {
  for (const id of FARM_IDS) {
    it(`${id}: the pack exists and carries real provenance`, () => {
      const pack = packForFarm(id);
      expect(pack).not.toBeNull();
      if (!pack) return;
      expect(pack.schema_version).toBe(2);
      expect(pack.kind).toBe("farm");
      expect(pack.source).toBe("NASA POWER daily point API, community AG");
      expect(pack.covered.start).toBe("1981-01-01");
      expect(pack.completeYears.first).toBe(1981);
      expect(pack.retrievedUtc).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+00:00$/);
      expect(pack.parameters.PRECTOTCORR).toContain("mm/day");
      expect(Object.keys(pack.parameters)).toHaveLength(7);
    });

    it(`${id}: the coordinates match the demo farm in lib/data.ts`, () => {
      const pack = packForFarm(id)!;
      const farm = FARMS.find((f) => f.id === id)!;
      expect(pack.lat).toBeCloseTo(farm.lat, 4);
      expect(pack.lon).toBeCloseTo(farm.lon, 4);
    });

    it(`${id}: onset is definition v2 and reports its own censoring`, () => {
      const pack = packForFarm(id)!;
      expect(pack.onset.definition).toBe("v2");
      expect(pack.onset.window).toEqual({ startDoy: 121, endDoy: 270 });
      expect(pack.onset.thresholdText).toBe(RULE_TEXT);
      expect(pack.onset.thresholdMm!).toBeGreaterThan(0);
      expect(pack.onset.referencePeriod).toEqual([2001, 2025]);
      expect(pack.onset.eraA.n).toBeLessThanOrEqual(12);
      expect(pack.onset.eraB.values).toHaveLength(pack.onset.eraB.n);
      expect(pack.onset.shiftDays).toBeCloseTo(pack.onset.medianB! - pack.onset.medianA!, 6);
      expect(pack.onset.censoredAtWindowStart.of).toBe(pack.onset.yearsDetected);
      expect(pack.onset.sensitivity.map((row) => row.thresholdFactor)).toEqual([0.8, 1, 1.2]);
    });

    it(`${id}: the rejected v1 rule is documented with the censoring it caused`, () => {
      const pack = packForFarm(id)!;
      expect(pack.method.onsetRejected).toContain("DOY 145");
      expect(pack.onset.legacyV1.censoredAtWindowStart.sharePct!).toBeGreaterThanOrEqual(50);
      expect(pack.onset.censoredAtWindowStart.sharePct!).toBeLessThan(pack.onset.legacyV1.censoredAtWindowStart.sharePct!);
    });

    it(`${id}: the rainfall trend is never the 1981–2025 one`, () => {
      const pack = packForFarm(id)!;
      const metrics = pack.metrics;
      expect(metrics.rainfallTrendWindow!.startsWith("2001")).toBe(true);
      expect(Math.min(...metrics.rainfallYearsUsed)).toBeGreaterThanOrEqual(2001);
      expect(metrics.rainfallTrendSource).toBe("NASA POWER PRECTOTCORR");
    });

    it(`${id}: homogeneity is tested and its booleans are booleans`, () => {
      const pack = packForFarm(id)!;
      const homogeneity = pack.quality.precipHomogeneity;
      expect(homogeneity.fullRecord.test).toContain("Pettitt");
      expect(homogeneity.analysisWindow.startsWith("2001")).toBe(true);
      expect(typeof homogeneity.homogeneous).toBe("boolean");
      expect(typeof homogeneity.affectsEraComparison).toBe("boolean");
      expect(typeof pack.quality.tempMaxHomogeneity.homogeneous).toBe("boolean");
      if (homogeneity.changePointInsideAnalysisWindow !== null) {
        expect(metricsCaution(pack)).toContain("POWER precipitation has source changes");
        expect(pack.onset.caution).toContain("Pettitt change point");
      }
    });

    it(`${id}: a CHIRPS cross-check exists and is labelled as non-NASA`, () => {
      const pack = packForFarm(id)!;
      const cross = pack.crossCheck;
      expect(cross.available).toBe(true);
      expect(cross.source).toBe("CHIRPS v2.0 daily (0.25°)");
      expect(cross.tierLabel).toBe("Open (UCSB CHC / USGS)");
      expect(cross.citation).toContain("Funk");
      expect(cross.yearsOnDisk).toEqual({ first: 1981, last: 2025, count: 45 });
      expect(cross.retrievedUtc).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(cross.onset!.shiftDays).toBeCloseTo(cross.onset!.medianB! - cross.onset!.medianA!, 6);
      expect(cross.agreement!.onsetYears.yearsCompared).toBeGreaterThanOrEqual(40);
      expect(cross.rainfallTrend2001toLatest!.window!.startsWith("2001")).toBe(true);
    });
  }

  it("the index lists six farms, 64 districts, the rule and the cross-check", () => {
    expect(PACK_INDEX.counts).toEqual({ farms: 6, districts: 64 });
    expect(PACK_INDEX.districts).toHaveLength(64);
    expect(PACK_INDEX.farms.map((f) => f.id).sort()).toEqual([...FARM_IDS].sort());
    expect(PACK_INDEX.onsetWindow).toEqual({ startDoy: 121, endDoy: 270 });
    expect(PACK_INDEX.onsetDefinition).toContain("Moron & Robertson");
    expect(PACK_INDEX.crossCheck.source).toContain("CHIRPS");
    expect(PACK_INDEX.trendWindow).toContain("2001");
  });

  it("source labels name the product that actually produced the number", () => {
    for (const id of FARM_IDS) {
      const pack = packForFarm(id)!;
      const label = sourceLabel(pack);
      if (pack.preferred.onsetShift.source === "CHIRPS v2.0") {
        expect(label).toContain("CHIRPS v2.0 cross-check");
      } else {
        expect(label).toContain("NASA POWER");
      }
      expect(label).toContain(retrievedDay(pack));
    }
  });
});

function metricsCaution(pack: NonNullable<ReturnType<typeof packForFarm>>): string {
  return pack.metrics.rainfallTrendCaution ?? "";
}

describe("onsetView / trendView source preference", () => {
  it("follows the pack's homogeneity test, not a hand choice", () => {
    for (const id of FARM_IDS) {
      const pack = packForFarm(id)!;
      const view = onsetView(pack)!;
      const flagged = pack.quality.precipHomogeneity.changePointInsideAnalysisWindow !== null;
      const chirpsFlagged = pack.crossCheck.homogeneity?.changePointInsideAnalysisWindow != null;
      if (flagged && !chirpsFlagged) expect(view.product).toBe("CHIRPS v2.0");
      if (!flagged) expect(view.product).toBe("NASA POWER");
      expect(view.shiftDays).toBeCloseTo(view.medianB - view.medianA, 6);
      expect(view.alternative).not.toBeNull();
      if (view.product === "CHIRPS v2.0") {
        expect(view.caution).toContain("not used");
        expect(view.alternative!.product).toBe("NASA POWER");
      }
    }
  });

  it("reports the disagreement between the two products", () => {
    const pack = packForFarm("farm-12")!;
    const view = onsetView(pack)!;
    const powerSays = pack.onset.shiftDays!;
    const chirpsSays = pack.crossCheck.onset!.shiftDays!;
    expect(view.product).toBe(pack.preferred.onsetShift.source === "CHIRPS v2.0" ? "CHIRPS v2.0" : "NASA POWER");
    // the two products genuinely differ here, so the alternative must be the other number
    expect(Math.abs(powerSays - chirpsSays)).toBeGreaterThan(0);
    expect(view.alternative!.shiftDays).toBe(view.product === "CHIRPS v2.0" ? powerSays : chirpsSays);
  });

  it("trendView scales the same way and keeps the window honest", () => {
    const pack = packForFarm("barishal-03")!;
    const trend = trendView(pack)!;
    expect(trend.window!.startsWith("2001")).toBe(true);
    expect(Math.abs(trend.pctPerDecade)).toBeLessThan(60);
    expect(trend.product).toBe(pack.preferred.rainfallTrend.source === "CHIRPS v2.0" ? "CHIRPS v2.0" : "NASA POWER");
  });
});

describe("withRealData merge", () => {
  it("replaces the fixture onset with the measured, source-preferred one", () => {
    const fixture = FARMS.find((f) => f.id === "rajshahi-07")!;
    const pack = packForFarm("rajshahi-07")!;
    const view = onsetView(pack)!;
    const merged = withRealData(fixture);
    expect(merged.onset.historicalMedianDOY).toBe(view.medianA);
    expect(merged.onset.currentMedianDOY).toBe(view.medianB);
    expect(merged.onset.shiftDays).toBeCloseTo(view.shiftDays, 6);
    expect(merged.onset.threshold).toBe(RULE_TEXT);
    // the fixture claimed +11 days later; the real series does not say that
    expect(fixture.onset.shiftDays).toBe(11);
    expect(merged.onset.shiftDays).toBeLessThan(0);
  });

  it("keeps shiftDays exactly equal to the difference of the era medians", () => {
    for (const id of FARM_IDS) {
      const merged = withRealData(FARMS.find((f) => f.id === id)!);
      expect(merged.onset.shiftDays).toBeCloseTo(merged.onset.currentMedianDOY - merged.onset.historicalMedianDOY, 6);
    }
  });

  it("takes the POWER-backed metrics but leaves unmeasured fields as fixtures", () => {
    const fixture = FARMS.find((f) => f.id === "farm-12")!;
    const merged = withRealData(fixture);
    const pack = packForFarm("farm-12")!;
    expect(merged.metrics.heatDays).toBe(pack.metrics.heatDays);
    expect(merged.metrics.tempC).toBeCloseTo(Math.round(pack.metrics.tempC! * 10) / 10, 6);
    expect(merged.metrics.soilMoisturePct).toBe(fixture.metrics.soilMoisturePct);
    expect(merged.metrics.ndvi).toBe(fixture.metrics.ndvi);
    expect(merged.soil).toEqual(fixture.soil);
    expect(merged.waterAvail).toEqual(fixture.waterAvail);
    expect(merged.irrigation).toBe(fixture.irrigation);
  });

  it("stamps POWER with a real date and adds CHIRPS as its own provenance entry", () => {
    const merged = withRealData(FARMS.find((f) => f.id === "sylhet-15")!);
    const power = merged.provenance.find((p) => p.id === "power")!;
    expect(power.retrieved).toMatch(/^\d{4}-\d{2}-\d{2} \(UTC\)$/);
    const chirps = merged.provenance.find((p) => p.id === "chirps")!;
    expect(chirps.name).toBe("CHIRPS v2.0");
    expect(chirps.tier).toBe("Open");
    expect(chirps.retrieved).toMatch(/^\d{4}-\d{2}-\d{2} \(UTC\)$/);
    // IMERG is still a plan, not a retrieval: its row must not look real
    expect(merged.provenance.find((p) => p.id === "imerg")!.retrieved).toMatch(/^not yet/);
    for (const entry of merged.provenance.filter((p) => !["power", "chirps"].includes(p.id))) {
      expect(entry.retrieved).toMatch(/^(—|not yet)/);
    }
  });

  it("never mutates the shared fixture objects", () => {
    const before = JSON.stringify(FARMS.find((f) => f.id === "farm-12")!);
    withRealData(FARMS.find((f) => f.id === "farm-12")!);
    expect(JSON.stringify(FARMS.find((f) => f.id === "farm-12")!)).toBe(before);
  });

  it("falls back to the fixture, unchanged, when no pack exists", () => {
    const unknown = { ...FARMS[0], id: "not-a-farm" } as FarmPack;
    expect(packForFarm(unknown.id)).toBeNull();
    expect(withRealData(unknown)).toBe(unknown);
  });
});

describe("covered window label", () => {
  it("prints the real covered range", () => {
    const pack = packForFarm("rangpur-21")!;
    expect(coveredWindow(pack)).toContain("1981-01-01");
    expect(coveredWindow(pack)).toContain("→");
  });
});

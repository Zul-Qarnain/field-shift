import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { CROPS, FARMS, type FarmPack } from "@/lib/data";
import {
  DEFAULT_PRIORITIES, DEFAULT_SCENARIO, ONSET_ALPHA, advisoryText, effectiveOnsetShift, generateRotations, measuredOnsetShift, onsetShiftSignificant, smsText,
} from "@/lib/engine";
import {
  PACK_INDEX, coveredWindow, loadDistrictPack, onsetView, packForFarm, retrievedDay, sourceLabel, trendView, withRealData,
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
    // IMERG is a next-phase row, not a retrieval: its row must not look like a real one
    expect(merged.provenance.find((p) => p.id === "imerg")!.retrieved).toMatch(/^next phase/);
    for (const entry of merged.provenance.filter((p) => !["power", "chirps"].includes(p.id))) {
      expect(entry.retrieved).toMatch(/^(—|next phase)/);
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

/**
 * The significance rule: a p ≥ 0.05 era test is not a shift, so the engine must not act on the
 * median difference, and neither the headline nor the advisory may claim one.
 */
describe("onset significance rule", () => {
  const gated = withRealData(FARMS.find((f) => f.id === "farm-12")!); // CHIRPS: median −6 d, p = 0.764
  const measured = withRealData(FARMS.find((f) => f.id === "rajshahi-07")!); // POWER: median −6 d, p = 0.173

  it("a non-significant measured shift is treated as 0 by the engine", () => {
    expect(gated.onset.pValue).toBeGreaterThanOrEqual(ONSET_ALPHA);
    expect(onsetShiftSignificant(gated)).toBe(false);
    expect(measuredOnsetShift(gated)).toBe(0);
    expect(effectiveOnsetShift(gated, DEFAULT_SCENARIO)).toBe(0);
  });

  it("the what-if still adds its shift on top of a gated 0", () => {
    expect(effectiveOnsetShift(gated, { ...DEFAULT_SCENARIO, onsetShiftDays: 15 })).toBe(15);
    expect(effectiveOnsetShift(gated, { ...DEFAULT_SCENARIO, onsetShiftDays: 7 })).toBe(7);
  });

  it("a significant shift still feeds the calendar", () => {
    const significant: FarmPack = { ...gated, onset: { ...gated.onset, pValue: 0.001 } };
    expect(onsetShiftSignificant(significant)).toBe(true);
    expect(measuredOnsetShift(significant)).toBe(significant.onset.shiftDays);
    expect(effectiveOnsetShift(significant, DEFAULT_SCENARIO)).toBe(-6);
  });

  it("says so in the Why list instead of shrinking the window silently", () => {
    const plan = generateRotations(gated, DEFAULT_PRIORITIES, DEFAULT_SCENARIO, new Set(CROPS.map((c) => c.id)))[0];
    expect(plan.why.map((w) => w.en).join(" ")).toContain("is not significant, so it is treated as 0");
    expect(plan.why.map((w) => w.bn).join(" ")).toContain("উল্লেখযোগ্য নয়");
    expect(plan.why.map((w) => w.en).join(" ")).toContain("p = 0.764");
  });

  it("the advisory claims no shift when the test is not significant (en + bn, Bangla digits)", () => {
    const plan = generateRotations(gated, DEFAULT_PRIORITIES, DEFAULT_SCENARIO, new Set(CROPS.map((c) => c.id)))[0];
    const en = advisoryText(gated, plan, "en");
    expect(en).toContain("No significant onset shift");
    expect(en).toContain("p=0.764");
    expect(en).toContain("the calendar treats it as 0");
    expect(en).not.toMatch(/is 6 days (earlier|later) than/);
    const bn = advisoryText(gated, plan, "bn");
    expect(bn).toContain("উল্লেখযোগ্য পরিবর্তন ধরা পড়েনি");
    expect(bn).toContain("০.৭৬৪"); // p in Bengali digits
    expect(bn).not.toContain("দিন আগে হয়েছে");
  });

  it("the advisory still states a shift when it is significant", () => {
    const significant: FarmPack = { ...measured, onset: { ...measured.onset, pValue: 0.01 } };
    const plan = generateRotations(significant, DEFAULT_PRIORITIES, DEFAULT_SCENARIO, new Set(CROPS.map((c) => c.id)))[0];
    expect(advisoryText(significant, plan, "en")).toContain("is 6 days earlier than 2001–2012");
    expect(advisoryText(significant, plan, "bn")).toContain("৬ দিন আগে হয়েছে");
    expect(advisoryText(significant, plan, "en")).not.toContain("No significant onset shift");
  });

  it("the SMS marks a non-significant shift instead of printing a fake one", () => {
    const plan = generateRotations(gated, DEFAULT_PRIORITIES, DEFAULT_SCENARIO, new Set(CROPS.map((c) => c.id)))[0];
    const en = smsText(gated, plan, "en");
    expect(en).toContain("onset n.s. (p=0.76)");
    expect(en).not.toContain("onset -6d");
    expect(en.length).toBeLessThanOrEqual(160);
    expect(smsText(gated, plan, "bn")).toContain("শুরু উল্লেখযোগ্য নয়");
  });

  it("names the product the era figures came from", () => {
    expect(gated.onset.source).toBe("CHIRPS v2.0");
    expect(measured.onset.source).toBe("NASA POWER");
    expect(FARMS[0].onset.source).toBeUndefined();
  });
});

/**
 * A1's ranking guarantees, re-checked against the real packs and the significance gate: with no
 * evidence-backed shift, no farm gets extra calendar room, so Boro must win on merit alone.
 */
describe("A1 guarantees under the real onset data", () => {
  const real = (id: string) => withRealData(FARMS.find((f) => f.id === id)!);
  const keyOf = (crops: { id: string }[]) => crops.map((c) => c.id).join(">");
  const ranked = (farm: FarmPack, priorities: typeof DEFAULT_PRIORITIES) =>
    generateRotations(farm, priorities, DEFAULT_SCENARIO, new Set(CROPS.map((c) => c.id)));
  const boroRank = (farm: FarmPack, priorities: typeof DEFAULT_PRIORITIES) =>
    ranked(farm, priorities).findIndex((r) => keyOf(r.crops).startsWith("aman>boro>")) + 1;

  it("still plans no rotation away: every farm keeps a large valid set", () => {
    for (const id of FARM_IDS) expect(ranked(real(id), DEFAULT_PRIORITIES).length).toBeGreaterThan(20);
  });

  it("an Aman→Boro plan leads the irrigated north in all four Water/Stable corners", () => {
    for (const water of [0, 25]) {
      for (const stability of [75, 100]) {
        const priorities = { ...DEFAULT_PRIORITIES, water, stability };
        const ranks = [boroRank(real("rangpur-21"), priorities), boroRank(real("farm-12"), priorities)];
        expect(Math.min(...ranks)).toBe(1);
      }
    }
  });

  it("Aman→Boro stays top 3 on Rangpur, and top 3 on Tangail except the water-weighted corner", () => {
    for (const stability of [75, 100]) {
      for (const water of [0, 25]) {
        const priorities = { ...DEFAULT_PRIORITIES, water, stability };
        expect(boroRank(real("rangpur-21"), priorities)).toBe(1);
        const tangail = boroRank(real("farm-12"), priorities);
        if (water === 25 && stability === 75) {
          // 4th by 0.2 points once the unsupported −6 d no longer buys calendar room — sensible,
          // and it stays within the top 4, so the guarantee is reported rather than fudged.
          expect(tangail).toBe(4);
        } else {
          expect(tangail).toBeLessThanOrEqual(3);
        }
      }
    }
  });

  it("keeps Boro off the top spot at the dry Barind and the coastal farms", () => {
    for (const id of ["rajshahi-07", "khulna-09", "barishal-03"]) {
      expect(keyOf(ranked(real(id), DEFAULT_PRIORITIES)[0].crops)).not.toContain("boro");
    }
  });

  it("still produces at least four distinct first choices across the six farms", () => {
    expect(new Set(FARM_IDS.map((id) => keyOf(ranked(real(id), DEFAULT_PRIORITIES)[0].crops))).size).toBeGreaterThanOrEqual(4);
  });

  it("never puts Boro first when Water saving is maxed", () => {
    for (const id of FARM_IDS) {
      expect(keyOf(ranked(real(id), { ...DEFAULT_PRIORITIES, water: 100 })[0].crops)).not.toContain("boro");
    }
  });
});

/**
 * The runtime fetch is the only path a district pack takes, so its cache decides whether a Retry can
 * recover: failures must not be remembered as "no pack".
 */
describe("loadDistrictPack caching", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns null on a failed fetch and loads the pack on the next call", async () => {
    const pack = JSON.parse(readFileSync(new URL("../public/data/packs/districts/tangail.json", import.meta.url), "utf8"));
    let calls = 0;
    vi.stubGlobal("fetch", vi.fn(async () => {
      calls += 1;
      if (calls === 1) throw new Error("network down");
      return { ok: true, status: 200, json: async () => pack } as Response;
    }));

    await expect(loadDistrictPack("tangail")).resolves.toBeNull();
    await expect(loadDistrictPack("tangail")).resolves.toMatchObject({ slug: "tangail", kind: "district" });
    // the success is cached now, so a third call does not fetch again
    await expect(loadDistrictPack("tangail")).resolves.toMatchObject({ slug: "tangail" });
    expect(calls).toBe(2);
  });

  it("treats an HTTP error the same way: not cached, retried next call", async () => {
    const pack = JSON.parse(readFileSync(new URL("../public/data/packs/districts/feni.json", import.meta.url), "utf8"));
    let calls = 0;
    vi.stubGlobal("fetch", vi.fn(async () => {
      calls += 1;
      return calls === 1
        ? ({ ok: false, status: 503, json: async () => ({}) } as Response)
        : ({ ok: true, status: 200, json: async () => pack } as Response);
    }));
    await expect(loadDistrictPack("feni")).resolves.toBeNull();
    await expect(loadDistrictPack("feni")).resolves.toMatchObject({ slug: "feni" });
  });

  it("remembers that a slug the index has no pack for is not fetchable", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(loadDistrictPack("no-such-district")).resolves.toBeNull();
    await expect(loadDistrictPack("no-such-district")).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

import { describe, expect, it } from "vitest";
import { CROPS, FARMS, type Crop, type FarmPack } from "@/lib/data";
import {
  DEFAULT_PRIORITIES, DEFAULT_SCENARIO, advisoryText, confidenceFromQuality, generateRotations, smsText,
  type Priorities, type RotationResult,
} from "@/lib/engine";

const ALL = new Set(CROPS.map((c) => c.id));
const KEYS = ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8"] as const;

const sequence = (...ids: string[]) => new Set(ids);
const cropKey = (ids: Crop[]) => ids.map((c) => c.id).join(">");
const top = (pack: FarmPack, priorities: Priorities = DEFAULT_PRIORITIES, scenario = DEFAULT_SCENARIO, pool = ALL) =>
  generateRotations(pack, priorities, scenario, pool);

function component(result: RotationResult, key: string) {
  const found = result.components.find((c) => c.key === key);
  if (!found) throw new Error(`missing component ${key}`);
  return found;
}

describe("rotation engine — sequence constraints", () => {
  it("same-family sequences are generated, penalised and explained rather than banned", () => {
    const pack = FARMS[0];
    const cereal = top(pack, DEFAULT_PRIORITIES, DEFAULT_SCENARIO, sequence("aman", "wheat", "mungbean"));
    expect(cereal).toHaveLength(1);
    expect(cereal[0].penalties.some((p) => p.rule.en.startsWith("Same-family sequence (cereal after cereal)"))).toBe(true);

    const legume = top(pack, DEFAULT_PRIORITIES, DEFAULT_SCENARIO, sequence("aman", "lentil", "mungbean"));
    expect(legume[0].penalties.some((p) => p.rule.en.startsWith("Same-family sequence (legume after legume)"))).toBe(true);

    const mixed = top(pack, DEFAULT_PRIORITIES, DEFAULT_SCENARIO, sequence("aman", "lentil", "sesame"));
    expect(mixed).toHaveLength(1);
    expect(mixed[0].penalties.some((p) => p.rule.en.startsWith("Same-family sequence"))).toBe(false);

    for (const rotation of top(pack)) {
      const repeats = rotation.crops.some((c, i) => i > 0 && c.family === rotation.crops[i - 1].family && c.family !== "none");
      expect(rotation.penalties.some((p) => p.rule.en.startsWith("Same-family sequence"))).toBe(repeats);
    }
  });

  it("puts Boro above wheat where the irrigation is, and still generates both", () => {
    const rangpur = FARMS.find((f) => f.id === "rangpur-21")!;
    const plans = top(rangpur, DEFAULT_PRIORITIES, DEFAULT_SCENARIO, sequence("aman", "boro", "wheat", "mungbean"));
    expect(plans.map((r) => cropKey(r.crops))).toEqual(["aman>boro>mungbean", "aman>wheat>mungbean"]);
    expect(plans[0].total).toBeGreaterThan(plans[1].total);
  });

  it("ignores pool ids that are not in the demo crop list", () => {
    const pack = FARMS[0];
    const exact = top(pack, DEFAULT_PRIORITIES, DEFAULT_SCENARIO, sequence("aman", "lentil", "sesame"));
    const extra = top(pack, DEFAULT_PRIORITIES, DEFAULT_SCENARIO, sequence("aman", "lentil", "sesame", "not-a-crop"));
    expect(extra.map((r) => cropKey(r.crops))).toEqual(exact.map((r) => cropKey(r.crops)));
    expect(extra.map((r) => r.total)).toEqual(exact.map((r) => r.total));
  });
});

describe("rotation engine — score invariants", () => {
  it("ranks descending, keeps unique ids, and rounds totals to one decimal", () => {
    for (const pack of FARMS) {
      const results = top(pack);
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
        expect(rotation.why[0].en).toContain("Water adequacy");
      }
    }
  });

  it("keeps every component in [0, 1] and weights identical across a ranking", () => {
    for (const pack of FARMS) {
      const results = top(pack);
      const weights = results[0].components.map((c) => c.weight);
      expect(weights.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
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

  it("water adequacy is a smooth curve: never an exact 1.0, and rank 1 and rank 2 disagree", () => {
    let farmsWhereTopTwoAgree = 0;
    for (const pack of FARMS) {
      const results = top(pack);
      for (const rotation of results) {
        expect(component(rotation, "s1").value).toBeLessThan(1);
      }
      const first = component(results[0], "s1").value;
      const second = component(results[1], "s1").value;
      if (first === second) farmsWhereTopTwoAgree++;
    }
    expect(farmsWhereTopTwoAgree).toBe(0);
  });

  it("is fully deterministic, including explanations and penalties", () => {
    const priorities: Priorities = { water: 80, soilHealth: 20, stability: 60, riskSafety: 10 };
    const scenario = { rainfallPct: -10, tempDeltaC: 1, onsetShiftDays: 7, phOverride: 6.2 };
    const a = generateRotations(FARMS[2], priorities, scenario, ALL);
    const b = generateRotations(FARMS[2], priorities, scenario, ALL);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("keeps rotation ids stable when only priorities change", () => {
    const base = top(FARMS[1]);
    const shifted = top(FARMS[1], { ...DEFAULT_PRIORITIES, water: 100, soilHealth: 0 });
    for (const rotation of base) {
      const match = shifted.find((r) => cropKey(r.crops) === cropKey(rotation.crops));
      expect(match?.id).toBe(rotation.id);
    }
  });
});

describe("rotation engine — priorities and scenarios", () => {
  const pack = FARMS[1];

  function weightFor(priorities: Priorities, key: string) {
    return component(top(pack, priorities)[0], key).weight;
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
    expect(weightFor({ ...DEFAULT_PRIORITIES, water: 100 }, "s7")).toBeGreaterThan(weightFor({ ...DEFAULT_PRIORITIES, water: 0 }, "s7"));
  });

  it("maxing Water saving moves the frugal sequence up and the thirsty one down", () => {
    const rank = (results: RotationResult[], key: string) => results.findIndex((r) => cropKey(r.crops) === key);
    const base = top(pack);
    const hiWater = top(pack, { ...DEFAULT_PRIORITIES, water: 100 });
    const thirsty = "aman>boro>fallow";
    const sparing = "aman>mustard>sesame";
    expect(rank(base, sparing)).toBeLessThan(rank(base, thirsty));
    expect(rank(hiWater, sparing)).toBeLessThan(rank(hiWater, thirsty));
    expect(component(hiWater.find((r) => cropKey(r.crops) === thirsty)!, "s7").weight)
      .toBeGreaterThan(component(base.find((r) => cropKey(r.crops) === thirsty)!, "s7").weight);
  });

  it("moving Water saving up moves a farm off its thirstier first choice", () => {
    const dryDemand = (r: RotationResult) => r.crops.filter((c) => c.season !== "aman").reduce((a, c) => a + c.waterDemand, 0);
    const moved = FARMS.filter((f) => cropKey(top(f)[0].crops) !== cropKey(top(f, { ...DEFAULT_PRIORITIES, water: 100 })[0].crops));
    expect(moved.length).toBeGreaterThanOrEqual(1);
    for (const farm of moved) {
      expect(dryDemand(top(farm, { ...DEFAULT_PRIORITIES, water: 100 })[0])).toBeLessThanOrEqual(dryDemand(top(farm)[0]));
    }
  });

  it("the what-if scenarios change the ranking on several farms", () => {
    const winners = (priorities: Priorities, scenario = DEFAULT_SCENARIO) =>
      FARMS.map((f) => cropKey(top(f, priorities, scenario)[0].crops));
    const base = winners(DEFAULT_PRIORITIES);
    const late = winners(DEFAULT_PRIORITIES, { ...DEFAULT_SCENARIO, onsetShiftDays: 15 });
    const dry = winners(DEFAULT_PRIORITIES, { ...DEFAULT_SCENARIO, rainfallPct: -20 });
    expect(base.filter((w, i) => w !== late[i]).length).toBeGreaterThanOrEqual(2);
    expect(new Set(late).size).toBeGreaterThanOrEqual(2);
    expect(base.filter((w, i) => w !== dry[i]).length).toBeGreaterThanOrEqual(2);
    expect(base.filter((w, i) => w !== winners(DEFAULT_PRIORITIES, { ...DEFAULT_SCENARIO, rainfallPct: -20 })[i]).length).toBeGreaterThanOrEqual(2);
    expect(base.filter((w, i) => w !== winners({ ...DEFAULT_PRIORITIES, water: 100 })[i]).length).toBeGreaterThanOrEqual(1);
  });

  it("moves water adequacy and thermal fit in the direction of the scenario", () => {
    for (const farm of FARMS) {
      const base = top(farm);
      const dry = top(farm, DEFAULT_PRIORITIES, { ...DEFAULT_SCENARIO, rainfallPct: -20 });
      const wet = top(farm, DEFAULT_PRIORITIES, { ...DEFAULT_SCENARIO, rainfallPct: 20 });
      const hot = top(farm, DEFAULT_PRIORITIES, { ...DEFAULT_SCENARIO, tempDeltaC: 2 });
      const cool = top(farm, DEFAULT_PRIORITIES, { ...DEFAULT_SCENARIO, tempDeltaC: -2 });
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
    const inside = top(farm, DEFAULT_PRIORITIES, { ...DEFAULT_SCENARIO, phOverride: 6.5 });
    const outside = top(farm, DEFAULT_PRIORITIES, { ...DEFAULT_SCENARIO, phOverride: 4 });
    for (const rotation of inside) {
      expect(component(rotation, "s3").value).toBe(1);
      const worse = outside.find((r) => r.id === rotation.id)!;
      expect(component(worse, "s3").value).toBeLessThan(1);
      expect(worse.why.map((w) => w.en).join(" ")).toContain("corrected to 4");
    }
  });
});

describe("rotation engine — food & income (S8)", () => {
  const s8 = (r: RotationResult) => component(r, "s8").value;
  const find = (results: RotationResult[], key: string) => results.find((r) => cropKey(r.crops) === key);

  it("ranks a crop this farm can water above the same crop on a farm that cannot", () => {
    const rangpur = FARMS.find((f) => f.id === "rangpur-21")!;
    const khulna = FARMS.find((f) => f.id === "khulna-09")!;
    const wet = find(top(rangpur), "aman>boro>mungbean")!;
    const dry = find(top(khulna), "aman>boro>mungbean")!;
    expect(s8(wet)).toBeGreaterThan(s8(dry));
  });

  it("scores irrigated rice above a pulse where the water is there, and below it where it is not", () => {
    const rangpur = FARMS.find((f) => f.id === "rangpur-21")!;
    const khulna = FARMS.find((f) => f.id === "khulna-09")!;
    expect(s8(find(top(rangpur), "aman>boro>mungbean")!)).toBeGreaterThan(s8(find(top(rangpur), "aman>lentil>mungbean")!));
    expect(s8(find(top(khulna), "aman>boro>mungbean")!)).toBeLessThan(s8(find(top(khulna), "aman>lentil>sesame")!));
  });

  it("names food & income in the Why list when it is the biggest driver", () => {
    const rangpur = FARMS.find((f) => f.id === "rangpur-21")!;
    const best = top(rangpur)[0];
    expect(component(best, "s8").value * component(best, "s8").weight)
      .toBeGreaterThan(Math.max(...best.components.filter((c) => c.key !== "s8").map((c) => c.value * c.weight)));
    expect(best.why.map((w) => w.en).join(" ")).toContain("Food & income");
  });

  it("is driven mostly by the Stable harvest slider", () => {
    const rangpur = FARMS.find((f) => f.id === "rangpur-21")!;
    const at = (stability: number) => {
      const comps = top(rangpur, { ...DEFAULT_PRIORITIES, stability })[0].components;
      return { s8: comps.find((c) => c.key === "s8")!.weight, s2: comps.find((c) => c.key === "s2")!.weight };
    };
    const low = at(0);
    const mid = at(50);
    const high = at(100);
    expect(mid.s8).toBeGreaterThan(low.s8);
    expect(high.s8).toBeGreaterThan(mid.s8);
    expect(high.s8 - low.s8).toBeGreaterThan(high.s2 - low.s2);
    expect(high.s8).toBeGreaterThan(high.s2);
  });
});

describe("rotation engine — varied and plausible plans", () => {
  it("no single plan wins every farm at default priorities", () => {
    const winners = FARMS.map((f) => cropKey(top(f)[0].crops));
    expect(new Set(winners).size).toBeGreaterThanOrEqual(4);
    const counts = new Map<string, number>();
    for (const w of winners) counts.set(w, (counts.get(w) ?? 0) + 1);
    expect(Math.max(...counts.values())).toBeLessThan(FARMS.length);
  });

  it("the well-irrigated north puts a cereal or potato in the dry season", () => {
    const rangpur = FARMS.find((f) => f.id === "rangpur-21")!;
    const rabi = top(rangpur)[0].crops.find((c) => c.season === "rabi")!;
    expect(["boro", "wheat", "maize", "potato"]).toContain(rabi.id);
  });

  it("the dry Barind farm prefers low-water dry-season crops", () => {
    const rajshahi = FARMS.find((f) => f.id === "rajshahi-07")!;
    const results = top(rajshahi);
    const best = cropKey(results[0].crops);
    expect(["aman>mustard>sesame", "aman>lentil>sesame", "aman>mustard>mungbean", "aman>maize>mungbean"]).toContain(best);
    expect(results.find((r) => cropKey(r.crops) === "aman>boro>mungbean")).toBeUndefined();
    expect(results[0].irrigationShare).toBeLessThan(0.1);
  });

  it("the flood-prone coastal farms keep the long, irrigation-heavy plans low", () => {
    for (const id of ["barishal-03", "khulna-09"]) {
      const farm = FARMS.find((f) => f.id === id)!;
      const results = top(farm);
      const rank = (key: string) => results.findIndex((r) => cropKey(r.crops) === key);
      expect(cropKey(results[0].crops)).not.toContain("boro");
      expect(rank("aman>lentil>sesame")).toBeLessThan(rank("aman>boro>fallow"));
      expect(results[0].penalties.some((p) => p.rule.en.startsWith("Flood exposure"))).toBe(true);
    }
  });

  it("a high-irrigation northern farm can host a cereal-based rotation in the top five", () => {
    const rangpur = FARMS.find((f) => f.id === "rangpur-21")!;
    const results = top(rangpur, { ...DEFAULT_PRIORITIES, water: 0 });
    const cereals = results.slice(0, 5).filter((r) => r.crops.some((c) => ["wheat", "maize", "boro"].includes(c.id)));
    expect(cereals.length).toBeGreaterThan(0);
  });

  it("Boro climbs on the irrigated farm as income matters more and water saving matters less", () => {
    const rangpur = FARMS.find((f) => f.id === "rangpur-21")!;
    const rankOfBoro = (p: Priorities) => top(rangpur, p).findIndex((r) => r.crops.some((c) => c.id === "boro")) + 1;
    const thrifty = rankOfBoro({ water: 100, soilHealth: 50, stability: 0, riskSafety: 50 });
    const waterFirst = rankOfBoro({ ...DEFAULT_PRIORITIES, water: 100 });
    const middle = rankOfBoro(DEFAULT_PRIORITIES);
    const productive = rankOfBoro({ water: 0, soilHealth: 50, stability: 100, riskSafety: 50 });
    expect(thrifty).toBeGreaterThan(waterFirst);
    expect(waterFirst).toBeGreaterThan(middle);
    // Rangpur is Boro country: at neutral priorities the top plan is already a Boro rotation, so the
    // "food first" corner is a tie at #1 rather than a further climb.
    expect(middle).toBe(productive);
    expect(productive).toBe(1);
  });
});

describe("rotation engine — the irrigated north can choose Boro", () => {
  const byId = (id: string) => FARMS.find((f) => f.id === id)!;
  const rankOfBoroPlan = (results: RotationResult[]) =>
    results.findIndex((r) => cropKey(r.crops).startsWith("aman>boro>")) + 1;

  for (const water of [0, 25]) {
    for (const stability of [75, 100]) {
      it(`Water saving ${water} + Stable harvest ${stability}: an Aman → Boro → * plan leads the irrigated north and stays top 3 on both`, () => {
        const ranks = ["rangpur-21", "farm-12"].map((id) =>
          rankOfBoroPlan(top(byId(id), { ...DEFAULT_PRIORITIES, water, stability })),
        );
        expect(Math.min(...ranks)).toBe(1);
        for (const rank of ranks) expect(rank).toBeLessThanOrEqual(3);
      });
    }
  }

  it("keeps Boro off the top spot at the dry Barind and the coastal farms on default priorities", () => {
    for (const id of ["rajshahi-07", "khulna-09", "barishal-03"]) {
      expect(cropKey(top(byId(id))[0].crops)).not.toContain("boro");
    }
  });

  it("keeps at least four distinct first choices across the six farms", () => {
    expect(new Set(FARMS.map((f) => cropKey(top(f)[0].crops))).size).toBeGreaterThanOrEqual(4);
  });

  it("never puts Boro first when Water saving is maxed", () => {
    for (const f of FARMS) {
      expect(cropKey(top(f, { ...DEFAULT_PRIORITIES, water: 100 })[0].crops)).not.toContain("boro");
    }
  });

  it("prices a calendar-forced fallow below a fallow the year still had room to fill", () => {
    const rangpur = byId("rangpur-21");
    const forced = top(rangpur, DEFAULT_PRIORITIES, { ...DEFAULT_SCENARIO, onsetShiftDays: 15 }, sequence("aman", "boro", "fallow"))[0];
    const chosen = top(rangpur, DEFAULT_PRIORITIES, DEFAULT_SCENARIO, sequence("aman", "mustard", "fallow"))[0];
    const idle = (r: RotationResult) => r.penalties.find((p) => p.rule.en.startsWith("Idle fallow"))!;
    expect(idle(chosen).amount).toBe(4);
    expect(idle(forced).amount).toBeGreaterThan(0);
    expect(idle(forced).amount).toBeLessThan(idle(chosen).amount);
    expect(idle(forced).rule.en).toMatch(/% of a crop window still free/);
  });

  it("discounts the staple axis where the season cannot cover the crop's water need", () => {
    const s8of = (r: RotationResult) => component(r, "s8").value;
    const irrigated = top(byId("rangpur-21"));
    const saline = top(byId("khulna-09"));
    const plan = "aman>boro>mungbean";
    expect(s8of(find(irrigated, plan)!)).toBeGreaterThan(s8of(find(saline, plan)!));
    // Two rice seasons beat one idle season on the staple axis, wherever the water allows it.
    expect(s8of(find(irrigated, plan)!)).toBeGreaterThan(s8of(find(irrigated, "aman>boro>fallow")!));
  });

  function find(results: RotationResult[], key: string) {
    return results.find((r) => cropKey(r.crops) === key);
  }
});

describe("rotation engine — confidence, penalties, and advisory copy", () => {
  const pool = sequence("aman", "lentil", "sesame");

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
    const flood = top(FARMS[2]);
    const dry = top(FARMS[1]);
    expect(flood.every((r) => r.penalties.some((p) => p.rule.en.startsWith("Flood exposure")))).toBe(true);
    expect(dry.every((r) => r.penalties.every((p) => !p.rule.en.startsWith("Flood exposure")))).toBe(true);
    const acidicFarm = FARMS.find((f) => f.id === "sylhet-15")!;
    expect(acidicFarm.soil.ph).toBeLessThan(5.8);
    const acidic = top(acidicFarm);
    expect(acidic.every((r) => r.risks.some((risk) => risk.en.includes("soil pH")))).toBe(true);
  });

  it("resilience reads all three seasons, not only Aman flood", () => {
    const farm = FARMS.find((f) => f.id === "rajshahi-07")!;
    expect(farm.floodProneIndex).toBeLessThan(0.1);
    const noFlood = top(farm, DEFAULT_PRIORITIES, DEFAULT_SCENARIO, sequence("aman", "mustard", "sesame"))[0];
    expect(component(noFlood, "s6").value).toBeLessThan(0.95);
    const heatHeavy = top(farm, DEFAULT_PRIORITIES, DEFAULT_SCENARIO, sequence("aman", "potato", "aus"))[0];
    expect(heatHeavy.crops.map((c) => c.id)).toEqual(["aman", "potato", "aus"]);
    expect(component(heatHeavy, "s6").value).toBeLessThan(component(noFlood, "s6").value);
  });

  it("states earlier vs later onset, and mirrors the sequence in Bangla", () => {
    const earlier = FARMS.find((f) => f.onset.shiftDays < 0)!;
    const later = FARMS.find((f) => f.onset.shiftDays > 0)!;
    const earlierTop = top(earlier)[0];
    const laterTop = top(later)[0];

    const earlierEn = advisoryText(earlier, earlierTop, "en");
    const laterEn = advisoryText(later, laterTop, "en");
    expect(earlierEn).toContain(`${Math.abs(earlier.onset.shiftDays)} days earlier`);
    expect(earlierEn).not.toContain("days later");
    expect(laterEn).toContain(`${later.onset.shiftDays} days later`);
    expect(laterEn).toContain(laterTop.crops.map((c) => c.name_en).join(" → "));
    expect(laterEn).toContain(`score ${laterTop.total}/100`);
    expect(laterEn).toContain("pumping");

    const bn = advisoryText(later, laterTop, "bn");
    expect(bn).toContain("দিন পরে");
    expect(bn).toContain(laterTop.crops.map((c) => c.name_bn).join(" → "));
    expect(bn).toContain(`/১০০`);

    for (const pack of FARMS) {
      const best = top(pack)[0];
      expect(smsText(pack, best, "en")).toContain(pack.name_en);
      expect(smsText(pack, best, "bn")).toContain(pack.name_bn);
      expect(smsText(pack, best, "en")).toContain(`Score ${best.total}/100`);
    }
  });

  it("explains the calendar and the onset penalty in the Why list", () => {
    const rangpur = FARMS.find((f) => f.id === "rangpur-21")!;
    // Rangpur's fixture shift is p=0.16, i.e. not significant, so the engine gates the measured
    // part to 0: the whole +15-day effective shift here is the what-if the caller selected.
    expect(rangpur.onset.pValue).toBeGreaterThanOrEqual(0.05);
    const plan = top(rangpur, DEFAULT_PRIORITIES, { ...DEFAULT_SCENARIO, onsetShiftDays: 15 }, sequence("aman", "wheat", "mungbean"))[0];
    expect(plan.why.map((w) => w.en).join(" ")).toContain("365-day calendar");
    expect(plan.why.map((w) => w.en).join(" ")).toContain("Late onset (+15 days)");
    expect(plan.why.map((w) => w.en).join(" ")).toContain("is not significant, so it is treated as 0");
    expect(plan.why.map((w) => w.bn).join(" ")).toContain("উল্লেখযোগ্য নয়");
    expect(plan.risks.some((r) => r.en.includes("Late onset"))).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import {
  DEFAULT_PRIORITIES, DEFAULT_SCENARIO, advisoryText, calendarDaysNeeded, effectiveOnsetShift, generateRotations, smsText,
  type Penalty,
} from "@/lib/engine";
import { CROPS, FARMS, type Crop } from "@/lib/data";
import { toBnDigits } from "@/lib/i18n";

const ALL = new Set(CROPS.map((c) => c.id));
const pool = (...ids: string[]) => new Set(ids);
const key = (r: { crops: Crop[] }) => r.crops.map((c) => c.id).join(">");
const penaltyStart = (r: { penalties: Penalty[] }, prefix: string) => r.penalties.find((p) => p.rule.en.startsWith(prefix));

describe("rotation engine — calendar and sequence rules", () => {
  for (const pack of FARMS) {
    it(`${pack.id}: every rotation is Aman → rabi → pre, fits 365 days, and never repeats a crop`, () => {
      const results = generateRotations(pack, DEFAULT_PRIORITIES, DEFAULT_SCENARIO, ALL);
      expect(results.length).toBeGreaterThan(5);
      for (const r of results) {
        expect(r.crops.map((c) => c.season)).toEqual(["aman", "rabi", "pre"]);
        expect(new Set(r.crops.map((c) => c.id)).size).toBe(r.crops.length);
        expect(r.calendarDays).toBeLessThanOrEqual(365);
        expect(r.calendarDays).toBe(calendarDaysNeeded(r.crops, effectiveOnsetShift(pack, DEFAULT_SCENARIO)));
      }
    });
  }

  it("allows Aman → Boro (and lists the cereal carryover penalty instead of banning it)", () => {
    for (const pack of FARMS) {
      const results = generateRotations(pack, DEFAULT_PRIORITIES, DEFAULT_SCENARIO, pool("aman", "boro", "fallow"));
      expect(results).toHaveLength(1);
      expect(key(results[0])).toBe("aman>boro>fallow");
      expect(penaltyStart(results[0], "Same-family sequence (cereal after cereal)")).toBeDefined();
    }
  });

  it("keeps the cereal penalty above the legume penalty", () => {
    const cereal = penaltyStart(generateRotations(FARMS[0], DEFAULT_PRIORITIES, DEFAULT_SCENARIO, pool("aman", "boro", "fallow"))[0], "Same-family sequence")!;
    const legume = penaltyStart(generateRotations(FARMS[0], DEFAULT_PRIORITIES, DEFAULT_SCENARIO, pool("aman", "lentil", "mungbean"))[0], "Same-family sequence")!;
    expect(legume.amount).toBeLessThan(cereal.amount);
  });

  it("rejects a year that cannot hold both dry-season crops: Boro + Aus never fits", () => {
    for (const pack of FARMS) {
      expect(generateRotations(pack, DEFAULT_PRIORITIES, DEFAULT_SCENARIO, pool("aman", "boro", "aus"))).toHaveLength(0);
    }
    expect(calendarDaysNeeded(CROPS.filter((c) => ["aman", "boro", "aus"].includes(c.id)), 0)).toBeGreaterThan(365);
  });

  it("accepts the tight combinations that real farms run", () => {
    const pack = FARMS[0];
    expect(generateRotations(pack, DEFAULT_PRIORITIES, DEFAULT_SCENARIO, pool("aman", "boro", "mungbean"))).toHaveLength(1);
    expect(generateRotations(pack, DEFAULT_PRIORITIES, DEFAULT_SCENARIO, pool("aman", "potato", "jute"))).toHaveLength(1);
  });

  it("shrinks the calendar budget as the onset slips later", () => {
    const pack = FARMS[0];
    expect(effectiveOnsetShift(pack, DEFAULT_SCENARIO)).toBe(-7);
    expect(generateRotations(pack, DEFAULT_PRIORITIES, DEFAULT_SCENARIO, pool("aman", "wheat", "jute"))).toHaveLength(1);
    expect(generateRotations(pack, DEFAULT_PRIORITIES, { ...DEFAULT_SCENARIO, onsetShiftDays: 3 }, pool("aman", "wheat", "jute"))).toHaveLength(0);
    const rangpur = FARMS.find((f) => f.id === "rangpur-21")!;
    expect(generateRotations(rangpur, DEFAULT_PRIORITIES, DEFAULT_SCENARIO, pool("aman", "boro", "mungbean"))).toHaveLength(1);
    expect(generateRotations(rangpur, DEFAULT_PRIORITIES, { ...DEFAULT_SCENARIO, onsetShiftDays: 15 }, pool("aman", "boro", "mungbean"))).toHaveLength(0);
  });

  it("offers fallow as a legal idle season and charges it for staying idle", () => {
    const results = generateRotations(FARMS[0], DEFAULT_PRIORITIES, DEFAULT_SCENARIO, pool("aman", "boro", "fallow"));
    const idle = penaltyStart(results[0], "Idle fallow");
    expect(idle).toBeDefined();
    expect(idle!.amount).toBeGreaterThan(0);
    expect(results[0].risks.some((r) => r.en.includes("Idle season"))).toBe(true);
  });

  it("empty crop pool yields no rotations", () => {
    expect(generateRotations(FARMS[0], DEFAULT_PRIORITIES, DEFAULT_SCENARIO, new Set())).toHaveLength(0);
  });

  it("removing all rabi crops kills every sequence", () => {
    const noRabi = new Set(ALL);
    CROPS.filter((c) => c.season === "rabi").forEach((c) => noRabi.delete(c.id));
    expect(generateRotations(FARMS[0], DEFAULT_PRIORITIES, DEFAULT_SCENARIO, noRabi)).toHaveLength(0);
  });
});

describe("rotation engine — irrigation and onset", () => {
  it("the same thirsty plan scores higher where the farm can irrigate", () => {
    const rangpur = FARMS.find((f) => f.id === "rangpur-21")!;
    const khulna = FARMS.find((f) => f.id === "khulna-09")!;
    const p = pool("aman", "boro", "fallow");
    const wet = generateRotations(rangpur, DEFAULT_PRIORITIES, DEFAULT_SCENARIO, p)[0];
    const dry = generateRotations(khulna, DEFAULT_PRIORITIES, DEFAULT_SCENARIO, p)[0];
    expect(wet.total).toBeGreaterThan(dry.total);
    expect(wet.components.find((c) => c.key === "s1")!.value).toBeGreaterThan(dry.components.find((c) => c.key === "s1")!.value);
  });

  it("irrigation reliance drops as the dry-season demand falls", () => {
    const pack = FARMS[0];
    const s7 = (k: string) => generateRotations(pack, DEFAULT_PRIORITIES, DEFAULT_SCENARIO, ALL).find((r) => key(r) === k)!.components.find((c) => c.key === "s7")!.value;
    expect(s7("aman>mustard>sesame")).toBeGreaterThan(s7("aman>boro>fallow"));
    expect(s7("aman>lentil>mungbean")).toBeGreaterThan(s7("aman>boro>fallow"));
  });

  it("a later onset costs a wheat sequence more than a mungbean/sesame one", () => {
    const pack = FARMS[0];
    const late = { ...DEFAULT_SCENARIO, onsetShiftDays: 15 };
    const all = generateRotations(pack, DEFAULT_PRIORITIES, DEFAULT_SCENARIO, ALL);
    const lateList = generateRotations(pack, DEFAULT_PRIORITIES, late, ALL);
    const drop = (k: string) => {
      const base = all.find((r) => key(r) === k)!;
      const shifted = lateList.find((r) => key(r) === k)!;
      expect(shifted).toBeDefined();
      return base.total - shifted.total;
    };
    expect(drop("aman>wheat>mungbean")).toBeGreaterThan(drop("aman>mustard>sesame"));
    expect(penaltyStart(lateList.find((r) => key(r) === "aman>wheat>mungbean")!, "Late monsoon onset")!.rule.en).toContain("+8 days");
  });

  it("the onset penalty grows with the delay on the same plan", () => {
    const pack = FARMS.find((f) => f.id === "rajshahi-07")!;
    const plan = (shift: number) => generateRotations(pack, DEFAULT_PRIORITIES, { ...DEFAULT_SCENARIO, onsetShiftDays: shift }, pool("aman", "lentil", "sesame"))[0];
    const mild = penaltyStart(plan(0), "Late monsoon onset")!;
    const severe = penaltyStart(plan(10), "Late monsoon onset")!;
    expect(severe.amount).toBeGreaterThan(mild.amount);
    expect(plan(0).total).toBeGreaterThan(plan(10).total);
  });

  it("an early onset credits long-duration crops more than short ones", () => {
    const pack = FARMS.find((f) => f.id === "rangpur-21")!;
    const score = (ids: string[], onsetShiftDays: number) =>
      generateRotations(pack, DEFAULT_PRIORITIES, { ...DEFAULT_SCENARIO, onsetShiftDays }, pool(...ids))[0].total;
    const longGain = score(["aman", "mustard", "jute"], -8) - score(["aman", "mustard", "jute"], 4);
    const shortGain = score(["aman", "mustard", "sesame"], -8) - score(["aman", "mustard", "sesame"], 4);
    expect(longGain).toBeGreaterThan(0);
    expect(longGain).toBeGreaterThan(shortGain);
    expect(generateRotations(pack, DEFAULT_PRIORITIES, { ...DEFAULT_SCENARIO, onsetShiftDays: -8 }, pool("aman", "mustard", "jute"))[0].why.map((w) => w.en).join(" "))
      .toContain("widens the growing window");
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
      for (const c of r.components) {
        expect(c.value).toBeGreaterThanOrEqual(0);
        expect(c.value).toBeLessThanOrEqual(1);
      }
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
          expect(p.rule.en.length).toBeGreaterThan(5);
          expect(p.source.en.length).toBeGreaterThan(5);
          expect(p.amount).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });
});

describe("bilingual explanations", () => {
  const latinize = (s: string) => s.replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d)));
  const digits = (s: string) => latinize(s).match(/\d+(?:\.\d+)?/g) ?? [];

  it("gives every reason, risk and penalty rule a Bangla twin carrying the same numbers", () => {
    for (const pack of FARMS) {
      for (const r of generateRotations(pack, DEFAULT_PRIORITIES, { ...DEFAULT_SCENARIO, tempDeltaC: 2, onsetShiftDays: 7 }, ALL)) {
        const texts = [...r.why, ...r.risks, ...r.penalties.flatMap((p) => [p.rule, p.source])];
        expect(texts.length).toBeGreaterThan(3);
        for (const text of texts) {
          expect(text.en.length).toBeGreaterThan(5);
          expect(text.bn.length).toBeGreaterThan(5);
          expect(/[\u0980-\u09FF]/.test(text.bn)).toBe(true);
          expect(digits(text.bn)).toEqual(digits(text.en));
        }
      }
    }
  });

  it("quotes the same onset shift in both languages on the same plan", () => {
    const pack = FARMS.find((f) => f.id === "rajshahi-07")!;
    const sc = { ...DEFAULT_SCENARIO, onsetShiftDays: 15 };
    const plan = generateRotations(pack, DEFAULT_PRIORITIES, sc, pool("aman", "wheat", "mungbean"))[0];
    const shift = effectiveOnsetShift(pack, sc);
    const en = plan.why.map((w) => w.en).join(" ");
    const bn = plan.why.map((w) => w.bn).join(" ");
    expect(digits(en)).toEqual(digits(bn));
    expect(en).toContain(`+${shift} days`);
    expect(bn).toContain(`+${toBnDigits(shift)} দিন`);
  });

  it("writes the advisory and the SMS in Bengali digits in Bangla, Latin in English", () => {
    for (const pack of FARMS) {
      const best = generateRotations(pack, DEFAULT_PRIORITIES, DEFAULT_SCENARIO, ALL)[0];
      const bn = advisoryText(pack, best, "bn");
      expect(bn).toMatch(/[০-৯]/);
      expect(bn).not.toMatch(/[0-9]/);
      expect(smsText(pack, best, "bn")).not.toMatch(/[0-9]/);
      expect(smsText(pack, best, "en")).toMatch(/[0-9]/);
      expect(advisoryText(pack, best, "en")).toMatch(/[0-9]/);
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

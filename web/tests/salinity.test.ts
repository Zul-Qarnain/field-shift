import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  CROPS,
  FARMS,
  SALINITY_CLASS_ECE,
  SALINITY_CLASSES,
  SALT_UNCITED,
  type Crop,
  type FarmPack,
  type SalinityBlock,
  type SalinityClass,
} from "@/lib/data";
import {
  DEFAULT_PRIORITIES,
  DEFAULT_SCENARIO,
  generateRotations,
  salinityLossForCrop,
  salinityPenalty,
  salinityYieldLossPct,
} from "@/lib/engine";

const ALL = new Set(CROPS.map((c) => c.id));
const crop = (id: string): Crop => CROPS.find((c) => c.id === id)!;
const farm = (id: string): FarmPack => FARMS.find((f) => f.id === id)!;
const saltBlock = (f: FarmPack): SalinityBlock => f.salinity;
const rice = crop("boro");

/** The same farm with salinity removed — the engine's state before this feature existed. */
const withoutSalinity = (f: FarmPack): FarmPack => ({
  ...f,
  salinity: { ...f.salinity, salineShare: 0, classShares: null, repECe: null, classAreasHa: null, cited: false },
});

/** A block whose whole saline area sits in one class, to test the response to ECe alone. */
const oneClass = (share: number, cls: SalinityClass): SalinityBlock => ({
  ...saltBlock(farm("khulna-09")),
  salineShare: share,
  classShares: Object.fromEntries(SALINITY_CLASSES.map((c) => [c, c === cls ? 1 : 0])) as Record<SalinityClass, number>,
});

describe("SRDI farm blocks", () => {
  it("the two coastal farms carry cited SRDI class areas and the four others are explicitly outside the survey", () => {
    for (const f of FARMS) {
      if (f.salinity.cited) {
        expect(f.salinity.classAreasHa).not.toBeNull();
        expect(f.salinity.salineHa! + f.salinity.totalHa!).toBeGreaterThan(0);
        expect(f.salinity.repECe).not.toBeNull();
        expect(f.salinity.source).toContain("SRDI (2010)");
        expect(f.salinity.retrieved).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      } else {
        expect(f.salinity.note).toContain("outside SRDI coastal saline survey area");
        expect(f.salinity.classShares).toBeNull();
        expect(f.salinity.repECe).toBeNull();
        expect(f.salinity.salineShare).toBe(0);
      }
    }
    expect(FARMS.filter((f) => f.salinity.cited).map((f) => f.id).sort()).toEqual(["barishal-03", "khulna-09"]);
  });

  it("class areas add up to the printed saline area, and class shares are shares of it", () => {
    for (const f of FARMS.filter((x) => x.salinity.cited)) {
      const areas = f.salinity.classAreasHa!;
      expect(SALINITY_CLASSES.reduce((a, c) => a + areas[c], 0)).toBe(f.salinity.salineHa);
      expect(SALINITY_CLASSES.reduce((a, c) => a + f.salinity.classShares![c], 0)).toBeCloseTo(1, 6);
    }
  });

  it("representative ECe is the area-weighted class midpoint (derived, and inside the printed bounds)", () => {
    for (const f of FARMS.filter((x) => x.salinity.cited)) {
      const derived = SALINITY_CLASSES.reduce((a, c) => a + f.salinity.classShares![c] * SALINITY_CLASS_ECE[c], 0);
      expect(f.salinity.repECe).toBe(Math.round(derived * 100) / 100);
      expect(f.salinity.repECe!).toBeGreaterThanOrEqual(3.0);
      expect(f.salinity.repECe!).toBeLessThanOrEqual(16.0);
    }
    expect(farm("khulna-09").salinity.repECe).toBe(9.19);
    expect(farm("barishal-03").salinity.repECe).toBe(3.61);
  });

  it("the baked farm blocks equal the numbers src/acquire/salinity.py published", () => {
    const published = JSON.parse(readFileSync(new URL("../public/data/salinity.json", import.meta.url), "utf8")) as {
      farms: Record<string, { district: string; upazila: string; saline_ha: number | null; total_ha: number | null; salineShare: number | null; repECe: number | null; classShares: Record<SalinityClass, number> | null }>;
      retrieved: string;
    };
    for (const f of FARMS) {
      const p = published.farms[f.id];
      expect(p, `salinity.json has no entry for ${f.id}`).toBeTruthy();
      expect(f.salinity.salineHa).toBe(p.saline_ha ?? null);
      expect(f.salinity.totalHa).toBe(p.total_ha ?? null);
      expect(f.salinity.salineShare).toBeCloseTo(p.salineShare ?? 0, 4);
      expect(f.salinity.repECe).toBe(p.repECe ?? null);
      for (const c of SALINITY_CLASSES) {
        expect(f.salinity.classShares?.[c] ?? 0).toBeCloseTo(p.classShares?.[c] ?? 0, 3);
      }
    }
    expect(farm("khulna-09").salinity.upazila).toBe(published.farms["khulna-09"].upazila);
    expect(farm("khulna-09").salinity.retrieved).toBe(published.retrieved);
  });
});

describe("FAO-29 Table 4 tolerance values", () => {
  /** ECe (dS/m) at 100% and at 0% yield, copied from the published table. */
  const TABLE4: Record<string, [number, number]> = {
    aman: [3.0, 11], boro: [3.0, 11], aus: [3.0, 11], wheat: [6.0, 20], maize: [1.7, 10], potato: [1.7, 10],
  };

  it("threshold matches Table 4 and slope is 100 / (ECe at 0% yield − threshold)", () => {
    for (const [id, [a, zero]] of Object.entries(TABLE4)) {
      const salt = crop(id).salt;
      expect(salt, `${id} should have a cited salt tolerance`).not.toBeNull();
      expect(salt!.thresholdECe).toBe(a);
      expect(salt!.slopePctPerDs).toBeCloseTo(100 / (zero - a), 1);
      expect(salt!.source).toContain("FAO Irrigation & Drainage Paper 29 Rev.1");
    }
  });

  it("the straight line reproduces the printed intermediate columns within their rounding", () => {
    for (const [id, [a, zero]] of Object.entries(TABLE4)) {
      const salt = crop(id).salt!;
      const at = (pct: 90 | 75 | 50) => a + (100 - pct) / salt.slopePctPerDs;
      for (const pct of [90, 75, 50] as const) {
        const drift = Math.round(Math.abs(at(pct) - pctRow(id, pct)) * 100) / 100;
        expect(drift, `${id} at ${pct}%: line ${at(pct)} vs printed ${pctRow(id, pct)}`).toBeLessThanOrEqual(0.2);
      }
      expect(zero).toBeGreaterThan(a);
    }
  });

  it("crops FAO-29 does not number are null, with a recorded reason", () => {
    for (const id of ["mustard", "lentil", "mungbean", "sesame", "jute", "fallow"]) {
      expect(crop(id).salt).toBeNull();
      expect(SALT_UNCITED[id]).toBeDefined();
      expect(SALT_UNCITED[id].length).toBeGreaterThan(20);
    }
  });

  it("tolerance ordering follows the paper: wheat most tolerant, rice middle, maize and potato least", () => {
    const t = (id: string) => crop(id).salt!.thresholdECe;
    expect(t("wheat")).toBeGreaterThan(t("boro"));
    expect(t("boro")).toBeGreaterThan(t("maize"));
    expect(t("maize")).toBe(t("potato"));
  });
});

/** The 90/75/50% ECe columns of FAO-29 Table 4 for the crops checked above. */
function pctRow(id: string, pct: 90 | 75 | 50): number {
  const rows: Record<string, [number, number, number]> = {
    aman: [3.8, 5.1, 7.2], boro: [3.8, 5.1, 7.2], aus: [3.8, 5.1, 7.2], wheat: [7.4, 9.5, 13], maize: [2.5, 3.8, 5.9], potato: [2.5, 3.8, 5.9],
  };
  return rows[id][pct === 90 ? 0 : pct === 75 ? 1 : 2];
}

describe("salinity yield response", () => {
  it("loss is zero at or below the threshold and rises with ECe until the zero-yield cap", () => {
    const a = rice.salt!.thresholdECe;
    expect(salinityYieldLossPct(a - 1, rice.salt!)).toBe(0);
    expect(salinityYieldLossPct(a, rice.salt!)).toBe(0);
    const losses = SALINITY_CLASSES.map((c) => salinityYieldLossPct(SALINITY_CLASS_ECE[c], rice.salt!));
    for (let i = 1; i < losses.length; i++) expect(losses[i]).toBeGreaterThanOrEqual(losses[i - 1]);
    expect(losses[1]).toBeGreaterThan(losses[0]); // S1 sits on rice's threshold, S2 does not
    expect(Math.max(...losses)).toBe(100); // capped: S4/S5 are past rice's zero-yield ECe of 11 dS/m
    // wheat is still under its zero-yield ECe in every class, so its response is strictly increasing
    const tolerant = SALINITY_CLASSES.map((c) => salinityYieldLossPct(SALINITY_CLASS_ECE[c], crop("wheat").salt!));
    for (let i = 1; i < tolerant.length; i++) expect(tolerant[i]).toBeGreaterThan(tolerant[i - 1]);
  });

  it("loss grows with the saline share, and never shrinks as the salt sits in a higher class", () => {
    let prev = -1;
    for (const share of [0, 0.25, 0.5, 0.75, 1]) {
      const loss = salinityLossForCrop(oneClass(share, "S3"), rice.salt!);
      expect(loss).toBeGreaterThan(prev);
      prev = loss;
    }
    prev = -1;
    for (const cls of SALINITY_CLASSES) {
      const loss = salinityLossForCrop(oneClass(1, cls), crop("wheat").salt!);
      expect(loss).toBeGreaterThan(prev);
      prev = loss;
    }
  });

  it("a tolerant crop on the same soil loses less than a sensitive one", () => {
    const block = farm("khulna-09").salinity;
    expect(salinityLossForCrop(block, crop("wheat").salt!)).toBeLessThan(salinityLossForCrop(block, rice.salt!));
    expect(salinityLossForCrop(block, crop("potato").salt!)).toBeGreaterThan(salinityLossForCrop(block, rice.salt!));
  });

  it("Aman is charged the same line as Boro — no monsoon-leaching factor is invented", () => {
    const block = farm("khulna-09").salinity;
    expect(salinityLossForCrop(block, crop("aman").salt!)).toBe(salinityLossForCrop(block, rice.salt!));
  });
});

describe("engine salinity penalty", () => {
  it("is zero and unlisted on farms SRDI never mapped", () => {
    for (const f of FARMS.filter((x) => !x.salinity.cited)) {
      for (const c of CROPS.filter((x) => x.salt)) expect(salinityPenalty(f, c)).toBeNull();
      for (const r of generateRotations(f, DEFAULT_PRIORITIES, DEFAULT_SCENARIO, ALL)) {
        expect(r.penalties.some((p) => p.rule.startsWith("Soil salinity"))).toBe(false);
      }
    }
  });

  it("skips crops with no cited tolerance instead of guessing one", () => {
    for (const f of FARMS.filter((x) => x.salinity.cited)) {
      for (const id of ["mustard", "lentil", "mungbean", "sesame", "jute", "fallow"]) {
        expect(salinityPenalty(f, crop(id))).toBeNull();
      }
    }
  });

  it("names the crop and the percent lost, and carries both sources", () => {
    const p = salinityPenalty(farm("khulna-09"), rice)!;
    expect(p.rule).toBe("Soil salinity (SRDI 2010, dry season) — Rice (Boro) loses ~42% yield");
    expect(p.source).toContain("SRDI (2010) Saline Soils of Bangladesh, Appendix-2 p.31 — Khulna/Dumuria");
    expect(p.source).toContain("FAO Irrigation & Drainage Paper 29 Rev.1");
    expect(p.source).toContain("ESTIMATE");
    expect(p.amount).toBeGreaterThan(0);
  });

  it("the saltier farm is penalised harder for the same crop", () => {
    const khulna = salinityPenalty(farm("khulna-09"), rice)!;
    const barishal = salinityPenalty(farm("barishal-03"), rice)!;
    expect(farm("khulna-09").salinity.salineShare).toBeGreaterThan(farm("barishal-03").salinity.salineShare);
    expect(khulna.amount).toBeGreaterThan(barishal.amount);
    expect(generateRotations(farm("khulna-09"), DEFAULT_PRIORITIES, DEFAULT_SCENARIO, ALL)[0].total)
      .toBeLessThan(generateRotations(farm("barishal-03"), DEFAULT_PRIORITIES, DEFAULT_SCENARIO, ALL)[0].total);
  });

  it("lowers the score of every rotation on a saline farm and leaves the unsurveyed farms untouched", () => {
    for (const f of FARMS) {
      const withSalt = generateRotations(f, DEFAULT_PRIORITIES, DEFAULT_SCENARIO, ALL);
      const without = generateRotations(withoutSalinity(f), DEFAULT_PRIORITIES, DEFAULT_SCENARIO, ALL);
      for (const r of withSalt) {
        const before = without.find((x) => x.id === r.id)!;
        if (f.salinity.cited) expect(r.total).toBeLessThanOrEqual(before.total);
        else expect(r.total).toBe(before.total);
      }
    }
  });

  it("lists the penalty in Why and flags uncited crops as a risk", () => {
    const top = generateRotations(farm("khulna-09"), DEFAULT_PRIORITIES, DEFAULT_SCENARIO, ALL)[0];
    expect(top.why.join(" ")).toContain("Soil salinity (SRDI 2010, dry season)");
    expect(top.why.join(" ")).toContain("Dumuria");
    expect(top.risks.filter((r) => r.includes("salt tolerance not cited")).length).toBeGreaterThan(0);
    expect(top.risks.join(" ")).toContain("not cited");
    // the same crop list on a farm outside the survey raises no salt talk at all
    const plain = generateRotations(farm("rangpur-21"), DEFAULT_PRIORITIES, DEFAULT_SCENARIO, ALL)[0];
    expect(plain.why.join(" ") + plain.risks.join(" ")).not.toContain("salinity");
  });

  it("the ranking on the two coastal farms responds to the salt penalty", () => {
    for (const id of ["khulna-09", "barishal-03"]) {
      const f = farm(id);
      const after = generateRotations(f, DEFAULT_PRIORITIES, DEFAULT_SCENARIO, ALL);
      const before = generateRotations(withoutSalinity(f), DEFAULT_PRIORITIES, DEFAULT_SCENARIO, ALL);
      const seq = (r: (typeof after)[number]) => r.crops.map((c) => c.id).join(">");
      const moved = after.filter((r, i) => seq(before[i]) !== seq(r)).length;
      expect(moved).toBeGreaterThan(0);
      expect(after[0].total).toBeLessThanOrEqual(before[0].total);
    }
  });

  it("every salinity penalty is deterministic and rounded to one decimal", () => {
    for (const f of FARMS.filter((x) => x.salinity.cited)) {
      const a = generateRotations(f, DEFAULT_PRIORITIES, DEFAULT_SCENARIO, ALL);
      const b = generateRotations(f, DEFAULT_PRIORITIES, DEFAULT_SCENARIO, ALL);
      expect(JSON.stringify(a.map((r) => r.penalties))).toBe(JSON.stringify(b.map((r) => r.penalties)));
      for (const r of a) for (const p of r.penalties.filter((x) => x.rule.startsWith("Soil salinity"))) {
        expect(p.amount).toBe(Math.round(p.amount * 10) / 10);
      }
    }
  });
});

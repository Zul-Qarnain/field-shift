import { describe, expect, it } from "vitest";
import { FARMS } from "@/lib/data";
import {
  OUTLOOK,
  outlookDate,
  outlookForFarm,
  num,
  signedDays,
  statusForSkill,
  type OutlookRow,
} from "@/lib/outlook";

const doyToDate = (doy: number, year: number) => {
  const date = new Date(Date.UTC(year, 0, 1));
  date.setUTCDate(doy);
  return date.toISOString().slice(0, 10);
};

describe("onset outlook payload shape", () => {
  it("carries the fields the card and the method page read", () => {
    expect(OUTLOOK.model_version).toMatch(/^onset-ml-v\d+$/);
    expect(OUTLOOK.issue_date).toBe(`${OUTLOOK.outlook_year}-04-25`);
    expect(OUTLOOK.trained_on.years).toBeGreaterThan(1);
    expect(OUTLOOK.trained_on.end).toBeLessThan(OUTLOOK.outlook_year);
    expect(OUTLOOK.backtest.length).toBeGreaterThan(0);
    expect(OUTLOOK.features.length).toBeGreaterThan(0);
    expect(OUTLOOK.quantile_interval.low).toBeLessThan(OUTLOOK.quantile_interval.high);
    expect(OUTLOOK.metrics.mae_model_days).not.toBeNull();
    expect(OUTLOOK.label_note).toMatch(/same-source|same product|same rainfall/i);
  });

  it("names CHIRPS as the label source, with its provider", () => {
    expect(OUTLOOK.sources.labels).toBe("CHIRPS v2.0 (UCSB Climate Hazards Center)");
    expect(OUTLOOK.sources.rainfall_feature).toBe(OUTLOOK.sources.labels);
    expect(OUTLOOK.data_sources.chirps.retrieved_utc).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/);
    expect(OUTLOOK.sources.power_rainfall_excluded).toMatch(/not used for labels or the rainfall feature/i);
  });

  it("reports both rainfall arms and keeps the POWER arm to the comparable years", () => {
    const names = Object.keys(OUTLOOK.variants).sort();
    expect(names).toEqual(["chirps", "power"]);
    const power = OUTLOOK.variants.power;
    expect(power.training_years!.start).toBeGreaterThanOrEqual(2001);
    expect(power.source).toMatch(/NASA POWER/);
    expect(OUTLOOK.variants.chirps.source).toBe(OUTLOOK.sources.labels);
    // The shipped decision is taken on the CHIRPS arm, not on POWER.
    expect(OUTLOOK.status).toBe(OUTLOOK.variants.chirps.metrics.status);
  });

  for (const row of [...OUTLOOK.districts, ...OUTLOOK.farms]) {
    it(`${row.key}: predicted doy and predicted date are the same day`, () => {
      if (row.predicted_doy === null || row.predicted_date === null) {
        expect(row.predicted_doy).toBeNull();
        return;
      }
      expect(row.predicted_date).toBe(doyToDate(Math.round(row.predicted_doy), OUTLOOK.outlook_year));
    });

    it(`${row.key}: interval is ordered and inside the monsoon window`, () => {
      const low = row.interval_low_doy;
      const high = row.interval_high_doy;
      if (low === null || high === null) {
        expect(low).toBeNull();
        return;
      }
      expect(low).toBeLessThanOrEqual(high);
      expect(low).toBeGreaterThanOrEqual(100);
      expect(high).toBeLessThanOrEqual(290);
    });

    it(`${row.key}: three contributions, all finite days`, () => {
      expect(row.top_contributions).toHaveLength(3);
      for (const c of row.top_contributions) {
        expect(Number.isFinite(c.effect_days)).toBe(true);
        expect(c.label_en.length).toBeGreaterThan(0);
        expect(c.label_bn.length).toBeGreaterThan(0);
      }
      const magnitudes = row.top_contributions.map((c) => Math.abs(c.effect_days));
      expect(magnitudes).toEqual([...magnitudes].sort((a, b) => b - a));
    });

    it(`${row.key}: observed onset is stated or explicitly not yet observable`, () => {
      const rowAny = row as OutlookRow;
      if (rowAny.observed_doy === null) {
        expect(rowAny.observed_note).toMatch(/not|before|no qualifying/i);
      } else {
        expect(rowAny.observed_date).toBe(doyToDate(Math.round(rowAny.observed_doy), OUTLOOK.outlook_year));
      }
    });
  }
});

describe("status rule", () => {
  it("shipped if and only if the model beats climatology", () => {
    expect(statusForSkill(0.001)).toBe("shipped");
    expect(statusForSkill(0)).toBe("validating");
    expect(statusForSkill(-0.2)).toBe("validating");
    expect(statusForSkill(null)).toBe("validating");
    expect(OUTLOOK.status).toBe(statusForSkill(OUTLOOK.metrics.skill));
  });

  it("every variant record obeys the same rule", () => {
    for (const [, record] of Object.entries(OUTLOOK.variants)) {
      expect(record.metrics.status).toBe(statusForSkill(record.metrics.skill));
    }
  });

  it("while skill against climatology is not above zero, the payload reports it in the numbers", () => {
    if (OUTLOOK.status === "validating") {
      expect(OUTLOOK.metrics.skill).not.toBeNull();
      expect(OUTLOOK.metrics.skill!).toBeLessThanOrEqual(0);
      expect(OUTLOOK.metrics.mae_model_days!).toBeGreaterThanOrEqual(OUTLOOK.metrics.mae_clim_days!);
    } else {
      expect(OUTLOOK.metrics.skill!).toBeGreaterThan(0);
    }
  });
});

describe("farm coverage", () => {
  it("every demo farm in the app has an outlook row at the same coordinates", () => {
    const ids = FARMS.map((farm) => farm.id).sort();
    expect(OUTLOOK.farms.map((f) => f.key).sort()).toEqual(ids);
    for (const farm of FARMS) {
      const row = outlookForFarm(farm.id);
      expect(row, `no outlook for ${farm.id}`).toBeDefined();
      expect(row!.lat).toBeCloseTo(farm.lat, 4);
      expect(row!.lon).toBeCloseTo(farm.lon, 4);
    }
  });

  it("states which CHIRPS cell each point actually read", () => {
    const cells = OUTLOOK.chirps_cells ?? {};
    expect(Object.keys(cells).length).toBe(OUTLOOK.districts.length + OUTLOOK.farms.length);
    for (const [key, cell] of Object.entries(cells)) {
      expect(cell.lat, key).toBeGreaterThanOrEqual(20);
      expect(cell.lat, key).toBeLessThanOrEqual(27);
      expect(cell.lon, key).toBeGreaterThanOrEqual(88);
      expect(cell.lon, key).toBeLessThanOrEqual(93);
    }
  });

  it("covers all 64 districts", () => {
    expect(OUTLOOK.districts.length).toBeGreaterThanOrEqual(60);
    expect(new Set(OUTLOOK.districts.map((d) => d.key)).size).toBe(OUTLOOK.districts.length);
  });
});

describe("formatters", () => {
  it("null stays null instead of becoming NaN text", () => {
    expect(num(null)).toBeNull();
    expect(outlookDate(null)).toBeNull();
    expect(signedDays(null)).toBeNull();
  });

  it("dates follow the language, digits stay Latin", () => {
    expect(outlookDate("2026-05-23", "en")).toBe("23 May 2026");
    const bangla = outlookDate("2026-05-23", "bn");
    expect(bangla).toContain("মে");
    expect(bangla).toContain("23");
    expect(bangla).not.toMatch(/[০-৯]/);
  });

  it("signed days use a real minus, not a hyphen", () => {
    expect(signedDays(2.4)).toBe("+2");
    expect(signedDays(-2.4)).toBe("−2");
    expect(signedDays(0)).toBe("0");
  });
});

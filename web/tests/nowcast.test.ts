import { readdirSync, readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  calendarKey,
  fetchLiveRecent,
  lastCompleteDate,
  loadNowcastPack,
  parsePowerDaily,
  powerUrl,
  windowDays,
  windowSummary,
  type Climatology,
  type DailySeries,
  type NowcastPack,
} from "@/lib/nowcast";

const NOWCAST_DIR = new URL("../public/data/nowcast/", import.meta.url);
const latinDay = (iso: string) => iso.replace(/-/g, "").slice(0, 8);

describe("calendarKey", () => {
  it("puts the leap-year calendar at the centre: 1 Jan = 0, 29 Feb = 59, 1 Mar = 60", () => {
    expect(calendarKey("2026-01-01")).toBe(0);
    expect(calendarKey("2024-02-29")).toBe(59);
    expect(calendarKey("2026-02-28")).toBe(58);
    expect(calendarKey("2026-03-01")).toBe(60);
    expect(calendarKey("2024-03-01")).toBe(60);
    expect(calendarKey("2026-12-31")).toBe(365);
    expect(calendarKey("2024-12-31")).toBe(365);
  });

  it("refuses a malformed date instead of guessing a key", () => {
    expect(Number.isNaN(calendarKey("not-a-date"))).toBe(true);
  });

  it("walks the window backwards over a year end, inclusive of the last day", () => {
    expect(windowDays("2026-01-02", 3)).toEqual(["2025-12-31", "2026-01-01", "2026-01-02"]);
    expect(windowDays("2026-10-05", 30)).toHaveLength(30);
  });
});

describe("parsePowerDaily", () => {
  const payload = {
    header: { fill_value: -999, sources: ["GEOSIT", "MERRA2"], api: { version: "v2.10.0" }, time_standard: "LST" },
    properties: {
      parameter: {
        PRECTOTCORR: { "20261002": 5.2, "20261001": -999, "20261003": 0 },
        T2M: { "20261001": 27.1, "20261002": 28.4 },
        GWETTOP: { "20261002": 0.9, "20261001": -999.0 },
      },
    },
  };

  it("turns every fill into null, keeps a real zero, and sorts by date", () => {
    const parsed = parsePowerDaily(payload);
    expect(parsed.dates).toEqual(["2026-10-01", "2026-10-02", "2026-10-03"]);
    expect(parsed.PRECTOTCORR).toEqual([null, 5.2, 0]);
    expect(parsed.T2M).toEqual([27.1, 28.4, null]);
    expect(parsed.GWETTOP).toEqual([null, 0.9, null]);
    expect(parsed.apiVersion).toBe("v2.10.0");
    expect(parsed.sources).toEqual(["GEOSIT", "MERRA2"]);
    expect(parsed.timeStandard).toBe("LST");
  });

  it("honours a header-declared fill value other than -999", () => {
    const parsed = parsePowerDaily({
      header: { fill_value: -8888 },
      properties: { parameter: { PRECTOTCORR: { "20260101": -8888, "20260102": 1.5 }, T2M: {}, GWETTOP: {} } },
    });
    expect(parsed.PRECTOTCORR).toEqual([null, 1.5]);
  });

  it("treats a body with no parameters as an empty series, not a crash", () => {
    const parsed = parsePowerDaily({ header: {}, properties: { parameter: {} } });
    expect(parsed.dates).toEqual([]);
    expect(lastCompleteDate(parsed)).toBeNull();
  });

  it("lastCompleteDate is the latest day carrying all three parameters", () => {
    expect(lastCompleteDate(parsePowerDaily(payload))).toBe("2026-10-02");
  });
});

describe("powerUrl", () => {
  it("asks the daily point API for the three parameters at the pack's own 4-decimal point", () => {
    const url = powerUrl(24.25142, 89.91518, "20260726", "20261009");
    expect(url).toBe(
      "https://power.larc.nasa.gov/api/temporal/daily/point?parameters=PRECTOTCORR,T2M,GWETTOP&community=AG" +
        "&longitude=89.9152&latitude=24.2514&start=20260726&end=20261009&format=JSON",
    );
  });
});

/** The same comparison the brief asks for: every committed summary, re-derived in TypeScript. */
describe("windowSummary reproduces src/compute/nowcast.py", () => {
  const files = readdirSync(NOWCAST_DIR).filter((name) => name.endsWith(".json") && name !== "index.json");
  const numericFields = [
    "rainTotalMm", "rainNormalMm", "rainAnomalyMm", "rainPctOfNormal",
    "tempMean", "tempNormal", "tempAnomaly", "wetMean", "wetNormal", "wetAnomaly",
  ] as const;

  it(`checks all ${files.length} committed nowcast packs`, () => {
    expect(files.length).toBe(70);
  });

  for (const name of files) {
    for (const window of [30, 60]) {
      it(`${name}: summary["${window}"] matches to within 1e-3`, () => {
        const pack = JSON.parse(readFileSync(new URL(name, NOWCAST_DIR), "utf8")) as NowcastPack;
        const got = windowSummary(pack.recent, pack.climatology, pack.lastCompleteDate, window);
        const want = pack.summary[String(window)];
        expect(got.start, `${name} start`).toBe(want.start);
        expect(got.end, `${name} end`).toBe(want.end);
        expect(got.validDays).toEqual(want.validDays);
        for (const field of numericFields) {
          const a = got[field];
          const b = want[field];
          if (a === null || b === null) {
            expect(a, `${name} ${field}`).toBe(b);
            continue;
          }
          expect(Math.abs(a - b), `${name} ${field}`).toBeLessThanOrEqual(1e-3);
        }
      });
    }
  }

  it("reports null for a variable that misses the 80% share, and numbers for the others", () => {
    const dates = windowDays("2026-10-05", 30);
    const clim: Climatology = {
      PRECTOTCORR: Array.from({ length: 366 }, () => 1),
      T2M: Array.from({ length: 366 }, () => 25),
      GWETTOP: Array.from({ length: 366 }, () => 0.5),
    };
    const series: DailySeries = {
      dates,
      PRECTOTCORR: dates.map((_, i) => (i < 20 ? 5 : null)),
      T2M: dates.map(() => 26),
      GWETTOP: dates.map(() => 0.6),
    };
    const summary = windowSummary(series, clim, "2026-10-05", 30);
    expect(summary.validDays.PRECTOTCORR).toBe(20);
    expect(summary.rainTotalMm).toBeNull();
    expect(summary.rainNormalMm).toBeNull();
    expect(summary.rainAnomalyMm).toBeNull();
    expect(summary.rainPctOfNormal).toBeNull();
    expect(summary.tempMean).toBeCloseTo(26, 6);
    expect(summary.tempAnomaly).toBeCloseTo(1, 6);
    expect(summary.wetMean).toBeCloseTo(0.6, 6);
  });

  it("never divides by a zero normal", () => {
    const dates = windowDays("2026-10-05", 30);
    const series: DailySeries = { dates, PRECTOTCORR: dates.map(() => 0), T2M: dates.map(() => 20), GWETTOP: dates.map(() => 0.1) };
    const clim: Climatology = {
      PRECTOTCORR: Array.from({ length: 366 }, () => 0),
      T2M: Array.from({ length: 366 }, () => 20),
      GWETTOP: Array.from({ length: 366 }, () => 0.1),
    };
    const summary = windowSummary(series, clim, "2026-10-05", 30);
    expect(summary.rainTotalMm).toBe(0);
    expect(summary.rainPctOfNormal).toBeNull();
  });
});

const okResponse = (body: unknown) => ({ ok: true, status: 200, json: async () => body }) as Response;

const livePayload = {
  header: { fill_value: -999, sources: ["GEOSIT"], api: { version: "v2.10.0" } },
  properties: {
    parameter: {
      PRECTOTCORR: { "20261005": 12.5, "20261006": -999 },
      T2M: { "20261005": 29.1, "20261006": -999 },
      GWETTOP: { "20261005": 0.85, "20261006": 0.8 },
    },
  },
};

describe("fetchLiveRecent", () => {
  const now = new Date("2026-10-09T08:00:00Z");

  it("requests the last 75 days at the point it was given and parses the answer", async () => {
    const seen: string[] = [];
    const fetchImpl = (async (input: RequestInfo | URL) => {
      seen.push(String(input));
      return okResponse(livePayload);
    }) as unknown as typeof fetch;

    const result = await fetchLiveRecent(24.2514, 89.9152, { fetchImpl, now });
    expect(seen[0]).toContain("latitude=24.2514");
    expect(seen[0]).toContain("longitude=89.9152");
    expect(seen[0]).toContain(`start=${latinDay("2026-07-26")}`);
    expect(seen[0]).toContain(`end=${latinDay("2026-10-09")}`);
    expect(result.lastComplete).toBe("2026-10-05");
    expect(result.fetchedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(result.apiVersion).toBe("v2.10.0");
    expect(result.PRECTOTCORR).toEqual([12.5, null]);
  });

  it("rejects a non-200", async () => {
    const fetchImpl = (async () => ({ ok: false, status: 503, json: async () => ({}) })) as unknown as typeof fetch;
    await expect(fetchLiveRecent(24, 90, { fetchImpl, now })).rejects.toThrow(/HTTP 503/);
  });

  it("rejects a body that is not JSON", async () => {
    const fetchImpl = (async () => ({
      ok: true,
      status: 200,
      json: async () => {
        throw new Error("Unexpected token");
      },
    })) as unknown as typeof fetch;
    await expect(fetchLiveRecent(24, 90, { fetchImpl, now })).rejects.toThrow(/not JSON/);
  });

  it("rejects a response with no day carrying all three parameters", async () => {
    const fetchImpl = (async () =>
      okResponse({ header: {}, properties: { parameter: { PRECTOTCORR: { "20261005": 1 }, T2M: { "20261005": -999 }, GWETTOP: {} } } })) as unknown as typeof fetch;
    await expect(fetchLiveRecent(24, 90, { fetchImpl, now })).rejects.toThrow(/no day/);
  });

  it("rejects when the request outlives its timeout", async () => {
    const fetchImpl = ((_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new DOMException("The operation was aborted", "AbortError")));
      })) as unknown as typeof fetch;
    await expect(fetchLiveRecent(24, 90, { fetchImpl, now, timeoutMs: 10 })).rejects.toThrow(/aborted/i);
  });
});

/** The saved-pack fetch decides whether a Retry can recover, so a failure must not be cached as "no pack". */
describe("loadNowcastPack caching", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns null on a failed fetch and gives the pack on the next call", async () => {
    const pack = JSON.parse(readFileSync(new URL("../public/data/nowcast/kushtia.json", import.meta.url), "utf8")) as NowcastPack;
    let calls = 0;
    vi.stubGlobal("fetch", vi.fn(async () => {
      calls += 1;
      if (calls === 1) throw new Error("network down");
      return { ok: true, status: 200, json: async () => pack } as Response;
    }));

    await expect(loadNowcastPack("kushtia")).resolves.toBeNull();
    await expect(loadNowcastPack("kushtia")).resolves.toMatchObject({ id: "kushtia", lastCompleteDate: pack.lastCompleteDate });
    await expect(loadNowcastPack("kushtia")).resolves.toMatchObject({ id: "kushtia" });
    expect(calls).toBe(2);
  });

  it("does not fetch a name that cannot be a file", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(loadNowcastPack("../secrets")).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

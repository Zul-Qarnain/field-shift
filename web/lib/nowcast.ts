/**
 * "This season so far" — recent NASA POWER days against the point's own climatology.
 *
 * `windowSummary` is a line-for-line port of `window_summary` in src/compute/nowcast.py, which
 * produced the committed summaries in web/public/data/nowcast/. web/tests/nowcast.test.ts re-derives
 * every committed pack with this file, so the browser's live path and the offline build cannot drift.
 */

export type NowcastParam = "PRECTOTCORR" | "T2M" | "GWETTOP";
export const NOWCAST_PARAMS: NowcastParam[] = ["PRECTOTCORR", "T2M", "GWETTOP"];
/** Mirrors MIN_VALID_SHARE in src/compute/nowcast.py: below this share of days, a variable reports nothing. */
export const MIN_VALID_SHARE = 0.8;
export const NOWCAST_WINDOWS = [30, 60] as const;
export type NowcastWindowDays = (typeof NOWCAST_WINDOWS)[number];

export interface DailySeries {
  dates: string[];
  PRECTOTCORR: (number | null)[];
  T2M: (number | null)[];
  GWETTOP: (number | null)[];
}

/** 366 calendar-day means, index = calendarKey, on the leap-year calendar (0 = 1 Jan, 59 = 29 Feb). */
export type Climatology = Record<NowcastParam, (number | null)[]>;

export interface NowcastSummary {
  start: string;
  end: string;
  days: number;
  validDays: Record<NowcastParam, number>;
  rainTotalMm: number | null;
  rainNormalMm: number | null;
  rainAnomalyMm: number | null;
  rainPctOfNormal: number | null;
  tempMean: number | null;
  tempNormal: number | null;
  tempAnomaly: number | null;
  wetMean: number | null;
  wetNormal: number | null;
  wetAnomaly: number | null;
}

export interface NowcastBaseline {
  firstYear: number;
  lastYear: number;
  halfWindowDays: number;
  calendar: string;
  why: string;
  precipChangePoint: number | null;
  changePointInsideBaseline: boolean;
}

export interface NowcastPack {
  schema_version: number;
  kind: "farm" | "district";
  id: string;
  name: string;
  lat: number;
  lon: number;
  source: string;
  source_url: string;
  powerApiVersion: string | null;
  powerSources: string[] | null;
  timeStandard: string | null;
  parameters: Record<NowcastParam, string>;
  retrievedUtc: string;
  requested: { start: string; end: string };
  lastCompleteDate: string;
  baseline: NowcastBaseline;
  climatology: Climatology;
  recent: DailySeries;
  summary: Record<string, NowcastSummary>;
}

export interface PowerDaily extends DailySeries {
  apiVersion: string;
  sources: string[];
  timeStandard: string | null;
}

export interface LiveRecent extends PowerDaily {
  /** Latest day the response carries all three parameters — the window ends here, not today. */
  lastComplete: string;
  fetchedAt: string;
}

const CUM_LEAP = [0, 31, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335];

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Day-of-year on a leap-year calendar, 0-based, so 1 March is key 60 in every year. */
export function calendarKey(isoDate: string): number {
  const m = ISO.exec(isoDate);
  if (!m) return NaN;
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return NaN;
  return CUM_LEAP[month - 1] + day - 1;
}

const toUTC = (iso: string) => Date.parse(`${iso}T00:00:00Z`);
const fromUTC = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const DAY_MS = 86_400_000;

export const shiftDay = (iso: string, days: number): string => fromUTC(toUTC(iso) + days * DAY_MS);

/** The `nDays` calendar days ending at `endIso` inclusive, oldest first. */
export function windowDays(endIso: string, nDays: number): string[] {
  const end = toUTC(endIso);
  return Array.from({ length: nDays }, (_, i) => fromUTC(end - (nDays - 1 - i) * DAY_MS));
}

/**
 * Round to `digits` the way Python's round() does — correctly, against the stored double. Multiplying
 * first and using Math.round would flip a value sitting a hair under a half (381.96949999999994 → 381.97)
 * and put the browser a millimetre out of step with the committed summaries.
 */
const round = (value: number, digits: number) => Number(value.toFixed(digits));

/**
 * CPython's sum() adds floats with Neumaier compensated summation, and the committed summaries were
 * built with it. A plain JS reduce lands 1 ULP away on a few points and flips their third decimal, so
 * the browser carries the same algorithm.
 */
function sumValues(values: number[]): number {
  let total = 0;
  let compensation = 0;
  for (const value of values) {
    const next = total + value;
    if (!Number.isFinite(next)) return next;
    if (Math.abs(total) >= Math.abs(value)) compensation += total - next + value;
    else compensation += value - next + total;
    total = next;
  }
  return total + compensation;
}

const finite = (value: number | null | undefined): value is number =>
  typeof value === "number" && Number.isFinite(value);

function valueByDate(series: DailySeries, param: NowcastParam): Map<string, number> {
  const values = series[param];
  const out = new Map<string, number>();
  series.dates.forEach((iso, i) => {
    if (finite(values[i])) out.set(iso, values[i] as number);
  });
  return out;
}

/**
 * Totals and means over the window, against the climatology of the same valid days. A variable with
 * fewer than ceil(0.8·n) days present reports null for all of its fields — never a number built on a gap.
 */
export function windowSummary(
  series: DailySeries,
  climatology: Climatology,
  endIso: string,
  nDays: number,
): NowcastSummary {
  const days = windowDays(endIso, nDays);
  const need = Math.ceil(MIN_VALID_SHARE * nDays);
  const summary: NowcastSummary = {
    start: days[0],
    end: endIso,
    days: nDays,
    validDays: { PRECTOTCORR: 0, T2M: 0, GWETTOP: 0 },
    rainTotalMm: null,
    rainNormalMm: null,
    rainAnomalyMm: null,
    rainPctOfNormal: null,
    tempMean: null,
    tempNormal: null,
    tempAnomaly: null,
    wetMean: null,
    wetNormal: null,
    wetAnomaly: null,
  };

  const pairsFor = (param: NowcastParam): [number, number][] => {
    const values = valueByDate(series, param);
    const normals = climatology[param];
    const out: [number, number][] = [];
    for (const day of days) {
      const value = values.get(day);
      const normal = normals ? normals[calendarKey(day)] : null;
      if (value !== undefined && finite(value) && finite(normal)) out.push([value, normal as number]);
    }
    return out;
  };

  const rain = pairsFor("PRECTOTCORR");
  const temp = pairsFor("T2M");
  const wet = pairsFor("GWETTOP");
  summary.validDays = { PRECTOTCORR: rain.length, T2M: temp.length, GWETTOP: wet.length };

  if (rain.length >= need) {
    const total = sumValues(rain.map(([v]) => v));
    const normal = sumValues(rain.map(([, c]) => c));
    summary.rainTotalMm = round(total, 3);
    summary.rainNormalMm = round(normal, 3);
    summary.rainAnomalyMm = round(total - normal, 3);
    summary.rainPctOfNormal = normal > 0 ? round((100 * total) / normal, 3) : null;
  }
  const means = (data: [number, number][]) => {
    if (data.length < need) return null;
    const meanValue = sumValues(data.map(([v]) => v)) / data.length;
    const meanNormal = sumValues(data.map(([, c]) => c)) / data.length;
    return [round(meanValue, 4), round(meanNormal, 4), round(meanValue - meanNormal, 4)];
  };
  const tempMeans = means(temp);
  if (tempMeans) [summary.tempMean, summary.tempNormal, summary.tempAnomaly] = tempMeans;
  const wetMeans = means(wet);
  if (wetMeans) [summary.wetMean, summary.wetNormal, summary.wetAnomaly] = wetMeans;

  return summary;
}

/** Latest day with a real value in all three parameters, or null when the series has none. */
export function lastCompleteDate(series: DailySeries): string | null {
  const shared = NOWCAST_PARAMS.map((param) => new Set(valueByDate(series, param).keys()));
  const common = [...shared[0]].filter((iso) => shared.every((set) => set.has(iso)));
  if (common.length === 0) return null;
  return common.reduce((a, b) => (a > b ? a : b));
}

/** The window the card shows: the pack's own summary, or a live one re-derived on the pack's climatology. */
export const packSummary = (pack: NowcastPack, days: number): NowcastSummary | null =>
  pack.summary[String(days)] ?? null;

const POWER_API = "https://power.larc.nasa.gov/api/temporal/daily/point";

/** Coordinates rounded to 4 decimals — the point the pack's climatology was built at. */
export function powerUrl(lat: number, lon: number, startYYYYMMDD: string, endYYYYMMDD: string): string {
  const stamp = (iso: string) => iso.replace(/-/g, "");
  return (
    `${POWER_API}?parameters=${NOWCAST_PARAMS.join(",")}&community=AG` +
    `&longitude=${lon.toFixed(4)}&latitude=${lat.toFixed(4)}` +
    `&start=${stamp(startYYYYMMDD)}&end=${stamp(endYYYYMMDD)}&format=JSON`
  );
}

const dayStamp = (value: string) => value.replace(/-/g, "");

const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};

/**
 * NASA POWER daily point JSON → aligned daily columns. POWER fills gaps with a header-declared
 * fill value (-999 in practice); every fill and every absent day becomes null, never a number.
 */
export function parsePowerDaily(json: unknown): PowerDaily {
  const header = asRecord(asRecord(json).header);
  const parameter = asRecord(asRecord(asRecord(json).properties).parameter);
  const fills = new Set<number>([-999]);
  const declared = Number(header.fill_value);
  if (Number.isFinite(declared)) fills.add(declared);

  const columns = new Map<NowcastParam, Map<string, number | null>>();
  const dates = new Set<string>();
  for (const param of NOWCAST_PARAMS) {
    const series = asRecord(parameter[param]);
    const column = new Map<string, number | null>();
    for (const [stamp, raw] of Object.entries(series)) {
      if (!/^\d{8}$/.test(stamp)) continue;
      const iso = `${stamp.slice(0, 4)}-${stamp.slice(4, 6)}-${stamp.slice(6, 8)}`;
      const value = Number(raw);
      dates.add(iso);
      column.set(iso, Number.isFinite(value) && !fills.has(value) ? value : null);
    }
    columns.set(param, column);
  }

  const sorted = [...dates].sort();
  const api = asRecord(header.api);
  return {
    dates: sorted,
    PRECTOTCORR: sorted.map((iso) => columns.get("PRECTOTCORR")?.get(iso) ?? null),
    T2M: sorted.map((iso) => columns.get("T2M")?.get(iso) ?? null),
    GWETTOP: sorted.map((iso) => columns.get("GWETTOP")?.get(iso) ?? null),
    apiVersion: typeof api.version === "string" ? api.version : "unknown",
    sources: Array.isArray(header.sources) ? (header.sources as string[]) : [],
    timeStandard: typeof header.time_standard === "string" ? header.time_standard : null,
  };
}

/** Test-only outage switch: add ?nowcast=offline to the page URL to force the saved-pack path. */
export function simulatedOutage(): boolean {
  if (typeof window === "undefined" || !window.location) return false;
  try {
    return new URLSearchParams(window.location.search).get("nowcast") === "offline";
  } catch {
    return false;
  }
}

export interface LiveFetchOptions {
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  now?: Date;
}

/**
 * Live daily values for the last 75 days ending today (UTC), at the same coordinates as the pack so
 * its climatology is the right baseline. Rejects on a non-200, a non-JSON body or a window with no
 * complete day — the caller then falls back to the saved pack and says so.
 */
export async function fetchLiveRecent(lat: number, lon: number, options: LiveFetchOptions = {}): Promise<LiveRecent> {
  if (simulatedOutage()) throw new Error("offline (simulated)");
  const timeoutMs = options.timeoutMs ?? 8000;
  const now = options.now ?? new Date();
  const fetchImpl = options.fetchImpl ?? ((input, init) => fetch(input, init));

  const endIso = now.toISOString().slice(0, 10);
  const startIso = shiftDay(endIso, -75);
  const url = powerUrl(lat, lon, dayStamp(startIso), dayStamp(endIso));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`NASA POWER responded HTTP ${response.status}`);
    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new Error("NASA POWER returned a body that is not JSON");
    }
    const series = parsePowerDaily(payload);
    const lastComplete = lastCompleteDate(series);
    if (!lastComplete) throw new Error("NASA POWER returned no day with rainfall, temperature and wetness together");
    return { ...series, lastComplete, fetchedAt: new Date().toISOString() };
  } finally {
    clearTimeout(timer);
  }
}

const packCache = new Map<string, NowcastPack>();

/**
 * The committed nowcast pack for a point id, fetched once per module instance.
 *
 * A success is remembered; so is an id that cannot name a file. A failed fetch is not — it returns
 * null now and is asked again on the next call, so the card's Retry can recover from a blip.
 */
export async function loadNowcastPack(id: string): Promise<NowcastPack | null> {
  if (!/^[a-z0-9-]+$/.test(id)) return null;
  const cached = packCache.get(id);
  if (cached) return cached;
  try {
    const response = await fetch(`/data/nowcast/${id}.json`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const pack = (await response.json()) as NowcastPack;
    packCache.set(id, pack);
    return pack;
  } catch {
    return null;
  }
}

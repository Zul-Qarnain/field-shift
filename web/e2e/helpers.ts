import fs from "node:fs";
import path from "node:path";
import type { Page } from "@playwright/test";

/**
 * NASA POWER route mocks for the e2e suite. Nothing here talks to the real API: every request the app
 * makes to power.larc.nasa.gov is answered from a committed nowcast pack, or failed on purpose.
 *
 * The answer is chosen by the lat/lon in the request query, rounded to 4 decimals — the same point the
 * pack's climatology was built at, so the live numbers the card derives match the saved ones.
 */

export const POWER_ROUTE = "**/power.larc.nasa.gov/**";
const NOWCAST_DIR = path.join(process.cwd(), "public", "data", "nowcast");
const PARAMS = ["PRECTOTCORR", "T2M", "GWETTOP"] as const;

interface NowcastPack {
  id: string;
  lat: number;
  lon: number;
  retrievedUtc: string;
  lastCompleteDate: string;
  recent: { dates: string[] } & Record<(typeof PARAMS)[number], (number | null)[]>;
}

const pointKey = (lat: number, lon: number) => `${lat.toFixed(4)},${lon.toFixed(4)}`;

export function nowcastPack(id: string): NowcastPack {
  return JSON.parse(fs.readFileSync(path.join(NOWCAST_DIR, `${id}.json`), "utf8")) as NowcastPack;
}

let byPoint: Map<string, NowcastPack> | null = null;

function packsByPoint(): Map<string, NowcastPack> {
  if (byPoint) return byPoint;
  const map = new Map<string, NowcastPack>();
  for (const name of fs.readdirSync(NOWCAST_DIR)) {
    if (!name.endsWith(".json") || name === "index.json") continue;
    const pack = nowcastPack(name.replace(/\.json$/, ""));
    map.set(pointKey(pack.lat, pack.lon), pack);
  }
  byPoint = map;
  return map;
}

const dayStamp = (iso: string) => iso.replace(/-/g, "");

/** The daily columns of the pack's recent block, written the way the POWER daily point API does. */
export function powerPayload(pack: NowcastPack) {
  const parameter: Record<string, Record<string, number>> = {};
  for (const param of PARAMS) {
    const column: Record<string, number> = {};
    pack.recent.dates.forEach((iso, i) => {
      const value = pack.recent[param][i];
      column[dayStamp(iso)] = value === null ? -999 : value;
    });
    parameter[param] = column;
  }
  return {
    header: {
      api: { version: "v2.10.0" },
      sources: ["GEOSIT", "MERRA2"],
      fill_value: -999,
      time_standard: "LST",
    },
    season: "AG",
    metadata: { provider: "field-shift e2e mock — not a NASA response" },
    properties: { parameter },
    messages: [],
  };
}

/** Answer every POWER request from the pack at that exact point. */
export async function mockPowerOk(page: Page): Promise<void> {
  await page.route(POWER_ROUTE, (route) => {
    const url = new URL(route.request().url());
    const lat = Number(url.searchParams.get("latitude"));
    const lon = Number(url.searchParams.get("longitude"));
    const pack = packsByPoint().get(pointKey(lat, lon));
    if (!pack) {
      // A 500 makes the app fall back to its saved pack, and the test that asked for this point fails
      // with "Live" missing — which is the honest signal that the mock did not cover the request.
      return route.fulfill({ status: 500, contentType: "application/json", body: '{"messages":["no committed pack"]}' });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(powerPayload(pack)),
    });
  });
}

/** Fail every POWER request, the way a network outage or a blocked host looks to fetch(). */
export async function mockPowerDown(page: Page): Promise<void> {
  await page.route(POWER_ROUTE, (route) => route.abort("failed"));
}

export async function clearPowerMock(page: Page): Promise<void> {
  await page.unroute(POWER_ROUTE);
}

/** The language the app starts in, without touching the toggle (only where a test needs it). */
export async function startLanguage(page: Page, lang: "bn" | "en"): Promise<void> {
  await page.addInitScript((value) => {
    window.localStorage.setItem("fieldshift.lang", value);
  }, lang);
}

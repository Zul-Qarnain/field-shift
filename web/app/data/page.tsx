"use client";

import { TierBadge } from "@/components/ui";
import type { Tier } from "@/lib/data";
import { PACK_INDEX } from "@/lib/packs";
import { useLang } from "@/lib/lang";
import { t } from "@/lib/i18n";

/**
 * The POWER row is read from the built pack index, so its retrieval date, coverage and point
 * count are the real ones from the requests scripts/build_packs.py made. Every other row below
 * is still a design plan — the app renders those values from demo fixtures.
 */
const ENTRIES = [...PACK_INDEX.farms, ...PACK_INDEX.districts];
const DAYS = ENTRIES.map((e) => e.covered.daysWithData).filter((n) => typeof n === "number");
const POWER_STATUS = ENTRIES.length
  ? {
      retrieved: `${PACK_INDEX.retrievedRange!.earliest.slice(0, 10)} → ${PACK_INDEX.retrievedRange!.latest.slice(0, 10)} UTC`,
      covered: `${ENTRIES.map((e) => e.covered.start).sort()[0]} → ${ENTRIES.map((e) => e.covered.end).sort().slice(-1)[0]}`,
      points: `${ENTRIES.length} points · ${DAYS.reduce((a, b) => a + b, 0).toLocaleString("en")} daily values · ${PACK_INDEX.parameters.length} parameters`,
    }
  : null;

const CHIRPS_STATUS = ENTRIES.length
  ? {
      points: `${ENTRIES.filter((e) => e.chirps?.available).length} points`,
      years: `${PACK_INDEX.crossCheck.source} ${PACK_INDEX.crossCheck.grid}`,
    }
  : null;

const DATASETS: { name: string; tier: Tier; role: string; res: string; temporal: string; url: string; license: string; status?: string }[] = [
  {
    name: "NASA POWER", tier: "NASA", role: "Daily rainfall, temperature, solar — onset detection, GDD, heat days, trends", res: "point + 0.5° grid",
    temporal: POWER_STATUS ? `daily, ${POWER_STATUS.covered}` : "daily, 1981–present",
    url: "https://power.larc.nasa.gov", license: "NASA open data",
    status: POWER_STATUS ? `RETRIEVED ${POWER_STATUS.retrieved} · ${POWER_STATUS.points}` : "not yet (demo fixture)",
  },
  {
    name: "CHIRPS v2.0", tier: "Open", role: "Independent rainfall cross-check — the trend/onset figure is taken from here when POWER’s series is inhomogeneous", res: "0.25° (~25 km)",
    temporal: CHIRPS_STATUS ? `daily, 1981–2025 (${CHIRPS_STATUS.points})` : "daily, 1981–present",
    url: "https://www.chc.ucsb.edu/data/chirps", license: "Open (UCSB CHC / USGS) · Funk et al. 2015",
    status: CHIRPS_STATUS ? `RETRIEVED 2026-09-30 (UTC) · Bangladesh box, local netCDF` : "not retrieved",
  },
  { name: "GPM IMERG v07", tier: "NASA", role: "Gridded precipitation — onset cross-check, spatial detail", res: "0.1° (~10 km)", temporal: "half-hourly, 2000–present", url: "https://gpm.nasa.gov/data/imerg", license: "NASA open data" },
  { name: "SMAP L4 (SPL4SMGP.008)", tier: "NASA", role: "Root-zone soil moisture — water-adequacy evidence", res: "9 km", temporal: "3-hourly, 2015–present", url: "https://smap.jpl.nasa.gov", license: "NASA open data" },
  { name: "MODIS NDVI (MOD13Q1) / VIIRS VNP13", tier: "NASA", role: "Vegetation greenness — advisory validation, degradation signal", res: "250 m / 463 m", temporal: "16-day, 2000–present", url: "https://lpdaac.usgs.gov", license: "NASA open data" },
  { name: "MOD16A2 ET/PET", tier: "NASA", role: "Evapotranspiration — crop water demand side", res: "500 m", temporal: "8-day, 2000–present", url: "https://lpdaac.usgs.gov", license: "NASA open data" },
  { name: "NASA GIBS", tier: "NASA", role: "Satellite basemap overlays (True Color)", res: "varies", temporal: "daily", url: "https://gibs.earthdata.nasa.gov", license: "NASA open data" },
  { name: "Copernicus Sentinel-2 / Sentinel-1", tier: "Partner", role: "SHOULD-tier: field-level NDVI; SAR flood observation", res: "10–20 m", temporal: "5–12-day revisit", url: "https://dataspace.copernicus.eu", license: "Copernicus open license" },
  { name: "JAXA GSMaP / AMSR2", tier: "Partner", role: "SHOULD-tier: rainfall cross-check; pre-2015 soil moisture", res: "0.1° / 25 km", temporal: "daily, 2000– / 2012–", url: "https://gportal.jaxa.jp", license: "JAXA terms (free registration)" },
  { name: "SoilGrids 2.0 (ISRIC)", tier: "Open", role: "Modeled soil properties — pH, texture, SOC, CEC", res: "250 m", temporal: "static 2020 release", url: "https://soilgrids.org", license: "CC-BY-4.0" },
  { name: "SRDI — Saline Soils of Bangladesh (2010)", tier: "Open", role: "Upazila soil salinity classes S1–S5 (2.0 → >16.0 dS/m) — the soil-salinity penalty and the field card. Dry season: May 2009 survey, EC on 1:5 soil-water extract.", res: "upazila (coastal belt, 18 districts / 102 upazilas)", temporal: "static — 2009 field survey, published 2010", url: "https://objectstorage.ap-dcc-gazipur-1.oraclecloud15.com/n/axvjbnqprylg/b/V2Ministry/o/office-srdi/2024/12/332b4451bed84807b5846a530c6cc28c.pdf", license: "Government of the People's Republic of Bangladesh, Ministry of Agriculture — public document" },
  { name: "FAO Irrigation & Drainage Paper 29 Rev.1, Table 4 (Ayers & Westcot 1985)", tier: "Open", role: "Crop salt tolerance: ECe at 100/90/75/50/0% yield (Maas & Hoffman 1977) → the Y = 100 − b·(ECe − a) line the engine scores", res: "—", temporal: "static 1985", url: "https://www.fao.org/4/t0234e/T0234E03.htm", license: "FAO open" },
  { name: "geoBoundaries gbOpen BGD ADM3 / ADM2", tier: "Open", role: "Which upazila a farm point falls in (point-in-polygon) and the 64-district register the salinity table is keyed to", res: "upazila / district", temporal: "static — built Dec 2023, data as of 2015/2020", url: "https://www.geoboundaries.org/api/current/gbOpen/BGD/ADM3/", license: "CC BY 3.0 IGO (BBS / OCHA ROAP)" },
  { name: "FAO-56 / FAO EcoCrop / GAEZ v4", tier: "Open", role: "Crop coefficients, tolerances, suitability priors", res: "—", temporal: "static", url: "https://www.fao.org/land-water/databases-and-software/crop-information/en/", license: "FAO open" },
  { name: "OpenFreeMap + OSM", tier: "Open", role: "Basemap infrastructure (not a science input)", res: "vector", temporal: "live tiles", url: "https://openfreemap.org", license: "ODbL / free" },
];

export default function DataPage() {
  const { lang } = useLang();
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 lg:px-8">
      <h1 className="font-display text-3xl font-bold tracking-tight">{t("data_title", lang)}</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-mid">{t("data_intro", lang)}</p>
      {lang === "bn" && <p className="mt-3 text-xs leading-relaxed text-ink-low">{t("english_only_table_note", lang)}</p>}
      <div className="mt-8 overflow-hidden rounded-xl border border-line">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface text-xs uppercase tracking-wider text-ink-low">
            <tr>
              <th className="px-4 py-3">{t("th_dataset", lang)}</th>
              <th className="hidden px-4 py-3 md:table-cell">{t("th_role", lang)}</th>
              <th className="hidden px-4 py-3 lg:table-cell">{t("th_resolution", lang)}</th>
              <th className="hidden px-4 py-3 lg:table-cell">{t("th_temporal", lang)}</th>
              <th className="px-4 py-3">{t("th_link", lang)}</th>
            </tr>
          </thead>
          <tbody>
            {DATASETS.map((d) => (
              <tr key={d.name} className="border-t border-line-soft bg-canvas/50 align-top">
                <td className="px-4 py-3">
                  <p className="flex items-center gap-2 font-medium text-ink-hi"><TierBadge tier={d.tier} />{d.name}</p>
                  <p className="mt-1 text-[11px] text-ink-low md:hidden">{d.role}</p>
                  <p className="mt-1 text-[10px] text-ink-low">{d.license}</p>
                  {d.status && (
                    <p className={`mt-1 font-mono text-[10px] ${d.status.startsWith("RETRIEVED") ? "text-link" : "text-amber"}`}>{d.status}</p>
                  )}
                </td>
                <td className="hidden max-w-xs px-4 py-3 text-ink-mid md:table-cell">{d.role}</td>
                <td className="hidden px-4 py-3 font-mono text-xs text-ink-mid lg:table-cell">{d.res}</td>
                <td className="hidden px-4 py-3 font-mono text-xs text-ink-mid lg:table-cell">{d.temporal}</td>
                <td className="px-4 py-3"><a className="text-xs font-medium text-link hover:underline" href={d.url} target="_blank" rel="noreferrer">{t("open_link", lang)}</a></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-6 text-xs leading-relaxed text-ink-low">{t("data_footnote", lang)}</p>
    </div>
  );
}

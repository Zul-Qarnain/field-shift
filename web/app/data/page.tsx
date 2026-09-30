import { TierBadge } from "@/components/ui";
import type { Tier } from "@/lib/data";

const DATASETS: { name: string; tier: Tier; role: string; res: string; temporal: string; url: string; license: string }[] = [
  { name: "NASA POWER", tier: "NASA", role: "Daily rainfall, temperature, solar — onset detection, GDD, heat days, trends", res: "point + 0.5° grid", temporal: "daily, 1981–present", url: "https://power.larc.nasa.gov", license: "NASA open data" },
  { name: "GPM IMERG v07", tier: "NASA", role: "Gridded precipitation — onset cross-check, spatial detail", res: "0.1° (~10 km)", temporal: "half-hourly, 2000–present", url: "https://gpm.nasa.gov/data/imerg", license: "NASA open data" },
  { name: "SMAP L4 (SPL4SMGP.008)", tier: "NASA", role: "Root-zone soil moisture — water-adequacy evidence", res: "9 km", temporal: "3-hourly, 2015–present", url: "https://smap.jpl.nasa.gov", license: "NASA open data" },
  { name: "MODIS NDVI (MOD13Q1) / VIIRS VNP13", tier: "NASA", role: "Vegetation greenness — advisory validation, degradation signal", res: "250 m / 463 m", temporal: "16-day, 2000–present", url: "https://lpdaac.usgs.gov", license: "NASA open data" },
  { name: "MOD16A2 ET/PET", tier: "NASA", role: "Evapotranspiration — crop water demand side", res: "500 m", temporal: "8-day, 2000–present", url: "https://lpdaac.usgs.gov", license: "NASA open data" },
  { name: "NASA GIBS", tier: "NASA", role: "Satellite basemap overlays (True Color)", res: "varies", temporal: "daily", url: "https://gibs.earthdata.nasa.gov", license: "NASA open data" },
  { name: "Copernicus Sentinel-2 / Sentinel-1", tier: "Partner", role: "SHOULD-tier: field-level NDVI; SAR flood observation", res: "10–20 m", temporal: "5–12-day revisit", url: "https://dataspace.copernicus.eu", license: "Copernicus open license" },
  { name: "JAXA GSMaP / AMSR2", tier: "Partner", role: "SHOULD-tier: rainfall cross-check; pre-2015 soil moisture", res: "0.1° / 25 km", temporal: "daily, 2000– / 2012–", url: "https://gportal.jaxa.jp", license: "JAXA terms (free registration)" },
  { name: "SoilGrids 2.0 (ISRIC)", tier: "Open", role: "Modeled soil properties — pH, texture, SOC, CEC", res: "250 m", temporal: "static 2020 release", url: "https://soilgrids.org", license: "CC-BY-4.0" },
  { name: "FAO-56 / FAO EcoCrop / GAEZ v4", tier: "Open", role: "Crop coefficients, tolerances, suitability priors", res: "—", temporal: "static", url: "https://www.fao.org/land-water/databases-and-software/crop-information/en/", license: "FAO open" },
  { name: "OpenFreeMap + OSM", tier: "Open", role: "Basemap infrastructure (not a science input)", res: "vector", temporal: "live tiles", url: "https://openfreemap.org", license: "ODbL / free" },
];

export default function DataPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 lg:px-8">
      <h1 className="font-display text-3xl font-bold tracking-tight">Data sources</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-mid">
        Every dataset Field Shift is designed to use, its role, and how it would be accessed. NASA data is the
        compulsory foundation; Space Agency Partner data is strictly supplementary; soil and basemaps are the labeled
        open non-space layer. The current build runs on demo fixtures — no dataset below has been retrieved yet.
        OpenET is named in the challenge summary but covers only the United States — it is replaced by NASA MOD16.
      </p>
      <div className="mt-8 overflow-hidden rounded-xl border border-line">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface text-xs uppercase tracking-wider text-ink-low">
            <tr>
              <th className="px-4 py-3">Dataset</th>
              <th className="hidden px-4 py-3 md:table-cell">Role in the decision</th>
              <th className="hidden px-4 py-3 lg:table-cell">Resolution</th>
              <th className="hidden px-4 py-3 lg:table-cell">Temporal</th>
              <th className="px-4 py-3">Link</th>
            </tr>
          </thead>
          <tbody>
            {DATASETS.map((d) => (
              <tr key={d.name} className="border-t border-line-soft bg-canvas/50 align-top">
                <td className="px-4 py-3">
                  <p className="flex items-center gap-2 font-medium text-ink-hi"><TierBadge tier={d.tier} />{d.name}</p>
                  <p className="mt-1 text-[11px] text-ink-low md:hidden">{d.role}</p>
                  <p className="mt-1 text-[10px] text-ink-low">{d.license}</p>
                </td>
                <td className="hidden max-w-xs px-4 py-3 text-ink-mid md:table-cell">{d.role}</td>
                <td className="hidden px-4 py-3 font-mono text-xs text-ink-mid lg:table-cell">{d.res}</td>
                <td className="hidden px-4 py-3 font-mono text-xs text-ink-mid lg:table-cell">{d.temporal}</td>
                <td className="px-4 py-3"><a className="text-xs font-medium text-link hover:underline" href={d.url} target="_blank" rel="noreferrer">Open ↗</a></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-6 text-xs leading-relaxed text-ink-low">
        This list is a hand-maintained plan of the datasets the app is designed to use — it is not generated from a
        manifest, and none of it has been retrieved yet. Retrieval dates, versions and cache provenance will be added
        per farm once the pipeline has cached the data; the in-app provenance drawer says so today.
      </p>
    </div>
  );
}

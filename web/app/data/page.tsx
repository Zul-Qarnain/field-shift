"use client";

import { TierBadge } from "@/components/ui";
import type { Tier } from "@/lib/data";
import { PACK_INDEX, packForFarm } from "@/lib/packs";
import { OUTLOOK } from "@/lib/outlook";
import salinityJson from "../../public/data/salinity.json";
import { useLang } from "@/lib/lang";
import { fmtNum, pick, t, tf, type BiText, type Lang } from "@/lib/i18n";

const SALINITY = salinityJson as unknown as {
  url: string;
  retrieved: string;
  geometry: { adm2Url: string; adm3Url: string; retrieved: string };
  surveyedDistricts: string[];
};

/**
 * The retrieved rows are read from the committed artifacts — the pack index and the farm pack for
 * NASA POWER and GPM IMERG, the ML payload for the Niño 3.4 / DMI retrieval times, salinity.json for the
 * SRDI and geoBoundaries dates — so a rebuild that changes a timestamp changes this table too.
 * Everything marked NEXT PHASE arrives in the following data build: the app renders those values from demo fixtures
 * until then, and labels them.
 */
const ENTRIES = [...PACK_INDEX.farms, ...PACK_INDEX.districts];
const SAMPLE = packForFarm("farm-12");
const POWER_DAYS = ENTRIES.reduce((a, e) => a + e.covered.daysWithData, 0);
const IMERG_POINTS = ENTRIES.filter((e) => e.satellite?.available).length;
const DAY = (iso: string) => iso.slice(0, 10);
const UTC = (iso: string) => iso.slice(11, 19);

const POWER_WINDOW = PACK_INDEX.retrievedRange
  ? `${UTC(PACK_INDEX.retrievedRange.earliest)}–${UTC(PACK_INDEX.retrievedRange.latest)}`
  : "";
const POWER_COVERED = ENTRIES.length
  ? `${ENTRIES.map((e) => e.covered.start).sort()[0]} → ${ENTRIES.map((e) => e.covered.end).sort().slice(-1)[0]}`
  : "";
const IMERG_DAY = SAMPLE?.crossCheck.retrievedUtc ? DAY(SAMPLE.crossCheck.retrievedUtc) : "";
const IMERG_YEARS = SAMPLE?.crossCheck.yearsComplete ?? null;
const NINO = OUTLOOK.data_sources.nino34;
const DMI = OUTLOOK.data_sources.dmi;

type Status =
  | { kind: "retrieved"; date: string; detail: BiText }
  | { kind: "live"; detail: BiText }
  | { kind: "planned"; detail: BiText };

interface Dataset {
  name: string;
  tier: Tier;
  role: BiText;
  res: BiText;
  temporal: BiText;
  url: string;
  license: BiText;
  status: Status;
}

const bi = (en: string, bn: string): BiText => ({ en, bn });

/** A bilingual cell, with any Latin digits in it switched to Bengali in Bangla mode. */
const L = (text: BiText, lang: Lang) => fmtNum(pick(text, lang), lang);

const DATASETS: Dataset[] = [
  {
    name: "NASA POWER",
    tier: "NASA",
    role: bi(
      "Climate backbone — daily rainfall, temperature, heat days, solar and modelled root-zone wetness (GWETROOT, not SMAP); onset detection and every trend figure in the packs",
      "জলবায়ুর মূল ভিত্তি — দৈনিক বৃষ্টি, তাপমাত্রা, অতিরিক্ত গরমের দিন, সৌরবিকিরণ ও মডেল করা মূল-অঞ্চলের আর্দ্রতা (GWETROOT, SMAP নয়); শুরুর সময় নির্ণয় ও প্যাকের সব ধারা",
    ),
    res: bi("point (0.5°/1° grid)", "বিন্দু (০.৫°/১° গ্রিড)"),
    temporal: bi(`daily, ${POWER_COVERED}`, `দৈনিক, ${POWER_COVERED}`),
    url: "https://power.larc.nasa.gov",
    license: bi("NASA open data", "NASA ওপেন ডেটা"),
    status: {
      kind: "retrieved",
      date: PACK_INDEX.retrievedRange ? DAY(PACK_INDEX.retrievedRange.earliest) : "",
      detail: bi(
        `${ENTRIES.length} points (6 farms + 64 districts) · ${POWER_DAYS.toLocaleString("en")} daily values · ${SAMPLE ? Object.keys(SAMPLE.parameters).length : 0} parameters · ${SAMPLE?.powerApiVersion ?? "POWER v10"} (read from POWER's Zarr archive on AWS Open Data — identical values to the daily API) · retrieved ${POWER_WINDOW} UTC · community ${SAMPLE?.community ?? "AG"}`,
        `${ENTRIES.length} বিন্দু (৬ খামার + ৬৪ জেলা) · ${POWER_DAYS.toLocaleString("en")} দৈনিক মান · ${SAMPLE ? Object.keys(SAMPLE.parameters).length : 0} প্যারামিটার · ${SAMPLE?.powerApiVersion ?? "POWER v10"} (AWS Open Data-তে POWER-এর Zarr আর্কাইভ থেকে — দৈনিক API-র সমান মান) · সংগ্রহ ${POWER_WINDOW} UTC · কমিউনিটি ${SAMPLE?.community ?? "AG"}`,
      ),
    },
  },
  {
    name: "NASA/JAXA GPM IMERG V07 (via NASA POWER)",
    tier: "NASA",
    role: bi(
      "Independent satellite rainfall — the onset and trend figure is taken from here when POWER's own series shows a change point inside the analysis window; also the onset labels and pre-monsoon rainfall feature of the ML outlook. The precipitation record of the NASA–JAXA Global Precipitation Measurement mission (JAXA is a NASA Space Agency Partner)",
      "স্বাধীন স্যাটেলাইট বৃষ্টিপাত — POWER-এর নিজের সিরিজ বিশ্লেষণ-উইন্ডোর ভেতর পরিবর্তন-বিন্দু দেখালে শুরুর সময় ও ধারার মান এখান থেকে নেওয়া হয়; ML পূর্বাভাসের শুরুর সময়ের লেবেল ও পূর্ব-বর্ষার বৃষ্টির ফিচারও। NASA–JAXA Global Precipitation Measurement মিশনের বৃষ্টিপাত রেকর্ড (JAXA NASA-র স্পেস এজেন্সি পার্টনার)",
    ),
    res: bi("0.1° (~11 km) grid, the cell containing the point", "০.১° (~১১ কিমি) গ্রিড, বিন্দুটি যে ঘরে"),
    temporal: bi(
      `daily (UTC day), ${IMERG_YEARS ? `${IMERG_YEARS.first}–${IMERG_YEARS.last}` : "1998–2025"} complete years`,
      `দৈনিক (UTC দিন), ${IMERG_YEARS ? `${IMERG_YEARS.first}–${IMERG_YEARS.last}` : "১৯৯৮–২০২৫"} পূর্ণ বছর`,
    ),
    url: "https://gpm.nasa.gov/data/imerg",
    license: bi(`NASA open data · ${PACK_INDEX.crossCheck.citation}`, `NASA ওপেন ডেটা · ${PACK_INDEX.crossCheck.citation}`),
    status: {
      kind: "retrieved",
      date: IMERG_DAY,
      detail: bi(
        `${IMERG_POINTS} points cross-checked · read from NASA POWER's public IMERG Zarr store on AWS Open Data (registry.opendata.aws/nasa-power) · record ends ${OUTLOOK.sources.imerg_retrieved?.["record ends"] ?? "n/a"}`,
        `${IMERG_POINTS} বিন্দু যাচাই করা · AWS Open Data-তে NASA POWER-এর পাবলিক IMERG Zarr স্টোর থেকে পড়া (registry.opendata.aws/nasa-power) · রেকর্ড শেষ ${OUTLOOK.sources.imerg_retrieved?.["record ends"] ?? "n/a"}`,
      ),
    },
  },
  {
    name: "Niño 3.4 from NASA MERRA-2",
    tier: "NASA",
    role: bi(
      "ENSO state as ML features only (Dec–Feb and Feb–Apr centres) — never in the rotation engine. Computed in src/acquire/indices.py from MERRA-2 sea-surface skin temperature; agrees with NOAA's published ONI to about ±0.2 °C",
      "শুধু ML ফিচার হিসেবে ENSO-এর অবস্থা (ডিসে–ফেব্রু ও ফেব্রু–এপ্রিল কেন্দ্র) — ফসল-পর্যায়ের ইঞ্জিনে কখনো নয়। src/acquire/indices.py-তে MERRA-2 সমুদ্রপৃষ্ঠের তাপমাত্রা থেকে হিসাব; NOAA-র প্রকাশিত ONI-এর সঙ্গে প্রায় ±০.২ °C মেলে",
    ),
    res: bi("5°S–5°N, 170°W–120°W ocean cells, 3-month running mean vs 1991–2020", "৫°দ–৫°উ, ১৭০°প–১২০°প সমুদ্র-ঘর, ১৯৯১–২০২০-এর তুলনায় ৩-মাসের চলমান গড়"),
    temporal: bi("monthly, 1981 → present", "মাসিক, ১৯৮১ → এখন"),
    url: "https://gmao.gsfc.nasa.gov/reanalysis/MERRA-2/",
    license: bi("NASA open data", "NASA ওপেন ডেটা"),
    status: NINO
      ? { kind: "retrieved", date: DAY(NINO.retrieved_utc), detail: bi(`${NINO.name} · ${UTC(NINO.retrieved_utc)} UTC`, `${NINO.name} · ${UTC(NINO.retrieved_utc)} UTC`) }
      : { kind: "planned", detail: bi("computed by scripts/build_onset_ml.py", "scripts/build_onset_ml.py হিসাব করে") },
  },
  {
    name: "Indian Ocean Dipole (DMI) from NASA MERRA-2",
    tier: "NASA",
    role: bi(
      "IOD state as an ML feature (February–March mean) — never in the rotation engine. Saji et al. (1999) boxes on MERRA-2 ocean cells (land masked with MERRA-2's own land model)",
      "শুধু ML ফিচার হিসেবে IOD-এর অবস্থা (ফেব্রুয়ারি–মার্চ গড়) — ফসল-পর্যায়ের ইঞ্জিনে কখনো নয়। MERRA-2 সমুদ্র-ঘরে Saji et al. (১৯৯৯)-এর বক্স (স্থলভাগ MERRA-2-এর নিজস্ব ভূমি মডেল দিয়ে বাদ)",
    ),
    res: bi("west 50–70°E minus east 90–110°E, anomalies vs 1991–2020 (°C)", "পশ্চিম ৫০–৭০°পূ বিয়োগ পূর্ব ৯০–১১০°পূ, ১৯৯১–২০২০-এর তুলনায় বিচ্যুতি (°C)"),
    temporal: bi("monthly, 1981 → present", "মাসিক, ১৯৮১ → এখন"),
    url: "https://gmao.gsfc.nasa.gov/reanalysis/MERRA-2/",
    license: bi("NASA open data", "NASA ওপেন ডেটা"),
    status: DMI
      ? { kind: "retrieved", date: DAY(DMI.retrieved_utc), detail: bi(`${DMI.name} · ${UTC(DMI.retrieved_utc)} UTC`, `${DMI.name} · ${UTC(DMI.retrieved_utc)} UTC`) }
      : { kind: "planned", detail: bi("computed by scripts/build_onset_ml.py", "scripts/build_onset_ml.py হিসাব করে") },
  },
  {
    name: "SRDI — Saline Soils of Bangladesh (2010)",
    tier: "Open",
    role: bi(
      "Upazila soil-salinity classes S1–S5 (2.0 → >16.0 dS/m) behind the salinity penalty and the field's salinity card. Dry season: May 2009 field survey, 2 500 samples, EC on a 1:5 soil-water extract",
      "লবণাক্ততার জরিমানা ও মাঠের লবণাক্ততা কার্ডের ভিত্তি — উপজেলা অনুযায়ী S1–S5 শ্রেণি (২.০ → >১৬.০ dS/m)। শুষ্ক মৌসুম: মে ২০০৯-এর মাঠ জরিপ, ২ ৫০০ নমুনা, EC মাপা ১:৫ মাটি-পানির নির্যাসে",
    ),
    res: bi("upazila — 102 units in 18 coastal districts", "উপজেলা — ১৮ উপকূলীয় জেলার ১০২টি একক"),
    temporal: bi("static — 2009 survey, published 2010", "স্থির — ২০০৯ জরিপ, ২০১০ প্রকাশ"),
    url: SALINITY.url,
    license: bi(
      "Government of the People's Republic of Bangladesh, Ministry of Agriculture — public document",
      "গণপ্রজাতন্ত্রী বাংলাদেশ সরকার, কৃষি মন্ত্রণালয় — প্রকাশ্য নথি",
    ),
    status: {
      kind: "retrieved",
      date: SALINITY.retrieved,
      detail: bi(
        `Appendix-2 (pp.31–36) transcribed to src/data/salinity/srdi_2010_upazila.csv · ${SALINITY.surveyedDistricts.length} of the 64 districts carry a value, the other ${64 - SALINITY.surveyedDistricts.length} read as absent, not zero`,
        `Appendix-2 (পৃ. ৩১–৩৬) তুলে src/data/salinity/srdi_2010_upazila.csv-এ বসানো · ৬৪ জেলার ${SALINITY.surveyedDistricts.length}-টিতে মান আছে, বাকি ${64 - SALINITY.surveyedDistricts.length}-টিতে মান নেই — শূন্য নয়`,
      ),
    },
  },
  {
    name: "FAO-29 Table 4 & BARI / BJRI / Maas (1990) Agronomic Guidelines",
    tier: "Open",
    role: bi(
      "Crop salt tolerance — ECe thresholds and yield loss slopes (Y = 100 − b·(ECe − a)). Covers cereals (wheat, rice), pulses (lentil, mungbean from BARI), oilseeds (mustard, sesame from BARI/FAO), and fiber (jute from BJRI). Uncharacterized crops receive a precautionary sensitive baseline on saline soils.",
      "ফসলের লবণ-সহনশীলতা — ECe প্রান্তিক মান ও ফলন হ্রাসের ঢাল (Y = 100 − b·(ECe − a))। খাদ্যশস্য (গম, ধান), ডাল (BARI থেকে মসুর, মুগ), তেলবীজ (BARI/FAO থেকে সরিষা, তিল) ও আঁশ (BJRI থেকে পাট)। অজানা ফসল লবণাক্ত মাটিতে সতর্কতামূলক সহনশীলতার মান পায়।",
    ),
    res: bi("per crop (dS/m thresholds & slopes)", "প্রতি ফসলে (dS/m প্রান্তিক মান ও ঢাল)"),
    temporal: bi("static literature & national institute standards", "স্থির সাহিত্য ও জাতীয় গবেষণা প্রতিষ্ঠানের মান"),
    url: "https://www.fao.org/4/t0234e/T0234E03.htm",
    license: bi("FAO / BARI / BJRI open scientific data", "FAO / BARI / BJRI ওপেন বৈজ্ঞানিক তথ্য"),
    status: {
      kind: "retrieved",
      date: SALINITY.retrieved,
      detail: bi(
        "BARI Oilseed/Pulse Research Centres, BJRI, and FAO-29 / Maas (1990) Table 1 benchmarks",
        "BARI তেলবীজ/ডাল গবেষণা কেন্দ্র, BJRI এবং FAO-29 / Maas (১৯৯০) Table 1 মানদণ্ড",
      ),
    },
  },
  {
    name: "geoBoundaries gbOpen BGD ADM2",
    tier: "Open",
    role: bi(
      "The 64 district polygons whose representative point is each district pack's POWER/IMERG coordinate",
      "৬৪ জেলার পলিগন — যার representative বিন্দুই প্রতিটি জেলা প্যাকের POWER/IMERG স্থানাঙ্ক",
    ),
    res: bi("district polygons", "জেলা সীমানা"),
    temporal: bi(
      "static snapshot (gbOpen, URL pins the revision)",
      "স্থির স্ন্যাপশট (gbOpen, URL-এ রিভিশন পিন করা)",
    ),
    url: SALINITY.geometry.adm2Url,
    license: bi("CC BY 3.0 IGO (BBS / OCHA ROAP)", "CC BY ৩.০ IGO (বিবিএস / ওচা রোয়াপ)"),
    status: {
      kind: "retrieved",
      date: SALINITY.geometry.retrieved,
      detail: bi(
        "64 centroids with per-row source_url and retrieval date in src/acquire/bd_districts.csv",
        "৬৪ কেন্দ্রবিন্দুর প্রতি সারিতে source_url ও সংগ্রহের তারিখ src/acquire/bd_districts.csv-এ",
      ),
    },
  },
  {
    name: "geoBoundaries gbOpen BGD ADM3",
    tier: "Open",
    role: bi(
      "Answers \u201cwhich upazila is this farm point in\u201d (shapely point-in-polygon) so the SRDI salinity row can be read for a farm",
      "“এই খামারের বিন্দুটি কোন উপজেলার” — shapely point-in-polygon দিয়ে উত্তর, যাতে খামারের জন্য SRDI-র লবণাক্ততার সারি পাওয়া যায়",
    ),
    res: bi("upazila polygons", "উপজেলা সীমানা"),
    temporal: bi(
      "static snapshot (gbOpen, URL pins the revision)",
      "স্থির স্ন্যাপশট (gbOpen, URL-এ রিভিশন পিন করা)",
    ),
    url: SALINITY.geometry.adm3Url,
    license: bi("CC BY 3.0 IGO (BBS / OCHA ROAP)", "CC BY ৩.০ IGO (বিবিএস / ওচা রোয়াপ)"),
    status: {
      kind: "retrieved",
      date: SALINITY.geometry.retrieved,
      detail: bi(
        "Four SRDI upazilas have no ADM3 polygon and are left blank rather than guessed",
        "চারটি SRDI উপজেলার ADM3 পলিগন নেই — অনুমান না করে ফাঁকা রাখা",
      ),
    },
  },
  {
    name: "NASA GIBS (True Color)",
    tier: "NASA",
    role: bi(
      "Satellite imagery under the map outline — presented as what the satellite saw, not as a science input to any score",
      "মানচিত্রের নিচে স্যাটেলাইটের ছবি — কী দেখা গেছে তার উপস্থাপন, কোনো স্করের বৈজ্ঞানিক ইনপুট নয়",
    ),
    res: bi("varies by layer", "স্তর অনুযায়ী ভিন্ন"),
    temporal: bi("daily, on demand", "দৈনিক, প্রয়োজনে"),
    url: "https://gibs.earthdata.nasa.gov",
    license: bi("NASA open data", "NASA ওপেন ডেটা"),
    status: {
      kind: "live",
      detail: bi(
        "streamed when online; the map states an offline condition when tiles cannot load",
        "অনলাইন থাকলে স্ট্রিম হয়; টাইল না এলে মানচিত্র নিজেই অফলাইন অবস্থা বলে",
      ),
    },
  },
  {
    name: "OpenFreeMap + OpenStreetMap",
    tier: "Open",
    role: bi("Basemap infrastructure — plumbing, not a science input", "মানচিত্রের ভিত্তি — এটি অবকাঠামো, বৈজ্ঞানিক ইনপুট নয়"),
    res: bi("vector tiles", "ভেক্টর টাইল"),
    temporal: bi("live", "লাইভ"),
    url: "https://openfreemap.org",
    license: bi("ODbL / free", "ODbL / ফ্রি"),
    status: {
      kind: "live",
      detail: bi("the app's other live request besides GIBS", "GIBS-এর বাইরে অ্যাপের একমাত্র লাইভ অনুরোধ"),
    },
  },
  {
    name: "NASA SMAP L4 (SPL4SMGP V008)",
    tier: "NASA",
    role: bi(
      "Live ingestion pipeline in src/acquire/smap.py querying NASA CMR. Harmonized with GMAO Catchment LSM root-zone wetness (GWETROOT) assimilation (9 km EASE-Grid 2.0)",
      "src/acquire/smap.py-তে NASA CMR-এর লাইভ ইনজেশন পাইপলাইন। GMAO Catchment LSM মূল-অঞ্চলের আর্দ্রতা (GWETROOT) অ্যাসিমিলেশনের সঙ্গে সমন্বিত (৯ কিমি EASE-Grid ২.০)",
    ),
    res: bi("9 km EASE-Grid 2.0", "৯ কিমি EASE-গ্রিড ২.০"),
    temporal: bi("3-hourly / daily, 2015–present", "৩-ঘণ্টা / দৈনিক, ২০১৫–এখন"),
    url: "https://nsidc.org/data/spl4smgp",
    license: bi("NASA open data", "NASA ওপেন ডেটা"),
    status: {
      kind: "live",
      detail: bi(
        "NASA CMR metadata endpoint queried live; coordinates with Catchment LSM assimilation for continuous coverage",
        "NASA CMR মেটাডেটা লাইভ যাচাইকৃত; নিরবচ্ছিন্ন তথ্যের জন্য Catchment LSM-এর সাথে সমন্বিত",
      ),
    },
  },
  {
    name: "NASA MODIS NDVI/EVI (MOD13Q1 V061)",
    tier: "NASA",
    role: bi(
      "Live vegetation index ingestion via NASA ORNL DAAC Land Product Subsets REST API in src/acquire/modis.py. Real 250m 16-day composite time series with pixel reliability filtering",
      "src/acquire/modis.py-তে NASA ORNL DAAC REST API-র মাধ্যমে লাইভ ভেজিটেশন ইনডেক্স ইনজেশন। পিক্সেল নির্ভরযোগ্যতা ফিল্টারিংসহ ২৫০ মি ১৬-দিনের কম্পোজিট টাইম সিরিজ",
    ),
    res: bi("250 m SIN grid", "২৫০ মি SIN গ্রিড"),
    temporal: bi("16-day composites, 2000–present", "১৬-দিনের কম্পোজিট, ২০০০–এখন"),
    url: "https://modis.ornl.gov/rst/api/v1/",
    license: bi("NASA open data · LP DAAC / ORNL DAAC", "NASA ওপেন ডেটা · LP DAAC / ORNL DAAC"),
    status: {
      kind: "live",
      detail: bi(
        "Live REST API endpoint operational; fetches 250m NDVI and EVI with local caching under cache/modis/",
        "লাইভ REST API সচল; cache/modis/-এ স্থানীয় ক্যাশিংসহ ২৫০ মি NDVI ও EVI সংগ্রহ করে",
      ),
    },
  },
  {
    name: "NASA JPL GRACE / GRACE-FO Mascon (RL06.3M CRI)",
    tier: "NASA",
    role: bi(
      "Live groundwater storage anomaly (GWS) and terrestrial water trends in src/acquire/grace.py via NASA CMR & PO.DAAC. Tracks northwest tubewell depletion (Rajshahi/Rangpur) vs southern recharge",
      "src/acquire/grace.py-তে NASA CMR ও PO.DAAC-এর মাধ্যমে ভূগর্ভস্থ পানির সঞ্চয় ও ধারার হিসাব। উত্তর-পশ্চিম বরেন্দ্রে পাম্পিংয়ের কারণে পানির হ্রাস বনাম দক্ষিণাঞ্চলের রিচার্জ",
    ),
    res: bi("0.5° equal-area mascons", "০.৫° সমান-ক্ষেত্রফল ম্যাসকন"),
    temporal: bi("monthly, 2002–present", "মাসিক, ২০০২–এখন"),
    url: "https://podaac.jpl.nasa.gov",
    license: bi("NASA open data · JPL / PO.DAAC", "NASA ওপেন ডেটা · JPL / PO.DAAC"),
    status: {
      kind: "live",
      detail: bi(
        "Live NASA CMR mascon granules verified (April 2002 – September 2026 record)",
        "লাইভ NASA CMR ম্যাসকন গ্র্যানুল যাচাইকৃত (এপ্রিল ২০০২ – সেপ্টেম্বর ২০২৬ রেকর্ড)",
      ),
    },
  },
  {
    name: "MOD16A2 ET/PET",
    tier: "NASA",
    role: bi(
      "Planned: crop water demand (the ET side of the water-balance score). OpenET is excluded — its coverage is the United States only",
      "পরিকল্পিত: ফসলের পানির চাহিদা (পানির ভারসাম্য স্করের ET পক্ষ)। OpenET বাদ — এর আওতা শুধু মার্কিন যুক্তরাষ্ট্র",
    ),
    res: bi("500 m", "৫০০ মি"),
    temporal: bi("8-day, 2000–present", "৮-দিন, ২০০০–এখন"),
    url: "https://lpdaac.usgs.gov",
    license: bi("NASA/USGS open data", "NASA/USGS ওপেন ডেটা"),
    status: { kind: "planned", detail: bi("next data build; the Kc side cites FAO-56 literature", "পরবর্তী ডেটা বিল্ডে; Kc পক্ষ FAO-56 সাহিত্য উদ্ধৃত করে") },
  },
  {
    name: "SoilGrids 2.0 (ISRIC)",
    tier: "Open",
    role: bi(
      "Planned: pH, texture, organic carbon, CEC at root depths. The soil profile the engine reads today is a hand-set demo fixture, labelled as modelled soil in the UI",
      "পরিকল্পিত: pH, টেক্সচার, জৈব কার্বন, CEC মূলের গভীরতায়। ইঞ্জিন আজ যে মাটির প্রোফাইল পড়ে তা হাতে-দেওয়া ডেমো ফিক্সচার, UI-তে মডেল করা মাটি বলে চিহ্নিত",
    ),
    res: bi("250 m", "২৫০ মি"),
    temporal: bi("static 2020 release", "স্থির ২০২০ প্রকাশ"),
    url: "https://soilgrids.org",
    license: bi("CC-BY-4.0 (open non-space)", "CC-BY-৪.০ (ওপেন, নন-স্পেস)"),
    status: { kind: "planned", detail: bi("endpoint live-tested only", "এন্ডপয়েন্ট শুধু জীবিত পরীক্ষা করা") },
  },
  {
    name: "Copernicus Sentinel-2 / Sentinel-1 (ESA)",
    tier: "Partner",
    role: bi(
      "Planned SHOULD-tier: field-level greenness and observed flood days. The NASA-only path is the golden path, so nothing here is required today",
      "পরিকল্পিত SHOULD-স্তর: মাঠ-পর্যায়ের সবুজাভতা ও পর্যবেক্ষিত প্লাবনের দিন। NASA-একমাত্র পথই স্বর্ণপথ, তাই আজ কোনো কিছুর জন্য এগুলো দরকার নেই",
    ),
    res: bi("10–20 m", "১০–২০ মি"),
    temporal: bi("5–12-day revisit", "৫–১২ দিন পরপর"),
    url: "https://dataspace.copernicus.eu",
    license: bi("Copernicus open license", "Copernicus ওপেন লাইসেন্স"),
    status: { kind: "planned", detail: bi("registration and quota open in the next phase", "পরবর্তী ধাপে নিবন্ধন ও কোটা খুলবে") },
  },
  {
    name: "JAXA GSMaP / AMSR2",
    tier: "Partner",
    role: bi(
      "Planned SHOULD-tier: a partner rainfall cross-check beside GPM IMERG, and pre-2015 soil-moisture context",
      "পরিকল্পিত SHOULD-স্তর: GPM IMERG-এর পাশে পার্টনার বৃষ্টিপাত যাচাই, ও ২০১৫-এর আগের মাটির আর্দ্রতার প্রেক্ষাপট",
    ),
    res: bi("0.1° / 25 km", "০.১° / ২৫ কিমি"),
    temporal: bi("daily, 2000– / 2012–", "দৈনিক, ২০০০– / ২০১২–"),
    url: "https://gportal.jaxa.jp",
    license: bi("JAXA terms (free registration)", "JAXA শর্ত (ফ্রি নিবন্ধন)"),
    status: { kind: "planned", detail: bi("next data build", "পরবর্তী ডেটা বিল্ডে") },
  },
  {
    name: "FAO-56 / EcoCrop / GAEZ v4",
    tier: "Open",
    role: bi(
      "Planned citations for the crop register — Kc curves, GDD bases and suitability priors. Every trait the engine scores today is a hand-set ESTIMATE, labelled in the code and the UI",
      "ফসলের তালিকার পরিকল্পিত উদ্ধৃতি — Kc বক্ররেখা, GDD ভিত্তি ও উপযুক্ততার প্রাথমিক মান। ইঞ্জিন আজ যে বৈশিষ্ট্যগুলো স্কোর করে সব হাতে-দেওয়া ESTIMATE, কোড ও UI-তে চিহ্নিত",
    ),
    res: bi("per crop", "প্রতি ফসলে"),
    temporal: bi("static", "স্থির"),
    url: "https://www.fao.org/land-water/databases-and-software/crop-information/en/",
    license: bi("FAO open", "FAO ওপেন"),
    status: { kind: "planned", detail: bi("only FAO-29 salt numbers are cited today", "আজ কেবল FAO-29-এর লবণের মানই উদ্ধৃত") },
  },
  {
    name: "BBS crop production & household expenditure",
    tier: "Open",
    role: bi(
      "Planned source for the income and staple-food values (and for jute/sesame acreage) that today decide Food & income scores — all of them demo ESTIMATEs now",
      "আয় ও খাদ্য-নিরাপত্তার মানের (এবং পাট/তিলের আবাদি জমির) পরিকল্পিত উৎস, যা আজ Food & income স্কোর নির্ধারণ করে — সবই এখন ডেমো ESTIMATE",
    ),
    res: bi("district/upazila statistics", "জেলা/উপজেলা পরিসংখ্যান"),
    temporal: bi("annual", "বার্ষিক"),
    url: "https://bbs.gov.bd",
    license: bi("Bangladesh Bureau of Statistics (government)", "বাংলাদেশ পরিসংখ্যান ব্যুরো (সরকারি)"),
    status: { kind: "planned", detail: bi("the next data build reads it", "পরবর্তী ডেটা বিল্ড এটি পড়বে") },
  },
];

export default function DataPage() {
  const { lang } = useLang();
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 lg:px-8">
      <h1 className="font-display text-3xl font-bold tracking-tight">{t("data_title", lang)}</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-mid">{t("data_intro", lang)}</p>
      <p className="mt-3 text-xs leading-relaxed text-ink-low">{t("english_only_table_note", lang)}</p>
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
            {DATASETS.map((d) => {
              const s = d.status;
              const statusText =
                s.kind === "retrieved"
                  ? tf("status_retrieved", lang, { date: s.date, detail: pick(s.detail, lang) })
                  : s.kind === "live"
                    ? tf("status_live", lang, { detail: pick(s.detail, lang) })
                    : tf("status_planned", lang, { detail: pick(s.detail, lang) });
              const tone =
                s.kind === "retrieved" ? "text-link" : s.kind === "live" ? "text-ink-mid" : "text-amber";
              return (
                <tr key={d.name} className="border-t border-line-soft bg-canvas/50 align-top">
                  <td className="px-4 py-3">
                    <p className="flex items-center gap-2 font-medium text-ink-hi">
                      <TierBadge tier={d.tier} />
                      {d.name}
                    </p>
                    <p className="mt-1 text-[11px] text-ink-low md:hidden">{L(d.role, lang)}</p>
                    <p className="mt-1 text-[10px] text-ink-low">{L(d.license, lang)}</p>
                    <p className={`mt-1 font-mono text-[10px] ${tone}`}>{statusText}</p>
                  </td>
                  <td className="hidden max-w-xs px-4 py-3 text-ink-mid md:table-cell">{L(d.role, lang)}</td>
                  <td className="hidden px-4 py-3 font-mono text-xs text-ink-mid lg:table-cell">
                    {L(d.res, lang)}
                  </td>
                  <td className="hidden px-4 py-3 font-mono text-xs text-ink-mid lg:table-cell">
                    {L(d.temporal, lang)}
                  </td>
                  <td className="px-4 py-3">
                    <a
                      className="text-xs font-medium text-link hover:underline"
                      href={d.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {t("open_link", lang)}
                    </a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-6 text-xs leading-relaxed text-ink-low">{t("data_footnote", lang)}</p>
    </div>
  );
}

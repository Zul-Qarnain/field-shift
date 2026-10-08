export type Lang = "en" | "bn";

/** Bengali digits ০–৯. Same value, different glyph. */
const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"] as const;

/** Latin digits become Bengali digits; every other character (signs, decimals, units, words) is untouched. */
export const toBnDigits = (value: string | number) => String(value).replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)]);

/** The same number written the way this language writes it. Never rounds, changes or reformats the value. */
export const fmtNum = (value: string | number, lang: Lang) => (lang === "bn" ? toBnDigits(value) : String(value));

/** Short label plus number, e.g. "12 d" / "১২ দিন" — the unit follows the language, the number does not change. */
export const fmtUnit = (value: string | number, unit: string, lang: Lang) => `${fmtNum(value, lang)} ${unit}`;

const STRINGS = {
  nav_home: { en: "Home", bn: "হোম" },
  nav_field: { en: "Field Analysis", bn: "মাঠ বিশ্লেষণ" },
  nav_plan: { en: "Crop Planning", bn: "ফসল পরিকল্পনা" },
  nav_method: { en: "Method", bn: "পদ্ধতি" },
  nav_data: { en: "Data", bn: "ডেটা" },
  nav_locate: { en: "Pick a location", bn: "স্থান বেছে নিন" },
  nav_quick: { en: "Quick answer", bn: "দ্রুত উত্তর" },
  search_ph: { en: "Search district or demo farm…", bn: "জেলা বা খামার খুঁজুন…" },
  tagline: { en: "Earth data. Smarter farms.", bn: "পৃথিবীর তথ্য। ভালো ফসল।" },
  shell_note_1: { en: "NASA POWER data today.", bn: "আজ NASA POWER-এর ডেটা।" },
  shell_note_2: { en: "More feeds next.", bn: "পরে আরও ডেটা।" },
  shell_note_3: { en: "A healthier tomorrow.", bn: "সুস্থ আগামীকাল।" },
  country: { en: "Bangladesh", bn: "বাংলাদেশ" },
  demo_fixture: { en: "demo fixture", bn: "ডেমো ফিক্সচার" },
  not_retrieved: { en: "next phase (demo value shown)", bn: "পরবর্তী ধাপ (ডেমো মান দেখানো হয়েছে)" },
  demo_flags: { en: "demo flags", bn: "ডেমো চিহ্ন" },
  view: { en: "View", bn: "দেখুন" },
  copy: { en: "Copy", bn: "কপি" },
  copied: { en: "Copied", bn: "কপি হয়েছে" },
  close: { en: "Close", bn: "বন্ধ" },
  open_link: { en: "Open ↗", bn: "খুলুন ↗" },
  coming_soon: { en: "coming soon", bn: "শীঘ্রই আসছে" },
  english_only_note: { en: "Detailed definitions are in English for now.", bn: "বিস্তারিত সংজ্ঞা আপাতত ইংরেজিতে।" },
  english_only_table_note: {
    en: "Dataset and product names, versions, file paths and ISO retrieval dates stay in English — they are citations, not interface text. Roles, resolutions and status lines follow the language you picked.",
    bn: "ডেটাসেট ও পণ্যের নাম, সংস্করণ, ফাইলের পথ ও ISO সংগ্রহের তারিখ ইংরেজিতেই থাকে — এগুলো উদ্ধৃতি, ইন্টারফেসের লেখা নয়। ভূমিকা, রেজোলিউশন ও অবস্থার লেখা আপনার বাছাই করা ভাষায় আসে।",
  },
  generated_fixtures: {
    en: "Climate numbers come from the NASA POWER packs (cross-checked with CHIRPS); soil moisture, NDVI, soil and crop traits are still deterministic demo fixtures.",
    bn: "জলবায়ুর সংখ্যাগুলো NASA POWER প্যাক থেকে আসে (CHIRPS দিয়ে যাচাই করা); মাটির আর্দ্রতা, NDVI, মাটি ও ফসলের বৈশিষ্ট্য এখনও নির্ধারিত ডেমো ফিক্সচার।",
  },
  footer_line: {
    en: "Built for the NASA Space Apps Challenge — a community science initiative. Not an official NASA product.",
    bn: "NASA Space Apps Challenge-এর জন্য নির্মিত — একটি কমিউনিটি সায়েন্স উদ্যোগ। এটি NASA-র কোনো দাপ্তরিক পণ্য নয়।",
  },

  hero_line1: { en: "The rains shifted.", bn: "বৃষ্টির সময় বদলেছে।" },
  hero_line2: { en: "Your calendar should too.", bn: "আপনার ফসলের ক্যালেন্ডারও বদলান।" },
  hero_intro: {
    en: "Field Shift is designed to turn NASA Earth observations (POWER, SMAP, MODIS …) — rainfall onset, soil moisture, heat days, greenness — into ranked, explainable crop-rotation strategies for a specific farm. Every number traces to its dataset. Rainfall onset, rainfall trend, heat days and temperature already come from real NASA POWER data cross-checked with CHIRPS; the remaining inputs are demo fixtures. Offline mode is planned.",
    bn: "Field Shift একটি নির্দিষ্ট খামারের জন্য NASA-র পৃথিবী পর্যবেক্ষণ (POWER, SMAP, MODIS …) — বর্ষার শুরু, মাটির আর্দ্রতা, তাপের দিন, সবুজাভতা — থেকে র‍্যাঙ্ক করা, ব্যাখ্যাযোগ্য ফসল-পর্যায় পরিকল্পনা বানানোর জন্য তৈরি। প্রতিটি সংখ্যা কোন ডেটাসেট থেকে এসেছে তা দেখা যায়। বর্ষার শুরু, বৃষ্টিপাতের ধারা, তাপের দিন ও তাপমাত্রা এখনই CHIRPS দিয়ে যাচাই করা প্রকৃত NASA POWER ডেটা থেকে আসে; বাকি ইনপুট ডেমো ফিক্সচার। অফলাইন মোড পরিকল্পনায় আছে।",
  },
  cta_open_farm: { en: "Open demo farm", bn: "ডেমো খামার দেখুন" },
  cta_plan_rotation: { en: "Plan a rotation", bn: "ফসল-পর্যায় পরিকল্পনা করুন" },
  farms_heading: { en: "Demo farms — pick one", bn: "ডেমো খামার — একটি বাছুন" },
  card_onset: { en: "Onset", bn: "শুরু" },
  unit_days_short: { en: "d", bn: "দিন" },
  unit_heat_days: { en: "heat d", bn: "তাপের দিন" },
  feat_shifted_title: { en: "What shifted", bn: "কী বদলেছে" },
  feat_shifted_body: {
    en: "Two-era comparisons of onset, heat and greenness — evidence first, not just a number. This demo shows sample distributions.",
    bn: "শুরু, তাপ ও সবুজাভতার দুই যুগের তুলনা — আগে প্রমাণ, শুধু সংখ্যা নয়। এই ডেমোতে নমুনা বণ্টন দেখানো হয়েছে।",
  },
  feat_plant_title: { en: "What to plant next", bn: "পরের ফসলে কী" },
  feat_plant_body: {
    en: "Rotations ranked by water, heat, soil-health and resilience — filtered by hard agronomic rules.",
    bn: "পানি, তাপ, মাটির স্বাস্থ্য ও সহনশীলতা মিলিয়ে ফসল-পর্যায়ের র‍্যাঙ্ক — কঠোর কৃষি নিয়মে বাছাই করা।",
  },
  feat_whatif_title: { en: "What if it changes", bn: "পরিবর্তন হলে কী হবে" },
  feat_whatif_body: {
    en: "Stress-test drier or hotter seasons and watch the ranking respond. Clearly labeled — not a forecast.",
    bn: "শুকনো বা বেশি গরম মৌসুমে র‍্যাঙ্ক কীভাবে বদলায় তা দেখুন। স্পষ্টভাবে চিহ্নিত — এটি পূর্বাভাস নয়।",
  },

  monitored: { en: "Demo field", bn: "নমুনা মাঠ" },
  onset_detected: { en: "Crop onset shift detected", bn: "ফসলের সময় পরিবর্তন ধরা পড়েছে" },
  days_earlier: { en: "days earlier than usual", bn: "দিন আগে শুরু" },
  days_later: { en: "days later than usual", bn: "দিন পরে শুরু" },
  recommended_action: { en: "What this changes", bn: "এর অর্থ কী" },
  action_later: {
    en: "The planting window moved later — short-duration winter crops fit the shifted season better. Compare rotations before deciding.",
    bn: "লাগানোর সময় পিছিয়ে গেছে — ছোট বর্ধনাকালের রবি মৌসুমি ফসল বদলে যাওয়া মৌসুমে বেশি মানায়। সিদ্ধান্তের আগে ফসল-পর্যায় তুলনা করুন।",
  },
  action_earlier: {
    en: "The usable-rain window opens earlier — longer-duration winter crops become feasible. Compare rotations before deciding.",
    bn: "ব্যবহারযোগ্য বৃষ্টির সময় আগে শুরু হয় — দীর্ঘ বর্ধনাকালের রবি মৌসুমি ফসলও সম্ভব। সিদ্ধান্তের আগে ফসল-পর্যায় তুলনা করুন।",
  },
  view_analysis: { en: "Plan the rotation", bn: "ফসল-পর্যায় পরিকল্পনা" },
  last_updated: { en: "Data window", bn: "ডেটা সময়সীমা" },
  field_details: { en: "Field details", bn: "মাঠের তথ্য" },
  data_provenance: { en: "Data provenance", bn: "ডেটার উৎস" },
  uncertainty: { en: "Uncertainty", bn: "অনিশ্চয়তা" },
  uncertainty_note: {
    en: "Onset comes from a stated rule applied to the farm's data pack — not a forecast. In this demo that pack is sample data. Soil is modeled; correct it if you know better.",
    bn: "শুরুর সময় নির্দিষ্ট নিয়মে খামারের ডেটা প্যাক থেকে আসে — পূর্বাভাস নয়। এই ডেমোতে প্যাকটি নমুনা ডেটা। মাটি মডেল করা; জানা থাকলে সংশোধন করুন।",
  },
  info_provenance: {
    en: "Every dataset behind the numbers on this page, with its version and retrieval status.",
    bn: "এই পাতার প্রতিটি সংখ্যার পেছনের ডেটাসেট, তার সংস্করণ ও সংগ্রহের অবস্থাসহ।",
  },
  info_uncertainty: {
    en: "Data-quality flags lower confidence visibly instead of hiding it. The flags themselves are demo fixture values.",
    bn: "ডেটা-মানের চিহ্নগুলো অনিশ্চয়তা লুকিয়ে রাখে না, বরং দেখায়। চিহ্নগুলোও ডেমো ফিক্সচারের মান।",
  },
  unc_soil: {
    en: "Soil from SoilGrids 250 m model — field test recommended",
    bn: "মাটির তথ্য SoilGrids ২৫০ মিটার মডেল থেকে — মাঠে পরীক্ষা করে নেওয়া ভালো",
  },
  unc_smap_yes: { en: "SMAP era available: yes (2015–present)", bn: "SMAP যুগ: আছে (২০১৫–এখন)" },
  unc_smap_no: { en: "SMAP era available: no — rainfall proxy used", bn: "SMAP যুগ: নেই — বৃষ্টিপাতের বিকল্প নির্দেশক ব্যবহার" },
  unc_ndvi_years: { en: "NDVI record: {n} years", bn: "NDVI রেকর্ড: {n} বছর" },
  loading_field: { en: "Loading field…", bn: "মাঠের তথ্য লোড হচ্ছে…" },

  metric_soil_moisture: { en: "Soil moisture", bn: "মাটির আর্দ্রতা" },
  metric_temp: { en: "Temperature (avg)", bn: "গড় তাপমাত্রা" },
  metric_heat_days: { en: "Heat days >35°C", bn: "৩৫°C-এর বেশি তাপের দিন" },
  panel_onset_title: { en: "Usable-rainfall onset — two eras compared", bn: "ব্যবহারযোগ্য বর্ষার শুরু — দুই যুগের তুলনা" },
  panel_ndvi_title: { en: "Season NDVI trend", bn: "মৌসুমের NDVI ধারা" },
  panel_rain_title: { en: "Annual rainfall trend", bn: "বার্ষিক বৃষ্টিপাতের ধারা" },
  salinity_title: { en: "Soil salinity", bn: "মাটির লবণাক্ততা" },
  salinity_badge: { en: "non-space · SRDI 2010", bn: "নন-স্পেস · SRDI ২০১০" },
  salinity_upazila: { en: "Upazila (SRDI survey unit)", bn: "উপজেলা (SRDI জরিপ একক)" },
  salinity_share: { en: "Saline share of the upazila", bn: "উপজেলার লবণাক্ত জমির ভাগ" },
  salinity_repec: { en: "Representative ECe", bn: "প্রতিনিধি ECe" },
  salinity_retrieved: { en: "retrieved", bn: "পড়া হয়েছে" },
  salinity_class_heading: { en: "SRDI class (dry-season ECe, dS/m)", bn: "SRDI শ্রেণি (খরার মৌসুমের ECe, dS/m)" },
  salinity_note: {
    en: "Dry-season classes from SRDI's May 2009 field survey; EC measured on a 1:5 soil-water extract. Representative ECe is the area-weighted class midpoint — derived from SRDI class areas, not a measured value at this field.",
    bn: "শুষ্ক মৌসুমের শ্রেণি, SRDI-র মে ২০০৯-এর মাঠ জরিপ থেকে; EC মাপা হয়েছিল ১:৫ মাটি-পানির নির্যাসে। প্রতিনিধি ECe = শ্রেণির মধ্যবিন্দুর ক্ষেত্রফল-ভিত্তিক গড় — SRDI-র শ্রেণি-এলাকা থেকে নির্ণীত, এই মাঠে মাপা মান নয়।",
  },
  salinity_outside_note: {
    en: "This upazila is outside SRDI's coastal saline survey, so there is no measured value here. Salinity is not scored — that is absence of data, not an assumption of zero salt.",
    bn: "এই উপজেলাটি SRDI-র উপকূলীয় লবণাক্ত জরিপের বাইরে, তাই এখানে মাপা কোনো মান নেই। লবণাক্ততা স্কোরে ধরা হয়নি — এটি তথ্যের অভাব, শূন্য লবণের ধারণা নয়।",
  },
  field_cards_note: {
    en: "Demo fixture values — these four cards are sample data until the pipeline caches the named feeds.",
    bn: "ডেমো ফিক্সচারের মান — নাম লেখা ফিডগুলো পাইপলাইন ক্যাশ করা পর্যন্ত এই চারটি কার্ড নমুনা ডেটা।",
  },
  sample_distributions: {
    en: "Sample distributions — real POWER onset years arrive with the pipeline.",
    bn: "নমুনা বণ্টন — পাইপলাইন এলে প্রকৃত POWER শুরুর বছরগুলো আসবে।",
  },
  per_decade: { en: "per decade · 2001–2025", bn: "প্রতি দশকে · ২০০১–২০২৫" },
  rain_sample_note: {
    en: "Sample value from the demo fixture. The Mann-Kendall trend over daily rainfall is computed by the pipeline.",
    bn: "ডেমো ফিক্সচারের নমুনা মান। দৈনিক বৃষ্টিপাতের Mann-Kendall ধারা পাইপলাইন হিসাব করবে।",
  },
  rain_declining: { en: " Shown as declining — which raises the water priority.", bn: " কমে যাওয়া হিসেবে দেখানো হয়েছে — তাই পানির অগ্রাধিকার বাড়ে।" },
  rain_stable: { en: " Shown as stable or rising on this farm.", bn: " এই খামারে স্থির বা বাড়তি হিসেবে দেখানো হয়েছে।" },
  current_crop: { en: "Current crop", bn: "বর্তমান ফসল" },
  growth_stage: { en: "Growth stage", bn: "বর্ধনার ধাপ" },
  soil_type: { en: "Soil type", bn: "মাটির ধরন" },
  area_label: { en: "Area", bn: "জমির পরিমাণ" },
  elevation_label: { en: "Elevation", bn: "উচ্চতা" },
  context_label: { en: "Context", bn: "পরিবেশ" },

  map_load: { en: "Load interactive map", bn: "ম্যাপ চালু করুন" },
  map_skip_note: { en: "Skipped on phones by default to keep the page fast.", bn: "ফোনে পেজ দ্রুত রাখতে ডিফল্টে ম্যাপ চালু হয় না।" },
  map_loading: { en: "Loading satellite view…", bn: "স্যাটেলাইট দৃশ্য লোড হচ্ছে…" },
  map_offline: { en: "The map draws on internet tiles — they arrive as soon as you are back online", bn: "ম্যাপ ইন্টারনেটের টাইল দিয়ে এঁকে — আপনি অনলাইনে ফিরলেই সেগুলো আসবে" },
  layers: { en: "Data layers", bn: "ডেটা লেয়ার" },
  layers_btn: { en: "Layers", bn: "লেয়ার" },
  layer_truecolor: { en: "True Color (satellite)", bn: "প্রকৃত রঙ (স্যাটেলাইট)" },
  layer_ndvi: { en: "NDVI (vegetation)", bn: "NDVI (সবুজাভতা)" },
  layer_moisture: { en: "Soil moisture", bn: "মাটির আর্দ্রতা" },
  layer_lst: { en: "Land surface temp.", bn: "ভূপৃষ্ঠের তাপমাত্রা" },
  layer_precip: { en: "Precipitation", bn: "বৃষ্টিপাত" },
  map_layers_note: {
    en: "Only True Color works today, streamed from NASA GIBS when online. The other layers are placeholders — they arrive with the data pipeline (pre-tiled PMTiles).",
    bn: "আজ শুধু True Color লেয়ারটি কাজ করে — ইন্টারনেট থাকলে NASA GIBS থেকে আসে। বাকিগুলো শুধু জায়গা রাখছে — ডেটা পাইপলাইনের সঙ্গে আসবে (PMTiles)।",
  },

  priorities: { en: "Your priorities", bn: "আপনার অগ্রাধিকার" },
  plan_title: { en: "Plan the rotation", bn: "ফসল-পর্যায় পরিকল্পনা করুন" },
  plan_sliders_note: {
    en: "Sliders re-rank instantly, on this device, with the same math every time.",
    bn: "স্লাইডার সরালেই এই ডিভাইসে র‍্যাঙ্ক বদলায় — গণনা সবসময় এক।",
  },
  plan_irrigation_note: {
    en: "Water saving also counts dry-season pumping — this farm's demo irrigation access is {n} (ESTIMATE). Stable harvest is the weight on food & income (S8): each season's demo income graded by its water-reliability margin, plus the staple rice the sequence can actually grow where its water need can be covered.",
    bn: "পানি সাশ্রয় স্লাইডার শুষ্ক মৌসুমে সেচের পানিও গণনা করে; এই খামারের ডেমো সেচ-প্রবেশাধিকার {n} (ESTIMATE)। “স্থিতিশীল ফলন” মৌসুমের খাদ্য ও আয়-মূল্য (S8) কে বেশি ওজন দেয়: প্রতি মৌসুমের ডেমো আয়-মূল্য সেই মৌসুমের পানির নির্ভরযোগ্যতার প্রান্ত দিয়ে গুণ করা হয়, সঙ্গে যোগ হয় এই ক্রম যে ধান সত্যিই ফলাতে পারে তার খাদ্য-নিরাপত্তার অংশ — যেখানে ফসলের পানির চাহিদা মেটাতে সম্ভব।",
  },
  crop_pool: { en: "Crop pool", bn: "ফসলের তালিকা" },
  crop_pool_info: {
    en: "Crops considered for the rotation. Same-family crops may follow each other but lose soil-health points; every sequence must also fit the 365-day calendar (durations + 10-day turnarounds + the onset shift). Fallow leaves the season idle, and is charged for it — less when the calendar left barely any room to crop, in full when the year still had a season spare.",
    bn: "ফসল-পর্যায়ের জন্য যেসব ফসল বিবেচনা করা হয়। একই গোত্রের ফসল পরপর বসানো যায়, তবে মাটির স্বাস্থ্যের পয়েন্ট কমে; প্রতিটি ক্রমকে ৩৬৫ দিনের ক্যালেন্ডারেও বসতে হয় (বর্ধনাকাল + ১০ দিনের টার্নঅ্যাউন্ড + বর্ষার শুরু পিছনো)। পতিত মানে সেই মৌসুমে জমি ফাঁকা রাখা — তার জন্য পয়েন্ট কাটা হয়; ক্যালেন্ডারে ফসল ফেলার জায়গা প্রায় না-থাকলে কম কাটে, আর বছরে পুরো একটি মৌসুম ফাঁকা থাকলে পুরোটা কাটে।",
  },
  scenarios: { en: "What-if", bn: "যদি এমন হয়" },
  whatif_info: {
    en: "Your observed data with a stated change applied — a stress test, not a forecast.",
    bn: "আপনার পর্যবেক্ষিত ডেটায় বলা একটি পরিবর্তন বসানো হয়েছে — এটি চাপ পরীক্ষা, পূর্বাভাস নয়।",
  },
  sc_baseline: { en: "Baseline", bn: "বেসলাইন" },
  sc_rain10: { en: "Rainfall −10%", bn: "বৃষ্টি −১০%" },
  sc_rain20: { en: "Rainfall −20%", bn: "বৃষ্টি −২০%" },
  sc_hot1: { en: "Hotter +1°C", bn: "তাপ +১°C" },
  sc_hot2: { en: "Hotter +2°C", bn: "তাপ +২°C" },
  sc_onset7: { en: "Onset +7 days", bn: "বর্ষার শুরু +৭ দিন" },
  sc_onset15: { en: "Onset +15 days", bn: "বর্ষার শুরু +১৫ দিন" },
  stress_test: {
    en: "Stress test — not a forecast. Ranking recalculated under the stated change.",
    bn: "চাপ পরীক্ষা — পূর্বাভাস নয়। বলা পরিবর্তন মানিয়ে র‍্যাঙ্ক আবার হিসাব করা হয়েছে।",
  },
  rotations: { en: "Ranked rotations", bn: "ফসল-পর্যায়" },
  plan_valid_rotations: { en: "{n} valid rotations", bn: "{n}টি বৈধ ফসল-পর্যায়" },
  plan_from_crops: { en: "from {c} crops · top {k} shown", bn: "{c}টি ফসল থেকে · সেরা {k}টি দেখানো হলো" },
  plan_show_all: { en: "Show all {n} valid rotations", bn: "সব {n}টি বৈধ ফসল-পর্যায় দেখুন" },
  plan_tie: {
    en: "Top two are less than a point apart — your priorities break the tie.",
    bn: "সেরা দুটির ব্যবধান এক পয়েন্টের কম — আপনার অগ্রাধিকারই এখানে সিদ্ধান্ত দেবে।",
  },
  plan_none: {
    en: "No valid rotation with this pool — every sequence either leaves a season empty or overruns the 365-day calendar at this onset. Re-enable a short-duration crop (mungbean, sesame, fallow) or drop the +15-day onset scenario.",
    bn: "এই তালিকায় কোনো বৈধ ফসল-পর্যায় নেই — প্রতিটি ক্রম হয় কোনো মৌসুম ফাঁকা রাখে, নয়তো এই শুরুর সময়ে ৩৬৫ দিনের ক্যালেন্ডার ছাড়িয়ে যায়। ছোট বর্ধনাকালের ফসল (মুগ, তিল, পতিত) আবার চালু করুন, অথবা +১৫ দিনের শুরুর দৃশ্যপটটি সরান।",
  },
  advisory_eyebrow: { en: "Advisory — the takeaway", bn: "পরামর্শ — মূল কথা" },
  advisory: { en: "Advisory", bn: "পরামর্শ" },
  advisory_note: {
    en: "Ranking math runs for real on this device; the farm values it reads are demo fixtures, including the irrigation access the water score uses.",
    bn: "র‍্যাঙ্কের গণনা সত্যিই এই ডিভাইসে চলে; তবে যে খামারের সংখ্যাগুলো পড়া হয় সেগুলো ডেমো ফিক্সচার — পানির স্কোর যে সেচ-প্রবেশাধিকার ব্যবহার করে সেটিও।",
  },
  copy_advisory: { en: "Copy advisory", bn: "পরামর্শ কপি করুন" },
  sms_version: { en: "SMS version", bn: "এসএমএস সংস্করণ" },
  open_full_planning: { en: "Open full planning", bn: "পুরো পরিকল্পনা দেখুন" },
  loading_plan: { en: "Loading planner…", bn: "পরিকল্পনা লোড হচ্ছে…" },

  why: { en: "Why", bn: "কেন" },
  why_title: { en: "Why this rotation?", bn: "এই ফসল-পর্যায়টি কেন?" },
  source_word: { en: "source", bn: "উৎস" },
  because: { en: "Because", bn: "কারণ" },
  component_scores: { en: "Component scores", bn: "উপস্কোর" },
  penalties: { en: "Penalties", bn: "পয়েন্ট কাটা" },
  tiers_note: { en: "all evidence tiers shown in Why", bn: "প্রমাণের স্তরগুলো “কেন” অংশে দেখানো হয়েছে" },
  why_sensitivity_note: {
    en: "Threshold and coefficient sensitivity testing arrives in the next phase; move the priority sliders and the what-if scenarios to see how the ranking changes today.",
    bn: "সীমা ও সহগের সংবেদনশীলতা পরীক্ষা পরবর্তী ধাপে আসছে; আজ র‍্যাঙ্ক কীভাবে বদলায় দেখতে অগ্রাধিকার স্লাইডার ও দৃশ্যপট বদলে দেখুন।",
  },
  conf_high: { en: "high confidence", bn: "উচ্চ আস্থা" },
  conf_medium: { en: "medium confidence", bn: "মধ্যম আস্থা" },
  conf_low: { en: "low confidence", bn: "কম আস্থা" },

  method_title: { en: "Method", bn: "পদ্ধতি" },
  method_intro: {
    en: "Every definition the interface uses, stated openly. Onset has a dozen definitions in the literature — naming ours, and saying which parts are computed today versus planned, is the point of this page.",
    bn: "ইন্টারফেস যে সংজ্ঞাগুলো ব্যবহার করে, সব এখানে খুলে বলা হয়েছে। সাহিত্যে onset-এর একাধিক সংজ্ঞা আছে — আমাদের সংজ্ঞা কোনটি, আর আজ কতটা হিসাব হচ্ছে বনাম কতটা পরিকল্পনায় আছে, সেটাই এই পাতার কাজ।",
  },
  demo_build_note: {
    en: "Onset, rainfall trend, heat days and temperature now come from the NASA POWER pipeline, cross-checked against CHIRPS; the soil-salinity penalty reads SRDI (2010) \"Saline Soils of Bangladesh\", Appendix-2. The rest of the numbers on these pages — soil moisture, NDVI, SoilGrids soil properties, water availability, crop traits, irrigation access — are still sample fixtures, and the onset outlook is a model built offline, never computed in the browser.",
    bn: "শুরুর সময়, বৃষ্টিপাতের ধারা, অতিরিক্ত গরমের দিন ও তাপমাত্রা এখন NASA POWER পাইপলাইন থেকে আসে, CHIRPS দিয়ে যাচাই করা; মাটির লবণাক্ততার জরিমানা SRDI (২০১০) \"Saline Soils of Bangladesh\"-এর Appendix-2 থেকে পড়া। এই পাতার বাকি সংখ্যাগুলো — মাটির আর্দ্রতা, NDVI, SoilGrids-এর মাটির বৈশিষ্ট্য, পানির প্রাপ্যতা, ফসলের বৈশিষ্ট্য, সেচের অ্যাক্সেস — এখনও নমুনা ফিক্সচার, আর বর্ষার শুরুর পূর্বাভাসটি অফলাইনে তৈরি মডেল, ব্রাউজারে হিসাব হয় না।",
  },
  method_footnote: {
    en: "The decision engine is deterministic and unit-tested; no language model computes any number in this product. The TypeScript runtime engine has its own unit tests; a cross-check against a Python reference implementation arrives with the next phase.",
    bn: "সিদ্ধান্ত ইঞ্জিন নির্ধারিত (deterministic) ও ইউনিট-পরীক্ষিত; এই পণ্যের কোনো সংখ্যা ভাষার মডেল হিসাব করে না। TypeScript ইঞ্জিনের নিজস্ব ইউনিট পরীক্ষা আছে; Python রেফারেন্স বাস্তবায়নের সঙ্গে যাচাই পরবর্তী ধাপে আসছে।",
  },
  data_title: { en: "Data sources", bn: "ডেটার উৎস" },
  data_intro: {
    en: "Every dataset Field Shift uses, its role, and its retrieval date where one exists. NASA data is the compulsory foundation; Space Agency Partner data is strictly supplementary; soil, salinity, boundaries and basemaps are the labeled open non-space layer. Retrieved for real and feeding the numbers you see: NASA POWER (70 points), CHIRPS v2.0 as the independent cross-check, SRDI 2010 plus FAO-29 for soil salinity, geoBoundaries for the district points and the upazila join, and NOAA PSL ONI/DMI as features of the build-time ML outlook. Rows marked NEXT PHASE arrive in the following data build; until then the app renders those values from demo fixtures and labels them. OpenET is named in the challenge summary but covers only the United States — it is replaced by NASA MOD16.",
    bn: "Field Shift যে সব ডেটাসেট ব্যবহার করে, তাদের ভূমিকা এবং থাকলে সংগ্রহের তারিখ। NASA-র ডেটাই বাধ্যতামূলক ভিত্তি; মহাকাশ এজেন্সি পার্টনারের ডেটা কেবল বাড়তি স্তর; মাটি, লবণাক্ততা, সীমানা ও বেসম্যাপ হলো চিহ্নিত মুক্ত অ-মহাকাশ স্তর। সত্যিই সংগ্রহ করা হয়েছে ও দেখা মানগুলো চালাচ্ছে: NASA POWER (৭০ বিন্দু), স্বাধীন যাচাই হিসেবে CHIRPS v2.0, মাটির লবণাক্ততার জন্য SRDI ২০১০ ও FAO-29, জেলা বিন্দু ও উপজেলা মিলের জন্য geoBoundaries, এবং অফলাইনে তৈরি ML পূর্বাভাসের ফিচার হিসেবে NOAA PSL ONI/DMI। যা NEXT PHASE চিহ্নে আছে তা পরবর্তী ডেটা বিল্ডে আসবে; সে পর্যন্ত অ্যাপ সেসব মান ডেমো ফিক্সচার থেকে দেখায় এবং তা স্পষ্ট করে লেখে। OpenET-এর নাম চ্যালেঞ্জ সারাংশে আছে, তবে তা শুধু যুক্তরাষ্ট্রের জন্য — বদলে NASA MOD16 রাখা হয়েছে।",
  },
  status_retrieved: {
    en: "RETRIEVED {date} · {detail}",
    bn: "সংগ্রহ হয়েছে {date} · {detail}",
  },
  status_live: {
    en: "LIVE IN THE APP · {detail}",
    bn: "অ্যাপে লাইভ · {detail}",
  },
  status_planned: {
    en: "NEXT PHASE · {detail}",
    bn: "পরবর্তী ধাপ · {detail}",
  },
  data_footnote: {
    en: "The rows are hand-written, not generated from a manifest — but every retrieval date, point count, version and covered range is read from the committed artifacts: web/public/data/packs/index.json and the farm packs, web/public/data/onset_outlook.json, and web/public/data/salinity.json. Rebuilding those files changes this table. The in-app provenance drawer labels every unretrieved value as a fixture.",
    bn: "সারিগুলো হাতে লেখা, কোনো ম্যানিফেস্ট থেকে তৈরি নয় — তবে প্রতিটি সংগ্রহের তারিখ, বিন্দুর সংখ্যা, সংস্করণ ও সময়সীমা কমিট করা ফাইল থেকে পড়া: web/public/data/packs/index.json ও ফার্ম প্যাক, web/public/data/onset_outlook.json এবং web/public/data/salinity.json। ওই ফাইলগুলো নতুন করে তৈরি করলে এই টেবিলও বদলাবে। অ্যাপের উৎস-ড্রয়ারে সংগ্রহ-হওয়া নয় এমন প্রতিটি মান ফিক্সচার হিসেবেই চিহ্নিত।",
  },
  th_dataset: { en: "Dataset", bn: "ডেটাসেট" },
  th_role: { en: "Role in the decision", bn: "সিদ্ধান্তে ভূমিকা" },
  th_resolution: { en: "Resolution", bn: "রেজোলিউশন" },
  th_temporal: { en: "Temporal", bn: "সময়সীমা" },
  th_link: { en: "Link", bn: "লিঙ্ক" },

  ml_heading: { en: "ML outlook", bn: "মডেলের পূর্বাভাস (ML)" },
  ml_badge: { en: "ML prediction", bn: "মডেলের পূর্বাভাস" },
  ml_experimental: { en: "Next phase: in training", bn: "পরবর্তী ধাপ: প্রশিক্ষণ চলছে" },
  ml_predicted_onset: { en: "Model's predicted onset", bn: "মডেল অনুযায়ী বর্ষার শুরু" },
  ml_interval: { en: "Model's 10–90 range", bn: "মডেলের 10–90 ব্যবধান" },
  ml_climatology: { en: "District climatology", bn: "জেলার গড় শুরু" },
  ml_vs_climatology: { en: "{days} days vs climatology", bn: "গড়ের তুলনায় {days} দিন" },
  ml_observed: { en: "Already observed this season", bn: "এই মৌসুমে ইতিমধ্যে পর্যবেক্ষিত" },
  ml_not_observed: { en: "Awaiting this season's onset", bn: "এই মৌসুমের শুরুর অপেক্ষায়" },
  ml_why: { en: "What moved this prediction", bn: "কী এই অনুমান নড়িয়েছে" },
  ml_backtest: { en: "Leave-one-year-out backtest", bn: "ব্যাকটেস্ট (প্রতি বছর আলাদা রেখে)" },
  ml_backtest_scope: { en: "{years} years · {districts} districts", bn: "{years} বছর · {districts} জেলা" },
  ml_mae_line: {
    en: "model {model} d · climatology {clim} d · skill {skill}",
    bn: "মডেল {model} দিন · গড় {clim} দিন · স্কিল {skill}",
  },
  ml_coverage_line: {
    en: "the interval covered {pct}% of backtested onsets",
    bn: "ব্যবধানটি ব্যাকটেস্টকৃত শুরুর {pct}% ঢেকেছে",
  },
  ml_shipped_note: {
    en: "On this backtest the model beats the district's own average start.",
    bn: "এই ব্যাকটেস্টে মডেল জেলার নিজের গড় শুরুকে ছাড়িয়েছে।",
  },
  ml_experimental_note: {
    en: "Both numbers, from the same backtest: the model's mean error is {model} days against the district climatology's {clim} days, so the app keeps climatology as its baseline and the outlook is shown as context only — it never feeds a rotation score or a recommendation. The next phase adds training years and features.",
    bn: "একই ব্যাকটেস্টের দুটি সংখ্যা: মডেলের MAE {model} দিন, জেলার ক্লাইমেটোলজির MAE {clim} দিন — তাই অ্যাপ বেসলাইন হিসেবে ক্লাইমেটোলজিই রাখে, পূর্বাভাসটি কেবল প্রেক্ষাপট হিসেবে দেখানো হয় এবং কোনো ফসল-পর্যায়ের স্কোর বা সুপারিশে ব্যবহার হয় না। পরবর্তী ধাপে প্রশিক্ষণ-বছর ও ফিচার বাড়ানো হবে।",
  },
  ml_offline_note: {
    en: "Built offline from cached CHIRPS, NASA POWER and NOAA data — not run in your browser.",
    bn: "এই পূর্বাভাস অফলাইনে তৈরি (CHIRPS, NASA POWER ও NOAA ক্যাশ ডেটা) — আপনার ব্রাউজারে হিসাব হয় না।",
  },
  ml_model_line: { en: "Model {version} · issued {issue} for {year}", bn: "মডেল {version} · {year} সালের জন্য {issue} তারিখে জারি" },
  ml_same_source_note: {
    en: "Onset labels and the rainfall feature both come from CHIRPS — a same-source check, not an independent forecast.",
    bn: "শুরুর লেবেল ও বৃষ্টির ফিচার দুটোই CHIRPS থেকে — একই উৎসের যাচাই, স্বাধীন পূর্বাভাস নয়।",
  },
  ml_missing: {
    en: "No ML outlook for this farm yet.",
    bn: "এই খামারের জন্য এখনো কোনো এমএল পূর্বাভাস নেই।",
  },
  src_fixture: { en: "fixture", bn: "ডেমো ফিক্সচার" },
  src_cache: { en: "cache", bn: "ক্যাশ" },
  src_live: { en: "live", bn: "লাইভ" },
  src_pack: { en: "data pack", bn: "ডেটা প্যাক" },
  copy_failed: { en: "Copy blocked — select the text", bn: "কপি আটকেছে — লেখাটি নির্বাচন করে কপি করুন" },
  unit_ha: { en: "ha", bn: "হেক্টর" },
  unit_m: { en: "m", bn: "মিটার" },

  card_sub_moisture: { en: "SMAP L4 · vs last {n} d", bn: "SMAP L4 · গত {n} দিনের তুলনায়" },
  card_sub_temp: { en: "POWER · vs {n}-y mean", bn: "POWER · {n} বছরের গড়ের তুলনায়" },
  card_sub_ndvi: { en: "MODIS/VIIRS · greenness", bn: "MODIS/VIIRS · সবুজাভতা" },
  card_sub_heat: { en: "T2M_MAX · per season", bn: "T2M_MAX · মৌসুম প্রতি" },
  card_sub_temp_pack: {
    en: "POWER T2M · {year} vs {era} median",
    bn: "POWER T2M · {year} বনাম {era} মধ্যক",
  },
  card_sub_heat_pack: {
    en: "POWER T2M_MAX >{c}°C · {year}, vs {days} d in {era}",
    bn: "POWER T2M_MAX >{c}°C · {year}, {era}-এ {days} দিন ছিল",
  },

  chart_current: { en: "Current season", bn: "চলতি মৌসুম" },
  chart_previous: { en: "Previous", bn: "আগের মৌসুম" },
  chart_historical: { en: "Historical avg", bn: "ঐতিহাসিক গড়" },
  chart_pct_season: { en: "of season", bn: "মৌসুমের অংশ" },
  chart_mann_whitney: { en: "Mann-Whitney", bn: "ম্যান-হুইটনি" },
  chart_years_unit: { en: "years", bn: "বছর" },
  mw_not_computable: { en: "Mann-Whitney not computable", bn: "ম্যান-হুইটনি হিসাব করা যায়নি" },
  chart_onset_rule: {
    en: "Onset rule: {rule}. Medians: {from} → {to}.",
    bn: "শুরুর নিয়ম: {rule}। মধ্যক: {from} → {to}।",
  },
  onset_rule_bn: {
    en: "5-day rainfall ≥ local Jun–Sep mean (2001–2025), no break ≥ 10 days under 5 mm",
    bn: "৫ দিনের বৃষ্টি ≥ স্থানীয় জুন–সেপ্টেম্বর গড় (২০০১–২০২৫), পরে ১০ দিনের মধ্যে ৫ মিমির কম বৃষ্টির বিরতি নয়",
  },
  drawer_sources: {
    en: "Planned sources — demo values today: water: NASA POWER (daily, 1981–2025) + SMAP L4 · heat: POWER T2M_MAX · soil: SoilGrids 2.0 (modeled, CC-BY-4.0) · demand: FAO-56 crop coefficients · flood: farm flood index (BD context) · irrigation access and crop durations: per-farm / per-crop ESTIMATE, cited to a register in the next phase · onset shift: this farm's NASA POWER data pack, cross-checked with CHIRPS, used only when its era test is significant (else 0), plus the what-if you picked · engine: field-shift rotation v1.1 (deterministic, tested)",
    bn: "পরিকল্পিত উৎস — আজকের মান ডেমো: পানি: NASA POWER (দৈনিক, ১৯৮১–২০২৫) + SMAP L4 · তাপ: POWER T2M_MAX · মাটি: SoilGrids 2.0 (মডেল, CC-BY-4.0) · চাহিদা: FAO-56 ফসল-গুণাঙ্ক · বন্যা: খামারের বন্যা-সূচক (বাংলাদেশ প্রেক্ষিত) · সেচ-প্রবেশাধিকার ও বর্ধনাকাল: খামার/ফসলভিত্তিক ESTIMATE, পরবর্তী ধাপে নিবন্ধ থেকে উদ্ধৃত হবে · শুরুর পরিবর্তন: এই খামারের NASA POWER ডেটা প্যাক (CHIRPS দিয়ে যাচাই), উল্লেখযোগ্য হলেই কেবল ব্যবহৃত (নয় হলে ০) + আপনার বেছে নেওয়া দৃশ্যপট · ইঞ্জিন: field-shift rotation v1.1 (নির্ধারিত, পরীক্ষিত)",
  },

  // Added with the NASA POWER data packs (ITEM 4). English + Bangla, numbers via tf/fmtNum.
  field_cards_note_real: {
    en: "Temperature and heat days come from this farm's NASA POWER data pack. Soil moisture and NDVI are demo fixtures in this build; SMAP L4 and MODIS/VIIRS arrive in the next data build.",
    bn: "তাপমাত্রা ও অতিরিক্ত গরমের দিন এই খামারের NASA POWER ডেটা প্যাক থেকে আসে। মাটির আর্দ্রতা ও NDVI এই বিল্ডে ডেমো ফিক্সচার; SMAP L4 ও MODIS/VIIRS পরবর্তী ডেটা বিল্ডে আসবে।",
  },
  uncertainty_note_real: {
    en: "Onset, rainfall trend, heat days and temperature come from real daily data for this point — NASA POWER, cross-checked against CHIRPS v2.0 — using the stated rule and complete years only, not a forecast. POWER's rainfall series is not homogeneous over 1981–2025, so each number names the product it came from and is flagged when a change point falls inside the analysis window. Soil moisture, NDVI and soil are still modelled or demo fixture values.",
    bn: "শুরুর সময়, বৃষ্টিপাতের ধারা, অতিরিক্ত গরমের দিন ও তাপমাত্রা এই স্থানের প্রকৃত দৈনিক ডেটা থেকে আসে — NASA POWER, CHIRPS v2.0 দিয়ে যাচাই করা — নির্দিষ্ট নিয়ম ও শুধু পূর্ণ বছর ব্যবহার করে, পূর্বাভাস নয়। POWER-এর বৃষ্টিপাতের ধারা ১৯৮১–২০২৫ সমজাতীয় নয়, তাই প্রতিটি সংখ্যা তার উৎস পণ্যের নাম বলে এবং বিশ্লেষণ-উইন্ডোর মধ্যে পরিবর্তন-বিন্দু থাকলে তা চিহ্নিত করা হয়। মাটির আর্দ্রতা, NDVI ও মাটির তথ্য এখনও মডেল বা ডেমো ফিক্সচার।",
  },
  rain_real_note: {
    en: "Mann-Kendall + Theil-Sen on annual rainfall, complete years 2001 onward only (POWER's earlier years are not homogeneous), scaled to % of the window mean:",
    bn: "বার্ষিক বৃষ্টিপাতে Mann-Kendall + Theil-Sen, শুধু ২০০১ সাল থেকে পূর্ণ বছর (POWER-এর আগের বছরগুলো সমজাতীয় নয়), উইন্ডোর গড়ের % হিসেবে:",
  },
  not_significant: { en: "not significant", bn: "উল্লেখযোগ্য নয়" },
  significant: { en: "significant", bn: "উল্লেখযোগ্য" },
  ns_short: { en: "n.s.", bn: "ন.স." },
  onset_no_shift: { en: "No significant onset shift", bn: "বর্ষার শুরুর উল্লেখযোগ্য পরিবর্তন নেই" },
  onset_median_secondary: {
    en: "median {days} days, p = {p} — {verdict}",
    bn: "মধ্যক {days} দিন, p = {p} — {verdict}",
  },
  action_no_shift: {
    en: "The two eras are not distinguishable at this point with the stated rule, so no earlier or later planting window is claimed here — the engine treats the shift as 0. Compare rotations before deciding.",
    bn: "নির্দিষ্ট নিয়মে এই স্থানে দুই যুগের পার্থক্য ধরা যায়নি, তাই এখানে লাগানোর সময় আগে বা পরে হয়েছে দাবি করা হয় না — ইঞ্জিন পরিবর্তনটিকে ০ ধরে। সিদ্ধান্তের আগে ফসল-পর্যায় তুলনা করুন।",
  },
  plan_onset_baseline: {
    en: "Baseline onset shift used by the engine: {days} {unit} (measured {median} {unit}, p = {p} — {verdict}).",
    bn: "ইঞ্জিনের বেসলাইন শুরুর পরিবর্তন: {days} {unit} (পরিমাপিত {median} {unit}, p = {p} — {verdict})।",
  },
  no_measurable_shift: { en: "no measurable shift", bn: "পরিমাপযোগ্য পরিবর্তন নেই" },
  onset_from_source: { en: "Onset from", bn: "শুরুর সময়ের উৎস" },
  pack_years_detected: { en: "{n} years with a detected onset", bn: "{n} বছরে প্রকৃত শুরু ধরা পড়েছে" },
  pack_era_medians: {
    en: "era medians {fromA} (DOY {a}) → {fromB} (DOY {b}), shift {days} {unit}",
    bn: "যুগের মধ্যক {fromA} (DOY {a}) → {fromB} (DOY {b}), পরিবর্তন {days} {unit}",
  },
  pack_rule_line: {
    en: "Source: {product} · rule: {rule} · threshold {mm} mm / 5 d",
    bn: "উৎস: {product} · নিয়ম: {rule} · সীমা {mm} মিমি / ৫ দিন",
  },
  pack_censoring_line: {
    en: "Censoring: {count} of {total} years ({pct}%) fall on the first searchable day (DOY {doy}) — the rule cannot report an onset before it, so a small shift may be the window, not the monsoon.",
    bn: "সীমাবদ্ধতা: {total} বছরের {count}টি ({pct}%) প্রথম খোঁজ-যোগ্য দিনেই (DOY {doy}) পড়ে — তার আগে নিয়ম শুরু বলতে পারে না, তাই ছোট পরিবর্তন উইন্ডোর হতে পারে, বর্ষার নয়।",
  },
  pack_caution_power_flagged: {
    en: "NASA POWER rainfall steps at {year} inside 2001–2025, so its shift ({days} d, p={p}) is not used — this figure comes from the independent CHIRPS cross-check.",
    bn: "NASA POWER-এর বৃষ্টিপাত ২০০১–২০২৫-এর ভেতর {year} সালে ধাপ বদলায়, তাই তার পরিবর্তন ({days} দিন, p={p}) ব্যবহার হয়নি — এই মান স্বাধীন CHIRPS যাচাই থেকে।",
  },
  pack_alternative_line: {
    en: "Cross-check ({product}): shift {days} d, p={p} — {verdict}.",
    bn: "যাচাই ({product}): পরিবর্তন {days} দিন, p={p} — {verdict}।",
  },
  trend_products_disagree: {
    en: "{product}: {pct}%/decade — the two products disagree on magnitude, so this trend is not treated as an established local change.",
    bn: "{product}: {pct}%/দশক — দুই পণ্যের মান মিলে না, তাই এই ধারা প্রমাণিত স্থানীয় পরিবর্তন হিসেবে ধরা হয় না।",
  },
  trend_caution_chirps: {
    en: "Caution: POWER precipitation has a change point at {year} inside the analysis window; this trend comes from the CHIRPS cross-check instead.",
    bn: "সতর্কতা: বিশ্লেষণ-উইন্ডোর ভেতর {year} সালে POWER-এর বৃষ্টিপাতে পরিবর্তন-বিন্দু আছে; এই ধারাটি CHIRPS যাচাই থেকে নেওয়া।",
  },
  trend_caution_power_flagged: {
    en: "Caution: POWER precipitation has a change point at {year} inside 2001–2025, so this trend describes the product as much as the climate — see the cross-check.",
    bn: "সতর্কতা: ২০০১–২০২৫-এর ভেতর {year} সালে POWER-এর বৃষ্টিপাতে পরিবর্তন-বিন্দু আছে; তাই এই ধারা পণ্যের ঢালও বলে, আবহাওয়ারও — যাচাইটি দেখুন।",
  },
  sens_title: {
    en: "Threshold sensitivity (same rule, 0.8× / 1.0× / 1.2× the local 5-day threshold)",
    bn: "সীমার সংবেদনশীলতা (একই নিয়ম, স্থানীয় ৫-দিনের সীমার ০.৮× / ১.০× / ১.২×)",
  },
  sens_row: {
    en: "{factor}× ({mm} mm): {a} → {b} DOY, shift {days} d, p {p}, {n} years, {cens}% censored",
    bn: "{factor}× ({mm} মিমি): {a} → {b} DOY, পরিবর্তন {days} দিন, p {p}, {n} বছর, {cens}% সীমাবদ্ধ",
  },
  sens_legacy_line: {
    en: "Rejected definition v1 (7-day ≥ 20 mm from DOY 145): {count}/{total} years pinned to its window floor ({pct}%).",
    bn: "প্রত্যাখ্যাত সংজ্ঞা v1 (DOY ১৪৫ থেকে ৭ দিনে ≥ ২০ মিমি): {count}/{total} বছর তার উইন্ডোর সীমায় আটকে ছিল ({pct}%।",
  },
  homog_rain_label: { en: "Rainfall homogeneity (Pettitt):", bn: "বৃষ্টিপাতের সমজাতীয়তা (পেতিট):" },
  homog_rain_full: {
    en: "full-record change point {year} ({p}, step {step} mm)",
    bn: "পুরো রেকর্ডে পরিবর্তন-বিন্দু {year} ({p}, ধাপ {step} মিমি)",
  },
  homog_in_window: {
    en: "a further step at {year} sits {where} inside the 2001–2025 analysis window",
    bn: "২০০১–২০২৫ বিশ্লেষণ-উইন্ডোর ভেতর {year} সালে আরেকটি ধাপ {where} পড়ে",
  },
  homog_clean: { en: "no significant step inside the 2001–2025 analysis window", bn: "২০০১–২০২৫ বিশ্লেষণ-উইন্ডোতে উল্লেখযোগ্য ধাপ নেই" },
  homog_temp_label: { en: "Temperature homogeneity (annual mean T2M_MAX):", bn: "তাপমাত্রার সমজাতীয়তা (বার্ষিক গড় T2M_MAX):" },
  homog_temp_step: { en: "step at {year} ({p})", bn: "{year} সালে ধাপ ({p})" },
  homog_temp_clean: { en: "no significant step in the analysis window", bn: "বিশ্লেষণ-উইন্ডোতে উল্লেখযোগ্য ধাপ নেই" },
  cp_era_b: { en: "inside era B", bn: "যুগ B-এর ভেতর" },
  cp_era_a: { en: "in era A or at the era boundary", bn: "যুগ A-তে বা যুগের সীমায়" },
  xcheck_label: { en: "CHIRPS cross-check", bn: "CHIRPS যাচাই" },
  xcheck_line: {
    en: "{deg}° cell {lat}, {lon}; retrieved {date}: onset r={r}, MAE {mae} d, {n} years; annual rainfall r={r2}, MAE {mae2} mm. Used for: trend ← {trend}, onset ← {onset}.",
    bn: "{deg}° ঘর {lat}, {lon}; সংগ্রহ {date}: শুরু r={r}, MAE {mae} দিন, {n} বছর; বার্ষিক বৃষ্টি r={r2}, MAE {mae2} মিমি. ব্যবহৃত: ধারা ← {trend}, শুরু ← {onset}।",
  },
  xcheck_missing: {
    en: "This point has no CHIRPS cross-check on file, so its POWER figures rest on NASA POWER alone; an independent product arrives with the next data build.",
    bn: "এই স্থানের জন্য CHIRPS যাচাই ফাইলে নেই — তাই এর POWER সংখ্যাগুলো শুধু NASA POWER-এর ওপর দাঁড়িয়ে আছে; স্বাধীন একটি পণ্য পরবর্তী ডেটা বিল্ডে যোগ হবে।",
  },

  // “This season so far” nowcast card + data-outage banner.
  nowcast_title: { en: "This season so far", bn: "এই মৌসুমে এখন পর্যন্ত" },
  nowcast_intro: {
    en: "The last {n} days of rain, temperature and surface wetness at this point, against this point's own normal.",
    bn: "এই বিন্দুর গত {n} দিনের বৃষ্টি, তাপমাত্রা ও ভূপৃষ্ঠের আর্দ্রতা — এই বিন্দুর নিজস্ব স্বাভাবিকের সঙ্গে তুলনায়।",
  },
  nowcast_loading: { en: "Loading this season's data…", bn: "এই মৌসুমের তথ্য লোড হচ্ছে…" },
  nowcast_window_label: { en: "Window", bn: "সময়সীমা" },
  nowcast_live_badge: { en: "Live · NASA POWER · fetched {date}", bn: "লাইভ · NASA POWER · সংগ্রহ {date}" },
  nowcast_saved_badge: {
    en: "Saved data pack · NASA POWER · retrieved {retrieved}, data to {last}",
    bn: "সংরক্ষিত ডেটা প্যাক · NASA POWER · সংগ্রহ {retrieved}, ডেটা {last} পর্যন্ত",
  },
  nowcast_none_badge: { en: "No data source · this point has no saved pack", bn: "কোনো তথ্যসূত্র নেই · এই বিন্দুর প্যাক সংরক্ষিত নেই" },
  nowcast_no_pack: {
    en: "No nowcast pack is stored for this point and the live request did not answer, so this card shows no numbers. The precomputed set covers {count} points and grows with each data build.",
    bn: "এই বিন্দুর জন্য কোনো নাকাস্ট প্যাক সংরক্ষিত নেই এবং লাইভ অনুরোধও উত্তর দেয়নি — তাই এই কার্ডে কোনো সংখ্যা দেখানো হয় না। প্রস্তুত সেটটি {count} বিন্দু ধারণ করে এবং প্রতি ডেটা বিল্ডে বাড়তে থাকে।",
  },
  nowcast_rain: { en: "Rain", bn: "বৃষ্টি" },
  nowcast_rain_sub: { en: "total vs normal over the window", bn: "সময়সীমায় মোট বনাম স্বাভাবিক" },
  nowcast_temp: { en: "Temperature", bn: "তাপমাত্রা" },
  nowcast_temp_sub: { en: "daily mean vs normal", bn: "দৈনিক গড় বনাম স্বাভাবিক" },
  nowcast_wet: { en: "Surface soil wetness (GWETTOP)", bn: "ভূপৃষ্ঠের মাটির আর্দ্রতা (GWETTOP)" },
  nowcast_wet_sub: { en: "0–100 % wet, mean vs normal", bn: "০–১০০% আর্দ্র, গড় বনাম স্বাভাবিক" },
  nowcast_normal_word: { en: "normal", bn: "স্বাভাবিক" },
  nowcast_pct_of_normal: { en: "{pct}% of normal", bn: "স্বাভাবিকের {pct}%" },
  nowcast_above: { en: "above normal", bn: "স্বাভাবিকের থেকে বেশি" },
  nowcast_below: { en: "below normal", bn: "স্বাভাবিকের থেকে কম" },
  nowcast_near: { en: "close to normal", bn: "স্বাভাবিকের কাছাকাছি" },
  nowcast_unit_pct_points: { en: "pp", bn: "পয়েন্ট" },
  nowcast_baseline_line: {
    en: "Normal: {first}–{last}, same calendar dates, ±{days}-day window",
    bn: "স্বাভাবিক: {first}–{last}, একই ক্যালেন্ডার তারিখ, ±{days} দিনের জানালা",
  },
  nowcast_chart_title: { en: "Daily rain against the normal", bn: "দৈনিক বৃষ্টি বনাম স্বাভাবিক" },
  nowcast_chart_rain: { en: "rain (mm/day)", bn: "বৃষ্টি (মিমি/দিন)" },
  nowcast_context_note: {
    en: "Each anomaly compares this point's recent days with this point's own normal. It is context for the season, not a forecast, and it does not change the rotation scores.",
    bn: "প্রতিটি পরিবর্তন এই বিন্দুর সাম্প্রতিক দিনগুলোকে এই বিন্দুরই নিজস্ব স্বাভাবিকের সঙ্গে তুলনা করে। এটি মৌসুমের প্রেক্ষাপট, পূর্বাভাস নয়, এবং ফসল-পর্যায়ের স্কোর বদলায় না।",
  },
  nowcast_gap: { en: "— · no complete days for this variable in the window", bn: "— · এই সময়সীমায় চলকটির পূর্ণাঙ্গ দিন নেই" },
  nowcast_valid_days: {
    en: "Days counted in this window: rain {rain}/{of} · temperature {temp}/{of} · wetness {wet}/{of}",
    bn: "এই সময়সীমায় গণনা করা দিন: বৃষ্টি {rain}/{of} · তাপমাত্রা {temp}/{of} · আর্দ্রতা {wet}/{of}",
  },
  outage_banner: {
    en: "Live NASA POWER data is unavailable right now. Showing the saved data pack from {date}.",
    bn: "এই মুহূর্তে NASA POWER-এর লাইভ তথ্য পাওয়া যাচ্ছে না। {date}-এর সংরক্ষিত ডেটা প্যাক দেখানো হচ্ছে।",
  },
  outage_banner_none: {
    en: "No data is available for this point right now — the saved pack is not on file and the live request did not answer, so no numbers are shown.",
    bn: "এই বিন্দুর জন্য এখন কোনো তথ্য নেই — সংরক্ষিত প্যাকটি ফাইলে নেই এবং লাইভ অনুরোধও উত্তর দেয়নি, তাই কোনো সংখ্যা দেখানো হয় না।",
  },
  outage_retry: { en: "Retry", bn: "আবার চেষ্টা করুন" },
  outage_reason: { en: "request said: {reason}", bn: "অনুরোধের উত্তর: {reason}" },

  // Pick a location.
  locate_intro: {
    en: "Click the map or choose a district — Field Shift snaps to the nearest point that already has NASA POWER data on file.",
    bn: "ম্যাপে ক্লিক করুন বা জেলা বাছুন — Field Shift সেই নিকটতম বিন্দুতে যায় যেটির জন্য আগে থেকেই NASA POWER ডেটা সংরক্ষিত আছে।",
  },
  locate_district_label: { en: "District", bn: "জেলা" },
  locate_district_placeholder: { en: "Choose a district…", bn: "একটি জেলা বাছুন…" },
  locate_map_hint_short: { en: "chosen on the map", bn: "ম্যাপে বেছে নেওয়া" },
  locate_start_hint: {
    en: "Choose a district or click the map to see which point already has NASA POWER data on file.",
    bn: "একটি জেলা বাছুন বা ম্যাপে ক্লিক করুন — কোন বিন্দুর জন্য আগে থেকেই NASA POWER ডেটা সংরক্ষিত আছে তা দেখতে।",
  },
  locate_map_hint: { en: "Click the map to choose a point · {n} precomputed points marked", bn: "বিন্দু বেছে নিতে ম্যাপে ক্লিক করুন · {n}টি প্রস্তুত বিন্দু চিহ্নিত" },
  locate_map_offline: {
    en: "The basemap draws over the internet, so the map stays blank here — the district list and every number on this page still work.",
    bn: "মানচিত্রের বেসম্যাপ ইন্টারনেট থেকে আসে, তাই এখানে ম্যাপ ফাঁকা থাকে — তবে জেলার তালিকা ও এই পাতার প্রতিটি সংখ্যার কাজ চলবে।",
  },
  locate_picked: { en: "Your pick", bn: "আপনার বাছাই" },
  locate_using: {
    en: "Using precomputed point: {name} ({kind}) — {km} km from your pick",
    bn: "প্রস্তুত বিন্দু ব্যবহার হচ্ছে: {name} ({kind}) — আপনার বাছাই থেকে {km} কিমি",
  },
  locate_kind_district_pack: { en: "district data pack", bn: "জেলা ডেটা প্যাক" },
  locate_kind_demo_farm: { en: "demo farm", bn: "ডেমো খামার" },
  locate_outside: {
    en: "That point is outside Bangladesh (88.0–92.7°E, 20.5–26.7°N), so no data pack covers it and nothing is snapped. Choose a district or a point inside the country.",
    bn: "বিন্দুটি বাংলাদেশের বাইরে (৮৮.০–৯২.৭° পূ., ২০.৫–২৬.৭° উ.), তাই কোনো ডেটা প্যাক এটি ধরে না এবং কিছুই মেলানো হয় না। দেশের ভেতরের একটি জেলা বা বিন্দু বাছুন।",
  },
  locate_far: {
    en: "The nearest point is {km} km away, so read its weather as area context rather than your own field's record.",
    bn: "নিকটতম বিন্দুটি {km} কিমি দূরে — তাই তার আবহাওয়াকে নিজ মাঠের রেকর্ড নয়, এলাকার প্রেক্ষাপট হিসেবে পড়ুন।",
  },
  locate_pack_heading: { en: "Data pack at this point", bn: "এই বিন্দুর ডেটা প্যাক" },
  locate_temp_year: { en: "Mean temperature ({year})", bn: "গড় তাপমাত্রা ({year})" },
  locate_heat_year: { en: "Heat days >{c} °C ({year})", bn: "তাপের দিন >{c}°C ({year})" },
  locate_own_point: {
    en: "A district chosen from the list uses that district's own data point",
    bn: "তালিকা থেকে জেলা বাছাই করলে সেই জেলার নিজের ডেটা বিন্দুই ব্যবহৃত হয়",
  },
  locate_no_pack: {
    en: "This point's POWER pack could not be read on this device, so the figures below keep the demo farm inputs and stay labelled.",
    bn: "এই বিন্দুর POWER প্যাকটি এই ডিভাইসে পড়া যায়নি, তাই নিচের সংখ্যাগুলো ডেমো খামারের ইনপুটই রেখেছে এবং তা স্পষ্ট করে লেখা আছে।",
  },
  locate_quick_link: { en: "Quick answer for this district", bn: "এই জেলার দ্রুত উত্তর" },
  locate_open_farm: { en: "Open farm", bn: "খামার দেখুন" },
  pack_no_value: { en: "no value in this pack", bn: "এই প্যাকে মান নেই" },

  // Quick answer.
  quick_intro: {
    en: "Three choices, one screen: your district, the crop standing in the field now, and what matters most to you. The ranking runs on this device.",
    bn: "তিনটি বাছাই, একটি পর্দা: আপনার জেলা, এখন মাঠে যে ফসল আছে, এবং আপনার সবচেয়ে বড় অগ্রাধিকার। র‍্যাঙ্ক এই ডিভাইসেই হিসাব হয়।",
  },
  quick_crop_label: { en: "Current crop", bn: "বর্তমান ফসল" },
  quick_priority_label: { en: "Priority", bn: "অগ্রাধিকার" },
  pri_balanced: { en: "Balanced", bn: "ভারসাম্য" },
  pri_water: { en: "Water saving", bn: "পানি সাশ্রয়" },
  pri_soil: { en: "Soil health", bn: "মাটির স্বাস্থ্য" },
  pri_stable: { en: "Stable harvest", bn: "স্থিতিশীল ফলন" },
  pri_risk: { en: "Heat & flood safety", bn: "তাপ ও বন্যা নিরাপত্তা" },
  quick_top: { en: "Top {n} rotations that keep {crop}", bn: "{crop} রেখে সেরা {n}টি ফসল-পর্যায়" },
  quick_fewer: {
    en: "Only {n} valid rotation(s) keep {crop} in the year at this point's calendar — the planner ranks everything the 365-day year can hold.",
    bn: "এই বিন্দুর ক্যালেন্ডারে {crop} রেখে মাত্র {n}টি বৈধ ফসল-পর্যায় পাওয়া গেছে — পরিকল্পক ৩৬৫ দিনের বছরে যা সইতে পারে সবই র‍্যাঙ্ক করে।",
  },
  quick_none: {
    en: "No rotation in the pool keeps {crop} — every sequence holding it overruns the 365-day calendar at this point's onset.",
    bn: "তালিকার কোনো ফসল-পর্যায় {crop} রেখে না — এটি ধরে প্রতিটি ক্রমই এই বিন্দুর শুরুর সময়ে ৩৬৫ দিন ছাড়িয়ে যায়।",
  },
  quick_score_heading: { en: "How the score builds", bn: "স্কোর যেভাবে গড়ে" },
  quick_equation: {
    en: "Σ parts {parts} − penalties {penalties} + credit {credit} = {total}",
    bn: "অংশের যোগ {parts} − কাটা {penalties} + সুবিধা {credit} = {total}",
  },
  quick_credit_label: { en: "Early-onset credit", bn: "আগে বর্ষা শুরুর সুবিধা" },
  quick_calendar_note: { en: "{used} of the 365-day year used", bn: "৩৬৫ দিনের বছরে {used} দিন লাগছে" },
  quick_salinity_unsurveyed: { en: "no SRDI value for this district", bn: "এই জেলার জন্য SRDI-র কোনো মান নেই" },
  quick_parts_label: { en: "Sum of parts", bn: "অংশের যোগ" },
  quick_penalties_label: { en: "Penalties", bn: "পয়েন্ট কাটা" },
  see_why: { en: "See why", bn: "কেন দেখুন" },
  quick_inputs_heading: { en: "Inputs used", bn: "যে ইনপুট ব্যবহার হয়েছে" },
  quick_power_input: { en: "{product} data pack for this point · retrieved {date}", bn: "এই বিন্দুর {product} ডেটা প্যাক · সংগ্রহ {date}" },
  quick_onset_input: {
    en: "Onset ({product}): median {days} {unit}, p = {p} — {verdict}",
    bn: "বর্ষার শুরু ({product}): মধ্যক {days} {unit}, p = {p} — {verdict}",
  },
  quick_salinity_input: { en: "Salinity: {source}", bn: "লবণাক্ততা: {source}" },
  quick_farm_input: {
    en: "soil, water and irrigation inputs from the nearest demo farm {name} ({km} km)",
    bn: "নিকটতম ডেমো খামার {name} ({km} কিমি)-এর মাটি, পানি ও সেচের ইনপুট",
  },
  quick_next_phase: {
    en: "District soil and irrigation layers come in the next phase; this build uses the nearest demo farm's inputs, and says which farm.",
    bn: "জেলাভিত্তিক মাটি ও সেচের স্তর পরবর্তী ধাপে আসবে; এই বিল্ড নিকটতম ডেমো খামারের ইনপুট ব্যবহার করে এবং কোন খামার তা লেখে।",
  },
  quick_pack_missing: {
    en: "This district's NASA POWER data pack could not be loaded, so no ranking is shown.",
    bn: "এই জেলার NASA POWER ডেটা প্যাকটি লোড হয়নি, তাই কোনো র‍্যাঙ্ক দেখানো হয় না।",
  },
  quick_risks_heading: { en: "Risks", bn: "ঝুঁকি" },
  home_entry_heading: { en: "Start here", bn: "এখান থেকে শুরু করুন" },
  home_quick_body: {
    en: "Choose a district, the crop in your field and your priority — get the top three rotations with every score shown as its parts.",
    bn: "জেলা, মাঠের ফসল ও অগ্রাধিকার বাছুন — সেরা তিনটি ফসল-পর্যায় দেখুন, প্রতিটি স্কোর তার অংশভেদে দেখানো।",
  },
  home_locate_body: {
    en: "Point at the map or pick a district, and Field Shift snaps to the nearest location with NASA POWER data already on file.",
    bn: "ম্যাপে ক্লিক করুন বা জেলা বাছুন — Field Shift সংরক্ষিত NASA POWER ডেটা থাকা নিকটতম স্থানটি নিয়ে নেয়।",
  },
} as const;

export type StringKey = keyof typeof STRINGS;
/** Every key, so a test can require en and bn for each string the interface reads. */
export const STRING_KEYS = Object.keys(STRINGS) as StringKey[];
export const t = (key: StringKey, lang: Lang) => STRINGS[key][lang];

/** Interface text that exists in both languages, carrying the same numbers in each. */
export interface BiText {
  en: string;
  bn: string;
}

export const pick = (text: BiText, lang: Lang) => text[lang];

/** Strings with {placeholder} slots — the phrasing follows the language and inserted numbers take that language's digits. */
export const tf = (key: StringKey, lang: Lang, vars: Record<string, string | number>) =>
  STRINGS[key][lang].replace(/\{(\w+)\}/g, (_match, name: string) => fmtNum(String(vars[name] ?? ""), lang));

const GROWTH_STAGE_BN: Record<string, string> = {
  Vegetative: "বর্ধনাকাল",
  Tillering: "কুশি পড়া",
  Flowering: "ফুল ধরা",
};

export const growthStageLabel = (stage: string, lang: Lang) =>
  lang === "bn" ? GROWTH_STAGE_BN[stage] ?? stage : stage;

const SOIL_TEXTURE_BN: Record<string, string> = {
  Loam: "দোঁশ",
  "Clay Loam": "এঁটে-দোঁশ",
  "Sandy Loam": "বেলে-দোঁশ",
  "Silty Clay": "পলল-এঁটে",
  "Silty Clay Loam": "পলল-এঁটে-দোঁশ",
};

export const soilTextureLabel = (texture: string, lang: Lang) =>
  lang === "bn" ? SOIL_TEXTURE_BN[texture] ?? texture : texture;

/** Calendar month names in both languages, index 0 = January. */
const MONTHS: [string, string][] = [
  ["Jan", "জানু"], ["Feb", "ফেব্রু"], ["Mar", "মার্চ"], ["Apr", "এপ্রিল"], ["May", "মে"], ["Jun", "জুন"],
  ["Jul", "জুলাই"], ["Aug", "আগ"], ["Sep", "সেপ্ট"], ["Oct", "অক্টো"], ["Nov", "নভে"], ["Dec", "ডিসে"],
];

export const monthLabel = (monthIndex: number, lang: Lang) => {
  const [en, bn] = MONTHS[((monthIndex % 12) + 12) % 12];
  return lang === "bn" ? bn : en;
};

/** Day plus month for a day-of-year value, written the way the language writes dates. */
export const dayMonthLabel = (doy: number, lang: Lang, year = 2024) => {
  const d = new Date(year, 0, doy);
  return lang === "bn" ? `${toBnDigits(d.getDate())} ${monthLabel(d.getMonth(), "bn")}` : d.toLocaleString("en", { month: "short", day: "numeric" });
};

export const CONF_KEYS = {
  high: "conf_high",
  medium: "conf_medium",
  low: "conf_low",
} as const;

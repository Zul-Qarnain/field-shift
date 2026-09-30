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
  search_ph: { en: "Search district or demo farm…", bn: "জেলা বা খামার খুঁজুন…" },
  tagline: { en: "Earth data. Smarter farms.", bn: "পৃথিবীর তথ্য। ভালো ফসল।" },
  shell_note_1: { en: "Sample data today.", bn: "আজ নমুনা ডেটায়।" },
  shell_note_2: { en: "NASA feeds next.", bn: "পরে NASA-র ডেটা।" },
  shell_note_3: { en: "A healthier tomorrow.", bn: "সুস্থ আগামীকাল।" },
  country: { en: "Bangladesh", bn: "বাংলাদেশ" },
  demo_fixture: { en: "demo fixture", bn: "ডেমো ফিক্সচার" },
  not_retrieved: { en: "not yet (demo fixture)", bn: "এখনও সংগ্রহ হয়নি (ডেমো ফিক্সচার)" },
  demo_flags: { en: "demo flags", bn: "ডেমো চিহ্ন" },
  view: { en: "View", bn: "দেখুন" },
  copy: { en: "Copy", bn: "কপি" },
  copied: { en: "Copied", bn: "কপি হয়েছে" },
  close: { en: "Close", bn: "বন্ধ" },
  open_link: { en: "Open ↗", bn: "খুলুন ↗" },
  coming_soon: { en: "coming soon", bn: "শীঘ্রই আসছে" },
  english_only_note: { en: "Detailed definitions are in English for now.", bn: "বিস্তারিত সংজ্ঞা আপাতত ইংরেজিতে।" },
  english_only_table_note: { en: "The dataset roles below stay in English for now.", bn: "নিচের ডেটাসেটের ভূমিকা আপাতত ইংরেজিতেই লেখা।" },
  generated_fixtures: {
    en: "Demo fixtures — deterministic sample data until the pipeline fills the cache",
    bn: "ডেমো ফিক্সচার — পাইপলাইন চালু হলে প্রকৃত ক্যাশ ডেটা আসবে",
  },
  footer_line: {
    en: "Built for the NASA Space Apps Challenge — a community science initiative. Not an official NASA product.",
    bn: "NASA Space Apps Challenge-এর জন্য নির্মিত — একটি কমিউনিটি সায়েন্স উদ্যোগ। এটি NASA-র কোনো দাপ্তরিক পণ্য নয়।",
  },

  hero_line1: { en: "The rains shifted.", bn: "বৃষ্টির সময় বদলেছে।" },
  hero_line2: { en: "Your calendar should too.", bn: "আপনার ফসলের ক্যালেন্ডারও বদলান।" },
  hero_intro: {
    en: "Field Shift is designed to turn NASA Earth observations (POWER, SMAP, MODIS …) — rainfall onset, soil moisture, heat days, greenness — into ranked, explainable crop-rotation strategies for a specific farm. Every number traces to its dataset. This demo runs on sample data; offline mode is planned.",
    bn: "Field Shift একটি নির্দিষ্ট খামারের জন্য NASA-র পৃথিবী পর্যবেক্ষণ (POWER, SMAP, MODIS …) — বর্ষার শুরু, মাটির আর্দ্রতা, তাপের দিন, সবুজাভতা — থেকে র‍্যাঙ্ক করা, ব্যাখ্যাযোগ্য ফসল-পর্যায় পরিকল্পনা বানানোর জন্য তৈরি। প্রতিটি সংখ্যা কোন ডেটাসেট থেকে এসেছে তা দেখা যায়। এই ডেমো নমুনা ডেটায় চলে; অফলাইন মোড পরিকল্পনায় আছে।",
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
  field_cards_note: {
    en: "Demo fixture values — these four cards are sample data until the pipeline caches the named feeds.",
    bn: "ডেমো ফিক্সচারের মান — নাম লেখা ফিডগুলো পাইপলাইন ক্যাশ করা পর্যন্ত এই চারটি কার্ড নমুনা ডেটা।",
  },
  sample_distributions: {
    en: "Sample distributions — real POWER onset years arrive with the pipeline.",
    bn: "নমুনা বণ্টন — পাইপলাইন এলে প্রকৃত POWER শুরুর বছরগুলো আসবে।",
  },
  per_decade: { en: "per decade · 1981–2025", bn: "প্রতি দশকে · ১৯৮১–২০২৫" },
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
  map_offline: { en: "Map needs internet — satellite tiles could not load", bn: "ম্যাপের ইন্টারনেট দরকার — স্যাটেলাইট টাইল লোড হতে পারেনি" },
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
    en: "Sensitivity testing is planned and not yet run; move the priority sliders and the what-if scenarios to see how the ranking changes.",
    bn: "সংবেদনশীলতা পরীক্ষা পরিকল্পনায় আছে, এখনও চালানো হয়নি; অগ্রাধিকার স্লাইডার ও দৃশ্যপট বদলে দেখুন র‍্যাঙ্ক কীভাবে বদলায়।",
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
    en: "Demo build: numbers on these pages come from sample fixtures, not yet from the NASA data pipeline.",
    bn: "ডেমো বিল্ড: এই পাতার সংখ্যাগুলো নমুনা ফিক্সচার থেকে আসে, এখনও NASA ডেটা পাইপলাইন থেকে নয়।",
  },
  method_footnote: {
    en: "The decision engine is deterministic and unit-tested; no language model computes any number in this product. The TypeScript runtime engine has its own unit tests; a cross-check against a Python reference implementation is planned and does not exist yet.",
    bn: "সিদ্ধান্ত ইঞ্জিন নির্ধারিত (deterministic) ও ইউনিট-পরীক্ষিত; এই পণ্যের কোনো সংখ্যা ভাষার মডেল হিসাব করে না। TypeScript ইঞ্জিনের নিজস্ব ইউনিট পরীক্ষা আছে; Python রেফারেন্স বাস্তবায়নের সঙ্গে যাচাই পরিকল্পনায় আছে, এখনও তৈরি হয়নি।",
  },
  data_title: { en: "Data sources", bn: "ডেটার উৎস" },
  data_intro: {
    en: "Every dataset Field Shift is designed to use, its role, and how it would be accessed. NASA data is the compulsory foundation; Space Agency Partner data is strictly supplementary; soil and basemaps are the labeled open non-space layer. The current build runs on demo fixtures — no dataset below has been retrieved yet. OpenET is named in the challenge summary but covers only the United States — it is replaced by NASA MOD16.",
    bn: "Field Shift যে সব ডেটাসেট ব্যবহারের জন্য তৈরি, তার ভূমিকা ও কীভাবে তা পাওয়া যাবে — সব এখানে। NASA-র ডেটাই বাধ্যতামূলক ভিত্তি; মহাকাশ এজেন্সি পার্টনারের ডেটা কেবল বাড়তি স্তর; মাটি ও বেসম্যাপ হলো চিহ্নিত মুক্ত অ-মহাকাশ স্তর। বর্তমান বিল্ড ডেমো ফিক্সচারে চলে — নিচের কোনো ডেটাসেট এখনও সংগ্রহ করা হয়নি। OpenET-এর নাম চ্যালেঞ্জ সারাংশে আছে, তবে তা শুধু যুক্তরাষ্ট্রের জন্য — বদলে NASA MOD16 রাখা হয়েছে।",
  },
  data_footnote: {
    en: "This list is a hand-maintained plan of the datasets the app is designed to use — it is not generated from a manifest, and none of it has been retrieved yet. Retrieval dates, versions and cache provenance will be added per farm once the pipeline has cached the data; the in-app provenance drawer says so today.",
    bn: "এই তালিকাটি হাতে রক্ষণাবেক্ষণ করা পরিকল্পনা — কোনো ম্যানিফেস্ট থেকে তৈরি হয়নি, এবং এখনও কোনো ডেটা সংগ্রহ করা হয়নি। পাইপলাইন ডেটা ক্যাশ করলে খামারভিত্তিক সংগ্রহের তারিখ, সংস্করণ ও ক্যাশ-উৎস যোগ হবে; অ্যাপের উৎস-ড্রয়ারে তাই এখন লেখা আছে।",
  },
  th_dataset: { en: "Dataset", bn: "ডেটাসেট" },
  th_role: { en: "Role in the decision", bn: "সিদ্ধান্তে ভূমিকা" },
  th_resolution: { en: "Resolution", bn: "রেজোলিউশন" },
  th_temporal: { en: "Temporal", bn: "সময়সীমা" },
  th_link: { en: "Link", bn: "লিঙ্ক" },

  src_fixture: { en: "fixture", bn: "ডেমো ফিক্সচার" },
  src_cache: { en: "cache", bn: "ক্যাশ" },
  src_live: { en: "live", bn: "লাইভ" },
  copy_failed: { en: "Copy failed — select the text", bn: "কপি হয়নি — লেখাটি নির্বাচন করুন" },
  unit_ha: { en: "ha", bn: "হেক্টর" },
  unit_m: { en: "m", bn: "মিটার" },

  card_sub_moisture: { en: "SMAP L4 · vs last {n} d", bn: "SMAP L4 · গত {n} দিনের তুলনায়" },
  card_sub_temp: { en: "POWER · vs {n}-y mean", bn: "POWER · {n} বছরের গড়ের তুলনায়" },
  card_sub_ndvi: { en: "MODIS/VIIRS · greenness", bn: "MODIS/VIIRS · সবুজাভতা" },
  card_sub_heat: { en: "T2M_MAX · per season", bn: "T2M_MAX · মৌসুম প্রতি" },

  chart_current: { en: "Current season", bn: "চলতি মৌসুম" },
  chart_previous: { en: "Previous", bn: "আগের মৌসুম" },
  chart_historical: { en: "Historical avg", bn: "ঐতিহাসিক গড়" },
  chart_pct_season: { en: "of season", bn: "মৌসুমের অংশ" },
  chart_mann_whitney: { en: "Mann-Whitney", bn: "ম্যান-হুইটনি" },
  chart_onset_rule: {
    en: "Onset rule: {rule}. Medians: {from} → {to}.",
    bn: "শুরুর নিয়ম: {rule}। মধ্যক: {from} → {to}।",
  },
  onset_rule_bn: { en: "7-day window ≥ 20 mm, dry spell ≤ 7 days", bn: "৭ দিনের উইন্ডোতে ≥ ২০ মিমি বৃষ্টি, তারপর ৭ দিনের বেশি শুকনো সময় নয়" },
  drawer_sources: {
    en: "Planned sources — demo values today: water: NASA POWER (daily, 1981–2025) + SMAP L4 · heat: POWER T2M_MAX · soil: SoilGrids 2.0 (modeled, CC-BY-4.0) · demand: FAO-56 crop coefficients · flood: farm flood index (BD context) · irrigation access and crop durations: per-farm / per-crop ESTIMATE, not yet cited · onset shift: farm fixture + the what-if you picked · engine: field-shift rotation v1.1 (deterministic, tested)",
    bn: "পরিকল্পিত উৎস — আজকের মান ডেমো: পানি: NASA POWER (দৈনিক, ১৯৮১–২০২৫) + SMAP L4 · তাপ: POWER T2M_MAX · মাটি: SoilGrids 2.0 (মডেল, CC-BY-4.0) · চাহিদা: FAO-56 ফসল-গুণাঙ্ক · বন্যা: খামারের বন্যা-সূচক (বাংলাদেশ প্রেক্ষিত) · সেচ-প্রবেশাধিকার ও বর্ধনাকাল: খামার/ফসলভিত্তিক ESTIMATE, এখনও উদ্ধৃত নয় · শুরুর পরিবর্তন: খামারের ফিক্সচার + আপনার বেছে নেওয়া দৃশ্যপট · ইঞ্জিন: field-shift rotation v1.1 (নির্ধারিত, পরীক্ষিত)",
  },
} as const;

export type StringKey = keyof typeof STRINGS;
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

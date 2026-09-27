export type Lang = "en" | "bn";

const STRINGS = {
  nav_home: { en: "Home", bn: "হোম" },
  nav_field: { en: "Field Analysis", bn: "মাঠ বিশ্লেষণ" },
  nav_plan: { en: "Crop Planning", bn: "ফসল পরিকল্পনা" },
  nav_map: { en: "Map Explorer", bn: "ম্যাপ এক্সপ্লোরার" },
  nav_method: { en: "Method", bn: "পদ্ধতি" },
  nav_data: { en: "Data", bn: "ডেটা" },
  search_ph: { en: "Search district or demo farm…", bn: "জেলা বা খামার খুঁজুন…" },
  monitored: { en: "Demo field", bn: "নমুনা মাঠ" },
  onset_detected: { en: "Crop onset shift detected", bn: "ফসলের সময় পরিবর্তন ধরা পড়েছে" },
  days_earlier: { en: "days earlier than usual", bn: "দিন আগের মতো শুরু" },
  days_later: { en: "days later than usual", bn: "দিন পরের মতো শুরু" },
  recommended_action: { en: "What this changes", bn: "এর অর্থ কী" },
  view_analysis: { en: "Plan the rotation", bn: "ফসল-পর্যায় পরিকল্পনা" },
  last_updated: { en: "Data window", bn: "ডেটা সময়সীমা" },
  field_details: { en: "Field details", bn: "মাঠের তথ্য" },
  data_provenance: { en: "Data provenance", bn: "ডেটার উৎস" },
  uncertainty: { en: "Uncertainty", bn: "অনিশ্চয়তা" },
  uncertainty_note: { en: "Onset is computed from a stated rule over observed data — not a forecast. Soil is modeled; correct it if you know better.", bn: "শুরুর সময় নির্দিষ্ট নিয়মে পর্যবেক্ষিত ডেটা থেকে গণনা করা — পূর্বাভাস নয়। মাটি মডেল করা; জানা থাকলে সংশোধন করুন।" },
  layers: { en: "Data layers", bn: "ডেটা লেয়ার" },
  footer_line: { en: "Built for the NASA Space Apps Challenge — a community science initiative. Not an official NASA product.", bn: "NASA Space Apps Challenge-এর জন্য নির্মিত — একটি কমিউনিটি সায়েন্স উদ্যোগ। এটি NASA-র কোনো দাপটিক পণ্য নয়।" },
  priorities: { en: "Your priorities", bn: "আপনার অগ্রাধিকার" },
  rotations: { en: "Ranked rotations", bn: "ফসল-পর্যায়" },
  why: { en: "Why", bn: "কেন" },
  scenarios: { en: "What-if", bn: "যদি এমন হয়" },
  copy: { en: "Copy", bn: "কপি" },
  copied: { en: "Copied", bn: "কপি হয়েছে" },
  generated_fixtures: { en: "Demo fixtures — deterministic sample data until the pipeline fills the cache", bn: "ডেমো ফিক্সচার — পাইপলাইন চালু হলে প্রকৃত ক্যাশ ডেটা আসবে" },
} as const;

export type StringKey = keyof typeof STRINGS;
export const t = (key: StringKey, lang: Lang) => STRINGS[key][lang];

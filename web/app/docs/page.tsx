"use client";

import { useState } from "react";
import { Panel, SourceChip } from "@/components/ui";
import { useLang } from "@/lib/lang";
import { t } from "@/lib/i18n";
import { 
  BookOpen, 
  Sprout, 
  Zap, 
  MapPin, 
  CalendarRange, 
  Database, 
  Smartphone, 
  HelpCircle, 
  CheckCircle2, 
  ShieldCheck,
  ChevronDown,
  ChevronUp
} from "lucide-react";

export default function DocsPage() {
  const { lang } = useLang();
  const bn = lang === "bn";

  const [activeTab, setActiveTab] = useState<"quickstart" | "pages" | "crops" | "faq">("quickstart");
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const toggleFaq = (idx: number) => {
    setOpenFaq(openFaq === idx ? null : idx);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 lg:px-8">
      {/* Page Header */}
      <div className="border-b border-line pb-6">
        <div className="flex items-center gap-2 text-action">
          <BookOpen className="h-6 w-6" />
          <span className="text-xs font-bold uppercase tracking-wider">
            {bn ? "ব্যবহার নির্দেশিকা ও ডকুমেন্টেশন" : "User Guide & Documentation"}
          </span>
        </div>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-ink-hi sm:text-4xl">
          {bn ? "ফিল্ড শিফট কীভাবে ব্যবহার করবেন?" : "How to Use Field Shift"}
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink-mid">
          {bn
            ? "বাংলাদেশি কৃষক ও কৃষি কর্মকর্তাদের জন্য নাসা (NASA) স্যাটেলাইট ডেটাভিত্তিক ফসল পরিকল্পনা ব্যবস্থার সম্পূর্ণ নির্দেশিকা।"
            : "Complete documentation and step-by-step guidance for farmers, extension officers, and researchers to adapt crop rotations with NASA Earth data."}
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="mt-6 flex flex-wrap gap-2 border-b border-line pb-3">
        <button
          onClick={() => setActiveTab("quickstart")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
            activeTab === "quickstart"
              ? "bg-action text-white shadow-sm"
              : "border border-line bg-surface/80 text-ink-mid hover:bg-elevated hover:text-ink-hi"
          }`}
        >
          <Zap className="h-4 w-4" />
          {bn ? "দ্রুত নির্দেশিকা (Quick Start)" : "Farmer Quick Start"}
        </button>

        <button
          onClick={() => setActiveTab("pages")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
            activeTab === "pages"
              ? "bg-action text-white shadow-sm"
              : "border border-line bg-surface/80 text-ink-mid hover:bg-elevated hover:text-ink-hi"
          }`}
        >
          <MapPin className="h-4 w-4" />
          {bn ? "ওয়েবসাইটের সকল পেইজ" : "Page-by-Page Walkthrough"}
        </button>

        <button
          onClick={() => setActiveTab("crops")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
            activeTab === "crops"
              ? "bg-action text-white shadow-sm"
              : "border border-line bg-surface/80 text-ink-mid hover:bg-elevated hover:text-ink-hi"
          }`}
        >
          <Sprout className="h-4 w-4" />
          {bn ? "১২টি ফসলের তথ্য" : "12-Crop Science Catalog"}
        </button>

        <button
          onClick={() => setActiveTab("faq")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
            activeTab === "faq"
              ? "bg-action text-white shadow-sm"
              : "border border-line bg-surface/80 text-ink-mid hover:bg-elevated hover:text-ink-hi"
          }`}
        >
          <HelpCircle className="h-4 w-4" />
          {bn ? "সাধারণ প্রশ্নোত্তর (FAQ)" : "Frequently Asked Questions"}
        </button>
      </div>

      {/* TAB 1: QUICK START */}
      {activeTab === "quickstart" && (
        <div className="mt-8 space-y-6">
          <div className="rounded-2xl border border-action/30 bg-action/5 p-6">
            <h2 className="font-display text-lg font-bold text-ink-hi">
              {bn ? "১০ সেকেন্ডে ফসল পরিকল্পনা পাওয়ার ধাপ:" : "Get a 3-Season Plan in 10 Seconds:"}
            </h2>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-line bg-surface p-4">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-action text-xs font-bold text-white">1</span>
                <h3 className="mt-3 font-semibold text-ink-hi">
                  {bn ? "১. জেলা বাছাই করুন" : "1. Choose Your District"}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-ink-mid">
                  {bn
                    ? "Quick Answer (/quick) পেইজে গিয়ে বাংলাদেশের ৬৪ জেলার যেকোনো একটি নির্বাচন করুন।"
                    : "Go to Quick Answer (/quick) and pick any of the 64 districts in Bangladesh."}
                </p>
              </div>

              <div className="rounded-xl border border-line bg-surface p-4">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-action text-xs font-bold text-white">2</span>
                <h3 className="mt-3 font-semibold text-ink-hi">
                  {bn ? "২. বর্তমান ফসল ও অগ্রাধিকার" : "2. Standing Crop & Goal"}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-ink-mid">
                  {bn
                    ? "জমিতে এখন কোন ফসল আছে (যেমন: আমন) এবং কোনটি বেশি দরকার (পানি সাশ্রয়, মাটির স্বাস্থ্য, লাভ) বেছে নিন।"
                    : "Select your standing crop and your main goal (Save Water, Soil Health, Steady Harvest, Weather Safety)."}
                </p>
              </div>

              <div className="rounded-xl border border-line bg-surface p-4">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-action text-xs font-bold text-white">3</span>
                <h3 className="mt-3 font-semibold text-ink-hi">
                  {bn ? "৩. সেরা ৩টি ফসল-পর্যায়" : "3. Top 3 Ranked Plans"}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-ink-mid">
                  {bn
                    ? "সরাসরি বৈজ্ঞানিক স্কোরে সেরা ৩টি পর্যায় দেখুন এবং মাঠে নিয়ে যেতে 'SMS কপি' করুন।"
                    : "Instantly view the top 3 scored rotations with full arithmetic and one-click SMS advisory."}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-surface p-6">
            <h3 className="font-display text-base font-bold text-ink-hi">
              {bn ? "মোবাইলে সরাসরি অ্যান্ড্রয়েড অ্যাপ (PWA) হিসেবে ব্যবহারের নিয়ম:" : "Install as Android App (PWA) on Mobile:"}
            </h3>
            <ul className="mt-3 space-y-2 text-xs text-ink-mid leading-relaxed">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-earth" />
                <span>
                  {bn
                    ? "অ্যান্ড্রয়েড ফোনে Chrome ব্রাউজারে সাইটটি ওপেন করে উপরের 'Install' বা 'Add to Home screen' চাপুন।"
                    : "Open in mobile Chrome and tap 'Install App' or 'Add to Home screen'."}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-earth" />
                <span>
                  {bn
                    ? "এটি কোনো গুগল প্লে স্টোর অ্যাকাউন্ট ছাড়াই আপনার হোম স্ক্রিনে একটি অ্যাপ আইকন হিসেবে জমা হবে।"
                    : "Installs directly to your home screen without needing Google Play Store."}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-earth" />
                <span>
                  {bn
                    ? "বিল্ট-ইন সার্ভিস ওয়ার্কারের মাধ্যমে নেটওয়ার্ক না থাকলেও পূর্বে দেখা ফসল পরিকল্পনা ও এসএমএস তৈরি করা যাবে।"
                    : "Built-in service worker enables offline viewing and SMS generation in rural areas without internet."}
                </span>
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* TAB 2: PAGE-BY-PAGE GUIDE */}
      {activeTab === "pages" && (
        <div className="mt-8 space-y-4">
          <Panel title={bn ? "১. হোম পেইজ (/)" : "1. Home Page (/)"}>
            <p className="text-sm leading-relaxed text-ink-mid">
              {bn
                ? "ওয়েবসাইটের শুরুতেই করিমের গল্প, সমস্যা প্রেক্ষাপট এবং বাংলাদেশের বিভিন্ন অঞ্চলের ৬টি প্রতীকী ডেমো খামার (টাঙ্গাইল, রাজশাহী, বরিশাল, খুলনা, রংপুর, সিলেট) দেওয়া আছে।"
                : "Provides the project overview, Karim's story, challenge framing, and 6 representative demo farms across Bangladesh."}
            </p>
          </Panel>

          <Panel title={bn ? "২. কুইক অ্যানসার (/quick)" : "2. Quick Answer (/quick)"}>
            <p className="text-sm leading-relaxed text-ink-mid">
              {bn
                ? "একটি স্ক্রিনেই সম্পূর্ণ উত্তর। জেলা বাছাই করুন, ফসলের নাম দিন এবং একটি ক্লিকেই তিন ফসলের সবচেয়ে লাভজনক ও নিরাপদ পর্যায় জানুন। 'See why' বাটনে ক্লিক করলে প্রতিটি স্কোরের পেছনের সম্পূর্ণ গাণিতিক হিসাব দেখা যায়।"
                : "Single-screen rotation answer for any of Bangladesh's 64 districts. 'See why' breaks down the 8 mathematical scoring components."}
            </p>
          </Panel>

          <Panel title={bn ? "৩. স্থান নির্বাচন (/locate)" : "3. Location Picker (/locate)"}>
            <p className="text-sm leading-relaxed text-ink-mid">
              {bn
                ? "ইন্টারেক্টিভ মানচিত্রে ক্লিক করে অথবা জেলা সিলেক্ট করে যেকোনো স্থানের নিকটতম নাসা গ্রিড ডেটাপয়েন্ট (০.৫° গ্রিড) ও আবহাওয়ার অবস্থা দেখা যায়।"
                : "Click anywhere on the interactive Bangladesh map or pick a district to snap to the nearest NASA satellite grid centroid."}
            </p>
          </Panel>

          <Panel title={bn ? "৪. মাঠ বিশ্লেষণ (/field)" : "4. Field Analysis (/field)"}>
            <p className="text-sm leading-relaxed text-ink-mid">
              {bn
                ? "খামারের ১৯৮১ থেকে ২০২৬ পর্যন্ত ৪৫ বছরের নাসা পাওয়ার (NASA POWER) আবহাওয়া, জিপিএম আইমার্জ (GPM IMERG) স্যাটেলাইট বৃষ্টিপাত, এসএমএপি (SMAP L4) মাটির আর্দ্রতা, মোডিস (MODIS) ২৫০মি সবুজাভতা এবং গ্রেস (GRACE) ভূগর্ভস্থ পানির ধারা বিস্তারিতভাবে দেখতে পারবেন।"
                : "Comprehensive historical analytics: 45-year NASA POWER series, GPM IMERG satellite rainfall, SMAP L4 soil wetness, MODIS 250m NDVI, and GRACE-FO aquifer storage depletion."}
            </p>
          </Panel>

          <Panel title={bn ? "৫. ফসল পরিকল্পনা (/plan)" : "5. Crop Planning (/plan)"}>
            <p className="text-sm leading-relaxed text-ink-mid">
              {bn
                ? "এখানে চারটি অগ্রাধিকার স্লাইডার (পানি সাশ্রয়, মাটির স্বাস্থ্য, নিয়মিত ফলন, আবহাওয়া সহনশীলতা) পরিবর্তন করে ফসল রদবদল দেখতে পারেন। পাশাপাশি 'What-if' বোতাম দিয়ে বৃষ্টিপাত -২০% কমলে বা বর্ষা ১৫ দিন দেরিতে শুরু হলে কী ঘটবে তা পরীক্ষা করা যায়।"
                : "Interactive scenario simulator: adjust 4 priority sliders or stress-test your farm against -20% rainfall, +15 days delayed monsoon, or +2°C heat waves."}
            </p>
          </Panel>

          <Panel title={bn ? "৬. বৈজ্ঞানিক পদ্ধতি (/method) ও ডেটা রেজিস্ট্রি (/data)" : "6. Methodology (/method) & Data Registry (/data)"}>
            <p className="text-sm leading-relaxed text-ink-mid">
              {bn
                ? "পদ্ধতি পেইজে ফলন ক্ষয় ও লবণাক্ততা সহনশীলতার গাণিতিক সূত্র (Maas 1990 / FAO-29 / BARI / BJRI) এবং ডেটা পেইজে ব্যবহৃত ১৩টি নাসা ও জাতীয় ডেটাসেটের সরাসরি লাইসেন্স ও সংগ্রহের তারিখ দেওয়া আছে।"
                : "Method page documents all agronomic formulas and validation gates; Data page registers all 13 utilized NASA and national open datasets with full provenance."}
            </p>
          </Panel>
        </div>
      )}

      {/* TAB 3: CROPS CATALOG */}
      {activeTab === "crops" && (
        <div className="mt-8 overflow-hidden rounded-xl border border-line">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface uppercase tracking-wider text-ink-low">
              <tr>
                <th className="px-4 py-3">{bn ? "ফসল" : "Crop"}</th>
                <th className="px-4 py-3">{bn ? "মৌসুম" : "Season"}</th>
                <th className="px-4 py-3">{bn ? "সময়কাল" : "Duration"}</th>
                <th className="px-4 py-3">{bn ? "পানির চাহিদা" : "Water Need"}</th>
                <th className="px-4 py-3">{bn ? "লবণ সহনশীলতা (ECe)" : "Salt Tolerance (ECe)"}</th>
                <th className="px-4 py-3">{bn ? "মূল সুবিধা" : "Key Agronomic Benefit"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-soft bg-canvas/60">
              <tr>
                <td className="px-4 py-2.5 font-medium text-ink-hi">T. Aman Rice (আমন ধান)</td>
                <td className="px-4 py-2.5">Kharif-II</td>
                <td className="px-4 py-2.5">130 days</td>
                <td className="px-4 py-2.5">Rainfed (0.85)</td>
                <td className="px-4 py-2.5">3.0 dS/m (Leached in monsoon)</td>
                <td className="px-4 py-2.5">প্রধান খাদ্যশস্য, বর্ষার পানিতে প্রাকৃতিকভাবে লবণাক্ততা ধুয়ে যায়।</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 font-medium text-ink-hi">Boro Rice (বোরো ধান)</td>
                <td className="px-4 py-2.5">Rabi</td>
                <td className="px-4 py-2.5">140 days</td>
                <td className="px-4 py-2.5">High Pumping (0.95)</td>
                <td className="px-4 py-2.5">3.0 dS/m (FAO-29)</td>
                <td className="px-4 py-2.5">সর্বোচ্চ ফলনশীল শুষ্ক মৌসুম ধান; তবে অতিরিক্ত সেচ পানির প্রয়োজন।</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 font-medium text-ink-hi">Mustard (সরিষা)</td>
                <td className="px-4 py-2.5">Rabi</td>
                <td className="px-4 py-2.5">85–90 days</td>
                <td className="px-4 py-2.5">Very Low (0.40)</td>
                <td className="px-4 py-2.5">3.0 dS/m (BARI Sarisha)</td>
                <td className="px-4 py-2.5">স্বল্পমেয়াদী তেলবীজ, আমন ও বোরোর মাঝখানে সহজেই চাষ করা যায়।</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 font-medium text-ink-hi">Lentil (মসুর ডাল)</td>
                <td className="px-4 py-2.5">Rabi</td>
                <td className="px-4 py-2.5">105 days</td>
                <td className="px-4 py-2.5">Very Low (0.35)</td>
                <td className="px-4 py-2.5">1.4 dS/m (Sensitive)</td>
                <td className="px-4 py-2.5">বাতাস থেকে নাইট্রোজেন সংবন্ধন করে মাটির উর্বরতা বাড়ায়।</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 font-medium text-ink-hi">Mungbean (মুগ ডাল)</td>
                <td className="px-4 py-2.5">Kharif-I</td>
                <td className="px-4 py-2.5">70 days</td>
                <td className="px-4 py-2.5">Low (0.35)</td>
                <td className="px-4 py-2.5">1.8 dS/m (BARI)</td>
                <td className="px-4 py-2.5">সবচেয়ে কম সময় (৭০ দিন) নেয়; চমৎকার ক্যাচ-ক্রপ।</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 font-medium text-ink-hi">Wheat (গম)</td>
                <td className="px-4 py-2.5">Rabi</td>
                <td className="px-4 py-2.5">115 days</td>
                <td className="px-4 py-2.5">Moderate (0.60)</td>
                <td className="px-4 py-2.5">6.0 dS/m (Tolerant)</td>
                <td className="px-4 py-2.5">লবণাক্ততা সহনশীল, কিন্তু মার্চের গরম (Terminal Heat) থেকে সাবধান।</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 font-medium text-ink-hi">Jute (পাট)</td>
                <td className="px-4 py-2.5">Kharif-I</td>
                <td className="px-4 py-2.5">110 days</td>
                <td className="px-4 py-2.5">Rainfed (0.80)</td>
                <td className="px-4 py-2.5">2.2 dS/m (BJRI)</td>
                <td className="px-4 py-2.5">পাতা পচে মাটিতে বিপুল পরিমাণ জৈব পদার্থ যোগ করে।</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 font-medium text-ink-hi">Fallow (পতিত জমি)</td>
                <td className="px-4 py-2.5">Any</td>
                <td className="px-4 py-2.5">0 days</td>
                <td className="px-4 py-2.5">None (0.00)</td>
                <td className="px-4 py-2.5">N/A</td>
                <td className="px-4 py-2.5">ক্যালেন্ডার ও মাটিকে বিশ্রাম দেয়; দেরিতে লাগানোর ঝুঁকি রোধ করে।</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 4: FAQ */}
      {activeTab === "faq" && (
        <div className="mt-8 space-y-3">
          {[
            {
              q_bn: "১. ফিল্ড শিফট কি ইন্টারনেটের ধীর গতিতেও কাজ করবে?",
              q_en: "1. Does Field Shift work in low-bandwidth rural networks?",
              a_bn: "হ্যাঁ, সম্পূর্ণ ওয়েবসাইটটি লাইটওয়েট এবং মোবাইল-ফার্স্ট ডিজাইনে তৈরি। একবার লোড হলে সার্ভিস ওয়ার্কারের মাধ্যমে অফলাইনেও পরামর্শ দেখতে পারবেন।",
              a_en: "Yes. The app is engineered for rural 2G/3G connectivity. Its service worker caches critical data for offline field operation."
            },
            {
              q_bn: "২. বরেন্দ্র অঞ্চলে বোরো ধানের বদলে কেন সরিষা বা ডাল চাষের পরামর্শ দেওয়া হয়?",
              q_en: "2. Why suggest mustard or pulses instead of Boro rice in Barind?",
              a_bn: "নাসার গ্রেস (GRACE) স্যাটেলাইটের তথ্য অনুযায়ী রাজশাহীর বরেন্দ্র অঞ্চলে ভূগর্ভস্থ পানির স্তর বছরে ১.৩৫ সেমি করে কমছে। বোরো ধান প্রচুর ভূগর্ভস্থ পানি পাম্প করে, অন্যদিকে সরিষা বা মুগ ডালে মাত্র এক-তৃতীয়াংশ পানি লাগে এবং মাটির স্বাস্থ্য ভালো থাকে।",
              a_en: "NASA GRACE-FO mascon data shows groundwater in Barind depleting by -1.35 cm/year due to tubewells. Mustard and pulses require only ~30% of the water while restoring soil nitrogen."
            },
            {
              q_bn: "৩. উপকূলীয় লবণাক্ত জমিতে বর্ষায় আমন ধান কীভাবে বাঁচে?",
              q_en: "3. How does Aman rice survive on coastal saline land during monsoon?",
              a_bn: "শুকনো মৌসুমে মাটির উপরের অংশে লবণ জমে (৬-১২ dS/m)। কিন্তু জুলাই-আগস্টে ১৫০০-২০০০ মিমি বর্ষার বৃষ্টির পানিতে এই লবণ ধুয়ে ভূগর্ভে বা খালে চলে যায়, ফলে শিকড়ের লবণাক্ততা ৬০%-৭৫% কমে আমন ধান ভালোভাবে বেড়ে ওঠে।",
              a_en: "Dry-season capillary rise drives salt to the surface, but 1500–2000 mm of monsoon rainfall leaches 60%–75% of soluble root-zone salts, allowing Kharif-II Aman to thrive."
            },
            {
              q_bn: "৪. কৃত্রিম বুদ্ধিমত্তা (AI) সহকারী কীভাবে সাহায্য করে?",
              q_en: "4. How does the AI Assistant help farmers and officers?",
              a_bn: "স্ক্রিনের নিচের ডানদিকের সবুজ মেসেজ বাটনে চাপ দিয়ে যেকোনো প্রশ্ন বাংলায় বা ইংরেজিতে লিখলে এআই সহকারী সম্পূর্ণ বৈজ্ঞানিক তথ্য ও এই ডকুমেন্টেশন ঘেঁটে সাথে সাথে সঠিক পরামর্শ প্রদান করবে।",
              a_en: "Click the green chat icon at the bottom right. The AI Assistant references this exact documentation, NASA data, and BARI agronomic guidelines to answer questions fluently in Bangla or English."
            }
          ].map((faq, i) => (
            <div key={i} className="overflow-hidden rounded-xl border border-line bg-surface">
              <button
                onClick={() => toggleFaq(i)}
                className="flex w-full items-center justify-between p-4 text-left font-medium text-ink-hi hover:bg-elevated/50"
              >
                <span>{bn ? faq.q_bn : faq.q_en}</span>
                {openFaq === i ? <ChevronUp className="h-4 w-4 text-action" /> : <ChevronDown className="h-4 w-4 text-ink-low" />}
              </button>
              {openFaq === i && (
                <div className="border-t border-line-soft bg-canvas/50 p-4 text-xs leading-relaxed text-ink-mid">
                  {bn ? faq.a_bn : faq.a_en}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { Panel, SourceChip } from "@/components/ui";
import { useLang } from "@/lib/lang";
import { t } from "@/lib/i18n";

const DEFINITIONS = [
  {
    term: "Usable-rainfall onset",
    body: "Onset definition v2, adapted from the Moron & Robertson (2014) family of local-relative definitions (their exact method differs; this is not a reimplementation of it): the first wet day (≥ 1 mm) in DOY 121–270 whose 5-day rainfall reaches that point's own mean 5-day rainfall over June–September 2001–2025, provided the 30 days after that window contain no 10-day period under 5 mm. Computed per year from NASA POWER daily PRECTOTCORR and cross-checked against CHIRPS v2.0; the two eras (2001–2012 vs 2013–2025) are compared with a two-sided Mann-Whitney U test, with a ±20 % threshold sensitivity and a censoring rate reported for every point. The earlier fixed rule (7-day ≥ 20 mm from DOY 145) was rejected after measurement: it returned the window floor in 50–91 % of years at Bangladeshi points, which cannot express a shift. POWER's precipitation series is not homogeneous over 1981–2025 (Pettitt change point), so the onset and trend figures are labelled with the product they came from and flagged when a change point falls inside the analysis window. See docs/science/onset.md. The shift enters the ranking today: it shrinks or widens the calendar budget and feeds the late-onset penalty below.",
  },
  {
    term: "Season calendar (durationDays)",
    body: "A rotation is only generated if it fits one 365-day year: Aman's duration plus the rabi and pre-monsoon durations plus two 10-day turnarounds, plus the effective onset shift, must stay under 365 days. So Boro (140 d) cannot be followed by Aus (105 d); Boro + Mungbean (70 d) fits with ten days to spare, and stops fitting once the onset is 11 days late. With the real packs the measured shift is small and mostly earlier rather than later, so this budget is currently generous rather than tight. ESTIMATE — durations and the 10-day turnaround are demo values, not cited to a crop register. Growing-degree-day sums are planned and are not used by this build.",
  },
  {
    term: "Water adequacy (S1)",
    body: "Per season: a smooth logistic of the supply−demand margin, 1/(1+exp(−(supply − demand)/0.2)), so a bigger safety margin scores slightly higher and nothing ties exactly at 1.0. Aman supply is usable rainfall only; dry-season supply is usable rainfall plus this farm's demo irrigation access, capped at 1.5. In this build both sides come from the demo fixture.",
  },
  {
    term: "Irrigation reliance (S7)",
    body: "The mean dry-season water demand that usable rainfall cannot cover, scaled to a 0–1 score and charged against the Water saving priority: pumping groundwater costs points even where the water is available. Farms with high demo irrigation access can still grow Boro, wheat or maize — the cost shows up here rather than in adequacy.",
  },
  {
    term: "Food & income (S8)",
    body: "Two axes, both averaged over the three seasons and put on a 0–1 scale by dividing by 0.8. The income axis is each season's yieldValue graded by that season's water-reliability margin (the same logistic as S1), so a crop this farm cannot water earns little. The staple axis is each season's stapleIndex graded by the share of the crop's water need the season can actually cover — full while rain plus the farm's irrigation access meet the demand, then cut at 1.5 per unit of shortfall, because a crop that misses water at the wrong time loses more than the missing share of its harvest. Reliability margin and delivered share are deliberately different questions: the first is priced again in S1, S6 and S7, the second only here. This is the component the Stable harvest slider mostly drives, and the reason a well-irrigated northern farm can put Boro above a cash-crop or pulse sequence once the farmer says food first, while a farm that cannot cover the water need still falls back to frugal pulses. ESTIMATE — yieldValue and stapleIndex are hand-set demo rankings (the idea is BBS yield × farm price for income, and the share of the household's own food base for staple), not cited figures; STAPLE_GAIN 0.3 and the 1.5 shortfall rate are a demo calibration chosen to reproduce the rotations Bangladeshi farms actually run on irrigated northern land, not fitted against a household-expenditure survey.",
  },
  {
    term: "Soil health balance (S4)",
    body: "Sequence-level nitrogen budget: legume fixation credit, residue-return indices, and the demand of non-fixing crops, minus the same-family and idle-land hits below. A simplified, demonstration-grade budget — the crop coefficients in this demo are ESTIMATE values, not yet cited to a source register.",
  },
  {
    term: "Same-family sequence & idle fallow",
    body: "Crops of the same botanical family may follow each other (Aman → Boro and Aman → Wheat are real Bangladesh patterns), but each repeat costs soil-health points and a listed penalty — cereal after cereal the most, legume after legume the least. A fallow season is legal and uses no water, and is charged up to 4 points for bare soil and lost residue — but the charge is scaled by how much of the year was genuinely still free for a crop (days left over the shortest pre-monsoon duration plus a turnaround). A pre-kharif fallow after a long Boro and Aman, where barely 80 days are left, is the normal turnaround rather than neglect, and is charged less; an idle season on a farm that had a whole season spare is charged in full. ESTIMATE — these coefficients are a demo calibration, not fitted against observed yield or pest data.",
  },
  {
    term: "Late-onset terminal heat",
    body: "A later monsoon onset delays Aman harvest and therefore winter sowing. Each dry-season crop carries a risk proportional to max(0, onset shift)/15 × (1 − heat tolerance) × duration/120, listed as a penalty and folded into resilience. An earlier onset widens the window and gives a small credit to long-duration crops. ESTIMATE scaling.",
  },
  {
    term: "Flood & heat penalties (S6 resilience)",
    body: "Resilience reads all three seasons: Aman flood exposure (farm flood-proneness × crop tolerance), heat exposure of the rabi and pre-monsoon crops, the dry-spell water risk of both dry seasons, and the late-onset term above. Penalties subtract points and are always shown with their rule and source.",
  },
  {
    term: "What-if scenarios",
    body: "Observed data with a stated change applied (rainfall −10/−20 %, temperature +1/+2 °C, onset +7/+15 days, soil-pH correction), re-run through the identical engine. Scenarios are stress tests — explicitly not climate forecasts.",
  },
];

export default function MethodPage() {
  const { lang } = useLang();
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 lg:px-8">
      <h1 className="font-display text-3xl font-bold tracking-tight">{t("method_title", lang)}</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-mid">{t("method_intro", lang)}</p>
      <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber/40 bg-amber/5 p-4">
        <SourceChip source="fixture" />
        <p className="text-sm leading-relaxed text-ink-mid">{t("demo_build_note", lang)}</p>
      </div>
      {lang === "bn" && <p className="mt-4 text-xs leading-relaxed text-ink-low">{t("english_only_note", lang)}</p>}
      <div className="mt-8 flex flex-col gap-4">
        {DEFINITIONS.map((d) => (
          <Panel key={d.term} title={d.term}>
            <p className="text-sm leading-relaxed text-ink-mid">{d.body}</p>
          </Panel>
        ))}
      </div>
      <p className="mt-8 text-xs leading-relaxed text-ink-low">{t("method_footnote", lang)}</p>
    </div>
  );
}

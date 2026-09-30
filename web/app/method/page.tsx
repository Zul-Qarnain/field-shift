"use client";

import { Panel, SourceChip } from "@/components/ui";
import { useLang } from "@/lib/lang";
import { t } from "@/lib/i18n";
import { OUTLOOK, num } from "@/lib/outlook";

const DEFINITIONS = [
  {
    term: "Usable-rainfall onset",
    body: "Onset definition v2, adapted from the Moron & Robertson (2014) family of local-relative definitions (their exact method differs; this is not a reimplementation of it): the first wet day (≥ 1 mm) in DOY 121–270 whose 5-day rainfall reaches that point's own mean 5-day rainfall over June–September 2001–2025, provided the 30 days after that window contain no 10-day period under 5 mm. Computed per year from NASA POWER daily PRECTOTCORR and cross-checked against CHIRPS v2.0; the two eras (2001–2012 vs 2013–2025) are compared with a two-sided Mann-Whitney U test, with a ±20 % threshold sensitivity and a censoring rate reported for every point. The earlier fixed rule (7-day ≥ 20 mm from DOY 145) was rejected after measurement: it returned the window floor in 50–91 % of years at Bangladeshi points, which cannot express a shift. POWER's precipitation series is not homogeneous over 1981–2025 (Pettitt change point), so the onset and trend figures are labelled with the product they came from and flagged when a change point falls inside the analysis window. See docs/science/onset.md. The measured shift only enters the ranking when its era test is significant — see the significance rule below.",
  },
  {
    term: "Significance rule on the onset shift (engine)",
    body: "A Mann-Whitney p ≥ 0.05 means the two eras are not distinguishable at this point, so the median difference is NOT treated as a shift anywhere in the product: effectiveOnsetShift = (era median difference if p < 0.05, else 0) + the what-if shift you select. The headline card then reads \"No significant onset shift\" with the median difference and the p-value as secondary text, the advisory and SMS say the same, the plan page states the baseline is 0, and the Why list carries a line \"measured onset shift … is not significant, so it is treated as 0 here\". Because the calendar budget and the late-onset penalty both read effectiveOnsetShift, a non-significant shift can no longer shrink or widen a farm's window. The what-if buttons (+7 / +15 days) always apply on top — they are stated hypotheticals, not claims about the farm. Threshold: p < 0.05, two-sided, set in web/lib/engine.ts (ONSET_ALPHA).",
  },
  {
    term: "Season calendar (durationDays)",
    body: "A rotation is only generated if it fits one 365-day year: Aman's duration plus the rabi and pre-monsoon durations plus two 10-day turnarounds, plus the effective onset shift, must stay under 365 days. So Boro (140 d) cannot be followed by Aus (105 d); Boro + Mungbean (70 d) fits with ten days to spare, and stops fitting once the onset is 11 days late. With the real packs the significance gate hands every demo farm 0 days — no farm's preferred product passes its era test — so the budget binds on the crop durations alone, not on a measured shift: Boro + Aman + Jute (110 d) and Boro + Aman + Sesame (85 d) never fit even at 0 shift, while Boro + Aman + Mungbean does, and the +7/+15 day what-ifs are the only way an onset change rules out more. Fallow (পতিত) is in the pool as an idle pre-monsoon season with 0 duration and 0 water: it exists so Boro–Fallow–T.Aman, where the calendar has no room for a third crop, can be represented at all, and it is charged through the idle-land rule below rather than banned. ESTIMATE — durations and the 10-day turnaround are demo values, not cited to a crop register. Growing-degree-day sums are planned and are not used by this build.",
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
    body: "Crops of the same botanical family may follow each other (Aman → Boro and Aman → Wheat are real Bangladesh patterns), but each repeat costs soil-health points and a listed penalty — cereal after cereal the most, legume after legume the least. A fallow season is legal and uses no water, and is charged up to 4 points for bare soil and lost residue — but the charge is scaled by how much of the year was genuinely still free for a crop, measured against an 80-day reference window (the shortest pre-monsoon crop in the pool, mungbean at 70 days, plus one 10-day turnaround for land prep). Pinned by test: Aman → Mustard → Fallow leaves the whole 80-day window spare, so it is charged the full 4 points, while Aman → Boro → Fallow under a +15-day later onset leaves only 65 free days and is charged 3.3 — a fallow the calendar forced costs less than an idle season on a farm that had a whole season spare. With the significance gate at 0 that second case only arrives through a what-if: at the demo farms Boro + Aman + Fallow leaves exactly the 80-day window, so it is charged in full. ESTIMATE — these coefficients are a demo calibration, not fitted against observed yield or pest data.",
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
    term: "Soil salinity penalty (SRDI 2010 × FAO-29)",
    body: "For a farm inside SRDI's coastal saline survey the engine reads its UPZILA, not a field sample: SRDI (2010) \"Saline Soils of Bangladesh\", Appendix-2, prints the area of each upazila in classes S1 2.0–4.0 … S5 >16.0 dS/m (field survey May 2009, EC on a 1:5 soil-water extract — a dry-season snapshot, 102 upazilas in 18 districts). Each class is read at its area-weighted midpoint ECe (S5 uses its 16.0 lower bound, so the figure is a lower estimate there) and turned into expected yield loss with FAO Irrigation & Drainage Paper 29 Rev.1 (Ayers & Westcot 1985) Table 4 and the paper's own equation (10), Y = 100 − b·(ECe − a): a = the crop's 100 %-yield ECe, b = 100 / (ECe at 0 % yield − a). The loss is summed over the upazila's class mix weighted by its saline share, and the non-saline remainder costs nothing because SRDI's Appendix-6 (p.55) calls 0–2 dS/m salt free with effects \"mostly negligible\". Aman is scored on the same dry-season classes, which makes its figure an upper bound — monsoon flooding leaches salts and no cited leaching factor was found, so none is invented. Worked from the committed values: at Khulna / Dumuria (68.3 % of the upazila is saline — 30 610 of 44 797 ha) a rice season loses ~42 % expected yield and costs 6.8 points, maize or potato ~49 % and 7.8 points, wheat ~19 % and 3.0 points; at Barishal / Wazirpur (8.1 % saline) rice loses ~0.6 % and 0.1 points. An upazila outside the surveyed belt carries no value at all — the penalty is skipped and the reason printed, because absent data is not zero salt. Crops FAO-29 publishes no ECe for (mustard, lentil, mungbean, sesame, jute) are never scored against salinity either; they appear as risk lines quoting the source's own gap. ESTIMATE — SALINITY_POINTS, 16 score points per 100 % expected yield loss, is the hand-set scale that converts percent loss into points; the ECe thresholds and slopes themselves are cited.",
  },
  {
    term: "What-if scenarios",
    body: "Observed data with a stated change applied (rainfall −10/−20 %, temperature +1/+2 °C, onset +7/+15 days, soil-pH correction), re-run through the identical engine. Scenarios are stress tests — explicitly not climate forecasts.",
  },
];

export default function MethodPage() {
  const { lang } = useLang();
  const top = (OUTLOOK.variants.chirps?.top_features ?? []).join(", ");
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

      <Panel className="mt-4" title={<span className="flex items-center gap-2">{t("ml_heading", lang)} · {OUTLOOK.model_version}</span>}>
        <p className="text-sm leading-relaxed text-ink-mid">
          {OUTLOOK.onset_rule}. That is the same v2 rule the first entry defines — applied here to CHIRPS v2.0 daily
          rainfall to make the training labels. The rejected v1 rule (7-day ≥ 20 mm from DOY 145) could not be used:
          measured on the cached series it pinned 50–91 % of Bangladeshi years to its own window floor. The
          outlook is issued on {OUTLOOK.issue_date}, before the window opens at DOY 121, so
          every feature is cut off at that date: CHIRPS and POWER rainfall and weather for 1 Mar – 20 Apr, last
          season&apos;s onset, ONI DJF and FMA, and DMI Feb–Mar. Weather anomalies are measured against a climatology
          rebuilt inside each backtest fold from that fold&apos;s training years only — and for a training row, with its
          own year dropped from the baseline it is compared to.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-ink-mid">{OUTLOOK.issue_before_onset}</p>
        <table className="mt-3 w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-line text-left text-ink-low">
              <th className="py-1.5 pr-2 font-medium">Arm</th>
              <th className="py-1.5 pr-2 font-medium">MAE (d)</th>
              <th className="py-1.5 pr-2 font-medium">Climatology (d)</th>
              <th className="py-1.5 pr-2 font-medium">Skill</th>
              <th className="py-1.5 pr-2 font-medium">RMSE (d)</th>
              <th className="py-1.5 pr-2 font-medium">10–90 coverage</th>
              <th className="py-1.5 font-medium">Years won</th>
            </tr>
          </thead>
          <tbody className="tabular">
            {Object.entries(OUTLOOK.variants).map(([name, v]) => (
              <tr key={name} className="border-b border-line-soft last:border-0">
                <td className="py-1.5 pr-2 text-ink-mid">
                  {v.source}
                  {v.training_years && (
                    <span className="text-ink-low"> · {v.training_years.start}–{v.training_years.end}</span>
                  )}
                </td>
                <td className="py-1.5 pr-2">{num(v.metrics.mae_model_days, 2)}</td>
                <td className="py-1.5 pr-2">{num(v.metrics.mae_clim_days, 2)}</td>
                <td className="py-1.5 pr-2">{num(v.metrics.skill, 3)}</td>
                <td className="py-1.5 pr-2">{num(v.metrics.rmse_days, 2)}</td>
                <td className="py-1.5 pr-2">{num(v.metrics.coverage, 2)}</td>
                <td className="py-1.5">
                  {v.metrics.years_beating_climatology ?? "—"} / {v.metrics.n_years ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-sm leading-relaxed text-ink-mid">
          Leave-one-year-out holds a whole year back across every district at once ({OUTLOOK.backtest}); the baseline
          is each district&apos;s own mean onset over the fold&apos;s training years. Because last season&apos;s onset is
          itself a feature, two stricter baselines are reported too: the district&apos;s mean of the two seasons before
          the one predicted ({num(OUTLOOK.metrics.mae_clim2_days, 2)} d, skill {num(OUTLOOK.metrics.skill_vs_clim2, 3)})
          and last season&apos;s onset on its own ({num(OUTLOOK.metrics.mae_lag1_days, 2)} d, skill{" "}
          {num(OUTLOOK.metrics.skill_vs_lag1, 3)}).
        </p>
        <p className={`mt-2 text-sm leading-relaxed ${OUTLOOK.status === "shipped" ? "text-lime" : "text-amber"}`}>
          {OUTLOOK.status === "shipped" ? t("ml_shipped_note", lang) : t("ml_experimental_note", lang)}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-ink-mid">
          Read this next to the feature ranking on the held-out years: the top movers are {top} — mostly
          <em>where</em> a district sits, which the climatology baseline already knows for free. In the labels,
          districts differ from each other by about 5.8 days while the year-to-year scatter inside one district is
          about 13.0 days: the hard part of the problem is the part these April features do not explain.
        </p>
        <p className="mt-2 text-xs leading-relaxed text-ink-low">{OUTLOOK.label_note}</p>
        <p className="mt-1 text-xs leading-relaxed text-ink-low">{OUTLOOK.sources.power_rainfall_excluded}</p>
        <p className="mt-1 text-xs leading-relaxed text-ink-low">{OUTLOOK.sources.power_weather_note}</p>
        <p className="mt-1 text-xs leading-relaxed text-ink-low">
          Predictions are explained with LightGBM tree SHAP ({OUTLOOK.contribution_method}). The model is built
          offline and shipped as a static file — nothing runs in the browser. This is the only place in the app where
          a trained model produces a number; the rotation engine and every other figure on these pages stay
          deterministic rules over the data shown. Full method, leakage controls and limitations:{" "}
          <code className="text-ink-mid">docs/science/onset_ml.md</code>.
        </p>
      </Panel>

      <p className="mt-8 text-xs leading-relaxed text-ink-low">{t("method_footnote", lang)}</p>
    </div>
  );
}

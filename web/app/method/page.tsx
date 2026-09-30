"use client";

import { Panel, SourceChip } from "@/components/ui";
import { useLang } from "@/lib/lang";
import { t } from "@/lib/i18n";
import { OUTLOOK, num } from "@/lib/outlook";

const DEFINITIONS = [
  {
    term: "Usable-rainfall onset",
    body: "First day of a 7-day window with ≥ 20 mm rainfall that is not followed by a dry spell longer than 7 days (no day with > 1 mm in the following 7 days). Planned method: compute it per year over NASA POWER daily rainfall 1981–2025, then compare the two eras (2001–2012 vs 2013–2025) with a Mann-Whitney U test. The onset values on the demo farms are sample data — they are not computed from POWER yet, and no threshold sensitivity has been run. The shift does enter the ranking today: it shrinks or widens the calendar budget and feeds the late-onset penalty below.",
  },
  {
    term: "Season calendar (durationDays)",
    body: "A rotation is only generated if it fits one 365-day year: Aman's duration plus the rabi and pre-monsoon durations plus two 10-day turnarounds, plus the effective onset shift, must stay under 365 days. So Boro (140 d) cannot be followed by Aus (105 d); Boro + Mungbean (70 d) fits with ten days to spare, and stops fitting once the onset is 11 days late — which is what the Rajshahi fixture shows. ESTIMATE — durations and the 10-day turnaround are demo values, not cited to a crop register. Growing-degree-day sums are planned and are not used by this build.",
  },
  {
    term: "Water adequacy (S1)",
    body: "Per season: a smooth logistic of the supply−demand margin, 1/(1+exp(−(supply − demand)/0.15)), so a bigger safety margin scores slightly higher and nothing ties exactly at 1.0. Aman supply is usable rainfall only; dry-season supply is usable rainfall plus this farm's demo irrigation access. In this build both sides come from the demo fixture.",
  },
  {
    term: "Irrigation reliance (S7)",
    body: "The mean dry-season water demand that usable rainfall cannot cover, scaled to a 0–1 score and charged against the Water saving priority: pumping groundwater costs points even where the water is available. Farms with high demo irrigation access can still grow Boro, wheat or maize — the cost shows up here rather than in adequacy.",
  },
  {
    term: "Food & income (S8)",
    body: "Each season's yield value graded by the water that season can actually deliver, averaged over the three seasons and scaled to a 0–1 score: a crop this farm cannot water earns little. This is the component the Stable harvest slider mostly drives, and the reason irrigated farms can prefer Boro, wheat, maize or potato over low-demand pulses. ESTIMATE — the yieldValue table is a hand-set demo ranking of food and income per season (the idea is BBS yield × farm price), not a cited figure; it is not calibrated against household income.",
  },
  {
    term: "Soil health balance (S4)",
    body: "Sequence-level nitrogen budget: legume fixation credit, residue-return indices, and the demand of non-fixing crops, minus the same-family and idle-land hits below. A simplified, demonstration-grade budget — the crop coefficients in this demo are ESTIMATE values, not yet cited to a source register.",
  },
  {
    term: "Same-family sequence & idle fallow",
    body: "Crops of the same botanical family may follow each other (Aman → Boro and Aman → Wheat are real Bangladesh patterns), but each repeat costs soil-health points and a listed penalty — cereal after cereal the most, legume after legume the least. A fallow season is legal and uses no water, and is charged an idle-land penalty for bare soil and lost residue. ESTIMATE — these coefficients are a demo calibration, not fitted against observed yield or pest data.",
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
          {OUTLOOK.onset_rule}. (The first entry above describes the earlier v1 rule; this build uses v2.) The
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

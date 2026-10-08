"use client";

import { BrainCircuit } from "lucide-react";
import { OUTLOOK, num, outlookDate, outlookForFarm, signedDays } from "@/lib/outlook";
import { useLang } from "@/lib/lang";
import { t, tf } from "@/lib/i18n";
import { Panel, SourceChip } from "@/components/ui";

/**
 * The machine-learning monsoon-onset forecast for one demo farm.
 *
 * Every number here was computed offline by scripts/build_onset_ml.py and shipped in
 * web/public/data/onset_outlook.json — the model does not run in the browser. The backtest
 * errors are shown beside the district's own average start, as plain numbers.
 */
export function OnsetOutlookCard({ farmId }: { farmId: string }) {
  const { lang } = useLang();
  const row = outlookForFarm(farmId);
  const shipped = OUTLOOK.status === "shipped";

  if (!row) {
    return (
      <Panel title={<span className="flex items-center gap-2"><BrainCircuit className="h-4 w-4 text-violet" />{t("ml_heading", lang)}</span>}>
        <p className="text-xs leading-relaxed text-ink-low">{t("ml_missing", lang)}</p>
      </Panel>
    );
  }

  const m = OUTLOOK.metrics;
  const predicted = outlookDate(row.predicted_date, lang);
  const low = outlookDate(row.interval_low_date, lang, false);
  const high = outlookDate(row.interval_high_date, lang);
  const clim = outlookDate(row.climatology_date, lang);
  const observed = outlookDate(row.observed_date, lang);

  return (
    <Panel
      title={
        <span className="flex items-center gap-2">
          <BrainCircuit className="h-4 w-4 text-violet" />
          {t("ml_heading", lang)}
        </span>
      }
      right={
        <span className="flex items-center gap-2">
          <span
            className="rounded-full border border-violet px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet"
          >
            {t("ml_badge", lang)}
          </span>
          <SourceChip source="cache" />
        </span>
      }
    >
      <p className="mb-1 text-[11px] leading-relaxed text-ink-mid">{t("ml_trained_on", lang)}</p>
      <dl className="text-sm">
        <div className="flex items-baseline justify-between gap-3 border-b border-line-soft py-2">
          <dt className="text-ink-mid">{t("ml_predicted_onset", lang)}</dt>
          <dd className="font-display text-base font-bold text-ink-hi tabular">{predicted ?? "—"}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-3 border-b border-line-soft py-2">
          <dt className="text-ink-mid">{t("ml_interval", lang)}</dt>
          <dd className="text-right text-xs text-ink-hi tabular">{low && high ? `${low} – ${high}` : "—"}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-3 border-b border-line-soft py-2">
          <dt className="text-ink-mid">{t("ml_climatology", lang)}</dt>
          <dd className="text-right text-xs text-ink-hi tabular">
            {clim ?? "—"}
            {row.vs_climatology_days !== null && (
              <span className="ml-1.5 text-ink-low">
                ({tf("ml_vs_climatology", lang, { days: signedDays(row.vs_climatology_days) ?? "0" })})
              </span>
            )}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-3 py-2">
          <dt className="text-ink-mid">{observed ? t("ml_observed", lang) : t("ml_not_observed", lang)}</dt>
          <dd className="text-right text-xs text-ink-hi tabular">{observed ?? "—"}</dd>
        </div>
      </dl>

      <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-ink-low">{t("ml_why", lang)}</p>
      <ul className="mt-1 space-y-1">
        {row.top_contributions.map((c) => (
          <li key={c.feature} className="flex items-start justify-between gap-3 text-[11px] leading-relaxed text-ink-mid">
            <span className="min-w-0">{lang === "bn" ? c.label_bn : c.label_en}</span>
            <span className="shrink-0 font-mono tabular text-ink-hi">
              {signedDays(c.effect_days) ?? "0"} d
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-3 rounded-lg border border-line bg-inset p-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-low">{t("ml_backtest", lang)}</p>
        <p className="mt-1 text-[11px] leading-relaxed text-ink-mid tabular">
          {tf("ml_backtest_scope", lang, {
            years: String(OUTLOOK.trained_on.years),
            districts: String(OUTLOOK.district_count ?? OUTLOOK.districts.length),
          })}{" "}
          ·{" "}
          {tf("ml_mae_line", lang, {
            model: num(m.mae_model_days) ?? "—",
            clim: num(m.mae_clim_days) ?? "—",
            skill: num(m.skill, 2) ?? "—",
          })}
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-ink-low">
          {tf("ml_coverage_line", lang, { pct: num((m.coverage ?? 0) * 100, 0) ?? "—" })}
        </p>
        <p className="mt-1.5 text-[11px] leading-relaxed text-ink-mid">
          {shipped
            ? t("ml_shipped_note", lang)
            : tf("ml_backtest_note", lang, { model: num(m.mae_model_days) ?? "—", clim: num(m.mae_clim_days) ?? "—" })}
        </p>
      </div>

      <p className="mt-2 text-[10px] leading-relaxed text-ink-low">
        {tf("ml_model_line", lang, {
          version: OUTLOOK.model_version,
          issue: OUTLOOK.issue_date,
          year: String(OUTLOOK.outlook_year),
        })}{" "}
        · {OUTLOOK.sources.labels}
      </p>
      <p className="mt-1 text-[10px] leading-relaxed text-ink-low">{t("ml_same_source_note", lang)}</p>
      <p className="mt-1 text-[10px] leading-relaxed text-ink-low">{t("ml_offline_note", lang)}</p>
    </Panel>
  );
}

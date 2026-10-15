"use client";

import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { SATELLITE, type OnsetView, type PowerPack } from "@/lib/packs";
import { useLang } from "@/lib/lang";
import { dayMonthLabel, fmtNum, t, tf } from "@/lib/i18n";

const ERA_A_COLOR = "#4ea8de";
const ERA_B_COLOR = "#d4f94e";

function density(samples: number[], from: number, to: number, bandwidth = 6) {
  const xs: number[] = [];
  for (let x = from; x <= to; x += 1) xs.push(x);
  if (samples.length === 0) return xs.map(() => 0);
  return xs.map((x) =>
    samples.reduce((acc, v) => acc + Math.exp(-0.5 * ((x - v) / bandwidth) ** 2), 0) / (samples.length * bandwidth * 2.5066),
  );
}

/**
 * Two-era onset distribution from the per-year DOYs of whichever product the pack prefers.
 * The eras can have different sample sizes, medians can be half-days, and the source is named
 * in the caption — if POWER precipitation is inhomogeneous these years are GPM IMERG years.
 */
export function PowerOnsetChart({ view, pack }: { view: OnsetView; pack: PowerPack }) {
  const { lang } = useLang();
  const from = Math.min(...view.eraA, ...view.eraB) - 8;
  const to = Math.max(...view.eraA, ...view.eraB) + 8;

  const data = useMemo(() => {
    const a = density(view.eraA, from, to);
    const b = density(view.eraB, from, to);
    return a.map((value, i) => ({ doy: from + i, historical: value, current: b[i] }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pack.id, pack.retrievedUtc, view.product]);

  const ticks = [pack.onset.window.startDoy, 152, 182, 213, 244, pack.onset.window.endDoy];
  const nDays = (value: number) => `${fmtNum(value > 0 ? `+${value}` : value, lang)} ${t("unit_days_short", lang)}`;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4 pb-2 text-[11px] text-ink-mid">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-water" /> {fmtNum(view.eraALabel, lang)} ({fmtNum(view.eraA.length, lang)} {t("chart_years_unit", lang)})
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-lime" /> {fmtNum(view.eraBLabel, lang)} ({fmtNum(view.eraB.length, lang)} {t("chart_years_unit", lang)})
        </span>
        <span className="ml-auto font-mono text-ink-low">
          {view.pValue === null ? t("mw_not_computable", lang) : `p = ${fmtNum(view.pValue.toFixed(3), lang)} · ${t("chart_mann_whitney", lang)}`}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={170}>
        <AreaChart data={data} margin={{ top: 4, right: 6, bottom: 0, left: -22 }}>
          <defs>
            <linearGradient id="pgA" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={ERA_A_COLOR} stopOpacity={0.55} />
              <stop offset="100%" stopColor={ERA_A_COLOR} stopOpacity={0.04} />
            </linearGradient>
            <linearGradient id="pgB" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={ERA_B_COLOR} stopOpacity={0.55} />
              <stop offset="100%" stopColor={ERA_B_COLOR} stopOpacity={0.04} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#1e2f4d" strokeDasharray="3 5" vertical={false} />
          <XAxis dataKey="doy" type="number" domain={[from, to]} ticks={ticks} tick={{ fill: "#7b8ca6", fontSize: 11 }} stroke="#1e2f4d" tickFormatter={(v: number) => dayMonthLabel(v, lang)} />
          <YAxis hide />
          <ReferenceLine x={view.medianA} stroke={ERA_A_COLOR} strokeDasharray="4 4" />
          <ReferenceLine x={view.medianB} stroke={ERA_B_COLOR} strokeDasharray="4 4" />
          <Tooltip
            contentStyle={{ background: "#16243d", border: "1px solid #1e2f4d", borderRadius: 8, fontSize: 12 }}
            labelFormatter={(v) => dayMonthLabel(v as number, lang)}
            formatter={(val, name) => [`${fmtNum(((val as number) * 100).toFixed(1), lang)}% ${t("chart_pct_season", lang)}`, name === "current" ? fmtNum(view.eraBLabel, lang) : fmtNum(view.eraALabel, lang)]}
          />
          <Area dataKey="historical" stroke={ERA_A_COLOR} strokeWidth={1.5} fill="url(#pgA)" />
          <Area dataKey="current" stroke={ERA_B_COLOR} strokeWidth={1.5} fill="url(#pgB)" />
        </AreaChart>
      </ResponsiveContainer>
      <p className="pt-1 text-[11px] leading-relaxed text-ink-low">
        {tf("pack_rule_line", lang, { product: view.product, rule: pack.onset.rule, mm: view.thresholdMm?.toFixed(1) ?? "n/a" })} ·{" "}
        {tf("pack_years_detected", lang, { n: view.yearsDetected })} ·{" "}
        {tf("pack_era_medians", lang, {
          fromA: dayMonthLabel(view.medianA, lang), a: view.medianA,
          fromB: dayMonthLabel(view.medianB, lang), b: view.medianB,
          days: view.shiftDays, unit: t("unit_days_short", lang),
        })}
        {" — "}
        <span className="font-mono">{nDays(view.shiftDays)}</span>.
      </p>
      {view.censored.of > 0 && (
        <p className="mt-1 text-[11px] leading-relaxed text-ink-low">
          {tf("pack_censoring_line", lang, {
            count: view.censored.count, total: view.censored.of,
            pct: view.censored.sharePct?.toFixed(0) ?? "n/a", doy: pack.onset.window.startDoy,
          })}
        </p>
      )}
      {view.caution && (
        <p className="mt-1 text-[11px] leading-relaxed text-amber">
          {view.product === SATELLITE && view.alternative
            ? tf("pack_caution_power_flagged", lang, {
                year: pack.quality.precipHomogeneity.changePointInsideAnalysisWindow ?? "—",
                days: view.alternative.shiftDays ?? "n/a",
                p: view.alternative.pValue?.toFixed(3) ?? "n/a",
              })
            : view.caution}
        </p>
      )}
      {view.alternative && (
        <p className="mt-1 text-[11px] leading-relaxed text-ink-low">
          {tf("pack_alternative_line", lang, {
            product: view.alternative.product,
            days: view.alternative.shiftDays ?? "n/a",
            p: view.alternative.pValue?.toFixed(3) ?? "n/a",
            verdict: view.alternative.pValue !== null && view.alternative.pValue < 0.05 ? t("significant", lang) : t("not_significant", lang),
          })}
        </p>
      )}
    </div>
  );
}

/** Small real-data strip: annual rainfall or heat days, labelled by year/month. */
export function PackSparkline({ series, color, unit }: { series: { label: string[]; values: number[] }; color: string; unit: string }) {
  const { lang } = useLang();
  const data = series.label.map((label, i) => ({ label, value: series.values[i] }));
  return (
    <div className="mt-2">
      <ResponsiveContainer width="100%" height={54}>
        <LineChart data={data} margin={{ top: 2, right: 4, bottom: 0, left: 4 }}>
          <YAxis hide domain={["dataMin", "dataMax"]} />
          <XAxis dataKey="label" hide />
          <Tooltip
            contentStyle={{ background: "#16243d", border: "1px solid #1e2f4d", borderRadius: 8, fontSize: 12 }}
            formatter={(val) => [`${fmtNum(val as number, lang)}${unit}`, ""]}
          />
          <Line dataKey="value" stroke={color} strokeWidth={1.5} dot={{ r: 1.5, fill: color, strokeWidth: 0 }} />
        </LineChart>
      </ResponsiveContainer>
      <div className="flex justify-between font-mono text-[10px] text-ink-low">
        <span>{fmtNum(series.label[0], lang)}</span>
        <span>{fmtNum(series.label[series.label.length - 1], lang)}</span>
      </div>
    </div>
  );
}

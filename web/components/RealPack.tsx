"use client";

import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { OnsetView, PowerPack } from "@/lib/packs";

const ERA_A_COLOR = "#4ea8de";
const ERA_B_COLOR = "#d4f94e";

const doyToDate = (doy: number) => new Date(2024, 0, Math.round(doy)).toLocaleString("en", { month: "short", day: "numeric" });

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
 * in the caption — if POWER precipitation is inhomogeneous these years are CHIRPS years.
 */
export function PowerOnsetChart({ view, pack }: { view: OnsetView; pack: PowerPack }) {
  const from = Math.min(...view.eraA, ...view.eraB) - 8;
  const to = Math.max(...view.eraA, ...view.eraB) + 8;

  const data = useMemo(() => {
    const a = density(view.eraA, from, to);
    const b = density(view.eraB, from, to);
    return a.map((value, i) => ({ doy: from + i, historical: value, current: b[i] }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pack.id, pack.retrievedUtc, view.product]);

  const ticks = [pack.onset.window.startDoy, 152, 182, 213, 244, pack.onset.window.endDoy];

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4 pb-2 text-[11px] text-ink-mid">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-water" /> {view.eraALabel} (n={view.eraA.length})
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-lime" /> {view.eraBLabel} (n={view.eraB.length})
        </span>
        <span className="ml-auto font-mono text-ink-low">
          {view.pValue === null ? "Mann-Whitney not computable" : `p = ${view.pValue.toFixed(3)} · Mann-Whitney`}
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
          <XAxis dataKey="doy" type="number" domain={[from, to]} ticks={ticks} tick={{ fill: "#7b8ca6", fontSize: 11 }} stroke="#1e2f4d" tickFormatter={(v: number) => doyToDate(v)} />
          <YAxis hide />
          <ReferenceLine x={view.medianA} stroke={ERA_A_COLOR} strokeDasharray="4 4" />
          <ReferenceLine x={view.medianB} stroke={ERA_B_COLOR} strokeDasharray="4 4" />
          <Tooltip
            contentStyle={{ background: "#16243d", border: "1px solid #1e2f4d", borderRadius: 8, fontSize: 12 }}
            labelFormatter={(v) => doyToDate(v as number)}
            formatter={(val, name) => [((val as number) * 100).toFixed(1) + "% of season", name === "current" ? view.eraBLabel : view.eraALabel]}
          />
          <Area dataKey="historical" stroke={ERA_A_COLOR} strokeWidth={1.5} fill="url(#pgA)" />
          <Area dataKey="current" stroke={ERA_B_COLOR} strokeWidth={1.5} fill="url(#pgB)" />
        </AreaChart>
      </ResponsiveContainer>
      <p className="pt-1 text-[11px] leading-relaxed text-ink-low">
        Source: <span className="font-semibold text-ink-mid">{view.product}</span> · {view.yearsDetected} years with a detected onset · era medians{" "}
        {doyToDate(view.medianA)} (DOY {view.medianA}) → {doyToDate(view.medianB)} (DOY {view.medianB}), shift {view.shiftDays > 0 ? "+" : ""}
        {view.shiftDays} d. Rule: {pack.onset.rule} Threshold {view.thresholdMm?.toFixed(1) ?? "n/a"} mm/5 d.
      </p>
      {view.censored.of > 0 && (
        <p className="mt-1 text-[11px] leading-relaxed text-ink-low">
          Censoring: {view.censored.count} of {view.censored.of} years ({view.censored.sharePct?.toFixed(0) ?? "n/a"}%) fall on the first searchable day (DOY{" "}
          {pack.onset.window.startDoy}) — the rule cannot report an onset before it, so a small shift may be partly the window, not the monsoon.
        </p>
      )}
      {view.caution && <p className="mt-1 text-[11px] leading-relaxed text-amber">{view.caution}</p>}
      {view.alternative && (
        <p className="mt-1 text-[11px] leading-relaxed text-ink-low">
          Cross-check ({view.alternative.product}): shift {view.alternative.shiftDays ?? "n/a"} d, p={view.alternative.pValue?.toFixed(3) ?? "n/a"} —{" "}
          {view.alternative.pValue !== null && view.alternative.pValue < 0.05 ? "also significant" : "not significant on its own"}.
        </p>
      )}
    </div>
  );
}

/** Small real-data strip: annual rainfall or heat days, labelled by year/month. */
export function PackSparkline({ series, color, unit }: { series: { label: string[]; values: number[] }; color: string; unit: string }) {
  const data = series.label.map((label, i) => ({ label, value: series.values[i] }));
  return (
    <div className="mt-2">
      <ResponsiveContainer width="100%" height={54}>
        <LineChart data={data} margin={{ top: 2, right: 4, bottom: 0, left: 4 }}>
          <YAxis hide domain={["dataMin", "dataMax"]} />
          <XAxis dataKey="label" hide />
          <Tooltip
            contentStyle={{ background: "#16243d", border: "1px solid #1e2f4d", borderRadius: 8, fontSize: 12 }}
            formatter={(val) => [`${val}${unit}`, ""]}
          />
          <Line dataKey="value" stroke={color} strokeWidth={1.5} dot={{ r: 1.5, fill: color, strokeWidth: 0 }} />
        </LineChart>
      </ResponsiveContainer>
      <div className="flex justify-between font-mono text-[10px] text-ink-low">
        <span>{series.label[0]}</span>
        <span>{series.label[series.label.length - 1]}</span>
      </div>
    </div>
  );
}

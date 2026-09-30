"use client";

import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { FarmPack } from "@/lib/data";
import { onsetRule } from "@/lib/data";
import { useLang } from "@/lib/lang";
import { dayMonthLabel, fmtNum, monthLabel, t, tf } from "@/lib/i18n";

/** Days of year where these months begin, used only to place the axis ticks. */
const ERA_TICKS = [160, 185, 215, 248];
const SEASON_MONTHS = [7, 8, 9, 10, 11, 0, 1, 2, 3];

function smooth(era: number[], from: number, to: number) {
  const xs: number[] = [];
  for (let x = from; x <= to; x += 1) xs.push(x);
  const n = era.length;
  const bw = 8;
  return xs.map((x) => {
    const dens = era.reduce((a, v) => a + Math.exp(-0.5 * ((x - v) / bw) ** 2), 0) / (n * bw * 2.5066);
    return { dens };
  });
}

export function OnsetDistribution({ pack }: { pack: FarmPack }) {
  const { lang } = useLang();
  const { eraA, eraB } = pack.onset;
  const from = Math.min(...eraA, ...eraB) - 20;
  const to = Math.max(...eraA, ...eraB) + 20;
  const data = useMemo(() => {
    const a = smooth(eraA, from, to);
    const b = smooth(eraB, from, to);
    return a.map((p, i) => ({ doy: from + i, historical: p.dens, current: b[i].dens }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pack.id]);

  const eraOld = fmtNum("2001–2012", lang);
  const eraNew = fmtNum("2013–2025", lang);

  return (
    <div>
      <div className="flex items-center gap-4 pb-2 text-[11px] text-ink-mid">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-water" /> {eraOld}</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-lime" /> {eraNew}</span>
        <span className="ml-auto font-mono text-ink-low">p = {fmtNum(pack.onset.pValue.toFixed(3), lang)} · {t("chart_mann_whitney", lang)}</span>
      </div>
      <ResponsiveContainer width="100%" height={170}>
        <AreaChart data={data} margin={{ top: 4, right: 6, bottom: 0, left: -22 }}>
          <defs>
            <linearGradient id="gA" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4ea8de" stopOpacity={0.55} />
              <stop offset="100%" stopColor="#4ea8de" stopOpacity={0.04} />
            </linearGradient>
            <linearGradient id="gB" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#d4f94e" stopOpacity={0.55} />
              <stop offset="100%" stopColor="#d4f94e" stopOpacity={0.04} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#1e2f4d" strokeDasharray="3 5" vertical={false} />
          <XAxis dataKey="doy" type="number" domain={[from, to]} ticks={ERA_TICKS} tickFormatter={(v) => fmtNum(v as number, lang)} tick={{ fill: "#7b8ca6", fontSize: 11 }} stroke="#1e2f4d" />
          <YAxis hide />
          <ReferenceLine x={pack.onset.historicalMedianDOY} stroke="#4ea8de" strokeDasharray="4 4" />
          <ReferenceLine x={pack.onset.currentMedianDOY} stroke="#d4f94e" strokeDasharray="4 4" />
          <Tooltip
            contentStyle={{ background: "#16243d", border: "1px solid #1e2f4d", borderRadius: 8, fontSize: 12 }}
            labelFormatter={(v) => dayMonthLabel(v as number, lang)}
            formatter={(val, name) => [`${fmtNum(((val as number) * 100).toFixed(1), lang)}% ${t("chart_pct_season", lang)}`, name === "current" ? eraNew : eraOld]}
          />
          <Area dataKey="historical" stroke="#4ea8de" strokeWidth={1.5} fill="url(#gA)" />
          <Area dataKey="current" stroke="#d4f94e" strokeWidth={1.5} fill="url(#gB)" />
        </AreaChart>
      </ResponsiveContainer>
      <p className="pt-1 text-[11px] leading-relaxed text-ink-low">
        {tf("chart_onset_rule", lang, {
          rule: onsetRule(pack, lang),
          from: dayMonthLabel(pack.onset.historicalMedianDOY, lang),
          to: dayMonthLabel(pack.onset.currentMedianDOY, lang),
        })}
      </p>
    </div>
  );
}

export function SeasonTrend({ pack }: { pack: FarmPack }) {
  const { lang } = useLang();
  const data = SEASON_MONTHS.map((month, i) => ({
    m: monthLabel(month, lang),
    current: pack.season.current[i],
    previous: pack.season.previous[i],
    historical: pack.season.historical[i],
  }));
  return (
    <div>
      <div className="flex items-center gap-4 pb-2 text-[11px] text-ink-mid">
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 bg-lime" /> {t("chart_current", lang)}</span>
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 border-t border-dashed border-water" /> {t("chart_previous", lang)}</span>
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 border-t border-dashed border-ink-low" /> {t("chart_historical", lang)}</span>
        <span className="ml-auto font-mono text-ink-low">NDVI · MODIS/VIIRS · NASA</span>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -22 }}>
          <CartesianGrid stroke="#1e2f4d" strokeDasharray="3 5" vertical={false} />
          <XAxis dataKey="m" tick={{ fill: "#7b8ca6", fontSize: 11 }} stroke="#1e2f4d" />
          <YAxis domain={[0, 1]} tickFormatter={(v) => fmtNum(v as number, lang)} tick={{ fill: "#7b8ca6", fontSize: 11 }} stroke="#1e2f4d" />
          <Tooltip
            contentStyle={{ background: "#16243d", border: "1px solid #1e2f4d", borderRadius: 8, fontSize: 12 }}
            formatter={(val) => [fmtNum(Number(val).toFixed(2), lang), "NDVI"]}
          />
          <Line dataKey="current" stroke="#d4f94e" strokeWidth={2} dot={false} />
          <Line dataKey="previous" stroke="#4ea8de" strokeWidth={1.5} strokeDasharray="5 4" dot={false} />
          <Line dataKey="historical" stroke="#7b8ca6" strokeWidth={1.2} strokeDasharray="3 4" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

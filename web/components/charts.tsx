"use client";

import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { FarmPack } from "@/lib/data";

const MONTHS = ["Jun", "Jul", "Aug", "Sep"];
const doyToDate = (doy: number) => {
  const d = new Date(2024, 0, doy);
  return d.toLocaleString("en", { month: "short", day: "numeric" });
};

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
  const { eraA, eraB } = pack.onset;
  const from = Math.min(...eraA, ...eraB) - 20;
  const to = Math.max(...eraA, ...eraB) + 20;
  const data = useMemo(() => {
    const a = smooth(eraA, from, to);
    const b = smooth(eraB, from, to);
    return a.map((p, i) => ({ doy: from + i, historical: p.dens, current: b[i].dens }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pack.id]);

  const ticks = MONTHS.map((m) => {
    const day = { Jun: 160, Jul: 185, Aug: 215, Sep: 248 }[m as "Jun" | "Jul" | "Aug" | "Sep"];
    return day;
  });

  return (
    <div>
      <div className="flex items-center gap-4 pb-2 text-[11px] text-ink-mid">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-water" /> 2001–2012</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-lime" /> 2013–2025</span>
        <span className="ml-auto font-mono text-ink-low">p = {pack.onset.pValue.toFixed(3)} · Mann-Whitney</span>
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
          <XAxis dataKey="doy" type="number" domain={[from, to]} ticks={ticks} tick={{ fill: "#7b8ca6", fontSize: 11 }} stroke="#1e2f4d" />
          <YAxis hide />
          <ReferenceLine x={pack.onset.historicalMedianDOY} stroke="#4ea8de" strokeDasharray="4 4" />
          <ReferenceLine x={pack.onset.currentMedianDOY} stroke="#d4f94e" strokeDasharray="4 4" />
          <Tooltip
            contentStyle={{ background: "#16243d", border: "1px solid #1e2f4d", borderRadius: 8, fontSize: 12 }}
            labelFormatter={(v) => doyToDate(v as number)}
            formatter={(val, name) => [((val as number) * 100).toFixed(1) + "% of season", name === "current" ? "2013–2025" : "2001–2012"]}
          />
          <Area dataKey="historical" stroke="#4ea8de" strokeWidth={1.5} fill="url(#gA)" />
          <Area dataKey="current" stroke="#d4f94e" strokeWidth={1.5} fill="url(#gB)" />
        </AreaChart>
      </ResponsiveContainer>
      <p className="pt-1 text-[11px] leading-relaxed text-ink-low">
        Onset rule: {pack.onset.threshold}. Medians: {doyToDate(pack.onset.historicalMedianDOY)} → {doyToDate(pack.onset.currentMedianDOY)}.
      </p>
    </div>
  );
}

export function SeasonTrend({ pack }: { pack: FarmPack }) {
  const months = ["Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr"];
  const data = months.map((m, i) => ({
    m,
    current: pack.season.current[i],
    previous: pack.season.previous[i],
    historical: pack.season.historical[i],
  }));
  return (
    <div>
      <div className="flex items-center gap-4 pb-2 text-[11px] text-ink-mid">
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 bg-lime" /> Current season</span>
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 border-t border-dashed border-water" /> Previous</span>
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 border-t border-dashed border-ink-low" /> Historical avg</span>
        <span className="ml-auto font-mono text-ink-low">NDVI · MODIS/VIIRS · NASA</span>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -22 }}>
          <CartesianGrid stroke="#1e2f4d" strokeDasharray="3 5" vertical={false} />
          <XAxis dataKey="m" tick={{ fill: "#7b8ca6", fontSize: 11 }} stroke="#1e2f4d" />
          <YAxis domain={[0, 1]} tick={{ fill: "#7b8ca6", fontSize: 11 }} stroke="#1e2f4d" />
          <Tooltip
            contentStyle={{ background: "#16243d", border: "1px solid #1e2f4d", borderRadius: 8, fontSize: 12 }}
            formatter={(val) => [Number(val).toFixed(2), "NDVI"]}
          />
          <Line dataKey="current" stroke="#d4f94e" strokeWidth={2} dot={false} />
          <Line dataKey="previous" stroke="#4ea8de" strokeWidth={1.5} strokeDasharray="5 4" dot={false} />
          <Line dataKey="historical" stroke="#7b8ca6" strokeWidth={1.2} strokeDasharray="3 4" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}


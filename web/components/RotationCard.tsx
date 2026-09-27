"use client";

import { Crop, Droplets, Flame, Leaf, Shield, Sprout } from "lucide-react";
import type { RotationResult } from "@/lib/engine";
import { ConfidenceChip, TierBadge } from "@/components/ui";

const COMP_COLORS: Record<string, string> = {
  s1: "#4ea8de",
  s2: "#f2b84b",
  s3: "#8b7bf0",
  s4: "#57c785",
  s5: "#d4f94e",
  s6: "#ef6c4d",
};
const COMP_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  s1: Droplets, s2: Flame, s3: Crop, s4: Leaf, s5: Sprout, s6: Shield,
};

export function ComponentBar({ k, label, value, weight }: { k: string; label: string; value: number; weight?: number }) {
  const Icon = COMP_ICONS[k] ?? Sprout;
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="w-32 shrink-0 truncate text-[11px] text-ink-mid">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-inset">
        <div className="h-full rounded-full" style={{ width: `${value * 100}%`, background: COMP_COLORS[k] }} />
      </div>
      <span className="w-8 shrink-0 text-right font-mono text-[11px] tabular text-ink-mid">{value.toFixed(2)}</span>
      {weight !== undefined && <span className="w-8 shrink-0 text-right font-mono text-[10px] text-ink-low">×{weight.toFixed(2)}</span>}
    </div>
  );
}

export function RotationCard({
  result, rank, onWhy, selected,
}: {
  result: RotationResult;
  rank: number;
  onWhy: () => void;
  selected: boolean;
}) {
  const top3 = [...result.components].sort((a, b) => b.value * b.weight - a.value * a.weight).slice(0, 3);
  return (
    <article
      className={`rounded-xl border bg-surface p-4 transition-colors fade-up ${
        selected ? "border-lime/60" : "border-line hover:border-action"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className={`flex h-7 w-7 items-center justify-center rounded-lg font-display text-sm font-bold ${rank === 1 ? "bg-lime text-canvas" : "bg-elevated text-ink-mid"}`}>
            {rank}
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {result.crops.map((c, i) => (
              <span key={c.id} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-ink-low">→</span>}
                <span className="rounded-md border border-line bg-inset px-2 py-1 text-xs font-semibold text-ink-hi">{c.name_en}</span>
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ConfidenceChip level={result.confidence} />
          <span className="font-display text-xl font-bold tabular">
            {result.total}
            <span className="text-xs font-medium text-ink-low">/100</span>
          </span>
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-1.5">
        {top3.map((c) => (
          <ComponentBar key={c.key} k={c.key} label={c.label} value={c.value} />
        ))}
      </div>

      {result.risks.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {result.risks.map((r) => (
            <span key={r} className="rounded-full border border-amber/40 bg-amber/10 px-2 py-0.5 text-[10px] text-amber">⚠ {r}</span>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between border-t border-line-soft pt-3">
        <div className="flex items-center gap-1.5">
          <TierBadge tier="NASA" />
          <span className="text-[10px] text-ink-low">all evidence tiers shown in Why</span>
        </div>
        <button
          onClick={onWhy}
          className="rounded-lg border border-action px-3 py-1.5 text-xs font-semibold text-action transition-colors hover:bg-action/10"
        >
          Why?
        </button>
      </div>
    </article>
  );
}

export function WhyDrawer({ result, onClose }: { result: RotationResult | null; onClose: () => void }) {
  if (!result) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={onClose}>
      <aside
        className="h-full w-full max-w-md overflow-y-auto border-l border-line bg-canvas p-5 shadow-drawer fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Why this rotation?</h2>
          <button onClick={onClose} className="rounded-lg border border-line px-2.5 py-1 text-xs text-ink-mid hover:text-ink-hi">Close</button>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {result.crops.map((c, i) => (
            <span key={c.id} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-ink-low">→</span>}
              <span className="rounded-md border border-line bg-inset px-2 py-1 text-xs font-semibold">{c.name_en}</span>
            </span>
          ))}
          <span className="ml-auto font-display text-lg font-bold tabular">{result.total}/100</span>
        </div>

        <h3 className="mt-5 text-xs font-semibold uppercase tracking-wider text-ink-low">Because</h3>
        <ul className="mt-2 space-y-2">
          {result.why.map((w, i) => (
            <li key={i} className="flex gap-2 text-sm leading-relaxed text-ink-mid">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-lime" />{w}
            </li>
          ))}
        </ul>

        <h3 className="mt-5 text-xs font-semibold uppercase tracking-wider text-ink-low">Component scores</h3>
        <div className="mt-2 flex flex-col gap-2">
          {result.components.map((c) => (
            <ComponentBar key={c.key} k={c.key} label={c.label} value={c.value} weight={c.weight} />
          ))}
        </div>

        {result.penalties.length > 0 && (
          <>
            <h3 className="mt-5 text-xs font-semibold uppercase tracking-wider text-ink-low">Penalties</h3>
            <ul className="mt-2 space-y-1.5">
              {result.penalties.map((p) => (
                <li key={p.rule} className="rounded-lg border border-risk/30 bg-risk/5 p-2.5 text-xs text-ink-mid">
                  <span className="font-semibold text-risk">−{p.amount}</span> {p.rule}
                  <span className="mt-0.5 block text-[10px] text-ink-low">source: {p.source}</span>
                </li>
              ))}
            </ul>
          </>
        )}

        <h3 className="mt-5 text-xs font-semibold uppercase tracking-wider text-ink-low">Provenance</h3>
        <p className="mt-2 rounded-lg border border-line bg-surface p-3 font-mono text-[11px] leading-relaxed text-ink-mid">
          water: NASA POWER (daily, 1981–2025) + SMAP L4 · heat: POWER T2M_MAX · soil: SoilGrids 2.0 (modeled, CC-BY-4.0) ·
          demand: FAO-56 crop coefficients · flood: farm flood index (BD context) · engine: field-shift rotation v1.0 (deterministic, tested)
        </p>
        <p className="mt-4 text-[11px] leading-relaxed text-ink-low">
          This ranking is stable to the stated thresholds; shift the onset threshold ±5 mm or any priority ±10 and the top set barely moves — the sensitivity report ships in Method.
        </p>
      </aside>
    </div>
  );
}

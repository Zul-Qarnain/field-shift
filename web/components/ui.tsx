"use client";

import { Info } from "lucide-react";
import type { Tier, Source } from "@/lib/data";

export function TierBadge({ tier }: { tier: Tier }) {
  const styles: Record<Tier, string> = {
    NASA: "bg-nasa text-white border-transparent",
    Partner: "border-violet text-violet",
    Open: "border-opengray text-ink-mid",
    You: "border-lime text-lime",
  };
  return (
    <span className={`inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${styles[tier]}`}>
      {tier}
    </span>
  );
}

export function SourceChip({ source }: { source: Source }) {
  const map: Record<Source, [string, string]> = {
    live: ["bg-earth/15 text-earth", "live"],
    cache: ["bg-water/15 text-water", "cache"],
    fixture: ["bg-amber/15 text-amber", "fixture"],
  };
  const [cls, label] = map[source];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] ${cls}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

export function DeltaChip({ value, unit = "", inverse = false }: { value: number; unit?: string; inverse?: boolean }) {
  const good = inverse ? value < 0 : value > 0;
  const neutral = value === 0;
  const cls = neutral ? "bg-surface text-ink-mid" : good ? "bg-lime/15 text-lime" : "bg-risk/15 text-risk";
  const sign = value > 0 ? "+" : "";
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-semibold tabular ${cls}`}>
      {sign}
      {value}
      {unit}
    </span>
  );
}

export function ConfidenceChip({ level }: { level: "high" | "medium" | "low" }) {
  const map = {
    high: "border-earth text-earth",
    medium: "border-amber text-amber",
    low: "border-risk text-risk",
  } as const;
  return (
    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${map[level]}`}>
      {level} confidence
    </span>
  );
}

export function Panel({ title, right, children, className = "" }: { title?: React.ReactNode; right?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-line bg-surface ${className}`}>
      {(title || right) && (
        <header className="flex items-center justify-between border-b border-line-soft px-4 py-3">
          {title && <h2 className="text-sm font-semibold text-ink-hi">{title}</h2>}
          {right}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function InfoDot({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex cursor-help">
      <Info className="h-3.5 w-3.5 text-ink-low" />
      <span className="pointer-events-none absolute bottom-5 left-1/2 z-50 hidden w-64 -translate-x-1/2 rounded-lg border border-line bg-elevated p-2.5 text-xs leading-relaxed text-ink-mid shadow-drawer group-hover:block">
        {text}
      </span>
    </span>
  );
}

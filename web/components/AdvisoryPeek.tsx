"use client";

import Link from "next/link";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { getFarm } from "@/lib/data";
import { generateRotations, DEFAULT_PRIORITIES, advisoryText } from "@/lib/engine";
import { SourceChip } from "@/components/ui";
import { useLang } from "@/lib/lang";

export function AdvisoryPeek({ farmId }: { farmId: string }) {
  const pack = getFarm(farmId);
  const results = generateRotations(pack, DEFAULT_PRIORITIES, { rainfallPct: 0, tempDeltaC: 0, onsetShiftDays: 0, phOverride: null }, new Set(["aman", "boro", "wheat", "maize", "mustard", "lentil", "mungbean", "sesame", "potato"]));
  const { lang } = useLang();
  const [copied, setCopied] = useState(false);
  const text = advisoryText(pack, results[0], lang);
  return (
    <section className="rounded-xl border border-lime/40 bg-surface p-5 fade-up">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-lime">Advisory</p>
        <SourceChip source="fixture" />
      </div>
      <p className="mt-2 font-display text-lg font-medium leading-relaxed text-ink-hi lg:text-xl">{text}</p>
      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={() => { navigator.clipboard?.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1600); }}
          className="flex items-center gap-1.5 rounded-lg border border-line bg-inset px-3 py-1.5 text-xs font-medium text-ink-mid hover:text-ink-hi"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-earth" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy advisory"}
        </button>
        <Link href={`/plan?farm=${farmId}`} className="text-xs font-semibold text-link hover:underline">
          Open full planning →
        </Link>
      </div>
    </section>
  );
}

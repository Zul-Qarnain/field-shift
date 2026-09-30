"use client";

import Link from "next/link";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { getFarm, CROPS } from "@/lib/data";
import { withRealData } from "@/lib/packs";
import { generateRotations, DEFAULT_PRIORITIES, advisoryText } from "@/lib/engine";
import { SourceChip } from "@/components/ui";
import { useLang } from "@/lib/lang";
import { t } from "@/lib/i18n";

export function AdvisoryPeek({ farmId }: { farmId: string }) {
  const pack = withRealData(getFarm(farmId));
  const results = generateRotations(pack, DEFAULT_PRIORITIES, { rainfallPct: 0, tempDeltaC: 0, onsetShiftDays: 0, phOverride: null }, new Set(CROPS.map((c) => c.id)));
  const { lang } = useLang();
  const [copied, setCopied] = useState(false);
  const text = advisoryText(pack, results[0], lang);
  return (
    <section className="rounded-xl border border-lime/40 bg-surface p-5 fade-up">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-lime">{t("advisory", lang)}</p>
        <SourceChip source="fixture" />
      </div>
      <p className="mt-2 font-display text-lg font-medium leading-relaxed text-ink-hi lg:text-xl">{text}</p>
      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={() => { navigator.clipboard?.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1600); }}
          className="flex items-center gap-1.5 rounded-lg border border-line bg-inset px-3 py-1.5 text-xs font-medium text-ink-mid hover:text-ink-hi"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-earth" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? t("copied", lang) : t("copy_advisory", lang)}
        </button>
        <Link href={`/plan?farm=${farmId}`} className="text-xs font-semibold text-link hover:underline">
          {t("open_full_planning", lang)} →
        </Link>
      </div>
    </section>
  );
}

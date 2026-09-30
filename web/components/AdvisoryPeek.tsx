"use client";

import Link from "next/link";
import { AlertTriangle, Check, Copy } from "lucide-react";
import { CROPS, getFarm } from "@/lib/data";
import { packForFarm, withRealData } from "@/lib/packs";
import { generateRotations, DEFAULT_PRIORITIES, DEFAULT_SCENARIO, advisoryText } from "@/lib/engine";
import { useCopy } from "@/lib/clipboard";
import { SourceChip } from "@/components/ui";
import { useLang } from "@/lib/lang";
import { t } from "@/lib/i18n";

export function AdvisoryPeek({ farmId }: { farmId: string }) {
  const realPack = packForFarm(farmId);
  const pack = withRealData(getFarm(farmId));
  const results = generateRotations(pack, DEFAULT_PRIORITIES, DEFAULT_SCENARIO, new Set(CROPS.map((c) => c.id)));
  const { lang } = useLang();
  const { state, copy } = useCopy();
  const text = advisoryText(pack, results[0], lang);
  return (
    <section className="rounded-xl border border-lime/40 bg-surface p-5 fade-up">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-lime">{t("advisory", lang)}</p>
        <SourceChip source="fixture" />
        {realPack && <SourceChip source="pack" />}
      </div>
      <p className="mt-2 font-display text-lg font-medium leading-relaxed text-ink-hi lg:text-xl">{text}</p>
      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={() => void copy(text)}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium ${
            state === "failed" ? "border-risk/50 bg-risk/10 text-risk" : "border-line bg-inset text-ink-mid hover:text-ink-hi"
          }`}
        >
          {state === "copied" ? <Check className="h-3.5 w-3.5 text-earth" /> : state === "failed" ? <AlertTriangle className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {state === "copied" ? t("copied", lang) : state === "failed" ? t("copy_failed", lang) : t("copy_advisory", lang)}
        </button>
        <Link href={`/plan?farm=${farmId}`} className="text-xs font-semibold text-link hover:underline">
          {t("open_full_planning", lang)} →
        </Link>
      </div>
    </section>
  );
}

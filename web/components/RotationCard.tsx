"use client";

import { Crop, Droplets, Flame, Leaf, Shield, Sprout } from "lucide-react";
import { pick, type RotationResult } from "@/lib/engine";
import { cropName } from "@/lib/data";
import { useLang } from "@/lib/lang";
import { fmtNum, t } from "@/lib/i18n";
import { ConfidenceChip, TierBadge } from "@/components/ui";

const COMP_COLORS: Record<string, string> = {
  s1: "#4ea8de",
  s2: "#f2b84b",
  s3: "#8b7bf0",
  s4: "#57c785",
  s5: "#d4f94e",
  s6: "#ef6c4d",
  s7: "#2ec4b6",
  s8: "#c9a227",
};
const COMP_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  s1: Droplets, s2: Flame, s3: Crop, s4: Leaf, s5: Sprout, s6: Shield, s7: Droplets, s8: Sprout,
};

export function ComponentBar({ k, label, value, weight }: { k: string; label: string; value: number; weight?: number }) {
  const { lang } = useLang();
  const Icon = COMP_ICONS[k] ?? Sprout;
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="w-32 shrink-0 truncate text-[11px] text-ink-mid">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-inset">
        <div className="h-full rounded-full" style={{ width: `${value * 100}%`, background: COMP_COLORS[k] }} />
      </div>
      <span className="w-8 shrink-0 text-right font-mono text-[11px] tabular text-ink-mid">{fmtNum(value.toFixed(2), lang)}</span>
      {weight !== undefined && <span className="w-10 shrink-0 text-right font-mono text-[10px] text-ink-low">×{fmtNum(weight.toFixed(2), lang)}</span>}
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
  const { lang } = useLang();
  const label = (c: RotationResult["components"][number]) => (lang === "bn" ? c.label_bn : c.label);
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
                <span className="rounded-md border border-line bg-inset px-2 py-1 text-xs font-semibold text-ink-hi">{cropName(c, lang)}</span>
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ConfidenceChip level={result.confidence} />
          <span className="font-display text-xl font-bold tabular">
            {fmtNum(result.total, lang)}
            <span className="text-xs font-medium text-ink-low">/{fmtNum(100, lang)}</span>
          </span>
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-1.5">
        {top3.map((c) => (
          <ComponentBar key={c.key} k={c.key} label={label(c)} value={c.value} />
        ))}
      </div>

      {result.risks.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {result.risks.map((r) => (
            <span key={r.en} className="rounded-full border border-amber/40 bg-amber/10 px-2 py-0.5 text-[10px] text-amber">⚠ {pick(r, lang)}</span>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between border-t border-line-soft pt-3">
        <div className="flex items-center gap-1.5">
          <TierBadge tier="NASA" />
          <span className="text-[10px] text-ink-low">{t("tiers_note", lang)}</span>
        </div>
        <button
          onClick={onWhy}
          className="rounded-lg border border-action px-3 py-1.5 text-xs font-semibold text-action transition-colors hover:bg-action/10"
        >
          {t("why", lang)}?
        </button>
      </div>
    </article>
  );
}

export function WhyDrawer({ result, onClose }: { result: RotationResult | null; onClose: () => void }) {
  const { lang } = useLang();
  if (!result) return null;
  const label = (c: RotationResult["components"][number]) => (lang === "bn" ? c.label_bn : c.label);
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={onClose}>
      <aside
        className="h-full w-full max-w-md overflow-y-auto border-l border-line bg-canvas p-5 shadow-drawer fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">{t("why_title", lang)}</h2>
          <button onClick={onClose} className="rounded-lg border border-line px-2.5 py-1 text-xs text-ink-mid hover:text-ink-hi">{t("close", lang)}</button>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {result.crops.map((c, i) => (
            <span key={c.id} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-ink-low">→</span>}
              <span className="rounded-md border border-line bg-inset px-2 py-1 text-xs font-semibold">{cropName(c, lang)}</span>
            </span>
          ))}
          <span className="ml-auto font-display text-lg font-bold tabular">{fmtNum(result.total, lang)}/{fmtNum(100, lang)}</span>
        </div>

        <h3 className="mt-5 text-xs font-semibold uppercase tracking-wider text-ink-low">{t("because", lang)}</h3>
        <ul className="mt-2 space-y-2">
          {result.why.map((w) => (
            <li key={w.en} className="flex gap-2 text-sm leading-relaxed text-ink-mid">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-lime" />{pick(w, lang)}
            </li>
          ))}
        </ul>

        <h3 className="mt-5 text-xs font-semibold uppercase tracking-wider text-ink-low">{t("component_scores", lang)}</h3>
        <div className="mt-2 flex flex-col gap-2">
          {result.components.map((c) => (
            <ComponentBar key={c.key} k={c.key} label={label(c)} value={c.value} weight={c.weight} />
          ))}
        </div>

        {result.penalties.length > 0 && (
          <>
            <h3 className="mt-5 text-xs font-semibold uppercase tracking-wider text-ink-low">{t("penalties", lang)}</h3>
            <ul className="mt-2 space-y-1.5">
              {result.penalties.map((p) => (
                <li key={p.rule.en} className="rounded-lg border border-risk/30 bg-risk/5 p-2.5 text-xs text-ink-mid">
                  <span className="font-semibold text-risk">−{fmtNum(p.amount, lang)}</span> {pick(p.rule, lang)}
                  <span className="mt-0.5 block text-[10px] text-ink-low">{t("source_word", lang)}: {pick(p.source, lang)}</span>
                </li>
              ))}
            </ul>
          </>
        )}

        <h3 className="mt-5 text-xs font-semibold uppercase tracking-wider text-ink-low">{t("data_provenance", lang)}</h3>
        <p className="mt-2 rounded-lg border border-line bg-surface p-3 font-mono text-[11px] leading-relaxed text-ink-mid">{t("drawer_sources", lang)}</p>
        <p className="mt-4 text-[11px] leading-relaxed text-ink-low">{t("why_sensitivity_note", lang)}</p>
      </aside>
    </div>
  );
}

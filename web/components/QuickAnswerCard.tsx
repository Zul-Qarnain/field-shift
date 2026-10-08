"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cropName } from "@/lib/data";
import { ONSET_ALPHA, pick, type RotationResult } from "@/lib/engine";
import { onsetView, retrievedDay, sourceLabel, type PowerPack } from "@/lib/packs";
import { scoreBreakdown, type DistrictProfile } from "@/lib/quick";
import { fmtNum, t, tf } from "@/lib/i18n";
import { useLang } from "@/lib/lang";
import { ConfidenceChip, TierBadge } from "@/components/ui";

const COMP_COLORS: Record<string, string> = {
  s1: "#4ea8de", s2: "#f2b84b", s3: "#8b7bf0", s4: "#57c785",
  s5: "#d4f94e", s6: "#ef6c4d", s7: "#2ec4b6", s8: "#c9a227",
};

const one = (value: number, lang: Parameters<typeof fmtNum>[1]) => fmtNum(value.toFixed(1), lang);

/** The score as the eight contributions it actually has, with the penalty subtraction beside them. */
function ScoreStack({ result }: { result: RotationResult }) {
  const { lang } = useLang();
  const parts = scoreBreakdown(result);
  return (
    <div data-testid="score-stack" className="mt-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-low">{t("quick_score_heading", lang)}</p>
      <div className="mt-1.5 flex h-3.5 w-full overflow-hidden rounded-full bg-inset" aria-hidden="true">
        {parts.segments.map((s) => (
          <div
            key={s.key}
            className="h-full border-r border-canvas/60"
            style={{ width: `${Math.max(0, s.display)}%`, background: COMP_COLORS[s.key] ?? "#8b7bf0" }}
            title={`${lang === "bn" ? s.label_bn : s.label} · ${one(s.display, lang)}`}
          />
        ))}
      </div>
      <div className="mt-1 flex h-2.5 w-full overflow-hidden rounded-full bg-inset">
        {parts.penaltyDisplay > 0 && (
          <div
            className="h-full"
            style={{
              width: `${parts.penaltyDisplay}%`,
              backgroundImage: "repeating-linear-gradient(45deg, #ef6c4d 0 4px, rgba(239,108,77,0.45) 4px 8px)",
            }}
            title={t("quick_penalties_label", lang)}
          />
        )}
        {parts.creditDisplay > 0 && (
          <div className="h-full bg-lime" style={{ width: `${parts.creditDisplay}%` }} title={t("quick_credit_label", lang)} />
        )}
      </div>

      <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] leading-snug text-ink-mid">
        {parts.segments.map((s) => (
          <li key={s.key} className="flex items-center gap-1.5">
            <span className="h-2 w-2 shrink-0 rounded-sm" style={{ background: COMP_COLORS[s.key] }} />
            <span className="min-w-0 truncate">{lang === "bn" ? s.label_bn : s.label}</span>
            <span className="ml-auto shrink-0 font-mono tabular text-ink-hi">{one(s.display, lang)}</span>
          </li>
        ))}
        <li className="flex items-center gap-1.5">
          <span className="h-2 w-2 shrink-0 rounded-sm bg-risk" />
          <span className="min-w-0 truncate">{t("quick_penalties_label", lang)}</span>
          <span className="ml-auto shrink-0 font-mono tabular text-risk">−{one(parts.penaltyDisplay, lang)}</span>
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-2 w-2 shrink-0 rounded-sm bg-lime" />
          <span className="min-w-0 truncate">{t("quick_credit_label", lang)}</span>
          <span className="ml-auto shrink-0 font-mono tabular text-lime">+{one(parts.creditDisplay, lang)}</span>
        </li>
      </ul>

      <p data-testid="score-equation" className="mt-2 rounded-lg border border-line bg-inset px-2.5 py-1.5 font-mono text-[11px] tabular text-ink-mid">
        {tf("quick_equation", lang, {
          parts: one(parts.partsDisplay, lang),
          penalties: one(parts.penaltyDisplay, lang),
          credit: one(parts.creditDisplay, lang),
          total: one(parts.total, lang),
        })}
      </p>
    </div>
  );
}

function AnswerInputs({ profile, pack }: { profile: DistrictProfile; pack: PowerPack }) {
  const { lang } = useLang();
  const view = onsetView(pack);
  const significant = view?.pValue !== null && view?.pValue !== undefined && view.pValue < ONSET_ALPHA;
  const sal = profile.pack.salinity;

  return (
    <div className="mt-4 rounded-lg border border-line bg-surface p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-low">{t("quick_inputs_heading", lang)}</p>
      <ul className="mt-1.5 space-y-1.5 text-[11px] leading-relaxed text-ink-mid">
        <li className="flex items-start gap-2">
          <TierBadge tier="NASA" />
          <span>{tf("quick_power_input", lang, { product: sourceLabel(pack), date: retrievedDay(pack) })}</span>
        </li>
        <li>
          ·{" "}
          {view
            ? tf("quick_onset_input", lang, {
                product: view.product,
                days: `${view.shiftDays > 0 ? "+" : ""}${view.shiftDays}`,
                unit: t("unit_days_short", lang),
                p: view.pValue === null ? "n/a" : view.pValue.toFixed(3),
                verdict: significant ? t("significant", lang) : t("not_significant", lang),
              })
            : `Onset: — · ${t("pack_no_value", lang)}`}
        </li>
        <li>
          ·{" "}
          {tf("quick_salinity_input", lang, {
            source: sal.cited
              ? `${sal.source} · ${(sal.salineShare * 100).toFixed(1)}%`
              : `${sal.source} · ${t("quick_salinity_unsurveyed", lang)}`,
          })}
        </li>
        <li>
          ·{" "}
          {tf("quick_farm_input", lang, {
            name: lang === "bn" ? profile.fromFarmNameBn : profile.fromFarmNameEn,
            km: (Math.round(profile.distanceKm * 10) / 10).toFixed(1),
          })}
        </li>
      </ul>
      <p className="mt-2 text-[11px] leading-relaxed text-ink-low">{t("quick_next_phase", lang)}</p>
    </div>
  );
}

export function QuickAnswerCard({
  result, rank, profile, pack,
}: {
  result: RotationResult;
  rank: number;
  profile: DistrictProfile;
  pack: PowerPack;
}) {
  const { lang } = useLang();
  const [open, setOpen] = useState(false);
  const parts = scoreBreakdown(result);

  return (
    <article data-testid="quick-result" className="rounded-xl border border-line bg-surface p-4 fade-up">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className={`flex h-7 w-7 items-center justify-center rounded-lg font-display text-sm font-bold ${rank === 1 ? "bg-lime text-canvas" : "bg-elevated text-ink-mid"}`}>
            {fmtNum(rank, lang)}
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

      <ScoreStack result={result} />

      <div className="mt-3 flex items-center justify-between border-t border-line-soft pt-3">
        <span className="text-[10px] text-ink-low">{tf("quick_calendar_note", lang, { used: result.calendarDays })}</span>
        <button
          onClick={() => setOpen((o) => !o)}
          data-testid="see-why"
          aria-expanded={open}
          className="flex items-center gap-1.5 rounded-lg border border-action px-3 py-1.5 text-xs font-semibold text-action transition-colors hover:bg-action/10"
        >
          {t("see_why", lang)}
          {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      </div>

      {open && (
        <div className="mt-3 border-t border-line-soft pt-3">
          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-ink-low">{t("component_scores", lang)}</h4>
          <ul className="mt-1.5 space-y-1 text-[11px] text-ink-mid">
            {parts.segments.map((s) => (
              <li key={s.key} className="flex items-center gap-2">
                <span className="h-2 w-2 shrink-0 rounded-sm" style={{ background: COMP_COLORS[s.key] }} />
                <span className="min-w-0 flex-1 truncate">{lang === "bn" ? s.label_bn : s.label}</span>
                <span className="shrink-0 font-mono tabular">
                  {fmtNum(s.value.toFixed(2), lang)} × {fmtNum(s.weight.toFixed(2), lang)} = {one(s.display, lang)}
                </span>
              </li>
            ))}
          </ul>

          {result.penalties.length > 0 && (
            <>
              <h4 className="mt-4 text-[10px] font-semibold uppercase tracking-wider text-ink-low">{t("penalties", lang)}</h4>
              <ul className="mt-1.5 space-y-1.5">
                {result.penalties.map((p) => (
                  <li key={p.rule.en} className="rounded-lg border border-risk/30 bg-risk/5 p-2.5 text-[11px] text-ink-mid">
                    <span className="font-semibold text-risk">−{fmtNum(p.amount, lang)}</span> {pick(p.rule, lang)}
                    <span className="mt-0.5 block text-[10px] text-ink-low">{t("source_word", lang)}: {pick(p.source, lang)}</span>
                  </li>
                ))}
              </ul>
            </>
          )}

          <h4 className="mt-4 text-[10px] font-semibold uppercase tracking-wider text-ink-low">{t("because", lang)}</h4>
          <ul className="mt-1.5 space-y-1.5">
            {result.why.map((w) => (
              <li key={w.en} className="flex gap-2 text-[11px] leading-relaxed text-ink-mid">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-lime" />{pick(w, lang)}
              </li>
            ))}
          </ul>

          {result.risks.length > 0 && (
            <>
              <h4 className="mt-4 text-[10px] font-semibold uppercase tracking-wider text-ink-low">{t("quick_risks_heading", lang)}</h4>
              <ul className="mt-1.5 flex flex-wrap gap-1.5">
                {result.risks.map((r) => (
                  <li key={r.en} className="rounded-full border border-amber/40 bg-amber/10 px-2 py-0.5 text-[10px] text-amber">⚠ {pick(r, lang)}</li>
                ))}
              </ul>
            </>
          )}

          <AnswerInputs profile={profile} pack={pack} />
        </div>
      )}
    </article>
  );
}

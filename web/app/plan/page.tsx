"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, Check, Copy, Droplets, Leaf, Shield, Sprout } from "lucide-react";
import { CROPS, cropName, districtName, farmContext, farmName, getFarm } from "@/lib/data";
import {
  DEFAULT_PRIORITIES, DEFAULT_SCENARIO, advisoryText, generateRotations, smsText,
  type Priorities, type RotationResult, type Scenario,
} from "@/lib/engine";
import { useCopy } from "@/lib/clipboard";
import { useLang } from "@/lib/lang";
import { fmtNum, t, tf, type StringKey } from "@/lib/i18n";
import { Panel, SourceChip, InfoDot } from "@/components/ui";
import { RotationCard, WhyDrawer } from "@/components/RotationCard";

const ALL_CROPS = CROPS.map((c) => c.id);

const SLIDERS: { key: keyof Priorities; label_en: string; label_bn: string; icon: typeof Droplets; color: string }[] = [
  { key: "water", label_en: "Water saving", label_bn: "পানি সাশ্রয়", icon: Droplets, color: "#4ea8de" },
  { key: "soilHealth", label_en: "Soil health", label_bn: "মাটির স্বাস্থ্য", icon: Leaf, color: "#57c785" },
  { key: "stability", label_en: "Stable harvest", label_bn: "স্থিতিশীল ফলন", icon: Sprout, color: "#d4f94e" },
  { key: "riskSafety", label_en: "Heat & flood safety", label_bn: "তাপ ও বন্যা নিরাপত্তা", icon: Shield, color: "#ef6c4d" },
];

const SCENARIOS: { label: StringKey; apply: Scenario }[] = [
  { label: "sc_baseline", apply: DEFAULT_SCENARIO },
  { label: "sc_rain10", apply: { ...DEFAULT_SCENARIO, rainfallPct: -10 } },
  { label: "sc_rain20", apply: { ...DEFAULT_SCENARIO, rainfallPct: -20 } },
  { label: "sc_hot1", apply: { ...DEFAULT_SCENARIO, tempDeltaC: 1 } },
  { label: "sc_hot2", apply: { ...DEFAULT_SCENARIO, tempDeltaC: 2 } },
  { label: "sc_onset7", apply: { ...DEFAULT_SCENARIO, onsetShiftDays: 7 } },
  { label: "sc_onset15", apply: { ...DEFAULT_SCENARIO, onsetShiftDays: 15 } },
];

function PlanView({ farmId }: { farmId: string }) {
  const pack = getFarm(farmId);
  const { lang } = useLang();
  const [priorities, setPriorities] = useState<Priorities>(DEFAULT_PRIORITIES);
  const [scenario, setScenario] = useState<Scenario>(DEFAULT_SCENARIO);
  const [pool, setPool] = useState<Set<string>>(new Set(ALL_CROPS));
  const [why, setWhy] = useState<RotationResult | null>(null);
  const copyAdvisory = useCopy();
  const copySms = useCopy();

  const results = useMemo(() => generateRotations(pack, priorities, scenario, pool), [pack, priorities, scenario, pool]);
  const top = results[0] as RotationResult | undefined;
  const advisory = top ? advisoryText(pack, top, lang) : "";
  const sms = top ? smsText(pack, top, lang) : "";
  const isBaseline = scenario === DEFAULT_SCENARIO;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
      <p className="text-xs text-ink-low">{t("nav_plan", lang)} <span className="mx-1">›</span> {farmName(pack, lang)} · {districtName(pack, lang)}</p>
      <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">
        {t("plan_title", lang)} <span className="text-ink-low">— {farmContext(pack, lang)}</span>
      </h1>

      <div className="mt-6 grid gap-5 xl:grid-cols-[340px_1fr]">
        {/* Left: priorities + crops + scenarios */}
        <aside className="flex flex-col gap-5">
          <Panel title={t("priorities", lang)}>
            <div className="flex flex-col gap-4">
              {SLIDERS.map((s) => (
                <div key={s.key}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 font-medium text-ink-mid">
                      <s.icon className="h-3.5 w-3.5" style={{ color: s.color }} />
                      {lang === "bn" ? s.label_bn : s.label_en}
                    </span>
                    <span className="font-mono tabular text-ink-low">{fmtNum(priorities[s.key], lang)}</span>
                  </div>
                  <input
                    type="range" min={0} max={100} value={priorities[s.key]}
                    onChange={(e) => setPriorities((p) => ({ ...p, [s.key]: Number(e.target.value) }))}
                    className="mt-1.5 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-inset accent-action"
                  />
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-ink-low">{t("plan_sliders_note", lang)}</p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-ink-low">{tf("plan_irrigation_note", lang, { n: pack.irrigation })}</p>
          </Panel>

          <Panel title={t("crop_pool", lang)} right={<InfoDot text={t("crop_pool_info", lang)} />}>
            <div className="flex flex-wrap gap-1.5">
              {CROPS.map((c) => {
                const on = pool.has(c.id);
                return (
                  <button
                    key={c.id}
                    onClick={() => setPool((p) => { const n = new Set(p); if (n.has(c.id)) n.delete(c.id); else n.add(c.id); return n; })}
                    className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${on ? "border-lime/50 bg-lime/10 text-ink-hi" : "border-line bg-inset text-ink-low hover:text-ink-mid"}`}
                  >
                    {on && <Check className="mr-1 inline h-3 w-3 text-lime" />}{cropName(c, lang)}
                  </button>
                );
              })}
            </div>
          </Panel>

          <Panel title={<span className="flex items-center gap-2">{t("scenarios", lang)} <InfoDot text={t("whatif_info", lang)} /></span>} right={<SourceChip source="fixture" />}>
            <div className="flex flex-wrap gap-1.5">
              {SCENARIOS.map((s) => (
                <button
                  key={s.label}
                  onClick={() => setScenario(s.apply)}
                  className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    scenario === s.apply ? "border-amber bg-amber/10 text-amber" : "border-line bg-inset text-ink-mid hover:text-ink-hi"
                  }`}
                >
                  {t(s.label, lang)}
                </button>
              ))}
            </div>
            {!isBaseline && (
              <div className="mt-3 rounded-lg border border-amber/40 bg-amber/5 p-2.5 text-[11px] leading-relaxed text-amber">
                ⚠ {t("stress_test", lang)}
              </div>
            )}
          </Panel>
        </aside>

        {/* Right: results */}
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-xl font-bold">
              {tf("plan_valid_rotations", lang, { n: results.length })}{" "}
              <span className="text-sm font-medium text-ink-low">{tf("plan_from_crops", lang, { c: pool.size, k: Math.min(3, results.length) })}</span>
            </h2>
            {results.length > 1 && Math.abs(results[0].total - results[1].total) < 0.5 && (
              <span className="text-xs text-amber">{t("plan_tie", lang)}</span>
            )}
          </div>

          {results.slice(0, 3).map((r, i) => (
            <RotationCard key={r.id} result={r} rank={i + 1} selected={i === 0} onWhy={() => setWhy(r)} />
          ))}
          {results.length > 3 && (
            <details className="rounded-xl border border-line bg-surface p-4">
              <summary className="cursor-pointer text-sm font-medium text-ink-mid">{tf("plan_show_all", lang, { n: results.length })}</summary>
              <div className="mt-3 flex flex-col gap-3">
                {results.slice(3).map((r, i) => (
                  <RotationCard key={r.id} result={r} rank={i + 4} selected={false} onWhy={() => setWhy(r)} />
                ))}
              </div>
            </details>
          )}
          {results.length === 0 && (
            <Panel>
              <p className="text-sm text-ink-mid">{t("plan_none", lang)}</p>
            </Panel>
          )}

          {top && (
            <section className="rounded-xl border border-lime/40 bg-lime/5 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-lime">{t("advisory_eyebrow", lang)}</p>
                <SourceChip source="fixture" />
              </div>
              <p className="mt-2 font-display text-lg font-medium leading-relaxed text-ink-hi">{advisory}</p>
              <p className="mt-1.5 text-[11px] leading-relaxed text-ink-low">{t("advisory_note", lang)}</p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => void copyAdvisory.copy(advisory)}
                  className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold transition-colors ${
                    copyAdvisory.state === "failed"
                      ? "bg-risk text-white hover:brightness-110"
                      : "bg-lime text-canvas hover:brightness-110"
                  }`}
                >
                  {copyAdvisory.state === "copied" ? <Check className="h-3.5 w-3.5" /> : copyAdvisory.state === "failed" ? <AlertTriangle className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copyAdvisory.state === "copied" ? t("copied", lang) : copyAdvisory.state === "failed" ? t("copy_failed", lang) : t("copy_advisory", lang)}
                </button>
                <button
                  onClick={() => void copySms.copy(sms)}
                  className={`flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-xs font-medium ${
                    copySms.state === "failed" ? "border-risk/50 bg-risk/10 text-risk" : "border-line bg-inset text-ink-mid hover:text-ink-hi"
                  }`}
                >
                  {copySms.state === "copied" ? <Check className="h-3.5 w-3.5 text-earth" /> : copySms.state === "failed" ? <AlertTriangle className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copySms.state === "copied"
                    ? t("copied", lang)
                    : copySms.state === "failed"
                      ? t("copy_failed", lang)
                      : t("sms_version", lang)}{" "}
                  · {fmtNum(sms.length, lang)}/{fmtNum(160, lang)}
                </button>
                <span className="font-bengali text-xs text-ink-low">{lang === "en" ? advisoryText(pack, top, "bn") : advisoryText(pack, top, "en").slice(0, 80) + "…"}</span>
              </div>
            </section>
          )}
        </div>
      </div>

      <WhyDrawer result={why} onClose={() => setWhy(null)} />
    </div>
  );
}

function LoadingNote() {
  const { lang } = useLang();
  return <div className="p-8 text-sm text-ink-low">{t("loading_plan", lang)}</div>;
}

export default function PlanPage() {
  return (
    <Suspense fallback={<LoadingNote />}>
      <PlanInner />
    </Suspense>
  );
}

function PlanInner() {
  const params = useSearchParams();
  return <PlanView farmId={params.get("farm") ?? "farm-12"} />;
}

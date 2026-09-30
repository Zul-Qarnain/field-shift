"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, Copy, Droplets, Leaf, Shield, Sprout } from "lucide-react";
import { CROPS, getFarm } from "@/lib/data";
import {
  DEFAULT_PRIORITIES, DEFAULT_SCENARIO, advisoryText, generateRotations, smsText,
  type Priorities, type RotationResult, type Scenario,
} from "@/lib/engine";
import { useLang } from "@/lib/lang";
import { Panel, SourceChip, InfoDot } from "@/components/ui";
import { RotationCard, WhyDrawer } from "@/components/RotationCard";

const ALL_CROPS = ["aman", "boro", "wheat", "maize", "mustard", "lentil", "mungbean", "sesame", "potato"];

const SLIDERS: { key: keyof Priorities; label_en: string; label_bn: string; icon: typeof Droplets; color: string }[] = [
  { key: "water", label_en: "Water saving", label_bn: "পানি সাশ্রয়", icon: Droplets, color: "#4ea8de" },
  { key: "soilHealth", label_en: "Soil health", label_bn: "মাটির স্বাস্থ্য", icon: Leaf, color: "#57c785" },
  { key: "stability", label_en: "Stable harvest", label_bn: "স্থিতিশীল ফলন", icon: Sprout, color: "#d4f94e" },
  { key: "riskSafety", label_en: "Heat & flood safety", label_bn: "তাপ ও বন্যা নিরাপত্তা", icon: Shield, color: "#ef6c4d" },
];

const SCENARIOS: { label: string; apply: Scenario }[] = [
  { label: "Baseline", apply: DEFAULT_SCENARIO },
  { label: "Rainfall −10%", apply: { ...DEFAULT_SCENARIO, rainfallPct: -10 } },
  { label: "Rainfall −20%", apply: { ...DEFAULT_SCENARIO, rainfallPct: -20 } },
  { label: "Hotter +1°C", apply: { ...DEFAULT_SCENARIO, tempDeltaC: 1 } },
  { label: "Hotter +2°C", apply: { ...DEFAULT_SCENARIO, tempDeltaC: 2 } },
];

function PlanView({ farmId }: { farmId: string }) {
  const pack = getFarm(farmId);
  const { lang } = useLang();
  const [priorities, setPriorities] = useState<Priorities>(DEFAULT_PRIORITIES);
  const [scenario, setScenario] = useState<Scenario>(DEFAULT_SCENARIO);
  const [pool, setPool] = useState<Set<string>>(new Set(ALL_CROPS));
  const [why, setWhy] = useState<RotationResult | null>(null);
  const [copied, setCopied] = useState<"adv" | "sms" | null>(null);

  const results = useMemo(() => generateRotations(pack, priorities, scenario, pool), [pack, priorities, scenario, pool]);
  const top = results[0];
  const advisory = advisoryText(pack, top, lang);
  const sms = smsText(pack, top, lang);
  const isBaseline = scenario === DEFAULT_SCENARIO;

  const copy = (text: string, kind: "adv" | "sms") => {
    navigator.clipboard?.writeText(text);
    setCopied(kind);
    setTimeout(() => setCopied(null), 1600);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
      <p className="text-xs text-ink-low">Crop Planning <span className="mx-1">›</span> {pack.name_en} · {pack.district}</p>
      <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">
        Plan the rotation <span className="text-ink-low">— {pack.context}</span>
      </h1>

      <div className="mt-6 grid gap-5 xl:grid-cols-[340px_1fr]">
        {/* Left: priorities + crops + scenarios */}
        <aside className="flex flex-col gap-5">
          <Panel title={lang === "bn" ? "আপনার অগ্রাধিকার" : "Your priorities"}>
            <div className="flex flex-col gap-4">
              {SLIDERS.map((s) => (
                <div key={s.key}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 font-medium text-ink-mid">
                      <s.icon className="h-3.5 w-3.5" style={{ color: s.color }} />
                      {lang === "bn" ? s.label_bn : s.label_en}
                    </span>
                    <span className="font-mono tabular text-ink-low">{priorities[s.key]}</span>
                  </div>
                  <input
                    type="range" min={0} max={100} value={priorities[s.key]}
                    onChange={(e) => setPriorities((p) => ({ ...p, [s.key]: Number(e.target.value) }))}
                    className="mt-1.5 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-inset accent-action"
                  />
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-ink-low">Sliders re-rank instantly, on this device, with the same math every time.</p>
          </Panel>

          <Panel title="Crop pool" right={<InfoDot text="Crops considered for the rotation. Same-family crops cannot follow each other." />}>
            <div className="flex flex-wrap gap-1.5">
              {CROPS.map((c) => {
                const on = pool.has(c.id);
                return (
                  <button
                    key={c.id}
                    onClick={() => setPool((p) => { const n = new Set(p); if (n.has(c.id)) n.delete(c.id); else n.add(c.id); return n; })}
                    className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${on ? "border-lime/50 bg-lime/10 text-ink-hi" : "border-line bg-inset text-ink-low hover:text-ink-mid"}`}
                  >
                    {on && <Check className="mr-1 inline h-3 w-3 text-lime" />}{c.name_en}
                  </button>
                );
              })}
            </div>
          </Panel>

          <Panel title={<span className="flex items-center gap-2">{lang === "bn" ? "যদি এমন হয়" : "What-if"} <InfoDot text="Your observed data with a stated change applied — a stress test, not a forecast." /></span>} right={<SourceChip source="fixture" />}>
            <div className="flex flex-wrap gap-1.5">
              {SCENARIOS.map((s) => (
                <button
                  key={s.label}
                  onClick={() => setScenario(s.apply)}
                  className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    scenario === s.apply ? "border-amber bg-amber/10 text-amber" : "border-line bg-inset text-ink-mid hover:text-ink-hi"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            {!isBaseline && (
              <div className="mt-3 rounded-lg border border-amber/40 bg-amber/5 p-2.5 text-[11px] leading-relaxed text-amber">
                ⚠ Stress test — not a forecast. Ranking recalculated under the stated change.
              </div>
            )}
          </Panel>
        </aside>

        {/* Right: results */}
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-xl font-bold">
              {results.length} valid rotations <span className="text-sm font-medium text-ink-low">from {pool.size} crops · top {Math.min(3, results.length)} shown</span>
            </h2>
            {results.length > 1 && Math.abs(results[0].total - results[1].total) < 0.5 && (
              <span className="text-xs text-amber">Top two are less than a point apart — your priorities break the tie.</span>
            )}
          </div>

          {results.slice(0, 3).map((r, i) => (
            <RotationCard key={r.id} result={r} rank={i + 1} selected={i === 0} onWhy={() => setWhy(r)} />
          ))}
          {results.length > 3 && (
            <details className="rounded-xl border border-line bg-surface p-4">
              <summary className="cursor-pointer text-sm font-medium text-ink-mid">Show all {results.length} valid rotations</summary>
              <div className="mt-3 flex flex-col gap-3">
                {results.slice(3).map((r, i) => (
                  <RotationCard key={r.id} result={r} rank={i + 4} selected={false} onWhy={() => setWhy(r)} />
                ))}
              </div>
            </details>
          )}
          {results.length === 0 && (
            <Panel>
              <p className="text-sm text-ink-mid">No valid rotation with this pool — the same-family rule or season windows block every sequence. Re-enable a legume or a cereal.</p>
            </Panel>
          )}

          <section className="rounded-xl border border-lime/40 bg-lime/5 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-lime">Advisory — the takeaway</p>
              <SourceChip source="fixture" />
            </div>
            <p className="mt-2 font-display text-lg font-medium leading-relaxed text-ink-hi">{advisory}</p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-ink-low">
              Ranking math runs for real on this device; the farm values it reads are demo fixtures.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button onClick={() => copy(advisory, "adv")} className="flex items-center gap-1.5 rounded-lg bg-lime px-3.5 py-2 text-xs font-bold text-canvas hover:brightness-110">
                {copied === "adv" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied === "adv" ? "Copied" : "Copy advisory"}
              </button>
              <button onClick={() => copy(sms, "sms")} className="flex items-center gap-1.5 rounded-lg border border-line bg-inset px-3.5 py-2 text-xs font-medium text-ink-mid hover:text-ink-hi">
                {copied === "sms" ? <Check className="h-3.5 w-3.5 text-earth" /> : <Copy className="h-3.5 w-3.5" />}
                SMS version · {sms.length}/160
              </button>
              <span className="font-bengali text-xs text-ink-low">{lang === "en" ? advisoryText(pack, top, "bn") : advisoryText(pack, top, "en").slice(0, 80) + "…"}</span>
            </div>
          </section>
        </div>
      </div>

      <WhyDrawer result={why} onClose={() => setWhy(null)} />
    </div>
  );
}

export default function PlanPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-ink-low">Loading planner…</div>}>
      <PlanInner />
    </Suspense>
  );
}

function PlanInner() {
  const params = useSearchParams();
  return <PlanView farmId={params.get("farm") ?? "farm-12"} />;
}

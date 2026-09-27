"use client";

import { Suspense } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { CalendarDays, Flame, MapPin, Ruler, Sprout, Thermometer, Waves, Wind } from "lucide-react";
import { FARMS, getFarm } from "@/lib/data";
import { useLang } from "@/lib/lang";
import { t } from "@/lib/i18n";
import { Panel, SourceChip, TierBadge, DeltaChip, InfoDot, MiniSpark } from "@/components/ui";
import { MapPanel } from "@/components/MapPanel";
import { AdvisoryPeek } from "@/components/AdvisoryPeek";

const chartSkeleton = <div className="h-[170px] w-full animate-pulse rounded-lg bg-inset" />;
const OnsetDistribution = dynamic(
  () => import("@/components/charts").then((m) => m.OnsetDistribution),
  { ssr: false, loading: () => chartSkeleton }
);
const SeasonTrend = dynamic(
  () => import("@/components/charts").then((m) => m.SeasonTrend),
  { ssr: false, loading: () => chartSkeleton }
);

function Spark({ base, color }: { base: number; color: string }) {
  const data = Array.from({ length: 9 }, (_, i) => base + Math.sin(i * 1.3 + base * 9) * base * 0.12);
  return <MiniSpark points={data} color={color} />;
}

function FieldHeader({ farmId }: { farmId: string }) {
  const f = getFarm(farmId);
  const { lang } = useLang();
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-xs text-ink-low">Field Analysis <span className="mx-1">›</span> {f.division} <span className="mx-1">›</span> {f.name_en}</p>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">
          {lang === "bn" ? f.name_bn : f.name_en}
          <span className="ml-3 inline-flex items-center gap-1 rounded-full border border-lime/40 bg-lime/10 px-2.5 py-1 align-middle text-[11px] font-semibold text-lime">
            <span className="h-1.5 w-1.5 rounded-full bg-lime" /> {t("monitored", lang)}
          </span>
        </h1>
        <p className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-ink-mid">
          <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-ink-low" />{f.district}, {f.division}, Bangladesh</span>
          <span className="font-mono text-xs text-ink-low">{f.lat.toFixed(4)}°N, {f.lon.toFixed(4)}°E</span>
          <span className="flex items-center gap-1.5"><Ruler className="h-3.5 w-3.5 text-ink-low" />{f.areaHa} ha</span>
          <span className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5 text-ink-low" />{t("last_updated", lang)}: 2001–2025 · POWER daily</span>
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {FARMS.map((x) => (
          <Link
            key={x.id}
            href={`/field?farm=${x.id}`}
            className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
              x.id === farmId ? "border-action bg-action/15 text-ink-hi" : "border-line bg-surface text-ink-mid hover:border-action hover:text-ink-hi"
            }`}
          >
            {x.district}
          </Link>
        ))}
      </div>
    </div>
  );
}

function FieldView({ farmId }: { farmId: string }) {
  const f = getFarm(farmId);
  const { lang } = useLang();
  const later = f.onset.shiftDays > 0;
  const m = f.metrics;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
      <FieldHeader farmId={farmId} />

      <div className="mt-6 grid gap-5 xl:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-5">
          <MapPanel pack={f} />

          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            {[
              { icon: Waves, label: lang === "bn" ? "মাটির আর্দ্রতা" : "Soil moisture", value: `${m.soilMoisturePct}%`, delta: m.soilMoistureDelta, unit: "%", sub: "SMAP L4 · vs last 7 d", color: "#4ea8de" },
              { icon: Thermometer, label: lang === "bn" ? "গড় তাপমাত্রা" : "Temperature (avg)", value: `${m.tempC}°C`, delta: m.tempDelta, unit: "°C", sub: "POWER · vs 30-y mean", color: "#f2b84b" },
              { icon: Sprout, label: "NDVI", value: m.ndvi.toFixed(2), delta: m.ndviDelta, unit: "", sub: "MODIS/VIIRS · greenness", color: "#57c785" },
              { icon: Flame, label: lang === "bn" ? "তাপ দিন" : "Heat days >35°C", value: `${m.heatDays}`, delta: m.heatDaysDelta, unit: " d", sub: "T2M_MAX · per season", color: "#ef6c4d" },
            ].map((c) => (
              <Panel key={c.label} className="fade-up">
                <div className="flex items-center gap-2 text-xs text-ink-mid">
                  <c.icon className="h-4 w-4" style={{ color: c.color }} />
                  {c.label}
                </div>
                <div className="mt-1.5 flex items-baseline gap-2">
                  <span className="font-display text-2xl font-bold tabular">{c.value}</span>
                  <DeltaChip value={c.delta} unit={c.unit} inverse={c.label.includes("Heat")} />
                </div>
                <div className="mt-1 text-[11px] text-ink-low">{c.sub}</div>
                <div className="mt-1.5 text-0"><Spark base={Math.abs(c.delta) + 0.5} color={c.color} /></div>
              </Panel>
            ))}
          </div>

          <Panel
            title={lang === "bn" ? "বর্ষার শুরু — দুই যুগের তুলনা" : "Usable-rainfall onset — two eras compared"}
            right={<SourceChip source="fixture" />}
          >
            <OnsetDistribution pack={f} />
          </Panel>

          <div className="grid gap-5 lg:grid-cols-2">
            <Panel title={lang === "bn" ? "মৌসুমের NDVI ধারা" : "Season NDVI trend"} right={<SourceChip source="fixture" />}>
              <SeasonTrend pack={f} />
            </Panel>
            <Panel title={lang === "bn" ? "বৃষ্টিপাতের ধারা" : "Annual rainfall trend"} right={<SourceChip source="fixture" />}>
              <div className="flex items-baseline gap-2 pb-1">
                <span className="font-display text-2xl font-bold tabular text-water">{m.rainfallTrendPctPerDecade > 0 ? "+" : ""}{m.rainfallTrendPctPerDecade}%</span>
                <span className="text-xs text-ink-mid">per decade · 1981–2025</span>
              </div>
              <Spark base={4} color="#4ea8de" />
              <p className="mt-2 text-[11px] leading-relaxed text-ink-low">
                Mann-Kendall trend over POWER daily rainfall. {m.rainfallTrendPctPerDecade < 0 ? "Declining — raises the water priority." : "Stable or rising on this farm."}
              </p>
            </Panel>
          </div>

          <AdvisoryPeek farmId={farmId} />
        </div>

        {/* Right rail */}
        <aside className="flex flex-col gap-5">
          <section className="rounded-xl border border-lime/40 bg-lime/5 p-4 fade-up">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-lime/15">
                <Sprout className="h-5 w-5 text-lime" />
              </span>
              <div>
                <h2 className="font-display text-base font-bold text-lime">{t("onset_detected", lang)}</h2>
                <p className="text-sm text-ink-mid tabular">
                  <span className="font-bold text-ink-hi">{later ? "+" : ""}{f.onset.shiftDays} days</span> — {later ? t("days_later", lang) : t("days_earlier", lang)}
                </p>
              </div>
            </div>
            <div className="mt-4 rounded-lg border border-line bg-inset p-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-amber">
                <Wind className="h-3.5 w-3.5" /> {t("recommended_action", lang)}
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-ink-mid">
                {later
                  ? "The planting window moved later — short-duration winter crops fit the shifted season better. Compare rotations before deciding."
                  : "The usable-rain window opens earlier — longer-duration winter crops become feasible. Compare rotations before deciding."}
              </p>
            </div>
            <Link
              href={`/plan?farm=${f.id}`}
              className="mt-3 flex items-center justify-center gap-2 rounded-lg bg-action px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-action-deep"
            >
              {t("view_analysis", lang)} →
            </Link>
          </section>

          <Panel title={t("field_details", lang)}>
            <dl className="text-sm">
              {[
                [lang === "bn" ? "ফসল" : "Current crop", lang === "bn" ? f.crop_bn : f.crop_en],
                [lang === "bn" ? "অবস্থা" : "Growth stage", f.growthStage],
                [lang === "bn" ? "মাটি" : "Soil type", `${f.soilType} · pH ${f.soil.ph}`],
                [lang === "bn" ? "এলাকা" : "Area", `${f.areaHa} ha`],
                [lang === "bn" ? "উচ্চতা" : "Elevation", `${f.elevationM} m`],
                [lang === "bn" ? "প্রেক্ষাপট" : "Context", f.context],
              ].map(([k, v]) => (
                <div key={k as string} className="flex items-center justify-between border-b border-line-soft py-2 last:border-0">
                  <dt className="text-ink-mid">{k}</dt>
                  <dd className="font-medium text-ink-hi">{v}</dd>
                </div>
              ))}
            </dl>
          </Panel>

          <Panel title={<span className="flex items-center gap-2">{t("data_provenance", lang)} <InfoDot text="Every dataset behind the numbers on this page, with version and retrieval date." /></span>}>
            <ul className="flex flex-col">
              {f.provenance.map((p) => (
                <li key={p.id} className="flex items-center gap-3 border-b border-line-soft py-2.5 last:border-0">
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-sm font-medium text-ink-hi">
                      <span className="truncate">{p.name}</span> <TierBadge tier={p.tier} />
                    </p>
                    <p className="truncate text-[11px] text-ink-low">{p.detail}</p>
                    <p className="font-mono text-[10px] text-ink-low">{p.version} · {p.retrieved}</p>
                  </div>
                  <a href={p.url} target="_blank" rel="noreferrer" className="text-xs font-medium text-link hover:underline">View</a>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title={<span className="flex items-center gap-2">{t("uncertainty", lang)} <InfoDot text="Data-quality flags lower confidence visibly instead of hiding it." /></span>} right={<span className="rounded border border-amber px-1.5 py-0.5 text-[10px] font-bold text-amber">MEDIUM</span>}>
            <p className="text-xs leading-relaxed text-ink-mid">{t("uncertainty_note", lang)}</p>
            <ul className="mt-3 space-y-1.5 text-[11px] text-ink-low">
              <li>· Soil from SoilGrids 250 m model — field test recommended ({f.soil.ph}, {f.soil.texture})</li>
              <li>· SMAP era available: {f.dataQuality.smapEra ? "yes (2015–present)" : "no — rainfall proxy used"}</li>
              <li>· NDVI record: {f.dataQuality.ndviRecordYears} years</li>
            </ul>
          </Panel>
        </aside>
      </div>
    </div>
  );
}

export default function FieldPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-ink-low">Loading field…</div>}>
      <FieldInner />
    </Suspense>
  );
}

function FieldInner() {
  const params = useSearchParams();
  return <FieldView farmId={params.get("farm") ?? "farm-12"} />;
}

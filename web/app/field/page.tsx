"use client";

import { Suspense, useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { CalendarDays, Flame, MapPin, Ruler, Sprout, Thermometer, Waves, Wind } from "lucide-react";
import { FARMS, districtName, divisionName, farmName, getFarm } from "@/lib/data";
import { coveredWindow, onsetView, packForFarm, retrievedDay, sourceLabel, trendView, withRealData } from "@/lib/packs";
import { useLang } from "@/lib/lang";
import { CONF_KEYS, growthStageLabel, t, tf } from "@/lib/i18n";
import { Panel, SourceChip, TierBadge, DeltaChip, InfoDot } from "@/components/ui";
import { MapPanel } from "@/components/MapPanel";
import { AdvisoryPeek } from "@/components/AdvisoryPeek";
import { HomogeneityNote, OnsetSensitivity, PackMethodNote } from "@/components/PackNotes";
import { confidenceFromQuality } from "@/lib/engine";

const chartSkeleton = <div className="h-[170px] w-full animate-pulse rounded-lg bg-inset" />;
const OnsetDistribution = dynamic(
  () => import("@/components/charts").then((m) => m.OnsetDistribution),
  { ssr: false, loading: () => chartSkeleton }
);
const SeasonTrend = dynamic(
  () => import("@/components/charts").then((m) => m.SeasonTrend),
  { ssr: false, loading: () => chartSkeleton }
);
const PowerOnsetChart = dynamic(
  () => import("@/components/RealPack").then((m) => m.PowerOnsetChart),
  { ssr: false, loading: () => chartSkeleton }
);
const PackSparkline = dynamic(
  () => import("@/components/RealPack").then((m) => m.PackSparkline),
  { ssr: false, loading: () => <div className="h-[54px] w-full animate-pulse rounded bg-inset" /> }
);

function FieldHeader({ farmId }: { farmId: string }) {
  const f = withRealData(getFarm(farmId));
  const pack = packForFarm(farmId);
  const { lang } = useLang();
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-xs text-ink-low">{t("nav_field", lang)} <span className="mx-1">›</span> {divisionName(f, lang)} <span className="mx-1">›</span> {farmName(f, lang)}</p>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">
          {farmName(f, lang)}
          <span className="ml-3 inline-flex items-center gap-1 rounded-full border border-lime/40 bg-lime/10 px-2.5 py-1 align-middle text-[11px] font-semibold text-lime">
            <span className="h-1.5 w-1.5 rounded-full bg-lime" /> {t("monitored", lang)}
          </span>
        </h1>
        <p className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-ink-mid">
          <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-ink-low" />{districtName(f, lang)}, {divisionName(f, lang)}, {t("country", lang)}</span>
          <span className="font-mono text-xs text-ink-low">{f.lat.toFixed(4)}°N, {f.lon.toFixed(4)}°E</span>
          <span className="flex items-center gap-1.5"><Ruler className="h-3.5 w-3.5 text-ink-low" />{f.areaHa} ha</span>
          <span className="flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5 text-ink-low" />
            {t("last_updated", lang)}: {pack ? coveredWindow(pack) : `2001–2025 · ${t("demo_fixture", lang)}`}
          </span>
          {pack && <span className="font-mono text-[11px] text-link">NASA POWER · {retrievedDay(pack)}</span>}
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
            {districtName(x, lang)}
          </Link>
        ))}
      </div>
    </div>
  );
}

function FieldView({ farmId }: { farmId: string }) {
  const realPack = packForFarm(farmId);
  const f = withRealData(getFarm(farmId));
  const { lang } = useLang();
  const later = f.onset.shiftDays > 0;
  const m = f.metrics;

  useEffect(() => {
    if (window.location.hash !== "#map") return;
    const el = document.getElementById("map");
    if (!el) return;
    const frame = requestAnimationFrame(() => el.scrollIntoView({ behavior: "smooth", block: "start" }));
    return () => cancelAnimationFrame(frame);
  }, []);

  const mm = realPack?.metrics;
  const view = realPack ? onsetView(realPack) : null;
  const trend = realPack ? trendView(realPack) : null;
  const CARDS = [
    { icon: Waves, label: t("metric_soil_moisture", lang), value: `${m.soilMoisturePct}%`, delta: m.soilMoistureDelta, unit: "%", sub: "SMAP L4 · vs last 7 d · fixture", color: "#4ea8de", inverse: false, source: "fixture" as const },
    {
      icon: Thermometer, label: t("metric_temp", lang), value: `${m.tempC}°C`, delta: m.tempDelta, unit: "°C",
      sub: mm?.tempYear ? `POWER T2M · ${mm.tempYear} vs ${realPack!.onset.eraA.label} median` : "POWER · vs 30-y mean",
      color: "#f2b84b", inverse: false, source: (realPack ? "pack" : "fixture") as "pack" | "fixture",
    },
    { icon: Sprout, label: "NDVI", value: m.ndvi.toFixed(2), delta: m.ndviDelta, unit: "", sub: "MODIS/VIIRS · greenness · fixture", color: "#57c785", inverse: false, source: "fixture" as const },
    {
      icon: Flame, label: t("metric_heat_days", lang), value: `${m.heatDays}`, delta: m.heatDaysDelta, unit: " d",
      sub: mm?.heatDaysYear ? `POWER T2M_MAX · ${mm.heatDaysYear} vs ${mm.heatDaysEraA} d in ${realPack!.onset.eraA.label}` : "T2M_MAX · per season",
      color: "#ef6c4d", inverse: true, source: (realPack ? "pack" : "fixture") as "pack" | "fixture",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
      <FieldHeader farmId={farmId} />

      <div className="mt-6 grid gap-5 xl:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-5">
          <MapPanel pack={f} />

          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            {CARDS.map((c) => (
              <Panel key={c.label} className="fade-up">
                <div className="flex items-center gap-2 text-xs text-ink-mid">
                  <c.icon className="h-4 w-4" style={{ color: c.color }} />
                  {c.label}
                  <span className="ml-auto"><SourceChip source={c.source} /></span>
                </div>
                <div className="mt-1.5 flex items-baseline gap-2">
                  <span className="font-display text-2xl font-bold tabular">{c.value}</span>
                  <DeltaChip value={c.delta} unit={c.unit} inverse={c.inverse} />
                </div>
                <div className="mt-1 text-[11px] text-ink-low">{c.sub}</div>
              </Panel>
            ))}
          </div>
          <p className="-mt-3 text-[11px] leading-relaxed text-ink-low">
            {realPack ? t("field_cards_note_real", lang) : t("field_cards_note", lang)}
          </p>

          <Panel
            title={t("panel_onset_title", lang)}
            right={realPack && view ? <SourceChip source="pack" label={sourceLabel(realPack)} /> : <SourceChip source="fixture" />}
          >
            {realPack && view ? (
              <>
                <PowerOnsetChart pack={realPack} view={view} />
                <OnsetSensitivity pack={realPack} />
                <HomogeneityNote pack={realPack} />
              </>
            ) : (
              <>
                <OnsetDistribution pack={f} />
                <p className="mt-1 text-[11px] leading-relaxed text-amber">{t("sample_distributions", lang)}</p>
              </>
            )}
          </Panel>

          <div className="grid gap-5 lg:grid-cols-2">
            <Panel title={t("panel_ndvi_title", lang)} right={<SourceChip source="fixture" />}>
              <SeasonTrend pack={f} />
            </Panel>
            <Panel
              title={t("panel_rain_title", lang)}
              right={realPack && trend ? <SourceChip source="pack" label={trend.product === "CHIRPS v2.0" ? "CHIRPS v2.0 · cross-check" : `NASA POWER · retrieved ${retrievedDay(realPack)}`} /> : <SourceChip source="fixture" />}
            >
              <div className="flex items-baseline gap-2 pb-1">
                <span className="font-display text-2xl font-bold tabular text-water">{m.rainfallTrendPctPerDecade > 0 ? "+" : ""}{m.rainfallTrendPctPerDecade}%</span>
                <span className="text-xs text-ink-mid">{t("per_decade", lang)}</span>
              </div>
              {realPack && trend ? (
                <>
                  <PackSparkline
                    series={trend.product === "CHIRPS v2.0" ? (realPack.crossCheck.annualRainfall ?? realPack.series.annualRainfallLast10) : realPack.series.annualRainfallLast10}
                    color="#4ea8de"
                    unit=" mm"
                  />
                  <p className="mt-2 text-[11px] leading-relaxed text-ink-low">
                    {t("rain_real_note", lang)}{" "}
                    <span className="font-mono">
                      {trend.product} · {trend.window} · τ={trend.tau?.toFixed(2) ?? "n/a"}, p={trend.pValue !== null && trend.pValue < 0.001 ? "<0.001" : trend.pValue?.toFixed(3) ?? "n/a"}
                    </span>
                    {m.rainfallTrendPctPerDecade < 0 ? t("rain_declining", lang) : t("rain_stable", lang)}
                  </p>
                  {trend.caution && <p className="mt-1 text-[11px] leading-relaxed text-amber">{trend.caution}</p>}
                  {trend.alternative && (
                    <p className="mt-1 text-[11px] leading-relaxed text-ink-low">
                      {trend.alternative.product}: {trend.alternative.pctPerDecade === null ? "n/a" : `${trend.alternative.pctPerDecade > 0 ? "+" : ""}${trend.alternative.pctPerDecade}%/decade`} — the two products disagree on magnitude, so the trend is not treated as an established local change.
                    </p>
                  )}
                </>
              ) : (
                <p className="mt-2 text-[11px] leading-relaxed text-ink-low">
                  {t("rain_sample_note", lang)}
                  {m.rainfallTrendPctPerDecade < 0 ? t("rain_declining", lang) : t("rain_stable", lang)}
                </p>
              )}
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
                  {view && view.shiftDays === 0 ? (
                    <span className="font-bold text-ink-hi">{t("no_measurable_shift", lang)}</span>
                  ) : (
                    <>
                      <span className="font-bold text-ink-hi">{Math.abs(f.onset.shiftDays)}</span>{" "}
                      {later ? t("days_later", lang) : t("days_earlier", lang)}
                    </>
                  )}
                </p>
                {view && (
                  <p className="mt-1 font-mono text-[10px] text-ink-low">
                    {t("onset_from_source", lang)}: {view.product} · p={view.pValue === null ? "n/a" : view.pValue.toFixed(3)} ·{" "}
                    {view.pValue !== null && view.pValue < 0.05 ? t("significant", lang) : t("not_significant", lang)}
                  </p>
                )}
              </div>
            </div>
            <div className="mt-4 rounded-lg border border-line bg-inset p-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-amber">
                <Wind className="h-3.5 w-3.5" /> {t("recommended_action", lang)}
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-ink-mid">
                {later ? t("action_later", lang) : t("action_earlier", lang)}
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
                [t("current_crop", lang), lang === "bn" ? f.crop_bn : f.crop_en],
                [t("growth_stage", lang), growthStageLabel(f.growthStage, lang)],
                [t("soil_type", lang), `${f.soilType} · pH ${f.soil.ph}`],
                [t("area_label", lang), `${f.areaHa} ha`],
                [t("elevation_label", lang), `${f.elevationM} m`],
                [t("context_label", lang), f.context],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between border-b border-line-soft py-2 last:border-0">
                  <dt className="text-ink-mid">{k}</dt>
                  <dd className="font-medium text-ink-hi">{v}</dd>
                </div>
              ))}
            </dl>
          </Panel>

          <Panel title={<span className="flex items-center gap-2">{t("data_provenance", lang)} <InfoDot text={t("info_provenance", lang)} /></span>}>
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
                  <a href={p.url} target="_blank" rel="noreferrer" className="text-xs font-medium text-link hover:underline">{t("view", lang)}</a>
                </li>
              ))}
            </ul>
          </Panel>

          {realPack && (
            <Panel title={<span className="flex items-center gap-2">{t("nav_method", lang)} <InfoDot text={t("english_only_note", lang)} /></span>} right={<SourceChip source="pack" />}>
              <PackMethodNote pack={realPack} />
              <p className="mt-2 font-mono text-[10px] text-ink-low">{realPack.source} · {realPack.parameters.PRECTOTCORR}</p>
            </Panel>
          )}

          <Panel
            title={<span className="flex items-center gap-2">{t("uncertainty", lang)} <InfoDot text={t("info_uncertainty", lang)} /></span>}
            right={<span className="rounded border border-amber px-1.5 py-0.5 text-[10px] font-bold text-amber uppercase tracking-wide">{t(CONF_KEYS[confidenceFromQuality(f.dataQuality)], lang)} · {t("demo_flags", lang)}</span>}
          >
            <p className="text-xs leading-relaxed text-ink-mid">{realPack ? t("uncertainty_note_real", lang) : t("uncertainty_note", lang)}</p>
            <ul className="mt-3 space-y-1.5 text-[11px] text-ink-low">
              <li>· {t("unc_soil", lang)} ({f.soil.ph}, {f.soil.texture})</li>
              <li>· {f.dataQuality.smapEra ? t("unc_smap_yes", lang) : t("unc_smap_no", lang)}</li>
              <li>· {tf("unc_ndvi_years", lang, { n: f.dataQuality.ndviRecordYears })}</li>
            </ul>
          </Panel>
        </aside>
      </div>
    </div>
  );
}

function LoadingNote() {
  const { lang } = useLang();
  return <div className="p-8 text-sm text-ink-low">{t("loading_field", lang)}</div>;
}

export default function FieldPage() {
  return (
    <Suspense fallback={<LoadingNote />}>
      <FieldInner />
    </Suspense>
  );
}

function FieldInner() {
  const params = useSearchParams();
  return <FieldView farmId={params.get("farm") ?? "farm-12"} />;
}

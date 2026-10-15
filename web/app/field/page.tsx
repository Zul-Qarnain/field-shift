"use client";

import { Suspense, useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { CalendarDays, Flame, MapPin, Ruler, Sprout, Thermometer, Waves, Wind } from "lucide-react";
import { FARMS, NOT_RETRIEVED, SALINITY_CLASS_BOUNDS, SALINITY_CLASSES, districtName, divisionName, farmContext, farmName, getFarm, provDetail, type FarmPack, type SalinityClass } from "@/lib/data";
import { SATELLITE, coveredWindow, onsetView, packForFarm, retrievedDay, sourceLabel, trendView, withRealData } from "@/lib/packs";
import { useLang } from "@/lib/lang";
import { CONF_KEYS, fmtNum, fmtUnit, growthStageLabel, soilTextureLabel, t, tf } from "@/lib/i18n";
import { Panel, SourceChip, TierBadge, DeltaChip, InfoDot } from "@/components/ui";
import { MapPanel } from "@/components/MapPanel";
import { AdvisoryPeek } from "@/components/AdvisoryPeek";
import { LiveDataBanner } from "@/components/LiveDataBanner";
import { NowcastCard } from "@/components/NowcastCard";
import { OnsetOutlookCard } from "@/components/OnsetOutlookCard";
import { HomogeneityNote, OnsetSensitivity, PackMethodNote } from "@/components/PackNotes";
import { confidenceFromQuality, onsetShiftSignificant } from "@/lib/engine";

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
          <span className="font-mono text-xs text-ink-low">{fmtNum(f.lat.toFixed(4), lang)}°N, {fmtNum(f.lon.toFixed(4), lang)}°E</span>
          <span className="flex items-center gap-1.5"><Ruler className="h-3.5 w-3.5 text-ink-low" />{fmtNum(f.areaHa, lang)} {t("unit_ha", lang)}</span>
          <span className="flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5 text-ink-low" />
            {t("last_updated", lang)}: {fmtNum(pack ? coveredWindow(pack) : `2001–2025 · ${t("demo_fixture", lang)}`, lang)}
          </span>
          {pack && <span className="font-mono text-[11px] text-link">NASA POWER · {fmtNum(retrievedDay(pack), lang)}</span>}
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

/** SRDI class shares for this farm's upazila — a cited, non-space dataset, so it carries its own badge. */
const SALINITY_COLOR: Record<SalinityClass, string> = { S1: "#57c785", S2: "#9ac75f", S3: "#f2b84b", S4: "#ef8b4d", S5: "#ef6c4d" };

function SalinityCard({ f }: { f: FarmPack }) {
  const { lang } = useLang();
  const s = f.salinity;
  const shares = s.classShares;
  const areas = s.classAreasHa;
  return (
    <Panel
      title={<span className="flex items-center gap-2">{t("salinity_title", lang)} <InfoDot text={s.cited ? t("salinity_note", lang) : t("salinity_outside_note", lang)} /></span>}
      right={
        <span className="flex items-center gap-1.5">
          <TierBadge tier="Open" />
          <span className="rounded border border-line px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-low">{t("salinity_badge", lang)}</span>
        </span>
      }
    >
      <div className="flex items-baseline gap-2">
        <span className="font-display text-2xl font-bold tabular">{shares ? `${fmtNum((s.salineShare * 100).toFixed(1), lang)}%` : "—"}</span>
        <span className="text-xs text-ink-mid">{t("salinity_share", lang)}</span>
      </div>
      <p className="mt-1 text-xs text-ink-mid">
        {t("salinity_upazila", lang)}: <span className="font-medium text-ink-hi">{districtName(f, lang)} / {s.upazila}</span>
        {shares && s.repECe !== null && <> · {t("salinity_repec", lang)} <span className="font-mono text-ink-hi">{fmtUnit(s.repECe, "dS/m", lang)}</span></>}
      </p>

      {shares && areas ? (
        <ul className="mt-3 flex flex-col gap-1.5">
          <li className="text-[10px] uppercase tracking-wider text-ink-low">{t("salinity_class_heading", lang)}</li>
          {SALINITY_CLASSES.map((c) => (
            <li key={c} className="flex items-center gap-2 text-[11px]">
              <span className="w-24 shrink-0 font-mono text-ink-low">{c} {fmtNum(SALINITY_CLASS_BOUNDS[c], lang)}</span>
              <span className="h-2 shrink-0 rounded-full" style={{ width: `${Math.max(1.5, shares[c] * 100)}%`, background: SALINITY_COLOR[c] }} />
              <span className="ml-auto whitespace-nowrap tabular text-ink-mid">{fmtNum(areas[c].toLocaleString("en-US"), lang)} ha · {fmtNum((shares[c] * 100).toFixed(0), lang)}%</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-[11px] leading-relaxed text-amber">{t("salinity_outside_note", lang)}</p>
      )}

      <p className="mt-3 border-t border-line-soft pt-2 text-[10px] leading-relaxed text-ink-low">
        {s.source} · {t("salinity_retrieved", lang)} {fmtNum(s.retrieved, lang)} · <Link href="/data" className="text-link hover:underline">{t("view", lang)}</Link>
      </p>
    </Panel>
  );
}

function FieldView({ farmId }: { farmId: string }) {
  const realPack = packForFarm(farmId);
  const f = withRealData(getFarm(farmId));
  const { lang } = useLang();
  const later = f.onset.shiftDays > 0;
  const significantShift = onsetShiftSignificant(f);
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
    {
      icon: Waves, label: t("metric_soil_moisture", lang), value: `${fmtNum(m.soilMoisturePct, lang)}%`, delta: m.soilMoistureDelta, unit: "%",
      sub: tf("card_sub_moisture", lang, { n: 7 }), color: "#4ea8de", inverse: false, source: "fixture" as const,
    },
    {
      icon: Thermometer, label: t("metric_temp", lang), value: `${fmtNum(m.tempC, lang)}°C`, delta: m.tempDelta, unit: "°C",
      sub: mm?.tempYear
        ? tf("card_sub_temp_pack", lang, { year: mm.tempYear, era: realPack!.onset.eraA.label })
        : tf("card_sub_temp", lang, { n: 30 }),
      color: "#f2b84b", inverse: false, source: (realPack ? "pack" : "fixture") as "pack" | "fixture",
    },
    {
      icon: Sprout, label: "NDVI", value: fmtNum(m.ndvi.toFixed(2), lang), delta: m.ndviDelta, unit: "",
      sub: tf("card_sub_ndvi", lang, {}), color: "#57c785", inverse: false, source: "fixture" as const,
    },
    {
      icon: Flame, label: t("metric_heat_days", lang), value: `${fmtNum(m.heatDays, lang)}`, delta: m.heatDaysDelta, unit: ` ${t("unit_days_short", lang)}`,
      sub: mm?.heatDaysYear
        ? tf("card_sub_heat_pack", lang, {
            c: mm.heatDaysThresholdC, year: mm.heatDaysYear, days: mm.heatDaysEraA ?? "n/a", era: realPack!.onset.eraA.label,
          })
        : tf("card_sub_heat", lang, {}),
      color: "#ef6c4d", inverse: true, source: (realPack ? "pack" : "fixture") as "pack" | "fixture",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
      <FieldHeader farmId={farmId} />

      <div className="mt-4"><LiveDataBanner pointId={farmId} /></div>

      <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-5">
          <MapPanel pack={f} />

          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            {CARDS.map((c) => (
              <Panel key={c.label} className="fade-up min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-mid">
                  <c.icon className="h-4 w-4" style={{ color: c.color }} />
                  {c.label}
                  <span className="ml-auto"><SourceChip source={c.source} /></span>
                </div>
                <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
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

          <NowcastCard pointId={farmId} label={farmName(f, lang)} />

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
              right={realPack && trend ? <SourceChip source="pack" label={trend.product === SATELLITE ? "GPM IMERG · cross-check" : `NASA POWER · retrieved ${retrievedDay(realPack)}`} /> : <SourceChip source="fixture" />}
            >
              <div className="flex items-baseline gap-2 pb-1">
                <span className="font-display text-2xl font-bold tabular text-water">{m.rainfallTrendPctPerDecade > 0 ? "+" : ""}{fmtNum(m.rainfallTrendPctPerDecade, lang)}%</span>
                <span className="text-xs text-ink-mid">{t("per_decade", lang)}</span>
              </div>
              {realPack && trend ? (
                <>
                  <PackSparkline
                    series={trend.product === SATELLITE ? (realPack.crossCheck.annualRainfall ?? realPack.series.annualRainfallLast10) : realPack.series.annualRainfallLast10}
                    color="#4ea8de"
                    unit=" mm"
                  />
                  <p className="mt-2 text-[11px] leading-relaxed text-ink-low">
                    {t("rain_real_note", lang)}{" "}
                    <span className="font-mono">
                      {trend.product} · {fmtNum(trend.window ?? "n/a", lang)} · τ={fmtNum(trend.tau?.toFixed(2) ?? "n/a", lang)}, p=
                      {fmtNum(trend.pValue !== null && trend.pValue < 0.001 ? "<0.001" : trend.pValue?.toFixed(3) ?? "n/a", lang)}
                    </span>
                    {m.rainfallTrendPctPerDecade < 0 ? t("rain_declining", lang) : t("rain_stable", lang)}
                  </p>
                  {trend.caution && (
                    <p className="mt-1 text-[11px] leading-relaxed text-amber">
                      {trend.product === SATELLITE
                        ? tf("trend_caution_satellite", lang, { year: realPack.quality.precipHomogeneity.changePointInsideAnalysisWindow ?? "—" })
                        : tf("trend_caution_power_flagged", lang, { year: realPack.quality.precipHomogeneity.changePointInsideAnalysisWindow ?? "—" })}
                    </p>
                  )}
                  {trend.alternative && (
                    <p className="mt-1 text-[11px] leading-relaxed text-ink-low">
                      {tf("trend_products_disagree", lang, {
                        product: trend.alternative.product,
                        pct: trend.alternative.pctPerDecade === null ? "n/a" : `${trend.alternative.pctPerDecade > 0 ? "+" : ""}${trend.alternative.pctPerDecade}`,
                      })}
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
        <aside className="flex min-w-0 flex-col gap-5">
          <section className="rounded-xl border border-lime/40 bg-lime/5 p-4 fade-up">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-lime/15">
                <Sprout className="h-5 w-5 text-lime" />
              </span>
              <div>
                <h2 className="font-display text-base font-bold text-lime">
                  {significantShift ? t("onset_detected", lang) : t("onset_no_shift", lang)}
                </h2>
                <p className="text-sm text-ink-mid tabular">
                  {significantShift ? (
                    f.onset.shiftDays === 0 ? (
                      <span className="font-bold text-ink-hi">{t("no_measurable_shift", lang)}</span>
                    ) : (
                      <>
                        <span className="font-bold text-ink-hi">{fmtNum(Math.abs(f.onset.shiftDays), lang)}</span>{" "}
                        {later ? t("days_later", lang) : t("days_earlier", lang)}
                      </>
                    )
                  ) : (
                    <span className="text-ink-mid">
                      {tf("onset_median_secondary", lang, {
                        days: `${f.onset.shiftDays > 0 ? "+" : ""}${f.onset.shiftDays}`,
                        p: f.onset.pValue.toFixed(2),
                        verdict: t("not_significant", lang),
                      })}
                    </span>
                  )}
                </p>
                {view && (
                  <p className="mt-1 font-mono text-[10px] text-ink-low">
                    {t("onset_from_source", lang)}: {view.product} · p={fmtNum(view.pValue === null ? "n/a" : view.pValue.toFixed(3), lang)} ·{" "}
                    {significantShift ? t("significant", lang) : t("not_significant", lang)}
                  </p>
                )}
              </div>
            </div>
            <div className="mt-4 rounded-lg border border-line bg-inset p-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-amber">
                <Wind className="h-3.5 w-3.5" /> {t("recommended_action", lang)}
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-ink-mid">
                {significantShift ? (later ? t("action_later", lang) : t("action_earlier", lang)) : t("action_no_shift", lang)}
              </p>
            </div>
            <Link
              href={`/plan?farm=${f.id}`}
              className="mt-3 flex items-center justify-center gap-2 rounded-lg bg-action px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-action-deep"
            >
              {t("view_analysis", lang)} →
            </Link>
          </section>

          <OnsetOutlookCard farmId={farmId} />

          <Panel title={t("field_details", lang)}>
            <dl className="text-sm">
              {[
                [t("current_crop", lang), lang === "bn" ? f.crop_bn : f.crop_en],
                [t("growth_stage", lang), growthStageLabel(f.growthStage, lang)],
                [t("soil_type", lang), `${soilTextureLabel(f.soilType, lang)} · pH ${fmtNum(f.soil.ph, lang)}`],
                [t("area_label", lang), `${fmtNum(f.areaHa, lang)} ${t("unit_ha", lang)}`],
                [t("elevation_label", lang), `${fmtNum(f.elevationM, lang)} ${t("unit_m", lang)}`],
                [t("context_label", lang), farmContext(f, lang)],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between border-b border-line-soft py-2 last:border-0">
                  <dt className="text-ink-mid">{k}</dt>
                  <dd className="font-medium text-ink-hi">{v}</dd>
                </div>
              ))}
            </dl>
          </Panel>

          <SalinityCard f={f} />

          <Panel title={<span className="flex items-center gap-2">{t("data_provenance", lang)} <InfoDot text={t("info_provenance", lang)} /></span>}>
            <ul className="flex flex-col">
              {f.provenance.map((p) => (
                <li key={p.id} className="flex items-center gap-3 border-b border-line-soft py-2.5 last:border-0">
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-sm font-medium text-ink-hi">
                      <span className="truncate">{p.name}</span> <TierBadge tier={p.tier} />
                    </p>
                    <p className="truncate text-[11px] text-ink-low">{provDetail(p, lang)}</p>
                    <p className="font-mono text-[10px] text-ink-low">{p.version} · {p.retrieved === "—" ? "—" : p.retrieved === NOT_RETRIEVED ? t("not_retrieved", lang) : fmtNum(p.retrieved, lang)}</p>                  </div>
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
              <li>· {t("unc_soil", lang)} ({fmtNum(f.soil.ph, lang)}, {soilTextureLabel(f.soil.texture, lang)})</li>
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

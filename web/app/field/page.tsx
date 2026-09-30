"use client";

import { Suspense, useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { CalendarDays, Flame, MapPin, Ruler, Sprout, Thermometer, Waves, Wind } from "lucide-react";
import { FARMS, SALINITY_CLASS_BOUNDS, SALINITY_CLASSES, districtName, divisionName, farmName, getFarm, type FarmPack, type SalinityClass } from "@/lib/data";
import { useLang } from "@/lib/lang";
import { CONF_KEYS, growthStageLabel, t, tf } from "@/lib/i18n";
import { Panel, SourceChip, TierBadge, DeltaChip, InfoDot } from "@/components/ui";
import { MapPanel } from "@/components/MapPanel";
import { AdvisoryPeek } from "@/components/AdvisoryPeek";
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

function FieldHeader({ farmId }: { farmId: string }) {
  const f = getFarm(farmId);
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
          <span className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5 text-ink-low" />{t("last_updated", lang)}: 2001–2025 · {t("demo_fixture", lang)}</span>
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
        <span className="font-display text-2xl font-bold tabular">{shares ? `${(s.salineShare * 100).toFixed(1)}%` : "—"}</span>
        <span className="text-xs text-ink-mid">{t("salinity_share", lang)}</span>
      </div>
      <p className="mt-1 text-xs text-ink-mid">
        {t("salinity_upazila", lang)}: <span className="font-medium text-ink-hi">{s.district} / {s.upazila}</span>
        {shares && s.repECe !== null && <> · {t("salinity_repec", lang)} <span className="font-mono text-ink-hi">{s.repECe} dS/m</span></>}
      </p>

      {shares && areas ? (
        <ul className="mt-3 flex flex-col gap-1.5">
          <li className="text-[10px] uppercase tracking-wider text-ink-low">{t("salinity_class_heading", lang)}</li>
          {SALINITY_CLASSES.map((c) => (
            <li key={c} className="flex items-center gap-2 text-[11px]">
              <span className="w-24 shrink-0 font-mono text-ink-low">{c} {SALINITY_CLASS_BOUNDS[c]}</span>
              <span className="h-2 shrink-0 rounded-full" style={{ width: `${Math.max(1.5, shares[c] * 100)}%`, background: SALINITY_COLOR[c] }} />
              <span className="ml-auto whitespace-nowrap tabular text-ink-mid">{areas[c].toLocaleString("en-US")} ha · {(shares[c] * 100).toFixed(0)}%</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-[11px] leading-relaxed text-amber">{t("salinity_outside_note", lang)}</p>
      )}

      <p className="mt-3 border-t border-line-soft pt-2 text-[10px] leading-relaxed text-ink-low">
        {s.source} · {t("salinity_retrieved", lang)} {s.retrieved} · <Link href="/data" className="text-link hover:underline">{t("view", lang)}</Link>
      </p>
    </Panel>
  );
}

function FieldView({ farmId }: { farmId: string }) {
  const f = getFarm(farmId);
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

  const CARDS = [
    { icon: Waves, label: t("metric_soil_moisture", lang), value: `${m.soilMoisturePct}%`, delta: m.soilMoistureDelta, unit: "%", sub: "SMAP L4 · vs last 7 d", color: "#4ea8de", inverse: false },
    { icon: Thermometer, label: t("metric_temp", lang), value: `${m.tempC}°C`, delta: m.tempDelta, unit: "°C", sub: "POWER · vs 30-y mean", color: "#f2b84b", inverse: false },
    { icon: Sprout, label: "NDVI", value: m.ndvi.toFixed(2), delta: m.ndviDelta, unit: "", sub: "MODIS/VIIRS · greenness", color: "#57c785", inverse: false },
    { icon: Flame, label: t("metric_heat_days", lang), value: `${m.heatDays}`, delta: m.heatDaysDelta, unit: " d", sub: "T2M_MAX · per season", color: "#ef6c4d", inverse: true },
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
                </div>
                <div className="mt-1.5 flex items-baseline gap-2">
                  <span className="font-display text-2xl font-bold tabular">{c.value}</span>
                  <DeltaChip value={c.delta} unit={c.unit} inverse={c.inverse} />
                </div>
                <div className="mt-1 text-[11px] text-ink-low">{c.sub}</div>
              </Panel>
            ))}
          </div>
          <p className="-mt-3 text-[11px] leading-relaxed text-ink-low">{t("field_cards_note", lang)}</p>

          <Panel
            title={t("panel_onset_title", lang)}
            right={<SourceChip source="fixture" />}
          >
            <OnsetDistribution pack={f} />
            <p className="mt-1 text-[11px] leading-relaxed text-amber">{t("sample_distributions", lang)}</p>
          </Panel>

          <div className="grid gap-5 lg:grid-cols-2">
            <Panel title={t("panel_ndvi_title", lang)} right={<SourceChip source="fixture" />}>
              <SeasonTrend pack={f} />
            </Panel>
            <Panel title={t("panel_rain_title", lang)} right={<SourceChip source="fixture" />}>
              <div className="flex items-baseline gap-2 pb-1">
                <span className="font-display text-2xl font-bold tabular text-water">{m.rainfallTrendPctPerDecade > 0 ? "+" : ""}{m.rainfallTrendPctPerDecade}%</span>
                <span className="text-xs text-ink-mid">{t("per_decade", lang)}</span>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-ink-low">
                {t("rain_sample_note", lang)}
                {m.rainfallTrendPctPerDecade < 0 ? t("rain_declining", lang) : t("rain_stable", lang)}
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
                  <span className="font-bold text-ink-hi">{Math.abs(f.onset.shiftDays)}</span>{" "}
                  {later ? t("days_later", lang) : t("days_earlier", lang)}
                </p>
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

          <SalinityCard f={f} />

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

          <Panel
            title={<span className="flex items-center gap-2">{t("uncertainty", lang)} <InfoDot text={t("info_uncertainty", lang)} /></span>}
            right={<span className="rounded border border-amber px-1.5 py-0.5 text-[10px] font-bold text-amber uppercase tracking-wide">{t(CONF_KEYS[confidenceFromQuality(f.dataQuality)], lang)} · {t("demo_flags", lang)}</span>}
          >
            <p className="text-xs leading-relaxed text-ink-mid">{t("uncertainty_note", lang)}</p>
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

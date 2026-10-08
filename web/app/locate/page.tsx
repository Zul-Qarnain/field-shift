"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { ExternalLink, Flame, MapPin, Thermometer } from "lucide-react";
import {
  PRECOMPUTED_POINTS,
  districtBySlug,
  districtSlugForFarmId,
  haversineKm,
  inBangladeshBBox,
  km1,
  nearestPoint,
  type LatLng,
  type PrecomputedPoint,
} from "@/lib/locate";
import { ONSET_ALPHA } from "@/lib/engine";
import { loadDistrictPack, onsetView, packForFarm, retrievedDay, type PowerPack } from "@/lib/packs";
import { useLang } from "@/lib/lang";
import { fmtNum, t, tf } from "@/lib/i18n";
import { Panel, SourceChip } from "@/components/ui";
import { DistrictSelect } from "@/components/DistrictSelect";
import { LiveDataBanner } from "@/components/LiveDataBanner";
import { NowcastCard } from "@/components/NowcastCard";

const mapSkeleton = <div className="h-[380px] w-full animate-pulse rounded-xl bg-inset" />;
const LocateMap = dynamic(() => import("@/components/LocateMap").then((m) => m.LocateMap), {
  ssr: false,
  loading: () => mapSkeleton,
});

const COORDS = (p: LatLng, lang: Parameters<typeof fmtNum>[1]) =>
  `${fmtNum(p.lat.toFixed(4), lang)}°N, ${fmtNum(p.lon.toFixed(4), lang)}°E`;

function PackSummary({ pack, pointId, loading }: { pack: PowerPack | null; pointId: string; loading: boolean }) {
  const { lang } = useLang();
  const view = pack ? onsetView(pack) : null;
  const significant = view?.pValue !== null && view?.pValue !== undefined && view.pValue < ONSET_ALPHA;
  const m = pack?.metrics;
  const dash = t("pack_no_value", lang);

  return (
    <Panel
      title={
        <span className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-ink-low" />
          {t("locate_pack_heading", lang)}
        </span>
      }
      right={pack ? <SourceChip source="pack" label={`NASA POWER · ${retrievedDay(pack)}`} /> : <SourceChip source="fixture" />}
    >
      {loading ? (
        <div className="flex flex-col gap-2" aria-busy="true">
          <div className="h-8 w-full animate-pulse rounded bg-inset" />
          <div className="h-8 w-2/3 animate-pulse rounded bg-inset" />
        </div>
      ) : !pack ? (
        <p className="text-xs leading-relaxed text-amber">{t("locate_no_pack", lang)}</p>
      ) : (
        <dl className="text-sm">
          <div className="flex items-baseline justify-between gap-3 border-b border-line-soft py-2">
            <dt className="text-ink-mid">{t("onset_from_source", lang)}</dt>
            <dd className="text-right tabular text-ink-hi">
              {view ? view.product : dash}
              {view && (
                <span className="ml-1.5 text-[11px] text-ink-low">
                  {tf("onset_median_secondary", lang, {
                    days: `${view.shiftDays > 0 ? "+" : ""}${view.shiftDays}`,
                    p: view.pValue === null ? "n/a" : view.pValue.toFixed(3),
                    verdict: significant ? t("significant", lang) : t("not_significant", lang),
                  })}
                </span>
              )}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-3 border-b border-line-soft py-2">
            <dt className="flex items-center gap-1.5 text-ink-mid">
              <Thermometer className="h-3.5 w-3.5 text-ink-low" />
              {m?.tempYear ? tf("locate_temp_year", lang, { year: m.tempYear }) : t("metric_temp", lang)}
            </dt>
            <dd className="tabular text-ink-hi">{m?.tempC !== null && m?.tempC !== undefined ? `${fmtNum(m.tempC.toFixed(1), lang)} °C` : dash}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-3 py-2">
            <dt className="flex items-center gap-1.5 text-ink-mid">
              <Flame className="h-3.5 w-3.5 text-ink-low" />
              {m?.heatDaysYear
                ? tf("locate_heat_year", lang, { c: m.heatDaysThresholdC, year: m.heatDaysYear })
                : t("metric_heat_days", lang)}
            </dt>
            <dd className="tabular text-ink-hi">
              {m?.heatDays !== null && m?.heatDays !== undefined
                ? `${fmtNum(m.heatDays, lang)} ${t("unit_days_short", lang)}`
                : dash}
            </dd>
          </div>
        </dl>
      )}
      <p className="mt-2 border-t border-line-soft pt-2 font-mono text-[10px] leading-relaxed text-ink-low">
        {pack
          ? `${pack.source} · ${fmtNum(pack.lat.toFixed(4), lang)}°N ${fmtNum(pack.lon.toFixed(4), lang)}°E · ${pointId}`
          : pointId}
      </p>
    </Panel>
  );
}

function LocateView() {
  const { lang } = useLang();
  const params = useSearchParams();

  const districtParam = params.get("district");
  const latParam = Number(params.get("lat"));
  const lonParam = Number(params.get("lon"));
  const initial: { picked: LatLng | null; slug: string | null } = districtParam
    ? { picked: districtBySlug(districtParam)?.centroid ?? null, slug: districtParam }
    : Number.isFinite(latParam) && Number.isFinite(lonParam) && params.get("lat") && params.get("lon")
      ? { picked: { lat: latParam, lon: lonParam }, slug: null }
      : { picked: null, slug: null };

  const [picked, setPicked] = useState<LatLng | null>(initial.picked);
  const [districtSlug, setDistrictSlug] = useState<string | null>(initial.slug);
  const [districtPack, setDistrictPack] = useState<{ id: string; pack: PowerPack | null } | null>(null);

  const snap = useMemo(() => {
    if (!picked) return null;
    const inside = inBangladeshBBox(picked.lat, picked.lon);
    if (!inside) return { inside, point: null as PrecomputedPoint | null, distanceKm: 0 };
    const own = districtSlug ? PRECOMPUTED_POINTS.find((p) => p.id === districtSlug) : undefined;
    if (own) return { inside, point: own, distanceKm: haversineKm(picked, own) };
    const nearest = nearestPoint(picked.lat, picked.lon);
    return { inside, point: nearest.point, distanceKm: nearest.distanceKm };
  }, [picked, districtSlug]);

  const point = snap?.point ?? null;

  useEffect(() => {
    const query = districtSlug ? `district=${districtSlug}` : picked ? `lat=${picked.lat.toFixed(4)}&lon=${picked.lon.toFixed(4)}` : "";
    window.history.replaceState(null, "", query ? `/locate?${query}` : "/locate");
  }, [picked, districtSlug]);

  const pointId = point?.id ?? null;

  useEffect(() => {
    if (!pointId || point?.kind !== "district") return;
    let active = true;
    void loadDistrictPack(pointId).then((loaded) => {
      if (active) setDistrictPack({ id: pointId, pack: loaded });
    });
    return () => {
      active = false;
    };
  }, [pointId, point]);

  const pack = !point
    ? null
    : point.kind === "farm"
      ? packForFarm(point.id)
      : districtPack?.id === point.id
        ? districtPack.pack
        : null;
  const packLoading = point !== null && point.kind === "district" && districtPack?.id !== point.id;

  const chooseDistrict = (slug: string) => {
    const district = districtBySlug(slug);
    if (!district) return;
    setDistrictSlug(slug);
    setPicked(district.centroid);
  };

  const pickOnMap = (lat: number, lon: number) => {
    setDistrictSlug(null);
    setPicked({ lat, lon });
  };

  const quickSlug = point ? (point.kind === "district" ? point.id : districtSlugForFarmId(point.id)) : null;
  const kindLabel = point ? t(point.kind === "farm" ? "locate_kind_demo_farm" : "locate_kind_district_pack", lang) : "";

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 lg:px-8">
      <h1 className="flex items-center gap-2 font-display text-3xl font-bold tracking-tight">
        <MapPin className="h-6 w-6 text-lime" /> {t("nav_locate", lang)}
      </h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-mid">{t("locate_intro", lang)}</p>

      {point && <div className="mt-4"><LiveDataBanner pointId={point.id} /></div>}

      <div className="mt-5 grid gap-5 lg:grid-cols-[320px_1fr]">
        <div className="flex flex-col gap-4">
          <Panel title={t("locate_district_label", lang)}>
            <DistrictSelect value={districtSlug} onChange={chooseDistrict} testId="district-select" />
          </Panel>
          {picked && (
            <Panel title={t("locate_picked", lang)}>
              <p className="font-mono text-xs text-ink-hi">{COORDS(picked, lang)}</p>
              <p className="mt-1 text-[11px] text-ink-low">
                {districtSlug ? t("locate_district_label", lang) : t("locate_map_hint_short", lang)}
              </p>
            </Panel>
          )}
        </div>

        <LocateMap points={PRECOMPUTED_POINTS} picked={picked} onPick={pickOnMap} />
      </div>

      <div data-testid="snap-result" className="mt-5">
        {!picked && <Panel><p className="text-xs text-ink-mid">{t("locate_start_hint", lang)}</p></Panel>}
        {picked && snap && !snap.inside && (
          <Panel>
            <p className="text-xs leading-relaxed text-amber">{t("locate_outside", lang)}</p>
          </Panel>
        )}
        {picked && snap && snap.point && (
          <Panel>
            <p className="text-sm font-semibold text-ink-hi">
              {tf("locate_using", lang, { name: lang === "bn" ? snap.point.name_bn : snap.point.name_en, kind: kindLabel, km: km1(snap.distanceKm) })}
            </p>
            <p className="mt-1 font-mono text-[11px] text-ink-low">
              {t("locate_picked", lang)}: {COORDS(picked, lang)} ·{" "}
              {lang === "bn" ? snap.point.name_bn : snap.point.name_en}: {COORDS(snap.point, lang)}
            </p>
            {districtSlug !== null && snap.point.id === districtSlug && (
              <p className="mt-1 text-[11px] leading-relaxed text-ink-mid">{t("locate_own_point", lang)}</p>
            )}
            {snap.distanceKm > 40 && (
              <p className="mt-2 text-[11px] leading-relaxed text-amber">{tf("locate_far", lang, { km: km1(snap.distanceKm) })}</p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              {quickSlug && (
                <Link
                  href={`/quick?district=${quickSlug}`}
                  className="flex items-center gap-1.5 rounded-lg border border-action px-3 py-1.5 text-xs font-semibold text-link hover:bg-action/10"
                >
                  {t("locate_quick_link", lang)} <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              )}
              {snap.point.kind === "farm" && (
                <Link
                  href={`/field?farm=${snap.point.id}`}
                  className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-ink-mid hover:text-ink-hi"
                >
                  {t("locate_open_farm", lang)} <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>
          </Panel>
        )}
      </div>

      {point && (
        <>
          <div className="mt-5"><NowcastCard pointId={point.id} label={lang === "bn" ? point.name_bn : point.name_en} /></div>
          <div className="mt-5"><PackSummary pack={pack} pointId={point.id} loading={packLoading} /></div>
        </>
      )}
    </div>
  );
}

export default function LocatePage() {
  const { lang } = useLang();
  return (
    <Suspense fallback={<div className="p-8 text-sm text-ink-low">{t("loading_field", lang)}</div>}>
      <LocateView />
    </Suspense>
  );
}

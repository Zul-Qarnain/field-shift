"use client";

import { useMemo, useState } from "react";
import { CloudRain, Thermometer, Waves } from "lucide-react";
import { NOWCAST_WINDOWS, calendarKey, packSummary, windowDays, windowSummary, type DailySeries, type NowcastSummary } from "@/lib/nowcast";
import { PRECOMPUTED_POINTS } from "@/lib/locate";
import { useNowcast } from "@/lib/useNowcast";
import { fmtNum, monthLabel, t, tf, toBnDigits, type Lang } from "@/lib/i18n";
import { useLang } from "@/lib/lang";
import { InfoDot, Panel, SourceChip } from "@/components/ui";

/** Below these magnitudes an anomaly reads as "close to normal" rather than above or below. */
const NEAR_RAIN_PCT = 5;
const NEAR_TEMP_C = 0.1;
const NEAR_WET_PP = 1;

const parts = (iso: string) => {
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number);
  return { year, month, day };
};

const dayMonth = (iso: string, lang: Lang) => {
  const { month, day } = parts(iso);
  return lang === "bn" ? `${toBnDigits(day)} ${monthLabel(month - 1, "bn")}` : `${day} ${monthLabel(month - 1, "en")}`;
};

/** "6 Sep – 5 Oct 2026" — one year when the window stays inside it, two when it crosses. */
const windowLabel = (startIso: string, endIso: string, lang: Lang) => {
  const to = `${dayMonth(endIso, lang)} ${fmtNum(parts(endIso).year, lang)}`;
  const from = dayMonth(startIso, lang);
  return parts(startIso).year === parts(endIso).year ? `${from} – ${to}` : `${from} ${fmtNum(parts(startIso).year, lang)} – ${to}`;
};

const utcDay = (isoStamp: string) => isoStamp.slice(0, 10);

const num = (value: number | null, digits: number, lang: Lang) =>
  value === null || !Number.isFinite(value) ? null : fmtNum(value.toFixed(digits), lang);

const signed = (value: number, digits: number, lang: Lang) =>
  fmtNum(`${value > 0 ? "+" : value < 0 ? "−" : ""}${Math.abs(value).toFixed(digits)}`, lang);

function Row({
  icon: Icon, label, sub, value, normal, unit, anomaly, anomalyUnit, direction,
}: {
  icon: typeof CloudRain;
  label: string;
  sub: string;
  value: string | null;
  normal: string | null;
  unit: string;
  anomaly: string | null;
  anomalyUnit: string;
  direction: number;
}) {
  const { lang } = useLang();
  return (
    <div className="flex items-start gap-3 border-b border-line-soft py-2.5 last:border-0">
      <Icon className="mt-1 h-4 w-4 shrink-0 text-ink-low" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink-hi">{label}</p>
        <p className="text-[11px] text-ink-low">{sub}</p>
      </div>
      <div className="shrink-0 text-right">
        {value === null ? (
          <p className="text-xs text-amber">{t("nowcast_gap", lang)}</p>
        ) : (
          <>
            <p className="font-display text-lg font-bold tabular leading-tight">
              {value}
              <span className="ml-0.5 text-xs font-medium text-ink-low">{unit}</span>
            </p>
            <p className="text-[11px] tabular text-ink-mid">
              {normal === null ? "—" : `${normal} ${unit}`} {t("nowcast_normal_word", lang)}
            </p>
            <p className={`text-[11px] font-semibold tabular ${direction === 0 ? "text-ink-mid" : direction > 0 ? "text-lime" : "text-amber"}`}>
              {direction > 0 ? "▲ " : direction < 0 ? "▼ " : "▪ "}
              {anomaly === null
                ? t("nowcast_gap", lang)
                : `${anomaly}${anomalyUnit ? ` ${anomalyUnit}` : ""} ${t(direction > 0 ? "nowcast_above" : direction < 0 ? "nowcast_below" : "nowcast_near", lang)}`}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

/** Daily rain bars against this point's own climatological line — plain SVG, so it costs no extra bundle. */
function RainChart({
  series, normals, endIso, nDays,
}: {
  series: DailySeries;
  normals: (number | null)[];
  endIso: string;
  nDays: number;
}) {
  const { lang } = useLang();
  const days = windowDays(endIso, nDays);
  const bars = days.map((iso) => {
    const index = series.dates.indexOf(iso);
    return { iso, rain: index >= 0 ? series.PRECTOTCORR[index] : null, normal: normals[calendarKey(iso)] ?? null };
  });
  const max = Math.max(1, ...bars.map((b) => Math.max(b.rain ?? 0, b.normal ?? 0)));
  const width = 100;
  const height = 46;
  const step = width / bars.length;
  const yFor = (v: number) => height - (v / max) * height;
  const line = bars.map((b, i) => `${(i * step + step / 2).toFixed(2)},${yFor(b.normal ?? 0).toFixed(2)}`).join(" ");

  return (
    <div className="mt-3 rounded-lg border border-line bg-inset p-3">
      <p className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-ink-low">
        <span>{t("nowcast_chart_title", lang)}</span>
        <span className="font-mono normal-case tracking-normal">{fmtNum(max.toFixed(0), lang)} mm</span>
      </p>
      <svg viewBox={`0 0 ${width} ${height}`} className="mt-2 h-[62px] w-full" role="img" aria-label={t("nowcast_chart_title", lang)} preserveAspectRatio="none">
        {bars.map((b, i) =>
          b.rain === null ? null : (
            <rect
              key={b.iso}
              x={i * step + step * 0.15}
              width={step * 0.7}
              y={yFor(b.rain)}
              height={Math.max(0.6, height - yFor(b.rain))}
              fill="#4ea8de"
              opacity={0.8}
            />
          ),
        )}
        <polyline points={line} fill="none" stroke="#f2b84b" strokeWidth={1} strokeDasharray="2 1.5" vectorEffect="non-scaling-stroke" />
      </svg>
      <p className="mt-1 flex flex-wrap gap-x-3 text-[10px] text-ink-low">
        <span><span className="mr-1 inline-block h-2 w-2 rounded-sm bg-water" />{t("nowcast_chart_rain", lang)}</span>
        <span><span className="mr-1 inline-block h-0.5 w-3 align-middle bg-amber" />{t("nowcast_normal_word", lang)}</span>
      </p>
    </div>
  );
}

export function NowcastCard({ pointId, label }: { pointId: string; label: string }) {
  const { lang } = useLang();
  const { status, pack, live, error } = useNowcast(pointId);
  const [days, setDays] = useState<number>(NOWCAST_WINDOWS[0]);

  const summary: NowcastSummary | null = useMemo(() => {
    if (!pack) return null;
    if (live) return windowSummary(live, pack.climatology, live.lastComplete, days);
    return packSummary(pack, days);
  }, [pack, live, days]);

  const endIso = live ? live.lastComplete : pack?.lastCompleteDate;
  const series: DailySeries | null = live ?? pack?.recent ?? null;
  const rainPct = summary?.rainPctOfNormal ?? null;
  const rainDirection = rainPct === null ? 0 : Math.abs(rainPct - 100) <= NEAR_RAIN_PCT ? 0 : rainPct > 100 ? 1 : -1;
  const tempAnomaly = summary?.tempAnomaly ?? null;
  const wetAnomaly = summary?.wetAnomaly ?? null;

  const badge =
    status === "live" && live
      ? tf("nowcast_live_badge", lang, { date: utcDay(live.fetchedAt) })
      : pack
        ? tf("nowcast_saved_badge", lang, { retrieved: utcDay(pack.retrievedUtc), last: pack.lastCompleteDate })
        : status === "none"
          ? t("nowcast_none_badge", lang)
          : null;

  return (
    <Panel
      className="fade-up"
      title={
        <span className="flex flex-wrap items-center gap-2">
          {t("nowcast_title", lang)}
          <span className="text-xs font-normal text-ink-mid">· {label}</span>
        </span>
      }
      right={
        <span className="flex items-center gap-2">
          <span data-testid="nowcast-source" className="rounded border border-line px-1.5 py-0.5 font-mono text-[10px] text-ink-mid">
            {badge ?? t("nowcast_loading", lang)}
          </span>
          <SourceChip source={status === "live" ? "live" : "pack"} />
        </span>
      }
    >
      <div data-testid="nowcast-card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] leading-relaxed text-ink-low">{tf("nowcast_intro", lang, { n: days })}</p>
          <div className="flex items-center gap-1" role="group" aria-label={t("nowcast_window_label", lang)}>
            {NOWCAST_WINDOWS.map((n) => (
              <button
                key={n}
                onClick={() => setDays(n)}
                aria-pressed={days === n}
                data-testid={`nowcast-window-${n}`}
                className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors ${
                  days === n ? "border-action bg-action/15 text-ink-hi" : "border-line bg-inset text-ink-mid hover:text-ink-hi"
                }`}
              >
                {fmtNum(n, lang)} {t("unit_days_short", lang)}
              </button>
            ))}
          </div>
        </div>

        {status === "loading" && (
          <div className="mt-3 flex flex-col gap-2" aria-busy="true">
            <p className="text-xs text-ink-low">{t("nowcast_loading", lang)}</p>
            <div className="h-8 w-full animate-pulse rounded bg-inset" />
            <div className="h-8 w-3/4 animate-pulse rounded bg-inset" />
            <div className="h-8 w-2/3 animate-pulse rounded bg-inset" />
          </div>
        )}

        {status === "none" && (
          <p className="mt-3 rounded-lg border border-amber/40 bg-amber/5 p-3 text-xs leading-relaxed text-amber">
            {tf("nowcast_no_pack", lang, { count: PRECOMPUTED_POINTS.length })}
            {error ? ` (${tf("outage_reason", lang, { reason: error })})` : ""}
          </p>
        )}

        {summary && endIso && (
          <>
            <p className="mt-3 text-xs font-semibold tabular text-ink-mid">{windowLabel(summary.start, summary.end, lang)}</p>
            <div className="mt-1">
              <Row
                icon={CloudRain}
                label={t("nowcast_rain", lang)}
                sub={t("nowcast_rain_sub", lang)}
                value={num(summary.rainTotalMm, 1, lang)}
                normal={num(summary.rainNormalMm, 1, lang)}
                unit="mm"
                anomaly={summary.rainAnomalyMm === null ? null : signed(summary.rainAnomalyMm, 1, lang)}
                anomalyUnit="mm"
                direction={rainDirection}
              />
              {rainPct !== null && (
                <p className="-mt-1 pb-2 text-right text-[11px] tabular text-ink-mid">
                  {tf("nowcast_pct_of_normal", lang, { pct: rainPct.toFixed(0) })}
                </p>
              )}
              <Row
                icon={Thermometer}
                label={t("nowcast_temp", lang)}
                sub={t("nowcast_temp_sub", lang)}
                value={num(summary.tempMean, 1, lang)}
                normal={num(summary.tempNormal, 1, lang)}
                unit="°C"
                anomaly={tempAnomaly === null ? null : signed(tempAnomaly, 1, lang)}
                anomalyUnit="°C"
                direction={tempAnomaly === null ? 0 : Math.abs(tempAnomaly) <= NEAR_TEMP_C ? 0 : tempAnomaly > 0 ? 1 : -1}
              />
              <Row
                icon={Waves}
                label={t("nowcast_wet", lang)}
                sub={t("nowcast_wet_sub", lang)}
                value={num(summary.wetMean === null ? null : summary.wetMean * 100, 1, lang)}
                normal={num(summary.wetNormal === null ? null : summary.wetNormal * 100, 1, lang)}
                unit="%"
                anomaly={wetAnomaly === null ? null : signed(wetAnomaly * 100, 1, lang)}
                anomalyUnit={t("nowcast_unit_pct_points", lang)}
                direction={wetAnomaly === null ? 0 : Math.abs(wetAnomaly * 100) <= NEAR_WET_PP ? 0 : wetAnomaly > 0 ? 1 : -1}
              />
            </div>

            {series && pack && (
              <RainChart series={series} normals={pack.climatology.PRECTOTCORR} endIso={endIso} nDays={days} />
            )}

            {pack && (
              <>
                <p className="mt-3 flex items-center justify-between gap-2 border-t border-line-soft pt-2 text-[11px] leading-relaxed text-ink-low">
                  <span>
                    {tf("nowcast_baseline_line", lang, {
                      first: pack.baseline.firstYear,
                      last: pack.baseline.lastYear,
                      days: pack.baseline.halfWindowDays,
                    })}
                  </span>
                  <InfoDot text={pack.baseline.why} />
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-ink-low">
                  {tf("nowcast_valid_days", lang, { rain: summary.validDays.PRECTOTCORR, temp: summary.validDays.T2M, wet: summary.validDays.GWETTOP, of: summary.days })}
                </p>
              </>
            )}
            <p className="mt-2 text-[11px] leading-relaxed text-ink-mid">{t("nowcast_context_note", lang)}</p>
          </>
        )}
      </div>
    </Panel>
  );
}

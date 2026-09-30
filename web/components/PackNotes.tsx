"use client";

import type { PowerPack } from "@/lib/packs";
import { useLang } from "@/lib/lang";
import { fmtNum, t, tf } from "@/lib/i18n";

/** Threshold sensitivity — the ±20 % local-threshold claim, straight from the pack. */
export function OnsetSensitivity({ pack }: { pack: PowerPack }) {
  const { lang } = useLang();
  const legacy = pack.onset.legacyV1.censoredAtWindowStart;
  return (
    <div className="mt-3 rounded-lg border border-line bg-inset p-3">
      <p className="text-[11px] font-semibold text-ink-mid">{t("sens_title", lang)}</p>
      <ul className="mt-1.5 space-y-1 font-mono text-[11px] text-ink-low">
        {pack.onset.sensitivity.map((row) => (
          <li key={row.thresholdFactor}>
            {tf("sens_row", lang, {
              factor: row.thresholdFactor.toFixed(1),
              mm: row.thresholdMm?.toFixed(1) ?? "n/a",
              a: row.medianA ?? "n/a",
              b: row.medianB ?? "n/a",
              days: row.shiftDays === null ? "n/a" : `${row.shiftDays > 0 ? "+" : ""}${row.shiftDays}`,
              p: row.pValue === null ? "n/a" : row.pValue.toFixed(3),
              n: row.detectedYears,
              cens: row.censoredPct?.toFixed(0) ?? "n/a",
            })}
          </li>
        ))}
      </ul>
      <p className="mt-2 font-mono text-[10px] text-ink-low">
        {tf("sens_legacy_line", lang, {
          count: legacy.count, total: legacy.of, pct: legacy.sharePct?.toFixed(0) ?? "n/a",
        })}
      </p>
    </div>
  );
}

/** Homogeneity + cross-check agreement: what the two products say, and which one we used. */
export function HomogeneityNote({ pack }: { pack: PowerPack }) {
  const { lang } = useLang();
  const homogeneity = pack.quality.precipHomogeneity;
  const tempHomogeneity = pack.quality.tempMaxHomogeneity;
  const cross = pack.crossCheck;
  const full = homogeneity.fullRecord;
  const inside = homogeneity.changePointInsideAnalysisWindow;
  const where = homogeneity.changePointLocation === "inside era B" ? t("cp_era_b", lang) : t("cp_era_a", lang);

  return (
    <div className="mt-2 space-y-1.5 text-[11px] leading-relaxed text-ink-low">
      <p>
        <span className="font-semibold text-ink-mid">{t("homog_rain_label", lang)}</span>{" "}
        {tf("homog_rain_full", lang, {
          year: fmtNum(full.changeYear ?? "—", lang),
          p: full.pValueText ? fmtNum(full.pValueText, lang) : "n/a",
          step: fmtNum(full.step ?? "n/a", lang),
        })}
        {inside !== null ? `; ${tf("homog_in_window", lang, { year: fmtNum(inside, lang), where })}` : `; ${t("homog_clean", lang)}`}.
      </p>
      <p>
        <span className="font-semibold text-ink-mid">{t("homog_temp_label", lang)}</span>{" "}
        {tempHomogeneity.changePointInsideAnalysisWindow !== null
          ? tf("homog_temp_step", lang, {
              year: fmtNum(tempHomogeneity.changePointInsideAnalysisWindow, lang),
              p: tempHomogeneity.analysisWindowTest.pValueText ? fmtNum(tempHomogeneity.analysisWindowTest.pValueText, lang) : "n/a",
            })
          : t("homog_temp_clean", lang)}
        {pack.metrics.heatDaysCaution ? ` — ${pack.metrics.heatDaysCaution}` : ""}.
      </p>
      {cross?.available && cross.agreement ? (
        <p>
          <span className="font-semibold text-ink-mid">{t("xcheck_label", lang)}</span>{" "}
          {tf("xcheck_line", lang, {
            deg: cross.grid?.degrees ?? "0.25",
            lat: cross.grid?.cell[0] ?? "n/a",
            lon: cross.grid?.cell[1] ?? "n/a",
            date: cross.retrievedUtc?.slice(0, 10) ?? "n/a",
            r: cross.agreement.onsetYears.pearsonR ?? "n/a",
            mae: cross.agreement.onsetYears.mae ?? "n/a",
            n: cross.agreement.onsetYears.yearsCompared,
            r2: cross.agreement.annualRainfallMm.pearsonR ?? "n/a",
            mae2: cross.agreement.annualRainfallMm.mae ?? "n/a",
            trend: pack.preferred.rainfallTrend.source,
            onset: pack.preferred.onsetShift.source,
          })}
        </p>
      ) : (
        <p className="text-amber">{t("xcheck_missing", lang)}</p>
      )}
    </div>
  );
}

/**
 * Method + caveats: the pack's own words, so the UI cannot outstate the pipeline. The pack text is
 * written by the Python builder in English; the panel says so rather than pretending otherwise.
 */
export function PackMethodNote({ pack }: { pack: PowerPack }) {
  const { lang } = useLang();
  return (
    <div className="mt-2 space-y-1.5 text-[11px] leading-relaxed text-ink-low">
      <p>{pack.method.onset}</p>
      <p>{pack.method.trendWindow}</p>
      <p>{pack.method.crossCheck}</p>
      {pack.method.caveats.map((caveat) => (
        <p key={caveat.slice(0, 24)} className="text-amber">
          {caveat}
        </p>
      ))}
      <p className="text-ink-low">{t("english_only_note", lang)}</p>
    </div>
  );
}

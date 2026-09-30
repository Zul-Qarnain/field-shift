"use client";

import type { PowerPack } from "@/lib/packs";

/** Threshold sensitivity — the ±20 % local-threshold claim, straight from the pack. */
export function OnsetSensitivity({ pack }: { pack: PowerPack }) {
  return (
    <div className="mt-3 rounded-lg border border-line bg-inset p-3">
      <p className="text-[11px] font-semibold text-ink-mid">Threshold sensitivity (same rule, 0.8× / 1.0× / 1.2× the local 5-day threshold)</p>
      <ul className="mt-1.5 space-y-1 font-mono text-[11px] text-ink-low">
        {pack.onset.sensitivity.map((row) => (
          <li key={row.thresholdFactor}>
            {row.thresholdFactor.toFixed(1)}× ({row.thresholdMm?.toFixed(1) ?? "n/a"} mm): {row.medianA ?? "n/a"} → {row.medianB ?? "n/a"} DOY, shift{" "}
            {row.shiftDays === null ? "n/a" : `${row.shiftDays > 0 ? "+" : ""}${row.shiftDays} d`}, p {row.pValue === null ? "n/a" : row.pValue.toFixed(3)},{" "}
            {row.detectedYears} years, {row.censoredPct?.toFixed(0) ?? "n/a"}% censored
          </li>
        ))}
      </ul>
      <p className="mt-2 font-mono text-[10px] text-ink-low">
        Rejected definition v1 (7-day ≥ 20 mm from DOY 145): {pack.onset.legacyV1.censoredAtWindowStart.count}/{pack.onset.legacyV1.censoredAtWindowStart.of} years
        pinned to its window floor ({pack.onset.legacyV1.censoredAtWindowStart.sharePct?.toFixed(0) ?? "n/a"}%).
      </p>
    </div>
  );
}

/** Homogeneity + cross-check agreement: what the two products say, and which one we used. */
export function HomogeneityNote({ pack }: { pack: PowerPack }) {
  const homogeneity = pack.quality.precipHomogeneity;
  const cross = pack.crossCheck;
  const full = homogeneity.fullRecord;
  return (
    <div className="mt-2 space-y-1.5 text-[11px] leading-relaxed text-ink-low">
      <p>
        <span className="font-semibold text-ink-mid">Rainfall homogeneity (Pettitt):</span> full record change point {full.changeYear ?? "none"} (
        {full.pValueText ?? "n/a"}, step {full.step ?? "n/a"} mm)
        {homogeneity.changePointInsideAnalysisWindow !== null ? (
          <>
            ; <span className="text-amber">a further step at {homogeneity.changePointInsideAnalysisWindow} sits {homogeneity.changePointLocation} inside the
            2001–2025 analysis window</span>
          </>
        ) : (
          "; no significant step inside the 2001–2025 analysis window"
        )}
        .
      </p>
      <p>
        <span className="font-semibold text-ink-mid">Temperature homogeneity (annual mean T2M_MAX):</span>{" "}
        {pack.quality.tempMaxHomogeneity.changePointInsideAnalysisWindow !== null
          ? `step at ${pack.quality.tempMaxHomogeneity.changePointInsideAnalysisWindow} (${pack.quality.tempMaxHomogeneity.analysisWindowTest.pValueText ?? "n/a"})`
          : "no significant step in the analysis window"}
        {pack.metrics.heatDaysCaution ? ` — ${pack.metrics.heatDaysCaution}` : ""}.
      </p>
      {cross?.available && cross.agreement ? (
        <p>
          <span className="font-semibold text-ink-mid">CHIRPS cross-check</span> ({cross.grid?.degrees}° cell {cross.grid?.cell.join(", ")}; retrieved{" "}
          {cross.retrievedUtc?.slice(0, 10)}): onset-year agreement r={cross.agreement.onsetYears.pearsonR ?? "n/a"}, MAE {cross.agreement.onsetYears.mae ?? "n/a"} d,{" "}
          {cross.agreement.onsetYears.yearsCompared} years; annual-rainfall r={cross.agreement.annualRainfallMm.pearsonR ?? "n/a"}, MAE{" "}
          {cross.agreement.annualRainfallMm.mae ?? "n/a"} mm. Used for: trend ← {pack.preferred.rainfallTrend.source}, onset ←{" "}
          {pack.preferred.onsetShift.source}.
        </p>
      ) : (
        <p className="text-amber">CHIRPS cross-check not available for this point — the POWER figures could not be verified against an independent product.</p>
      )}
    </div>
  );
}

/** Method + caveats: the pack's own words, so the UI cannot outstate the pipeline. */
export function PackMethodNote({ pack }: { pack: PowerPack }) {
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
    </div>
  );
}

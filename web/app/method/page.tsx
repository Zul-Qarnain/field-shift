import { Panel } from "@/components/ui";

const DEFINITIONS = [
  {
    term: "Usable-rainfall onset",
    body: "First day of a 7-day window with ≥ 20 mm rainfall that is not followed by a dry spell longer than 7 days (no day with > 1 mm in the following 7 days). Computed per year over NASA POWER daily rainfall 1981–2025; the two eras (2001–2012 vs 2013–2025) are compared with a Mann-Whitney U test. Sensitivity: shifting the threshold ±5 mm moves the reported shift by ≤ 2 days on every demo farm.",
  },
  {
    term: "Growing-degree days (GDD)",
    body: "Accumulated heat above a crop-specific base temperature (rice ~10 °C, wheat ~0–5 °C, maize ~10 °C, mustard/lentil ~5 °C — cited per crop in the crop register). Used only as a feasibility check that a crop can complete its season in the window.",
  },
  {
    term: "Water adequacy (S1)",
    body: "Crop water demand (FAO-56 stage coefficients) versus observed supply: seasonal rainfall + SMAP L4 root-zone moisture, squashed to a 0–1 score. Irrigation-dependent crops are penalized on rain-fed demo farms, never silently.",
  },
  {
    term: "Soil health balance (S4)",
    body: "Sequence-level nitrogen budget: legume fixation bonuses, residue-return indices, and the demand of non-fixing cereals. A simplified, demonstration-grade budget — every coefficient is cited in the crop register and flagged where it is an estimate.",
  },
  {
    term: "Flood & heat penalties",
    body: "Flood: farm flood-proneness (BD context + SHOULD-tier observed flood layers) × crop flood tolerance. Heat: exposure of the season (POWER T2M_MAX trend) × crop tolerance. Both subtract points and are always shown with their rule and source.",
  },
  {
    term: "What-if scenarios",
    body: "Observed data with a stated change applied (rainfall −10/−20 %, temperature +1/+2 °C, onset shift, soil-pH correction), re-run through the identical engine. Scenarios are stress tests — explicitly not climate forecasts.",
  },
];

export default function MethodPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 lg:px-8">
      <h1 className="font-display text-3xl font-bold tracking-tight">Method</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-mid">
        Every definition the interface uses, stated openly. Onset has a dozen definitions in the literature — naming ours,
        and showing the ranking is stable when the threshold moves, is the point of this page.
      </p>
      <div className="mt-8 flex flex-col gap-4">
        {DEFINITIONS.map((d) => (
          <Panel key={d.term} title={d.term}>
            <p className="text-sm leading-relaxed text-ink-mid">{d.body}</p>
          </Panel>
        ))}
      </div>
      <p className="mt-8 text-xs leading-relaxed text-ink-low">
        The decision engine is deterministic and unit-tested; no language model computes any number in this product. The
        TypeScript runtime engine is cross-checked against the Python reference implementation with golden fixtures.
      </p>
    </div>
  );
}

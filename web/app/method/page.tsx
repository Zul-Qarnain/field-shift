import { Panel, SourceChip } from "@/components/ui";

const DEFINITIONS = [
  {
    term: "Usable-rainfall onset",
    body: "First day of a 7-day window with ≥ 20 mm rainfall that is not followed by a dry spell longer than 7 days (no day with > 1 mm in the following 7 days). Planned method: compute it per year over NASA POWER daily rainfall 1981–2025, then compare the two eras (2001–2012 vs 2013–2025) with a Mann-Whitney U test. The onset values on the demo farms are sample data — they are not computed from POWER yet, and no threshold sensitivity has been run. The shift does enter the ranking today: it shrinks or widens the calendar budget and feeds the late-onset penalty below.",
  },
  {
    term: "Season calendar (durationDays)",
    body: "A rotation is only generated if it fits one 365-day year: Aman's duration plus the rabi and pre-monsoon durations plus two 10-day turnarounds, plus the effective onset shift, must stay under 365 days. So Boro (140 d) cannot be followed by Aus (105 d); Boro + Mungbean (70 d) fits with ten days to spare, and stops fitting once the onset is 11 days late — which is what the Rajshahi fixture shows. ESTIMATE — durations and the 10-day turnaround are demo values, not cited to a crop register. Growing-degree-day sums are planned and are not used by this build.",
  },
  {
    term: "Water adequacy (S1)",
    body: "Per season: a smooth logistic of the supply−demand margin, 1/(1+exp(−(supply − demand)/0.15)), so a bigger safety margin scores slightly higher and nothing ties exactly at 1.0. Aman supply is usable rainfall only; dry-season supply is usable rainfall plus this farm's demo irrigation access. In this build both sides come from the demo fixture.",
  },
  {
    term: "Irrigation reliance (S7)",
    body: "The mean dry-season water demand that usable rainfall cannot cover, scaled to a 0–1 score and charged against the Water saving priority: pumping groundwater costs points even where the water is available. Farms with high demo irrigation access can still grow Boro, wheat or maize — the cost shows up here rather than in adequacy.",
  },
  {
    term: "Food & income (S8)",
    body: "Each season's yield value graded by the water that season can actually deliver, averaged over the three seasons and scaled to a 0–1 score: a crop this farm cannot water earns little. This is the component the Stable harvest slider mostly drives, and the reason irrigated farms can prefer Boro, wheat, maize or potato over low-demand pulses. ESTIMATE — the yieldValue table is a hand-set demo ranking of food and income per season (the idea is BBS yield × farm price), not a cited figure; it is not calibrated against household income.",
  },
  {
    term: "Soil health balance (S4)",
    body: "Sequence-level nitrogen budget: legume fixation credit, residue-return indices, and the demand of non-fixing crops, minus the same-family and idle-land hits below. A simplified, demonstration-grade budget — the crop coefficients in this demo are ESTIMATE values, not yet cited to a source register.",
  },
  {
    term: "Same-family sequence & idle fallow",
    body: "Crops of the same botanical family may follow each other (Aman → Boro and Aman → Wheat are real Bangladesh patterns), but each repeat costs soil-health points and a listed penalty — cereal after cereal the most, legume after legume the least. A fallow season is legal and uses no water, and is charged an idle-land penalty for bare soil and lost residue. ESTIMATE — these coefficients are a demo calibration, not fitted against observed yield or pest data.",
  },
  {
    term: "Late-onset terminal heat",
    body: "A later monsoon onset delays Aman harvest and therefore winter sowing. Each dry-season crop carries a risk proportional to max(0, onset shift)/15 × (1 − heat tolerance) × duration/120, listed as a penalty and folded into resilience. An earlier onset widens the window and gives a small credit to long-duration crops. ESTIMATE scaling.",
  },
  {
    term: "Flood & heat penalties (S6 resilience)",
    body: "Resilience reads all three seasons: Aman flood exposure (farm flood-proneness × crop tolerance), heat exposure of the rabi and pre-monsoon crops, the dry-spell water risk of both dry seasons, and the late-onset term above. Penalties subtract points and are always shown with their rule and source.",
  },
  {
    term: "What-if scenarios",
    body: "Observed data with a stated change applied (rainfall −10/−20 %, temperature +1/+2 °C, onset +7/+15 days, soil-pH correction), re-run through the identical engine. Scenarios are stress tests — explicitly not climate forecasts.",
  },
];

export default function MethodPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 lg:px-8">
      <h1 className="font-display text-3xl font-bold tracking-tight">Method</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-mid">
        Every definition the interface uses, stated openly. Onset has a dozen definitions in the literature — naming
        ours, and saying which parts are computed today versus planned, is the point of this page.
      </p>
      <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber/40 bg-amber/5 p-4">
        <SourceChip source="fixture" />
        <p className="text-sm leading-relaxed text-ink-mid">
          Demo build: numbers on these pages come from sample fixtures, not yet from the NASA data pipeline.
        </p>
      </div>
      <div className="mt-8 flex flex-col gap-4">
        {DEFINITIONS.map((d) => (
          <Panel key={d.term} title={d.term}>
            <p className="text-sm leading-relaxed text-ink-mid">{d.body}</p>
          </Panel>
        ))}
      </div>
      <p className="mt-8 text-xs leading-relaxed text-ink-low">
        The decision engine is deterministic and unit-tested; no language model computes any number in this product.
        The TypeScript runtime engine has its own unit tests; a cross-check against a Python reference implementation
        is planned and does not exist yet.
      </p>
    </div>
  );
}

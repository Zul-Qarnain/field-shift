"""Build-time driver for the onset ML outlook. Run it offline; the browser never does.

    /workspace/fs-venv/bin/python scripts/build_onset_ml.py

Real inputs, all read from the caches named below — nothing here is invented:

* CHIRPS v2.0 daily 0.25° (UCSB Climate Hazards Center), Bangladesh box, cache/chirps/
  — onset labels and the pre-monsoon rainfall feature for the shipped arm;
* NASA POWER daily point series, cache/power/ — temperature, humidity and root-zone
  moisture for both arms, rainfall for the restricted 2001–2025 arm;
* NOAA PSL ONI and DMI monthly series, cache/indices/.

It labels every district-year with the v2 onset rule, runs a leave-one-year-out backtest
for both arms, refits the shipped arm on all its years, predicts the outlook year for the
districts and the six demo farms, and writes metrics.json plus
web/public/data/onset_outlook.json. A district-year with no observed onset is dropped, not
filled.
"""

from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path

import pandas as pd

REPO = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO))

from src.acquire import chirps, districts as district_mod, indices, power  # noqa: E402
from src.compute import onset as onset_mod  # noqa: E402
from src.compute.ml import dataset as D  # noqa: E402
from src.compute.ml import features as F  # noqa: E402
from src.compute.ml import onset_ml as M  # noqa: E402
from src.compute.ml import outlook as O  # noqa: E402

FIRST_YEAR = 1981
OUTLOOK_YEAR = 2026
ISSUE_DATE = f"{OUTLOOK_YEAR}-04-25"
POWER_DIR = REPO / "cache" / "power"
CHIRPS_DIR = REPO / "cache" / "chirps"
METRICS_PATH = REPO / "src" / "compute" / "ml" / "metrics.json"
OUTLOOK_PATH = REPO / "web" / "public" / "data" / "onset_outlook.json"
PRIMARY = "chirps"

#: Demo farm coordinates, copied from web/lib/data.ts; web/tests/outlook.test.ts checks
#: they still match, so this table cannot silently drift from the app. A farm has no onset
#: history of its own, so its baseline and prior-season value come from its district.
FARM_POINTS = [
    D.Point("farm-12", "Farm-12 (Tangail)", 24.2514, 89.9152, "farm", "tangail"),
    D.Point("rajshahi-07", "Farm-07 (Rajshahi)", 24.3636, 88.3277, "farm", "rajshahi"),
    D.Point("barishal-03", "Farm-03 (Barishal)", 22.8486, 90.2512, "farm", "barisal"),
    D.Point("khulna-09", "Farm-09 (Khulna)", 22.8029, 89.4018, "farm", "khulna"),
    D.Point("rangpur-21", "Farm-21 (Rangpur)", 25.6486, 89.3517, "farm", "rangpur"),
    D.Point("sylhet-15", "Farm-15 (Sylhet)", 24.8026, 92.0521, "farm", "sylhet"),
]


def load_points() -> list[D.Point]:
    district_points = [
        D.Point(str(row["slug"]), str(row["name"]), float(row["lat"]), float(row["lon"]), "district")
        for row in district_mod.load_csv()
    ]
    return district_points + FARM_POINTS


def read_power(point: D.Point) -> pd.DataFrame:
    return power.fetch_daily(point.lat, point.lon, start=f"{FIRST_YEAR}0101", cache_dir=POWER_DIR)


def read_chirps(point: D.Point) -> pd.Series:
    return chirps.series(point.lat, point.lon, FIRST_YEAR, OUTLOOK_YEAR, chirps_dir=CHIRPS_DIR)


def outlook_fold(
    district: F.District,
    scalars: pd.DataFrame,
    labels: pd.Series,
    years: list[int],
    oni: pd.DataFrame,
    dmi: pd.DataFrame,
) -> pd.DataFrame:
    """Features for every label year *and* the outlook year, under one honest fold.

    The fold holds the outlook year out: a training row is measured against a climatology
    that excludes its own year, and the outlook row against the full training mean. That is
    the same construction the backtest scores, so the shipped prediction and the reported
    skill are built the same way.
    """
    clim = F.fold_climatology(scalars, OUTLOOK_YEAR, years)
    return F.features_from_scalars(clim, district, [*years, OUTLOOK_YEAR], labels, oni, dmi)


def arm_rows(variant: D.Variant, years: list[int], oni: pd.DataFrame, dmi: pd.DataFrame) -> pd.DataFrame:
    frames = []
    for point in variant.points:
        features = outlook_fold(point.district(), variant.scalars[point.key], variant.labels[point.key], years, oni, dmi)
        if not features.empty:
            frames.append(features)
    combined = pd.concat(frames, ignore_index=True)
    combined["onset_doy"] = [
        float(variant.labels[str(key)].get(int(year), float("nan"))) if str(key) in variant.labels else float("nan")
        for key, year in zip(combined["district"], combined["year"], strict=True)
    ]
    return combined


def observed_onset(rainfall: pd.Series | None, source_name: str) -> tuple[float, str]:
    """Is the outlook year's onset confirmable at this point yet, and if not, why?

    A candidate at DOY ``d`` needs ``d + ACCUM_DAYS + BREAK_CHECK_DAYS`` of record before
    the v2 rule can confirm it, so the confirmable part of the window is walked only as far
    as the data allows. "Not confirmable yet" is kept strictly apart from "no onset".
    """
    if rainfall is None or len(rainfall) == 0:
        return float("nan"), "no rainfall record for this point"
    year_days = rainfall[rainfall.index.year == OUTLOOK_YEAR]
    if year_days.empty:
        return float("nan"), f"no {OUTLOOK_YEAR} data in the rainfall record"
    last_doy = int(year_days.index[-1].dayofyear)
    reach = last_doy - (onset_mod.ACCUM_DAYS + onset_mod.BREAK_CHECK_DAYS)
    if reach < onset_mod.WINDOW_START_DOY:
        return float("nan"), (
            f"the {OUTLOOK_YEAR} record reaches only DOY {last_doy}, which is before the rule's window "
            f"(from DOY {onset_mod.WINDOW_START_DOY}) can be confirmed at all"
        )
    confirmed_to = min(reach, onset_mod.WINDOW_END_DOY)
    value = onset_mod.onset_for_year(rainfall, OUTLOOK_YEAR, window_end_doy=confirmed_to)
    if pd.isna(value):
        return float("nan"), (
            f"no qualifying onset yet: the window has been checked to DOY {confirmed_to} of "
            f"{onset_mod.WINDOW_START_DOY}–{onset_mod.WINDOW_END_DOY} (record ends DOY {last_doy})"
        )
    return float(value), f"observed under the v2 rule in {source_name} (record ends DOY {last_doy})"


def chirps_retrieved() -> dict[str, str]:
    """What the CHIRPS files say about when they were fetched — training years and outlook year apart."""
    years = chirps.available_years(CHIRPS_DIR)
    out: dict[str, str] = {}
    for label, year in (("first year on disk", years[0]), ("last training year", chirps.LAST_YEAR), ("outlook year", OUTLOOK_YEAR)):
        path = CHIRPS_DIR / f"chirps_bd_{year}.nc"
        if not path.exists():
            out[label] = "not on disk"
            continue
        import xarray as xr

        with xr.open_dataset(path) as dataset:
            out[label] = str(dataset.attrs.get("retrieved_utc", "no timestamp in the file"))
    out["years on disk"] = f"{years[0]}–{years[-1]} ({len(years)} files)"
    return out


def main() -> None:
    parser = argparse.ArgumentParser(description="Build the onset ML outlook and its backtest metrics.")
    parser.add_argument("--limit", type=int, default=0, help="only the first N districts (smoke test)")
    parser.add_argument("--years", type=int, default=0, help="only the last N label years (smoke test)")
    parser.add_argument("--rounds", type=int, default=M.NUM_BOOST_ROUND, help="boosting rounds")
    parser.add_argument("--metrics-out", type=Path, default=METRICS_PATH)
    parser.add_argument("--out", type=Path, default=OUTLOOK_PATH)
    args = parser.parse_args()

    started = time.time()
    oni, dmi = indices.oni(), indices.dmi()
    points = load_points()
    if args.limit:
        points = [p for p in points if p.kind == "farm"] + points[: args.limit]
    print(f"{len([p for p in points if p.kind == 'district'])} districts + {len([p for p in points if p.kind == 'farm'])} farms")

    power_frames: dict[str, pd.DataFrame] = {}
    chirps_series: dict[str, pd.Series] = {}
    cells: dict[str, tuple[float, float]] = {}
    stamps: list[str] = []
    for point in points:
        frame = read_power(point)
        power_frames[point.key] = frame
        stamps.append(str(frame.attrs.get("retrieved_utc", "unknown")))
        chirps_series[point.key] = read_chirps(point)
        cells[point.key] = chirps.cell_of(point.lat, point.lon, chirps_dir=CHIRPS_DIR)
    print(f"series read for {len(points)} points ({time.time() - started:.0f}s)")

    variants: dict[str, D.Variant] = {}
    years_by_variant: dict[str, list[int]] = {}
    reports: dict[str, dict[str, object]] = {}
    rows_by_variant: dict[str, pd.DataFrame] = {}
    for name in D.VARIANTS:
        variant = D.build_variant(name, points, power_frames, chirps_series, OUTLOOK_YEAR)
        variant.cells = cells
        years = D.year_pool(variant)
        if args.years:
            years = years[-args.years :]
        districts = [p.district() for p in variant.points if p.kind == "district"]
        samples = M.build_samples(districts, variant.scalars, variant.labels, oni, dmi, years)
        folds = M.backtest_rows(samples, M.leave_one_year_split(years))
        report = M.run_backtest(folds, rounds=args.rounds)
        metrics = report["metrics"]
        print(
            f"  [{name}] {len(years)} years {years[0]}–{years[-1]}, {len(districts)} districts, "
            f"{metrics['n_district_years']} district-years: mae {metrics['mae_model']} vs clim {metrics['mae_clim']} "
            f"skill {metrics['skill']} rmse {metrics['rmse']} coverage {metrics['coverage']} -> {metrics['status']}"
        )
        variants[name] = variant
        years_by_variant[name] = years
        reports[name] = M.variant_record(report, years, len(districts))
        reports[name]["source"] = variant.source
        rows_by_variant[name] = arm_rows(variant, years, oni, dmi)

    M.write_metrics(reports, args.metrics_out, primary=PRIMARY)

    primary = variants[PRIMARY]
    years = years_by_variant[PRIMARY]
    combined = rows_by_variant[PRIMARY]
    train = combined[(combined["year"].isin(years)) & combined["district"].isin(primary.trainable)].dropna(subset=["onset_doy"])
    models = {
        "mean": M.fit({"objective": "regression"}, train[F.FEATURE_NAMES], train["onset_doy"], args.rounds),
        "low": M.fit({"objective": "quantile", "alpha": M.QUANTILES[0]}, train[F.FEATURE_NAMES], train["onset_doy"], args.rounds),
        "high": M.fit({"objective": "quantile", "alpha": M.QUANTILES[1]}, train[F.FEATURE_NAMES], train["onset_doy"], args.rounds),
    }

    outlook = combined[combined["year"] == OUTLOOK_YEAR].set_index("district")
    targets = [O.OutlookTarget(p.key, p.kind, p.label, p.lat, p.lon, p.clim_key) for p in primary.points if p.key in outlook.index]
    skipped = [p.key for p in points if p.key not in {t.key for t in targets}]
    if skipped:
        print(f"  no {OUTLOOK_YEAR} window for: {', '.join(skipped)}")
    ordered = outlook.loc[[t.key for t in targets]].reset_index().rename(columns={"index": "district"})

    fitted = O.FittedOutlook(
        mean_model=models["mean"],
        low_model=models["low"],
        high_model=models["high"],
        clim_by_district={key: float(series.reindex(years).mean()) for key, series in primary.labels.items()},
        training_years=years,
        trained_at=time.strftime("%Y-%m-%dT%H:%M:%S+00:00", time.gmtime()),
        data_retrieved_utc={
            "power": max(stamps) if stamps else "unknown",
            "oni": str(oni.attrs["retrieved_utc"]),
            "dmi": str(dmi.attrs["retrieved_utc"]),
            "chirps": str(chirps.provenance(CHIRPS_DIR)["retrievedUtc"]),
        },
    )
    records = O.predict_targets(fitted, ordered, targets)

    observed: dict[str, float] = {}
    notes: dict[str, str] = {}
    for point in targets:
        value, note = observed_onset(chirps_series.get(point.key), primary.source)
        notes[point.key] = note
        if value == value:
            observed[point.key] = value
        print(f"  {point.key}: {note}")

    metrics = reports[PRIMARY]["metrics"]
    payload = O.build_payload(
        fitted,
        metrics,
        records,
        issue_date=ISSUE_DATE,
        observed=observed,
        label_note=(
            f"Labels are the v2 onset rule — {onset_mod.RULE_TEXT_UI} — applied to "
            f"{primary.source} daily rainfall over DOY {onset_mod.WINDOW_START_DOY}–{onset_mod.WINDOW_END_DOY}. "
            "Labels and the rainfall feature come from the same product, so this is a same-source "
            "nowcast check; no comparison against a third rainfall dataset has been run."
        ),
        variants=reports,
        sources={
            "labels": primary.source,
            "rainfall_feature": primary.source,
            "weather_features": "NASA POWER daily point series (T2M, T2M_MAX, RH2M, GWETROOT)",
            "indices": "NOAA PSL ONI (ERSSTv6 3-month running mean) and DMI (HadISST1.1)",
            "chirps_ui": "CHIRPS v2.0 (UCSB Climate Hazards Center)",
            "power_rainfall_excluded": (
                "POWER PRECTOTCORR is not used for labels or the rainfall feature in the CHIRPS arm: at Tangail "
                "its annual total averages 937 mm in 1981–1996, 1714 mm in 1997–2015 and 2814 mm in 2016–2025, so "
                "a 45-year anomaly climatology would be measuring the product, not the monsoon. The POWER arm is "
                "therefore reported for 2001–2025 only."
            ),
            "power_weather_note": (
                "Temperature, humidity and root-zone moisture also come from a reanalysis-merged product; "
                "they are used as anomalies against each fold's own climatology, which limits but does not "
                "remove the same inhomogeneity risk."
            ),
            "chirps_grid": "CHIRPS v2.0 is a 0.25° daily grid: a point's value is its nearest cell, not a station reading.",
            "chirps_retrieved": chirps_retrieved(),
        },
    )
    payload["observed_notes"] = notes
    payload["out_of_sample"] = O.out_of_sample_check(records)
    payload["district_count"] = len([t for t in targets if t.kind == "district"])
    payload["farm_district_note"] = (
        "A demo farm's baseline and prior-season onset come from the district it sits in; "
        "its own 1 Mar – 20 Apr rainfall comes from its own CHIRPS cell."
    )
    payload["onset_rule"] = onset_mod.RULE_LABEL
    payload["chirps_cells"] = {
        key: {"lat": cell[0], "lon": cell[1]}
        for key, cell in sorted(cells.items())
        if key in {t.key for t in targets}
    }
    payload["issue_before_onset"] = (
        f"The outlook is issued on {M.ISSUE_TEXT}. The v2 window opens at DOY {onset_mod.WINDOW_START_DOY} "
        f"(1 May in {OUTLOOK_YEAR}), so in some districts the real onset falls only days after the issue date: "
        "the model predicts an event that can arrive almost immediately, not one a season away."
    )
    O.write_payload(payload, args.out)
    print(f"wrote {args.out} and {args.metrics_out} in {time.time() - started:.0f}s")


if __name__ == "__main__":
    main()

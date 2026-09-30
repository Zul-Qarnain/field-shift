"""Pre-issue-date features for the onset ML outlook.

The outlook is issued on 25 April, so a feature may only use information that existed by
25 April of the year being predicted:

* pre-monsoon rainfall summed over 1 Mar – 20 Apr — from CHIRPS v2.0 in the shipped model,
  because NASA POWER PRECTOTCORR is not homogeneous over 1981–2025 (its source changes
  inflate the later segments; measured at Tangail the annual total averages 937 mm in
  1981–1996, 1714 mm in 1997–2015 and 2814 mm in 2016–2025);
* POWER temperature, humidity and root-zone moisture over the same window, used as
  anomalies — these are physical quantities without the rainfall jump, but they carry
  their own reanalysis inhomogeneity risk and are flagged as such;
* the *previous* year's onset, which is fully observed by then;
* ONI DJF (centred on January) and ONI FMA (centred on March), and DMI averaged over
  Feb–Mar — nothing from April onwards;
* the district centroid, which is not time dependent.

Every weather feature is an anomaly, and the climatology it is measured against is built
inside one backtest fold. :class:`FoldClimatology` holds that fold's training years and
refuses targets outside the fold; for a *training* row it also drops that row's own year
from the baseline, so no year — test or train — ever informs the mean it is compared to.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date

import numpy as np
import pandas as pd

ISSUE_MONTH, ISSUE_DAY = 4, 25
PRE_START = (3, 1)
PRE_END = (4, 20)

RAIN = "PRECTOTCORR"
#: POWER columns read for the pre-monsoon window, and how each one is summarised.
WEATHER_VARS = {
    "t2m": ("T2M", "mean"),
    "t2m_max": ("T2M_MAX", "mean"),
    "rh2m": ("RH2M", "mean"),
}
#: Root-zone moisture is read at the end of the window, not averaged across it.
SOIL = "GWETROOT"
SOIL_END_DAYS = 5
RAIN_KEY = "rain"
SCALAR_KEYS = [RAIN_KEY, *WEATHER_VARS, "gwetroot_eow"]

FEATURE_NAMES = [
    "rain_anom_mar_apr",
    "t2m_anom",
    "t2m_max_anom",
    "rh2m_anom",
    "gwetroot_eow_anom",
    "prior_onset_doy",
    "oni_djf",
    "oni_fma",
    "dmi_feb_mar",
    "lat",
    "lon",
]

#: Plain wording for the card, keyed by feature name.
FEATURE_LABELS_EN = {
    "rain_anom_mar_apr": "pre-monsoon rain (1 Mar – 20 Apr) above or below this district's normal",
    "t2m_anom": "pre-monsoon mean temperature against normal",
    "t2m_max_anom": "pre-monsoon daily maximum temperature against normal",
    "rh2m_anom": "pre-monsoon humidity against normal",
    "gwetroot_eow_anom": "root-zone soil wetness at the end of the window against normal",
    "prior_onset_doy": "when last season's rains started",
    "oni_djf": "El Niño / La Niña state in Dec–Feb",
    "oni_fma": "El Niño / La Niña state in Feb–Apr",
    "dmi_feb_mar": "Indian Ocean Dipole in Feb–Mar",
    "lat": "how far north the district is",
    "lon": "how far east the district is",
}

#: The same wording in Bangla. Digits stay Latin, as everywhere else in the UI.
FEATURE_LABELS_BN = {
    "rain_anom_mar_apr": "পূর্ব-মৌসুমি বৃষ্টি (1 মার্চ – 20 এপ্রিল) এই জেলার গড়ের তুলনায় কম-বেশি",
    "t2m_anom": "পূর্ব-মৌসুমি গড় তাপমাত্রা গড়ের তুলনায়",
    "t2m_max_anom": "পূর্ব-মৌসুমি সর্বোচ্চ তাপমাত্রা গড়ের তুলনায়",
    "rh2m_anom": "পূর্ব-মৌসুমি আর্দ্রতা গড়ের তুলনায়",
    "gwetroot_eow_anom": "মৌসুম-শুরুর সময় শেষে মাটির আর্দ্রতা গড়ের তুলনায়",
    "prior_onset_doy": "গত মৌসুমে বৃষ্টি কবে শুরু হয়েছিল",
    "oni_djf": "ডিসে–ফেব্রে এল নিনো / লা নিনার অবস্থা",
    "oni_fma": "ফেব্রে–এপ্রিলে এল নিনো / লা নিনার অবস্থা",
    "dmi_feb_mar": "ফেব্রু–মার্চে ইন্ডিয়ান ওশান ডাইপোল",
    "lat": "জেলাটি কতটা উত্তরে",
    "lon": "জেলাটি কতটা পূর্বে",
}


class LeakageError(ValueError):
    """Raised when a fold would let a year inform the baseline it is scored against."""


@dataclass(frozen=True)
class District:
    slug: str
    name: str
    lat: float
    lon: float


@dataclass(frozen=True)
class FoldClimatology:
    """The training years of one leave-one-year-out fold, plus their window scalars."""

    test_year: int
    train_years: tuple[int, ...]
    scalars: pd.DataFrame

    @property
    def means(self) -> pd.Series:
        """Climatology over the fold's training years — the baseline for the test year."""
        return self._pool(self.train_years)

    def baseline_for(self, year: int) -> pd.Series:
        """The climatology `year` may be compared against, never including itself."""
        if year == self.test_year:
            return self.means
        if year in self.train_years:
            return self._pool(tuple(y for y in self.train_years if y != year))
        raise LeakageError(f"year {year} belongs to no part of fold {self.test_year}")

    def _pool(self, years: tuple[int, ...]) -> pd.Series:
        subset = self.scalars.loc[[y for y in years if y in self.scalars.index]]
        if subset.empty:
            raise LeakageError("climatology needs at least one training year with window data")
        means = subset.mean()
        if means.isna().all():
            raise LeakageError("every training-year window is missing — no climatology to build")
        return means


def window_bounds(year: int) -> tuple[pd.Timestamp, pd.Timestamp]:
    return pd.Timestamp(date(year, *PRE_START)), pd.Timestamp(date(year, *PRE_END))


def pre_window_scalars(power: pd.DataFrame, years: list[int], rain: pd.Series | None = None) -> pd.DataFrame:
    """Summarise 1 Mar – 20 Apr of each year: one row per year.

    `rain` is a daily mm series (CHIRPS in the shipped model, POWER PRECTOTCORR in the
    2001–2025 variant); when it is given it replaces the POWER rainfall column.

    A year is NaN when its window is incomplete or any day inside it is missing, so a
    point with a gap cannot borrow a climatology built from fuller windows.
    """
    rows: dict[int, dict[str, float]] = {}
    for year in years:
        lo, hi = window_bounds(year)
        slice_ = power.loc[lo:hi]
        expected = (hi - lo).days + 1
        complete = len(slice_) == expected
        limit = expected if complete else -1
        scalars: dict[str, float] = {key: _summarise(slice_, column, how, limit) for key, (column, how) in WEATHER_VARS.items()}
        if rain is None:
            scalars[RAIN_KEY] = _summarise(slice_, RAIN, "sum", limit)
        else:
            scalars[RAIN_KEY] = _summarise_series(rain.loc[lo:hi], limit)
        tail = slice_[SOIL].astype(float).tail(SOIL_END_DAYS) if SOIL in slice_.columns and complete else None
        scalars["gwetroot_eow"] = (
            float(tail.mean())
            if tail is not None and len(tail) == SOIL_END_DAYS and not tail.isna().any()
            else float("nan")
        )
        rows[year] = scalars
    return pd.DataFrame.from_dict(rows, orient="index").sort_index()


def _summarise(slice_: pd.DataFrame, column: str, how: str, expected_days: int) -> float:
    if column not in slice_.columns or len(slice_) != expected_days:
        return float("nan")
    values = slice_[column].astype(float)
    if values.isna().any():
        return float("nan")
    return float(values.sum()) if how == "sum" else float(values.mean())


def _summarise_series(values: pd.Series | None, expected_days: int) -> float:
    if values is None or len(values) != expected_days:
        return float("nan")
    numbers = values.astype(float)
    return float(numbers.sum()) if not numbers.isna().any() else float("nan")


def fold_climatology(scalars: pd.DataFrame, test_year: int, train_years: list[int]) -> FoldClimatology:
    """Declare the fold. Overlapping train and test years is a leakage error."""
    years = tuple(int(y) for y in train_years)
    if test_year in years:
        raise LeakageError(f"target year {test_year} is also in the climatology training set")
    if not years:
        raise LeakageError("a fold needs at least one training year")
    return FoldClimatology(test_year=int(test_year), train_years=years, scalars=scalars)


def features_from_scalars(
    clim: FoldClimatology,
    district: District,
    target_years: list[int],
    onsets: pd.Series,
    oni: pd.DataFrame,
    dmi: pd.DataFrame,
) -> pd.DataFrame:
    """Anomaly features for `target_years` inside the fold `clim` describes.

    `onsets` is indexed by year and may hold any year; only ``year - 1`` is read, which
    is fully observed before the 25 April issue date.
    """
    rows: list[dict[str, object]] = []
    for year in target_years:
        baseline = clim.baseline_for(year)  # refuses any year that is not part of this fold
        if year not in clim.scalars.index:
            continue
        window = clim.scalars.loc[year]
        prior = onsets.get(year - 1, float("nan")) if onsets is not None else float("nan")
        rows.append(
            {
                "year": int(year),
                "district": district.slug,
                "rain_anom_mar_apr": _anomaly(window.get(RAIN_KEY), baseline.get(RAIN_KEY)),
                "t2m_anom": _anomaly(window.get("t2m"), baseline.get("t2m")),
                "t2m_max_anom": _anomaly(window.get("t2m_max"), baseline.get("t2m_max")),
                "rh2m_anom": _anomaly(window.get("rh2m"), baseline.get("rh2m")),
                "gwetroot_eow_anom": _anomaly(window.get("gwetroot_eow"), baseline.get("gwetroot_eow")),
                "prior_onset_doy": _finite(prior),
                "oni_djf": oni_centre(oni, year, 1),
                "oni_fma": oni_centre(oni, year, 3),
                "dmi_feb_mar": dmi_mean(dmi, year),
                "lat": float(district.lat),
                "lon": float(district.lon),
            }
        )
    frame = pd.DataFrame.from_records(rows)
    if frame.empty:
        return pd.DataFrame(columns=["year", "district", *FEATURE_NAMES])
    return frame[["year", "district", *FEATURE_NAMES]]


def make_features(
    power: pd.DataFrame,
    district: District,
    target_years: list[int],
    train_years: list[int],
    onsets: pd.Series,
    oni: pd.DataFrame,
    dmi: pd.DataFrame,
    test_year: int | None = None,
    rain: pd.Series | None = None,
) -> pd.DataFrame:
    """Convenience wrapper: window scalars -> fold climatology -> features.

    `test_year` defaults to the first target year, which is what a single-year outlook
    call wants; a backtest passes it explicitly so training rows keep their own guard.
    """
    overlap = sorted(set(target_years) & set(train_years))
    if overlap and test_year is None:
        raise LeakageError(f"target year(s) {overlap} are also in the climatology training set")
    holdout = int(test_year if test_year is not None else target_years[0])
    all_years = sorted(set(target_years) | set(train_years) | {holdout})
    scalars = pre_window_scalars(power, all_years, rain=rain)
    clim = fold_climatology(scalars, holdout, train_years)
    return features_from_scalars(clim, district, target_years, onsets, oni, dmi)


def _anomaly(value: object, baseline: object) -> float:
    value, baseline = _finite(value), _finite(baseline)
    if np.isnan(value) or np.isnan(baseline):
        return float("nan")
    return float(value - baseline)


def _finite(value: object) -> float:
    if value is None:
        return float("nan")
    try:
        number = float(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return float("nan")
    return number if np.isfinite(number) else float("nan")


def oni_centre(oni: pd.DataFrame, year: int, centre_month: int) -> float:
    """ONI is a 3-month running mean indexed by its centre month, so Jan == DJF, Mar == FMA."""
    column = oni.columns[0]
    stamp = pd.Timestamp(year=year, month=centre_month, day=1)
    if stamp not in oni.index:
        return float("nan")
    return _finite(oni[column].loc[stamp])


def dmi_mean(dmi: pd.DataFrame, year: int, months: tuple[int, ...] = (2, 3)) -> float:
    """Mean DMI over `months`; NaN unless every month is published.

    The default stops at March: the outlook is issued on 25 April, so April's value does
    not exist yet when a prediction has to be made.
    """
    column = dmi.columns[0]
    values = [
        _finite(dmi[column].loc[stamp])
        for stamp in (pd.Timestamp(year=year, month=m, day=1) for m in months)
        if stamp in dmi.index
    ]
    if len(values) != len(months) or any(np.isnan(v) for v in values):
        return float("nan")
    return float(np.mean(values))

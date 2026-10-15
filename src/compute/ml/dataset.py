"""Inputs for each onset-model variant, built from the two NASA rainfall sources.

Two variants are trained and reported side by side:

``imerg`` (the shipped arm)
    Labels and the rainfall feature come from NASA/JAXA GPM IMERG V07 daily rainfall (via
    NASA POWER), on every complete year IMERG covers (1998–2025). IMERG is a satellite
    product intercalibrated across the TRMM and GPM eras; its annual totals at the demo points
    show no reanalysis-style step, so a 28-year anomaly climatology is meaningful.

``power`` (the restricted arm)
    Labels and the rainfall feature come from NASA POWER PRECTOTCORR, on 2001–2025 only.
    POWER's PRECTOTCORR is not homogeneous over the full record — measured at Tangail the
    annual total averages 937 mm in 1981–1996, 1714 mm in 1997–2015 and 2814 mm in
    2016–2025 — so the early segment is excluded rather than silently mixed in.

Both arms take temperature, humidity and root-zone moisture from POWER, as anomalies
against their own fold climatology; those variables carry their own inhomogeneity risk,
which the doc and the payload state rather than hide.
"""

from __future__ import annotations

from dataclasses import dataclass, field

import pandas as pd

from src.compute import onset as onset_mod
from src.compute.ml import features as F

#: Years whose POWER PRECTOTCORR is treated as comparable (see the module docstring).
POWER_FIRST_YEAR = 2001
#: First complete IMERG year in the POWER store.
IMERG_FIRST_YEAR = 1998
SOURCE_NAMES = {
    "imerg": "NASA/JAXA GPM IMERG V07 (via NASA POWER)",
    "power": "NASA POWER PRECTOTCORR (MERRA-2), 2001–2025 only",
}
VARIANTS = tuple(SOURCE_NAMES)


@dataclass(frozen=True)
class Point:
    """One place the outlook is produced for: a district centroid or a demo farm."""

    key: str
    label: str
    lat: float
    lon: float
    kind: str  # "district" | "farm"
    #: For a farm, the district whose onset history and baseline it sits in.
    clim_key: str = ""

    def __post_init__(self) -> None:
        if self.kind == "district" and not self.clim_key:
            object.__setattr__(self, "clim_key", self.key)

    def district(self) -> F.District:
        return F.District(self.key, self.label, self.lat, self.lon)


@dataclass
class Variant:
    """One arm of the comparison: features, labels and the years it may use."""

    name: str
    points: list[Point]
    scalars: dict[str, pd.DataFrame]
    labels: dict[str, pd.Series]
    years: list[int]
    trainable: set[str]
    #: The IMERG grid cell actually used per point, so 0.1° can be stated honestly.
    cells: dict[str, tuple[float, float]] = field(default_factory=dict)

    @property
    def source(self) -> str:
        return SOURCE_NAMES[self.name]


def onset_labels(rainfall: pd.Series, first_year: int) -> pd.Series:
    """Observed onsets per year under the v2 rule, from `first_year` onwards."""
    onsets = onset_mod.onset_series(rainfall.astype(float))
    return onsets[onsets.index >= int(first_year)].dropna()


def build_variant(
    name: str,
    points: list[Point],
    power: dict[str, pd.DataFrame],
    satellite: dict[str, pd.Series],
    outlook_year: int,
) -> Variant:
    """Window scalars and onset labels for one arm of the comparison.

    The window is summarised for the label years *and* `outlook_year`; the outlook year is
    never labelled here, because that is the answer rather than an input.
    """
    if name not in VARIANTS:
        raise ValueError(f"unknown variant {name!r} (one of {VARIANTS})")
    from_satellite = name == "imerg"
    floor = IMERG_FIRST_YEAR if from_satellite else POWER_FIRST_YEAR

    labels: dict[str, pd.Series] = {}
    for point in points:
        # A farm has no onset record of its own: it borrows the district it sits in.
        source_key = point.key if point.kind == "district" else point.clim_key
        series = satellite.get(source_key) if from_satellite else power.get(source_key, pd.DataFrame()).get(F.RAIN)
        if series is None or len(series) == 0:
            continue
        labels[point.key] = onset_labels(series, floor)

    label_years = sorted({int(year) for series in labels.values() for year in series.index if int(year) < outlook_year})
    window_years = sorted({*label_years, outlook_year})

    scalars: dict[str, pd.DataFrame] = {}
    used: list[Point] = []
    for point in points:
        frame = power.get(point.key)
        if frame is None or point.key not in labels:
            continue
        rain = satellite.get(point.key) if from_satellite else None
        scalars[point.key] = F.pre_window_scalars(frame, window_years, rain=rain)
        used.append(point)

    return Variant(
        name=name,
        points=used,
        scalars=scalars,
        labels=labels,
        years=label_years,
        trainable={point.key for point in used if point.kind == "district"},
    )


def year_pool(variant: Variant, share: float = 0.5) -> list[int]:
    """Years at least `share` of the trainable points have a labelled onset for.

    A year only a couple of districts reach would make a fold's test set tiny and its
    skill figure meaningless, so those years are left out and said so. At least two points
    must reach a year, so a single district never carries a fold alone.
    """
    points = [key for key in variant.trainable if key in variant.scalars]
    if not points:
        return []
    needed = max(2, round(share * len(points)))
    pool: list[int] = []
    for year in variant.years:
        labelled = sum(1 for key in points if year in variant.labels[key].index)
        if labelled >= needed:
            pool.append(year)
    return pool

import outlookJson from "../public/data/onset_outlook.json";

/**
 * The outlook the offline build wrote into web/public/data/onset_outlook.json.
 * The browser reads a statement about a model; it does not run the model.
 */
export type OutlookStatus = "shipped" | "experimental";

export interface FeatureContribution {
  feature: string;
  label_en: string;
  label_bn: string;
  effect_days: number;
}

export interface OutlookRow {
  key: string;
  kind: "district" | "farm";
  label: string;
  lat: number;
  lon: number;
  predicted_doy: number | null;
  predicted_date: string | null;
  interval_low_doy: number | null;
  interval_low_date: string | null;
  interval_high_doy: number | null;
  interval_high_date: string | null;
  climatology_doy: number | null;
  climatology_date: string | null;
  vs_climatology_days: number | null;
  top_contributions: FeatureContribution[];
  observed_doy: number | null;
  observed_date: string | null;
  observed_note: string;
}

export interface OutlookMetrics {
  mae_model_days: number | null;
  mae_clim_days: number | null;
  skill: number | null;
  rmse_days: number | null;
  coverage: number | null;
  n_district_years: number | null;
  n_years: number | null;
  years_beating_climatology: number | null;
  share_years_beating_climatology: number | null;
  n_district_years_vs_clim2: number | null;
  /** Skill against the district's own mean of two and three seasons back. */
  mae_clim2_days: number | null;
  skill_vs_clim2: number | null;
  /** Skill against last season's onset itself — the rule a farmer needs no model for. */
  mae_lag1_days: number | null;
  skill_vs_lag1: number | null;
  n_missing_prior: number | null;
  /** The same decision the top-level status reports, per arm. */
  status?: OutlookStatus;
}

export interface VariantRecord {
  source: string;
  training_years: { start: number; end: number; count: number } | null;
  districts: number;
  folds: number;
  metrics: OutlookMetrics;
  top_features: string[];
}

export interface OnsetOutlook {
  model_version: string;
  status: OutlookStatus;
  issue_date: string;
  outlook_year: number;
  trained_on: { start: number; end: number; years: number };
  built_at_utc: string;
  model_trained_at_utc: string;
  quantile_interval: { low: number; high: number };
  contribution_method: string;
  data_sources: Record<string, { name: string; retrieved_utc: string }>;
  metrics: OutlookMetrics;
  backtest: string;
  features: string[];
  label_note: string;
  onset_rule?: string;
  issue_before_onset?: string;
  farm_district_note?: string;
  district_count?: number;
  observed_notes?: Record<string, string>;
  /** How the outlook year's prediction actually compared to the onsets already observed
   * there — one season, so it is a check rather than a skill claim. */
  out_of_sample?: {
    districts_compared: number;
    mae_model_days: number;
    bias_days: number;
    mae_clim_days: number | null;
    interval_hits: number;
    note: string;
  };
  /** The 0.25° CHIRPS cell actually read for each point — not a station, so it is stated. */
  chirps_cells?: Record<string, { lat: number; lon: number }>;
  sources: {
    labels: string;
    rainfall_feature: string;
    weather_features: string;
    indices: string;
    power_rainfall_excluded?: string;
    power_weather_note?: string;
    chirps_grid?: string;
    chirps_retrieved?: Record<string, string>;
  };
  variants: Record<string, VariantRecord>;
  districts: OutlookRow[];
  farms: OutlookRow[];
}

/** The outlook built offline, imported statically so the page never fetches it at runtime. */
export const OUTLOOK = outlookJson as unknown as OnsetOutlook;

/** The rule the build applies, restated here so the UI cannot claim more than the code means. */
export const statusForSkill = (skill: number | null): OutlookStatus =>
  skill !== null && Number.isFinite(skill) && skill > 0 ? "shipped" : "experimental";

export const beatsClimatology = (outlook: OnsetOutlook): boolean => outlook.status === "shipped";

/** A number the build could not compute arrives as null, never as NaN. */
export const num = (value: number | null, digits = 1): string | null =>
  value === null || !Number.isFinite(value) ? null : value.toFixed(digits);

/** Signed day difference: "+3" or "−4", never a bare minus from float formatting. */
export const signedDays = (value: number | null): string | null => {
  if (value === null || !Number.isFinite(value)) return null;
  const rounded = Math.round(value);
  return `${rounded > 0 ? "+" : rounded < 0 ? "−" : ""}${Math.abs(rounded)}`;
};

const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_BN = ["জানু", "ফেব্রু", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগ", "সেপ্ট", "অক্টো", "নভে", "ডিসে"];
/** "2026-05-23" → "23 May 2026" in English, "23 মে 2026" in Bangla — Latin digits either way. */
export const outlookDate = (
  iso: string | null,
  lang: "en" | "bn" = "en",
  withYear = true,
): string | null => {
  if (!iso) return null;
  const [year, month, day] = iso.split("-");
  if (!year || !month || !day) return iso;
  const months = lang === "bn" ? MONTHS_BN : MONTHS_EN;
  const label = months[Number(month) - 1] ?? month;
  return withYear ? `${Number(day)} ${label} ${year}` : `${Number(day)} ${label}`;
};

export const outlookForFarm = (farmId: string): OutlookRow | undefined =>
  OUTLOOK.farms.find((row) => row.key === farmId);

export const outlookForDistrict = (slug: string): OutlookRow | undefined =>
  OUTLOOK.districts.find((row) => row.key === slug);

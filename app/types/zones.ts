import type { GeoJsonFeature, GeoJsonFeatureCollection, GeoJsonPolygon } from "./geojson";

// Mirrors titiktemu-backend's src/types/analytics.ts / services -- the
// shapes GET /api/zones, /api/zones/lookup and /api/reallocation return.

export type ZoneProperties = {
  grid_id: string;
  district_name: string | null;
  kecamatan: string | null;
  poi_count: number | null;
  ews_code: number | null;
  vulnerability_index: number | null;
  matching_score: number | null;
};

export type ZoneFeature = GeoJsonFeature<ZoneProperties, GeoJsonPolygon>;
export type ZoneFeatureCollection = GeoJsonFeatureCollection<ZoneProperties, GeoJsonPolygon>;

export type ZoneColor = "green" | "yellow" | "red";
export type ZoneLabel = "aman" | "waspada" | "bahaya";

// One figure per batch run (not per grid cell) -- every EWS classification
// and matching_score in a run comes from the same fitted XGBoost model.
// This is the leave-one-out cross-validated accuracy against REAL, measured
// UMKM survey data (n real points) -- not the XGBoost/GWR surface-fit
// number, which the backend deliberately doesn't expose (near-100% by
// construction, not a real-world accuracy figure). confidence_level is
// derived from `n`, not from accuracy_pct -- don't re-derive it here.
//
// accuracy_pct is ORDINAL/adjacent-tier-tolerant: aman/waspada/bahaya is an
// ordered risk scale, so a one-tier miss (e.g. real waspada predicted as
// bahaya) counts as correct while a two-tier aman<->bahaya miss does not.
// exact_match_accuracy_pct is the stricter, untolerant figure -- both real,
// both LOOCV-validated against the same survey data, just scored
// differently. Nullable since rows from before this distinction existed
// won't have them.
export type ConfidenceLevel = "high" | "moderate" | "low";
export type ModelAccuracy = {
  accuracy_pct: number;
  n: number;
  ci_95_low_pct: number;
  ci_95_high_pct: number;
  confidence_level: ConfidenceLevel;
  exact_match_accuracy_pct: number | null;
  opposite_extreme_error_pct: number | null;
  computed_at: string;
};

export type ZoneDetail = {
  grid_id: string;
  district_name: string | null;
  ews_code: number;
  zone_color: ZoneColor;
  zone_label: ZoneLabel;
  vulnerability_index: number;
  matching_score: number;
  narrative: string | null;
  recommendation_type: string | null;
  model_accuracy: ModelAccuracy | null;
};

export type ReallocationCandidate = {
  rank: number;
  recommended_grid_id: string;
  recommended_district: string | null;
  distance_m: number;
  matching_score: number;
  crossed_district: boolean;
  recommended_feature: ZoneFeature;
};

export type ReallocationResult = {
  found: boolean;
  eligible: boolean;
  zone: ZoneDetail | null;
  candidates: ReallocationCandidate[];
  message?: string;
};

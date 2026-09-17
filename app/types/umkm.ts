import type { ZoneColor, ZoneLabel } from "./zones";

// Mirrors titiktemu-backend's src/repositories/index.ts UmkmBusiness --
// real survey rows (see titiktemu-analytics' umkm_businesses table),
// never fabricated fields. Deliberately has NO raw rent/revenue --
// `reference_price_per_txn_idr` is the only price signal, a single real
// reference value, not a fabricated min-max range.
export type UmkmBusiness = {
  id: string;
  name: string | null;
  category: string | null;
  grid_id: string;
  district_name: string | null;
  kecamatan: string | null;
  latitude: number;
  longitude: number;
  dist_to_station_m: number | null;
  reference_price_per_txn_idr: number | null;
  data_confidence: number | null;
  source: string;
  ews_code: number | null;
  vulnerability_index: number | null;
  matching_score: number | null;
  zone_color: ZoneColor | null;
  zone_label: ZoneLabel | null;
};

// category here means the real tenant-type value the analytics pipeline
// actually populates on umkm_businesses.category (verified directly
// against the live database) -- there is no food/retail/service-style
// "business category" column anywhere in the real data, so don't invent
// one; this is genuinely what's filterable.
export type UmkmTenantCategory =
  | "umkm_tetap"
  | "umkm_seasonal"
  | "franchise_tetap"
  | "franchise_seasonal";

export type UmkmListFilters = {
  district?: string;
  search?: string;
  ews_code?: number;
  category?: UmkmTenantCategory;
  min_price?: number;
  max_price?: number;
  max_dist_m?: number;
  limit?: number;
  offset?: number;
};

export type UmkmListResult = {
  rows: UmkmBusiness[];
  total: number;
};

// Mirrors titiktemu-analytics' compute_dashboard_metrics() output (see
// that repo's src/persistence/dashboard_metrics.py) -- passed through
// as-is by the backend's /api/dashboard-summary, so this type only
// documents the fields this frontend actually reads.
export type DashboardSummary = {
  total_grid_cells: number;
  danger_zone_count: number;
  moderate_zone_count: number;
  safe_zone_count: number;
  danger_zone_pct: number;
  avg_vulnerability_index: number;
  avg_matching_score: number;
  ews_validation_accuracy_pct: number | null;
  ews_validation_n: number | null;
  confidence_level: "high" | "moderate" | "low" | null;
  by_district: Record<string, { danger: number; moderate: number; safe: number }>;
  tenants_needing_reallocation: number;
  total_tenants_tracked: number;
  computed_at: string;
};

export type PolicyRecommendation = {
  grid_id: string;
  district_name: string | null;
  narrative: string;
  recommendation_type: "mitigasi" | "realokasi" | "pemantauan";
  vulnerability_index: number;
  generated_at: string;
};

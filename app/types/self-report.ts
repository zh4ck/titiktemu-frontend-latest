// Mirrors titiktemu-backend's new `umkm_self_reports` resource
// (POST/GET /api/umkm-self-reports). Field names/shapes are chosen to line
// up with what titiktemu-analytics' survey ingestion actually consumes
// (src/ingestion/umkm_survey.py: tenant_type, revenue_per_month,
// transaction_per_day high/normal/low split, rent amount+period,
// rent_expiry_date, transaction_per_buyer, rent_trend) rather than the
// old self-tracker form's made-up fields (rentangHarga band, free-text
// titikLokasi) -- see app/modules/umkm-self-tracker/self-tracker-form.tsx.

export type TenantType = "umkm_tetap" | "umkm_seasonal" | "franchise_tetap" | "franchise_seasonal";
export type RentPeriodUnit = "hari" | "bulan" | "tahun";
export type SelfReportStatus = "pending" | "reviewed" | "exported";

export type UmkmSelfReport = {
  id: string;
  submitted_by: string | null;
  business_name: string;
  description: string | null;
  tenant_type: TenantType | null;
  latitude: number;
  longitude: number;
  tenant_area_m2: number | null;
  target_market: string | null;
  rent_price_amount: number | null;
  rent_period_unit: RentPeriodUnit | null;
  rent_expiry_date: string | null;
  revenue_per_month_idr: number | null;
  txn_high_idr: number | null;
  txn_normal_idr: number | null;
  txn_low_idr: number | null;
  transaction_per_buyer_idr: number | null;
  rent_trend_pct: number | null;
  status: SelfReportStatus;
  created_at: string;
  updated_at: string;
};

export type UmkmSelfReportInput = {
  business_name: string;
  latitude: number;
  longitude: number;
  description?: string;
  tenant_type?: TenantType;
  tenant_area_m2?: number;
  target_market?: string;
  rent_price_amount?: number;
  rent_period_unit?: RentPeriodUnit;
  rent_expiry_date?: string;
  revenue_per_month_idr?: number;
  txn_high_idr?: number;
  txn_normal_idr?: number;
  txn_low_idr?: number;
  transaction_per_buyer_idr?: number;
  rent_trend_pct?: number;
};

export type UmkmSelfReportListResult = {
  rows: UmkmSelfReport[];
  total: number;
};

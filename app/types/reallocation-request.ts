// Mirrors titiktemu-backend's new `reallocation_requests` resource
// (POST/GET /api/reallocation-requests, PATCH /api/reallocation-requests/:id).
// A UMKM user, after seeing /api/reallocation candidates for their own
// location, picks ONE candidate to formally request relocating to; an
// operator then approves/rejects it. Deliberately NOT named "Laporan
// Alokasi" anywhere -- that name is already used by the existing read-only
// AI policy-recommendations page (see app/modules/laporan-alokasi).

export type ReallocationRequestStatus = "pending" | "approved" | "rejected";

export type ReallocationRequest = {
  id: string;
  submitted_by: string | null;
  origin_grid_id: string;
  requested_grid_id: string;
  requested_district: string | null;
  distance_m: number | null;
  matching_score: number | null;
  note: string | null;
  status: ReallocationRequestStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ReallocationRequestInput = {
  origin_grid_id: string;
  requested_grid_id: string;
  requested_district?: string | null;
  distance_m?: number | null;
  matching_score?: number | null;
  note?: string | null;
};

export type ReallocationRequestListResult = {
  rows: ReallocationRequest[];
  total: number;
};

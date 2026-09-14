import type {
  ModelAccuracy,
  ReallocationResult,
  ZoneDetail,
  ZoneFeatureCollection,
} from "@/app/types/zones";
import type { ChatMessage, ChatResponse, ChatRole } from "@/app/types/chat";
import type {
  DashboardSummary,
  PolicyRecommendation,
  UmkmBusiness,
  UmkmListFilters,
  UmkmListResult,
} from "@/app/types/umkm";
import type {
  ReallocationRequest,
  ReallocationRequestInput,
  ReallocationRequestListResult,
  ReallocationRequestStatus,
} from "@/app/types/reallocation-request";
import type {
  UmkmSelfReport,
  UmkmSelfReportInput,
  UmkmSelfReportListResult,
} from "@/app/types/self-report";
import { createClient } from "@/app/lib/supabase/client";

export async function apiFetch<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<T> {
  const {
    data: { session },
  } = await createClient().auth.getSession();

  const headers = new Headers(init?.headers);
  if (session?.access_token) {
    headers.set("Authorization", `Bearer ${session.access_token}`);
  }

  const response = await fetch(input, { ...init, headers });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export function fetchZones(): Promise<ZoneFeatureCollection> {
  return apiFetch<ZoneFeatureCollection>(`${API_URL}/api/zones`);
}

export function fetchZoneLookup(lat: number, lng: number): Promise<ZoneDetail | null> {
  return apiFetch<ZoneDetail | null>(
    `${API_URL}/api/zones/lookup?lat=${lat}&lng=${lng}`,
  ).catch((error: Error) => {
    // The backend returns 404 for a location outside the study area --
    // treat that as "no zone here" rather than an app-breaking error.
    if (error.message.includes("404")) return null;
    throw error;
  });
}

export function fetchReallocation(lat: number, lng: number): Promise<ReallocationResult> {
  return apiFetch<ReallocationResult>(
    `${API_URL}/api/reallocation?lat=${lat}&lng=${lng}`,
  );
}

export function fetchModelAccuracy(): Promise<ModelAccuracy | null> {
  return apiFetch<ModelAccuracy>(`${API_URL}/api/model-accuracy`).catch((error: Error) => {
    // 404 means the analytics batch pipeline hasn't run yet -- no accuracy
    // to show, not an app-breaking error.
    if (error.message.includes("404")) return null;
    throw error;
  });
}

export function fetchUmkmList(filters: UmkmListFilters = {}): Promise<UmkmListResult> {
  const params = new URLSearchParams();
  if (filters.district) params.set("district", filters.district);
  if (filters.search) params.set("search", filters.search);
  if (filters.ews_code !== undefined) params.set("ews_code", String(filters.ews_code));
  if (filters.limit !== undefined) params.set("limit", String(filters.limit));
  if (filters.offset !== undefined) params.set("offset", String(filters.offset));
  return apiFetch<UmkmListResult>(`${API_URL}/api/umkm?${params.toString()}`);
}

export function fetchUmkmDetail(id: string): Promise<UmkmBusiness | null> {
  return apiFetch<UmkmBusiness>(`${API_URL}/api/umkm/${id}`).catch((error: Error) => {
    if (error.message.includes("404")) return null;
    throw error;
  });
}

export function fetchDashboardSummary(): Promise<DashboardSummary | null> {
  return apiFetch<DashboardSummary>(`${API_URL}/api/dashboard-summary`).catch((error: Error) => {
    if (error.message.includes("404")) return null;
    throw error;
  });
}

export function fetchPolicyRecommendations(recommendationType?: string): Promise<PolicyRecommendation[]> {
  const params = recommendationType ? `?recommendation_type=${recommendationType}` : "";
  return apiFetch<PolicyRecommendation[]>(`${API_URL}/api/policy-recommendations${params}`);
}

export function submitReallocationRequest(
  input: ReallocationRequestInput,
): Promise<ReallocationRequest> {
  return apiFetch<ReallocationRequest>(`${API_URL}/api/reallocation-requests`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export function fetchReallocationRequests(
  status?: ReallocationRequestStatus,
): Promise<ReallocationRequestListResult> {
  const params = status ? `?status=${status}` : "";
  return apiFetch<ReallocationRequestListResult>(`${API_URL}/api/reallocation-requests${params}`);
}

export function reviewReallocationRequest(
  id: string,
  status: Extract<ReallocationRequestStatus, "approved" | "rejected">,
): Promise<ReallocationRequest> {
  return apiFetch<ReallocationRequest>(`${API_URL}/api/reallocation-requests/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
}

export function submitUmkmSelfReport(input: UmkmSelfReportInput): Promise<UmkmSelfReport> {
  return apiFetch<UmkmSelfReport>(`${API_URL}/api/umkm-self-reports`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export function fetchUmkmSelfReports(): Promise<UmkmSelfReportListResult> {
  return apiFetch<UmkmSelfReportListResult>(`${API_URL}/api/umkm-self-reports`);
}

export function sendChatMessage(
  message: string,
  role: ChatRole,
  history: ChatMessage[],
): Promise<ChatResponse> {
  return apiFetch<ChatResponse>(`${API_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, role, history }),
  });
}

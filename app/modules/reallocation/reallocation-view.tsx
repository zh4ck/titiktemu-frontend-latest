"use client";

// UMKM-facing "Lihat Realokasi" view (TODO: "Add view reallocation for the
// user"). Distinct from app/modules/tenant-matching (operator-only, picks
// among MANY at-risk UMKM businesses) -- this page is scoped to the signed-in
// UMKM user's OWN real geolocated position only. Lets them review candidate
// safe zones and submit a reallocation request for operator review (see
// app/hooks/use-reallocation-requests.ts -- a separate resource from the
// existing read-only "Laporan Alokasi" policy-recommendations page).

import Link from "next/link";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Badge } from "@/app/components/ui/badge";
import { ConfidenceBadge } from "@/app/components/ui/confidence-badge";
import { Skeleton } from "@/app/components/ui/skeleton";
import { MapLegend } from "@/app/components/map/map-legend";
import { useCurrentLocation } from "@/app/hooks/use-current-location";
import { useReallocation } from "@/app/hooks/use-reallocation";
import { useSubmitReallocationRequest } from "@/app/hooks/use-reallocation-requests";
import { useZoneLookup } from "@/app/hooks/use-zone-lookup";
import { regionLabel } from "@/app/lib/format";
import type { ReallocationCandidate, ZoneLabel } from "@/app/types/zones";

const LeafletMap = dynamic(
  () => import("@/app/components/map/leaflet-map").then((mod) => mod.LeafletMap),
  { ssr: false },
);
const ReallocationLayer = dynamic(
  () => import("@/app/components/map/reallocation-layer").then((mod) => mod.ReallocationLayer),
  { ssr: false },
);

const ZONE_BADGE_VARIANT: Record<ZoneLabel, "secondary" | "default" | "primary"> = {
  aman: "secondary",
  waspada: "default",
  bahaya: "primary",
};

function candidateLabel(candidate: ReallocationCandidate): string {
  return regionLabel(candidate.recommended_district);
}

export default function ReallocationView() {
  const searchParams = useSearchParams();
  const { location, status: locationStatus } = useCurrentLocation();
  const { data: zone, isLoading: isZoneLoading } = useZoneLookup(location);
  const isEligibleForLookup = !!zone && zone.ews_code === 2;
  const { data: reallocation, isLoading: isReallocationLoading } = useReallocation(
    location,
    isEligibleForLookup,
  );

  // Deep-linked from a specific card (e.g. Beranda's Rekomendasi Alokasi
  // "Lihat Realokasi" button) -- pre-selects that candidate instead of
  // defaulting to rank 1.
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(
    () => searchParams.get("candidate"),
  );
  const [note, setNote] = useState("");
  const submitRequest = useSubmitReallocationRequest();

  const selectedCandidate: ReallocationCandidate | null = useMemo(
    () =>
      reallocation?.candidates.find((c) => c.recommended_grid_id === selectedCandidateId) ??
      reallocation?.candidates[0] ??
      null,
    [reallocation, selectedCandidateId],
  );

  function handleSubmit() {
    if (!zone || !selectedCandidate) return;
    submitRequest.mutate({
      origin_grid_id: zone.grid_id,
      requested_grid_id: selectedCandidate.recommended_grid_id,
      requested_district: selectedCandidate.recommended_district,
      distance_m: selectedCandidate.distance_m,
      matching_score: selectedCandidate.matching_score,
      note: note.trim() || undefined,
    });
  }

  return (
    <div className="mx-auto flex h-full max-w-4xl flex-col gap-4 overflow-y-auto p-6">
      <header>
        <h1 className="text-fig-sh4 text-primary-teal-70">Lihat Realokasi</h1>
        <p className="text-b7 text-neutral-600">
          Rekomendasi lokasi realokasi terdekat berdasarkan posisi Anda saat ini.
        </p>
      </header>

      {locationStatus === "idle" && <Skeleton className="h-10 w-full" />}
      {locationStatus === "unsupported" && (
        <p className="text-b8 text-neutral-600">
          Browser Anda tidak mendukung deteksi lokasi. Fitur ini memerlukan akses lokasi perangkat.
        </p>
      )}
      {locationStatus === "denied" && (
        <p className="text-b8 text-behavior-red-30">
          Akses lokasi ditolak. Aktifkan izin lokasi di pengaturan browser Anda untuk menggunakan fitur ini.
        </p>
      )}
      {locationStatus === "error" && (
        <p className="text-b8 text-behavior-red-30">
          Tidak dapat mendeteksi lokasi Anda saat ini. Coba lagi beberapa saat lagi.
        </p>
      )}

      {isZoneLoading && <Skeleton className="h-10 w-full" />}

      {location && !isZoneLoading && !zone && (
        <div className="flex flex-col items-start gap-2 rounded-lg border border-neutral-300 bg-neutral-50 p-4">
          <p className="text-b8 text-neutral-600">
            Lokasi Anda saat ini berada di luar area studi TitikTemu, sehingga rekomendasi realokasi tidak
            tersedia untuk posisi ini.
          </p>
          <Link href="/beranda/" className="text-b9 font-semibold text-primary-teal-70 hover:underline">
            Kembali ke Beranda
          </Link>
        </div>
      )}

      {zone && (
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant={ZONE_BADGE_VARIANT[zone.zone_label]} selectable={false}>
            {zone.zone_label.toUpperCase()}
          </Badge>
          <ConfidenceBadge modelAccuracy={zone.model_accuracy} />
          <span className="text-b8 text-neutral-600">Anda berada di {regionLabel(zone.district_name)}</span>
        </div>
      )}

      {zone && zone.ews_code === 0 && (
        <p className="text-b8 text-neutral-600">
          Lokasi Anda berada di zona aman -- realokasi tidak diperlukan.
        </p>
      )}
      {zone && zone.ews_code === 1 && (
        <p className="text-b8 text-neutral-600">
          Lokasi Anda berada di zona waspada. Rekomendasi realokasi saat ini hanya tersedia untuk zona
          berstatus bahaya.
        </p>
      )}

      {isReallocationLoading && <Skeleton className="h-10 w-full" />}

      {location && zone && zone.ews_code === 2 && (
        <div className="relative">
          <LeafletMap center={[location.lat, location.lng]} zoom={14}>
            <ReallocationLayer
              origin={location}
              candidates={reallocation?.candidates ?? []}
              modelAccuracy={reallocation?.zone?.model_accuracy}
            />
          </LeafletMap>
          <MapLegend />
        </div>
      )}

      {reallocation && reallocation.eligible && reallocation.candidates.length > 0 && (
        <div className="flex flex-col gap-4 lg:flex-row">
          <div className="flex-1">
            <h2 className="text-fig-sh6 text-neutral-900">
              Kandidat Lokasi ({reallocation.candidates.length})
            </h2>
            <ol className="mt-2 flex flex-col gap-2">
              {reallocation.candidates.map((candidate) => (
                <li key={candidate.recommended_grid_id}>
                  <button
                    type="button"
                    onClick={() => setSelectedCandidateId(candidate.recommended_grid_id)}
                    aria-pressed={selectedCandidate?.recommended_grid_id === candidate.recommended_grid_id}
                    className={`flex w-full items-center justify-between gap-3 rounded-xl border p-4 text-left transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 ${
                      selectedCandidate?.recommended_grid_id === candidate.recommended_grid_id
                        ? "border-primary-teal-60 bg-primary-teal-20"
                        : "border-border"
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-fig-sh6 text-neutral-900">
                        #{candidate.rank} {candidateLabel(candidate)}
                      </span>
                      <span className="block truncate text-b7 text-neutral-400">
                        {candidate.distance_m.toFixed(0)}m dari lokasi Anda
                        {candidate.crossed_district ? " • Lintas kawasan" : ""}
                      </span>
                    </span>
                    <span className="shrink-0 text-fig-sh5 text-primary-teal-70">
                      {Math.round(candidate.matching_score)}%
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </div>

          {selectedCandidate && (
            <aside className="w-full shrink-0 rounded-xl border border-border p-4 lg:w-96">
              <h2 className="text-fig-sh6 text-neutral-900">Ajukan Realokasi</h2>
              <p className="mt-1 text-b8 text-neutral-600">
                Anda akan mengajukan pindah ke <strong>{candidateLabel(selectedCandidate)}</strong> (
                {selectedCandidate.distance_m.toFixed(0)}m, skor kecocokan{" "}
                {Math.round(selectedCandidate.matching_score)}%). Pengajuan ini akan ditinjau oleh operator.
              </p>

              <label className="mt-3 flex flex-col gap-1.5">
                <span className="text-fig-sh8 text-primary-teal-70">Catatan (opsional)</span>
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  disabled={submitRequest.isPending}
                  placeholder="Contoh: saya butuh lokasi dengan akses jalan utama"
                  className="min-h-20 rounded-lg bg-neutral-100 p-3 text-b8 text-neutral-900 shadow-[0px_4px_32px_rgba(0,0,0,0.04)] outline-none placeholder:text-neutral-500 focus:ring-2 focus:ring-primary-teal-60"
                />
              </label>

              {submitRequest.isSuccess ? (
                <p className="mt-3 text-b8 font-semibold text-behavior-green-30">
                  Pengajuan terkirim -- menunggu peninjauan operator.
                </p>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitRequest.isPending}
                  className="mt-3 flex h-11 w-full items-center justify-center rounded-lg bg-primary-teal-60 text-fig-sh7 text-neutral-0 transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  {submitRequest.isPending ? "Mengirim..." : "Ajukan Realokasi"}
                </button>
              )}
              {submitRequest.isError && (
                <p className="mt-2 text-b9 text-behavior-red-30">
                  Gagal mengirim pengajuan. Coba lagi.
                </p>
              )}
            </aside>
          )}
        </div>
      )}
    </div>
  );
}

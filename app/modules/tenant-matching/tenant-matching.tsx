"use client";

// Restyled to match Figma node 15004:6635 ("Smart Tenant Matching").
//
// UI-ONLY caveat: the Figma frame's candidate cards assume each candidate
// IS a tenant business (name, category, capital, a photo, a free-text AI
// narrative). The real data model doesn't work that way -- `useReallocation`
// returns `ReallocationCandidate` rows describing candidate DESTINATION
// ZONES for the one already-selected at-risk UMKM, not a list of tenant
// businesses with their own name/category/capital. So several Figma fields
// have no backing field at all and are rendered as clearly-commented
// placeholder/example content below (same pattern as
// app/modules/umkm-self-tracker/overlays.tsx). Nothing here fabricates a
// business name, photo URL, or timestamp -- see inline comments for exactly
// which fields are real vs. placeholder.

import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { ImageOff } from "lucide-react";
import { Badge } from "@/app/components/ui/badge";
import { ConfidenceBadge } from "@/app/components/ui/confidence-badge";
import { Input } from "@/app/components/ui/input";
import { Skeleton } from "@/app/components/ui/skeleton";
import { MapLegend } from "@/app/components/map/map-legend";
import { useReallocation } from "@/app/hooks/use-reallocation";
import { useUmkm } from "@/app/hooks/use-umkm";
import { useZoneLookup } from "@/app/hooks/use-zone-lookup";
import { regionLabel } from "@/app/lib/format";
import type { ReallocationCandidate } from "@/app/types/zones";

// Bucketed label for "Kesesuaian ESG" -- there is no distinct ESG field in
// the data model, so this is `matching_score` (a real field) re-labeled
// and bucketed, not a separate real metric. The UI says so via a caption.
// Thresholds mirror app/modules/beranda/home.tsx's matchingTier().
function esgSuitabilityLabel(matchingScore: number): string {
  const rounded = Math.round(matchingScore);
  if (matchingScore >= 75) return `Tinggi (${rounded}%)`;
  if (matchingScore >= 50) return `Sedang (${rounded}%)`;
  return `Rendah (${rounded}%)`;
}

// "Status" in Figma is an operational status with a since-date ("Butuh
// perhatian -- sejak 12 Agustus 2026"). No such tracked status/timestamp
// exists anywhere in the data model. The closest REAL equivalent is
// `crossed_district`, which does say something meaningful about the
// candidate zone's relationship to the origin -- so that's what's shown;
// the since-date is not fabricated.
function candidateStatusLabel(candidate: ReallocationCandidate): string {
  return candidate.crossed_district
    ? "Lintas kawasan dari lokasi asal"
    : "Dalam kawasan yang sama dengan lokasi asal";
}

// "Lokasi" built entirely from real candidate fields -- no grid_id exposed.
function candidateLocationLabel(candidate: ReallocationCandidate): string {
  return `${regionLabel(candidate.recommended_district)} · ${candidate.distance_m.toFixed(0)} m dari pintu keluar stasiun`;
}

const LeafletMap = dynamic(
  () => import("@/app/components/map/leaflet-map").then((mod) => mod.LeafletMap),
  { ssr: false },
);
const ReallocationLayer = dynamic(
  () => import("@/app/components/map/reallocation-layer").then((mod) => mod.ReallocationLayer),
  { ssr: false },
);

// GeoJSON polygon coordinates are [lng, lat] rings -- a simple average of
// the exterior ring's vertices is precise enough to center a map link on,
// without pulling in a full geometry library for one centroid.
function polygonCentroid(candidate: ReallocationCandidate): { lat: number; lng: number } {
  const ring = candidate.recommended_feature.geometry.coordinates[0] ?? [];
  const sum = ring.reduce(
    (acc, [lng, lat]) => ({ lng: acc.lng + lng, lat: acc.lat + lat }),
    { lng: 0, lat: 0 },
  );
  return { lat: sum.lat / (ring.length || 1), lng: sum.lng / (ring.length || 1) };
}

export default function TenantMatching() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const paramLat = searchParams.get("lat");
  const paramLng = searchParams.get("lng");
  const hasParamLocation = paramLat !== null && paramLng !== null;

  const [search, setSearch] = useState("");
  const [selectedUmkmId, setSelectedUmkmId] = useState<string | null>(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);

  // Only "bahaya" businesses are actually eligible for reallocation -- the
  // backend's /api/reallocation only ever populates candidates when
  // ews_code === 2 (see getReallocationForLocation in titiktemu-backend),
  // returning an empty candidate list with an explanatory message for
  // "waspada" zones instead. Filtering the picker to bahaya-only up front
  // (previously `!== "aman"`, which let waspada through too) keeps this
  // list consistent with what will actually produce candidates below.
  const { data: umkmResult, isLoading: isUmkmListLoading } = useUmkm({
    search: search || undefined,
    limit: 20,
  });
  const eligibleUmkm = useMemo(
    () => (umkmResult?.rows ?? []).filter((u) => u.zone_label === "bahaya"),
    [umkmResult],
  );
  const selectedUmkm = useMemo(
    () => eligibleUmkm.find((u) => u.id === selectedUmkmId) ?? null,
    [eligibleUmkm, selectedUmkmId],
  );

  const location = useMemo(() => {
    if (hasParamLocation) return { lat: Number(paramLat), lng: Number(paramLng) };
    return selectedUmkm ? { lat: selectedUmkm.latitude, lng: selectedUmkm.longitude } : null;
  }, [hasParamLocation, paramLat, paramLng, selectedUmkm]);

  const { data: zone, isLoading: isZoneLoading } = useZoneLookup(location);
  const isEligibleForLookup = !!zone && zone.ews_code > 0;
  const { data: reallocation, isLoading: isReallocationLoading } = useReallocation(
    location,
    isEligibleForLookup,
  );

  const selectedCandidate: ReallocationCandidate | null =
    reallocation?.candidates.find((c) => c.recommended_grid_id === selectedCandidateId) ??
    reallocation?.candidates[0] ??
    null;

  function selectUmkm(id: string) {
    setSelectedUmkmId(id);
    setSelectedCandidateId(null);
    // Clear any lat/lng deep-link so the real business selection takes over.
    if (hasParamLocation) router.replace(pathname, { scroll: false });
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-6">
      <header>
        <h1 className="text-fig-sh4 text-primary-teal-70">Smart Tenant Matching</h1>
        <p className="text-b7 text-neutral-900">
          Kandidat tenant yang direkomendasikan AI untuk mengisi slot kosong stasiun
        </p>
        <p className="mt-1 text-b8 text-neutral-600">
          Pilih UMKM di zona berisiko untuk melihat rekomendasi realokasi ke zona aman terdekat.
        </p>
      </header>

      <div className="flex flex-col gap-4 lg:flex-row">
        {/* Always visible now (previously hidden whenever arriving via a
            Discovery Map redirect) -- so an operator landing directly on
            this page can browse every bahaya-status UMKM themselves,
            without having to go through Discovery Map first. */}
        <aside className="flex w-full shrink-0 flex-col gap-2 lg:w-72">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari UMKM di zona berisiko"
            aria-label="Cari UMKM"
          />
          <h2 className="text-s6 font-semibold text-neutral-900">
            UMKM Berisiko -- Bahaya ({eligibleUmkm.length})
          </h2>
          <div className="flex max-h-[420px] flex-col gap-2 overflow-y-auto lg:max-h-[calc(100vh-20rem)]">
            {isUmkmListLoading &&
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
            {!isUmkmListLoading && eligibleUmkm.length === 0 && (
              <p className="text-b9 text-neutral-500">Tidak ada UMKM berstatus bahaya saat ini.</p>
            )}
            {!isUmkmListLoading &&
              eligibleUmkm.map((umkm) => (
                <button
                  key={umkm.id}
                  type="button"
                  onClick={() => selectUmkm(umkm.id)}
                  aria-pressed={!hasParamLocation && selectedUmkmId === umkm.id}
                  className={`rounded-xl border p-3 text-left transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 ${
                    !hasParamLocation && selectedUmkmId === umkm.id
                      ? "border-primary-500 bg-primary-50"
                      : "border-border"
                  }`}
                >
                  <p className="text-b9 font-semibold text-neutral-900">{umkm.name ?? regionLabel(umkm.district_name)}</p>
                  <p className="text-b9 text-neutral-500">
                    {umkm.category} &middot; {regionLabel(umkm.district_name)} &middot; {umkm.zone_label?.toUpperCase()}
                  </p>
                </button>
              ))}
          </div>
        </aside>

        <div className="flex flex-1 flex-col gap-4">
          {isZoneLoading && <Skeleton className="h-10 w-full" />}

          {zone && (
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="secondary" selectable={false}>
                {zone.zone_label.toUpperCase()}
              </Badge>
              <ConfidenceBadge modelAccuracy={zone.model_accuracy} />
              <span className="text-b8 text-neutral-600">
                {selectedUmkm?.name ?? "Lokasi ini"} berada di {regionLabel(zone.district_name)}
              </span>
            </div>
          )}

          {zone && zone.ews_code === 0 && (
            <p className="text-b8 text-neutral-600">UMKM ini berada di zona aman -- realokasi tidak diperlukan.</p>
          )}

          {isReallocationLoading && <Skeleton className="h-10 w-full" />}
          {reallocation && !reallocation.eligible && reallocation.message && (
            <p className="text-b8 text-neutral-600">{reallocation.message}</p>
          )}

          {location && (
            <div className="relative">
              <LeafletMap center={[location.lat, location.lng]} zoom={13}>
                <ReallocationLayer
                  origin={location}
                  candidates={reallocation?.candidates ?? []}
                  modelAccuracy={reallocation?.zone?.model_accuracy}
                />
              </LeafletMap>
              <MapLegend />
            </div>
          )}

          {reallocation && reallocation.eligible && (
            <div className="flex flex-col gap-4 lg:flex-row">
              <div className="flex-1">
                <h2 className="text-fig-sh6 text-neutral-900">
                  Daftar Kandidat ({reallocation.candidates.length})
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
                          {/* ReallocationCandidate carries no UMKM name/category (these
                              rows describe destination ZONES, not tenant businesses) --
                              recommended_district stands in as the real, human-friendly
                              identifying label. grid_id is an internal modeling id, never
                              shown to the user (see app/lib/format.ts's regionLabel). */}
                          <span className="block truncate text-fig-sh6 text-neutral-900">
                            #{candidate.rank} {regionLabel(candidate.recommended_district)}
                          </span>
                          {candidate.crossed_district && (
                            <span className="block truncate text-b7 text-neutral-400">Lintas kawasan</span>
                          )}
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
                  <h2 className="text-fig-sh6 text-neutral-900">Daftar Kandidat Terpilih</h2>

                  {/* Candidate photo: not part of the data model at all (no product/
                      tenant photo field on ReallocationCandidate or UmkmBusiness).
                      Rather than invent an image URL or use an expiring Figma asset
                      link, show a plain neutral placeholder box (same empty-state
                      spirit as DokumentasiLapanganOverlay in
                      app/modules/umkm-self-tracker/overlays.tsx). */}
                  <div className="mt-3 flex h-32 w-full items-center justify-center rounded-xl bg-neutral-100 text-neutral-400">
                    <ImageOff className="size-8" aria-hidden="true" />
                    <span className="sr-only">Belum ada foto kandidat</span>
                  </div>

                  <dl className="mt-3 flex flex-col gap-2 text-b7">
                    <div className="flex flex-col gap-0.5">
                      {/* Placeholder -- no real data source for tenant "kategori" on a
                          reallocation candidate (that's a UmkmBusiness field, and this
                          candidate is a destination zone, not a business). */}
                      <dt className="text-neutral-400">Kategori</dt>
                      <dd className="text-neutral-900">Belum tersedia (contoh: Kuliner)</dd>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      {/* Placeholder -- no capital/funding field exists anywhere in the
                          data model (UmkmBusiness deliberately has no rent/revenue
                          range, see app/types/umkm.ts). */}
                      <dt className="text-neutral-400">Kapasitas Modal</dt>
                      <dd className="text-neutral-900">Belum tersedia (contoh: Rp5.000.000)</dd>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <dt className="text-neutral-400">Kesesuaian ESG</dt>
                      <dd className="text-neutral-900">{esgSuitabilityLabel(selectedCandidate.matching_score)}</dd>
                      <dd className="text-b9 text-neutral-400 italic">
                        (berdasarkan matching score, bukan metrik ESG terpisah)
                      </dd>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <dt className="text-neutral-400">Lokasi</dt>
                      <dd className="text-neutral-900">{candidateLocationLabel(selectedCandidate)}</dd>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <dt className="text-neutral-400">Status</dt>
                      <dd className="text-neutral-900">{candidateStatusLabel(selectedCandidate)}</dd>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <dt className="text-neutral-400">Indeks Kerentanan</dt>
                      <dd className="text-neutral-900">
                        {selectedCandidate.recommended_feature.properties.vulnerability_index !== null
                          ? selectedCandidate.recommended_feature.properties.vulnerability_index.toFixed(3)
                          : "Tidak tersedia untuk grid ini"}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-3 border-l-4 border-primary-teal-60 bg-primary-teal-20/40 p-3 text-b8 text-neutral-700 italic">
                    Rekomendasi ini dihitung dari jarak ({selectedCandidate.distance_m.toFixed(0)} m), skor
                    kecocokan ({Math.round(selectedCandidate.matching_score)}%), dan status lintas-kawasan
                    grid tujuan -- bukan narasi AI bebas teks, karena backend belum menyediakan field insight
                    naratif untuk kandidat realokasi.
                  </div>

                  <Link
                    href={(() => {
                      const centroid = polygonCentroid(selectedCandidate);
                      return `/discovery-map/?lat=${centroid.lat}&lng=${centroid.lng}`;
                    })()}
                    className="mt-3 block w-fit text-b9 font-semibold text-primary-teal-70 hover:underline"
                  >
                    Lihat di Discovery Map
                  </Link>

                  {/* Approve/reject moved to the "Pengajuan Realokasi Pengguna" tab
                      on Laporan Alokasi -- that's the real, backend-persisted review
                      queue for reallocation requests a UMKM user actually submitted.
                      This page is for exploring candidates, not deciding on them. */}
                  <Link
                    href="/report-allocation/"
                    className="mt-3 flex h-10 w-full items-center justify-center rounded-[8px] bg-primary-teal-60 text-fig-sh7 text-white transition-opacity hover:opacity-90"
                  >
                    Tinjau Pengajuan di Laporan Alokasi
                  </Link>
                </aside>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

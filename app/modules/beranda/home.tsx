"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/app/components/ui/badge";
import { AiPanel } from "@/app/components/modules/ai-panel";
import { MapLegend } from "@/app/components/map/map-legend";
import { useAuth } from "@/app/lib/auth";
import { useCurrentLocation } from "@/app/hooks/use-current-location";
import { useGrid } from "@/app/hooks/use-grid";
import { useModelAccuracy } from "@/app/hooks/use-model-accuracy";
import { useZoneLookup } from "@/app/hooks/use-zone-lookup";
import { useReallocation } from "@/app/hooks/use-reallocation";
import { useUmkm } from "@/app/hooks/use-umkm";
import { useDashboardSummary } from "@/app/hooks/use-dashboard-summary";
import { usePolicy } from "@/app/hooks/use-policy";
import { NarrativeBlock } from "@/app/components/modules/narrative-block";
import { centroidOf } from "@/app/lib/geo";
import { regionLabel } from "@/app/lib/format";
import type { ReallocationCandidate, ZoneLabel } from "@/app/types/zones";
import type { UmkmBusiness } from "@/app/types/umkm";
import type { PolicyRecommendation } from "@/app/types/umkm";

const LeafletMap = dynamic(
  () => import("@/app/components/map/leaflet-map").then((mod) => mod.LeafletMap),
  { ssr: false },
);
const GeoJsonLayer = dynamic(
  () => import("@/app/components/map/geojson-layer").then((mod) => mod.GeoJsonLayer),
  { ssr: false },
);
const CurrentLocationMarker = dynamic(
  () => import("@/app/components/map/current-location-marker").then((mod) => mod.CurrentLocationMarker),
  { ssr: false },
);

const ZONE_BADGE_VARIANT: Record<ZoneLabel, "secondary" | "default" | "primary"> = {
  aman: "secondary",
  waspada: "default",
  bahaya: "primary",
};

// Same convention as geojson-layer.tsx's EWS_TO_HEX -- used to color the
// current-location pulse marker to match the user's own zone status
// instead of it always being red (TODO: "make current user's location
// pulse red/yellow/green depending on their own grid's EWS score").
const EWS_MARKER_COLOR: Record<number, string> = {
  0: "#39b332",
  1: "#eab308",
  2: "#dc2626",
};

const RECOMMENDATION_LABEL: Record<string, string> = {
  realokasi: "Risiko Tinggi",
  mitigasi: "Risiko Sedang",
  pemantauan: "Risiko Rendah",
};

const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

function matchingTier(score: number): string {
  if (score >= 75) return "Tingkat Kesesuaian Tinggi";
  if (score >= 50) return "Tingkat Kesesuaian Sedang";
  return "Tingkat Kesesuaian Rendah";
}

function candidateLabel(candidate: ReallocationCandidate): string {
  return regionLabel(candidate.recommended_district);
}

export default function Home() {
  const { user, role } = useAuth();
  const mode: "umkm" | "operator" = role === "operator_tod" ? "operator" : "umkm";

  const [clickedLocation, setClickedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [affordableOnly, setAffordableOnly] = useState(false);
  const [safeOnly, setSafeOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedUmkmId, setSelectedUmkmId] = useState<string | null>(null);
  // Frozen the first time the user's real location arrives, so the map
  // zooms to it once (TODO: "focus/zoom on the current user's location so
  // they don't have to search for their dot") without fighting the user's
  // own subsequent panning every time the GPS reading refines.
  const [autoFocusTarget, setAutoFocusTarget] = useState<{ lat: number; lng: number } | null>(null);

  const { data: grid, isLoading: isGridLoading } = useGrid();
  const { data: modelAccuracy } = useModelAccuracy();
  const { location: currentLocation, status: locationStatus } = useCurrentLocation();
  const { data: zone, isLoading: isZoneLoading } = useZoneLookup(clickedLocation);
  // The user's OWN zone (from their real geolocated position) -- distinct
  // from `zone`, which is whatever the user last clicked on the map.
  const { data: ownZone, isLoading: isOwnZoneLoading } = useZoneLookup(
    mode === "umkm" ? currentLocation : null,
  );
  const ownZoneIsDanger = mode === "umkm" && ownZone?.ews_code === 2;
  const { data: ownReallocation } = useReallocation(
    mode === "umkm" ? currentLocation : null,
    ownZoneIsDanger,
  );

  // Adjusting state during render (React's own recommended pattern for
  // "remember something from an earlier render, exactly once") -- not a
  // useEffect, since calling setState synchronously inside an effect body
  // triggers an avoidable extra render; this guarded call only ever fires
  // once, the render it happens on already reflects the new state.
  if (mode === "umkm" && currentLocation && !autoFocusTarget) {
    setAutoFocusTarget(currentLocation);
  }

  const { data: umkmResult, isLoading: isUmkmLoading } = useUmkm({
    search: search || undefined,
    ews_code: safeOnly ? 0 : undefined,
    limit: 8,
  });
  const umkmList = [...(umkmResult?.rows ?? [])].sort((a, b) => {
    if (!affordableOnly) return 0;
    return (a.reference_price_per_txn_idr ?? Infinity) - (b.reference_price_per_txn_idr ?? Infinity);
  });
  const selectedUmkm = umkmList.find((item) => item.id === selectedUmkmId) ?? null;

  const { data: summary } = useDashboardSummary();
  const { data: recommendations } = usePolicy();

  // Region-scoped stats for a UMKM user (TODO: "just give statistics
  // around the user's region, not the whole study grid") -- falls back to
  // the whole-study-grid totals for operators, or when the user's own
  // district can't be resolved yet.
  const districtStats =
    mode === "umkm" && ownZone?.district_name ? summary?.by_district[ownZone.district_name] : undefined;
  const scopedTotals = districtStats
    ? {
        total: districtStats.safe + districtStats.moderate + districtStats.danger,
        danger: districtStats.danger,
        safe: districtStats.safe,
        moderate: districtStats.moderate,
      }
    : summary
      ? {
          total: summary.total_grid_cells,
          danger: summary.danger_zone_count,
          safe: summary.safe_zone_count,
          moderate: summary.moderate_zone_count,
        }
      : null;
  const pctOf = (n: number) => (scopedTotals && scopedTotals.total > 0 ? Math.round((n / scopedTotals.total) * 100) : null);
  const zonaRawanPct = scopedTotals ? pctOf(scopedTotals.danger) : null;
  const zonaAmanPct = scopedTotals ? pctOf(scopedTotals.safe) : null;
  const zonaWaspadaPct = scopedTotals ? pctOf(scopedTotals.moderate) : null;

  // Sort generic policy recommendations by proximity to the user's real
  // location (TODO: "Rekomendasi Alokasi is different for each UMKM user
  // based on their location, prioritize nearest allocation if exist") --
  // only used as a fallback when the user isn't in a bahaya zone with real
  // reallocation candidates of their own (see ownReallocation below).
  const sortedRecommendations = useMemo(() => {
    const all = recommendations ?? [];
    if (mode !== "umkm" || !currentLocation || !grid) return all;
    return [...all].sort((a, b) => distanceToGridCentroid(a, grid, currentLocation) - distanceToGridCentroid(b, grid, currentLocation));
  }, [recommendations, mode, currentLocation, grid]);

  const ownCandidates = ownZoneIsDanger ? (ownReallocation?.candidates ?? []) : [];
  const showOwnCandidates = ownCandidates.length > 0;

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-h6 font-semibold text-secondary-800">Beranda</h1>
          <p className="text-b8 text-neutral-600">
            {mode === "umkm"
              ? "Temukan zona risiko dan UMKM di sekitar Anda."
              : "Ringkasan kondisi kawasan dan rekomendasi alokasi terkini."}
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-neutral-0 px-3 py-2">
          <span className="size-8 shrink-0 rounded-full bg-secondary-100" aria-hidden="true" />
          <span className="text-b9 font-semibold text-neutral-900">
            {user?.user_metadata?.full_name ?? user?.email ?? "Pengguna"}
          </span>
        </div>
      </header>

      {mode === "umkm" && locationStatus === "denied" && (
        <div className="shrink-0 flex items-center gap-2 rounded-lg border border-behavior-yellow-20/40 bg-behavior-yellow-10 px-4 py-2 text-b9 text-behavior-yellow-30">
          Akses lokasi ditolak -- aktifkan izin lokasi di pengaturan browser Anda agar posisi Anda dan
          rekomendasi realokasi terdekat dapat ditampilkan di peta.
        </div>
      )}
      {mode === "umkm" && currentLocation && !isOwnZoneLoading && !ownZone && (
        <div className="shrink-0 flex items-center gap-2 rounded-lg border border-neutral-300 bg-neutral-50 px-4 py-2 text-b9 text-neutral-600">
          Lokasi Anda saat ini berada di luar area studi TitikTemu, sehingga status zona dan rekomendasi
          belum tersedia untuk posisi ini.
        </div>
      )}

      {/* flex-1 min-h-0 makes this row fill exactly the remaining viewport
          height (see app/(app)/layout.tsx) -- the map inside it uses h-full
          to match, and never moves as the page scrolls, because the page
          itself no longer scrolls; only the aside below does. */}
      <div className="flex flex-1 min-h-0 flex-col gap-4 lg:flex-row">
        <div className="relative h-[min(70vh,600px)] w-full shrink-0 overflow-hidden rounded-xl lg:h-full lg:flex-1">
          {!isGridLoading && (
            <LeafletMap
              className="h-full w-full rounded-xl"
              onClick={(lat, lng) => {
                setSelectedUmkmId(null);
                setClickedLocation({ lat, lng });
              }}
              flyTo={
                selectedUmkm
                  ? { lat: selectedUmkm.latitude, lng: selectedUmkm.longitude, zoom: 16 }
                  : autoFocusTarget
                    ? { ...autoFocusTarget, zoom: 15 }
                    : null
              }
            >
              <GeoJsonLayer data={grid} modelAccuracy={modelAccuracy} />
              {currentLocation && (
                <CurrentLocationMarker
                  lat={currentLocation.lat}
                  lng={currentLocation.lng}
                  color={ownZone ? EWS_MARKER_COLOR[ownZone.ews_code] : undefined}
                />
              )}
            </LeafletMap>
          )}
          <MapLegend />
          <AiPanel role={mode === "operator" ? "operator" : "umkm"} />
        </div>

        <aside className="flex w-full shrink-0 flex-col gap-7 overflow-y-auto bg-neutral-0 pt-2 pb-6 px-4 lg:w-95">
          <h2 className="text-fig-h5 text-neutral-900">Panel Informasi</h2>
          <div className="h-px w-full shrink-0 bg-neutral-200" />

          {mode === "umkm" && ownZoneIsDanger && (
            <div className="flex shrink-0 flex-col gap-2 rounded-xl border border-behavior-red-20/30 bg-behavior-red-10 p-4">
              <p className="text-fig-sh7 text-behavior-red-30">Lokasi Anda berada di zona bahaya</p>
              <p className="text-b9 text-neutral-700">
                {regionLabel(ownZone?.district_name)} terindikasi berisiko tinggi tergusur. Lihat
                rekomendasi lokasi realokasi terdekat.
              </p>
              <Link
                href="/reallocation/"
                className="mt-1 w-fit rounded-lg bg-behavior-red-20 px-4 py-2 text-fig-sh8 text-neutral-0 transition-opacity hover:opacity-90"
              >
                Lihat Realokasi
              </Link>
            </div>
          )}

          {summary && (
            <div className="flex shrink-0 flex-col gap-3">
              <p className="text-fig-sh6 text-neutral-900">Matching Score</p>
              <div className="flex items-center gap-3">
                <span className="text-fig-sh4 text-primary-teal-70">
                  {Math.round(summary.avg_matching_score)}% Match
                </span>
                <span className="rounded-xl bg-primary-teal-60 px-3 py-1 text-fig-sh9 text-neutral-0">
                  {matchingTier(summary.avg_matching_score)}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-primary-teal-20">
                <div
                  className="h-full rounded-full bg-primary-teal-60"
                  style={{ width: `${Math.min(100, Math.max(0, summary.avg_matching_score))}%` }}
                />
              </div>
              <p className="text-b9 text-neutral-400">Rata-rata seluruh kawasan studi.</p>
            </div>
          )}

          <div className="h-px w-full shrink-0 bg-neutral-200" />

          {scopedTotals && (
            <div className="flex shrink-0 flex-col gap-3">
              <p className="text-fig-sh6 text-neutral-900">
                {districtStats ? `Status Zona di ${ownZone?.district_name}` : "Status Tiap Zona"}
              </p>
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1 rounded-xl border border-neutral-200 bg-neutral-0 p-4 shadow-[0_4px_4px_rgba(0,0,0,0.02)]">
                  <p className="text-b8 text-neutral-500">Zona Rawan</p>
                  <p className="text-fig-sh6 text-behavior-red-30">{zonaRawanPct}% Area</p>
                </div>
                <div className="min-w-0 flex-1 rounded-xl border border-neutral-200 bg-neutral-0 p-4 shadow-[0_4px_4px_rgba(0,0,0,0.02)]">
                  <p className="text-b8 text-neutral-500">Zona Aman</p>
                  <p className="text-fig-sh6 text-behavior-green-30">{zonaAmanPct}% Area</p>
                </div>
                <div className="min-w-0 flex-1 rounded-xl border border-neutral-200 bg-neutral-0 p-4 shadow-[0_4px_4px_rgba(0,0,0,0.02)]">
                  <p className="text-b8 text-neutral-500">Zona Waspada</p>
                  <p className="text-fig-sh6 text-behavior-yellow-30">{zonaWaspadaPct}% Area</p>
                </div>
              </div>
            </div>
          )}

          <div className="h-px w-full shrink-0 bg-neutral-200" />

          <div className="flex flex-col gap-3">
            <p className="text-fig-h6 text-neutral-900">Rekomendasi Alokasi</p>

            {showOwnCandidates ? (
              <div className="no-scrollbar flex max-h-[420px] flex-col gap-4 overflow-y-auto">
                {ownCandidates.slice(0, 3).map((candidate) => (
                  <div
                    key={candidate.recommended_grid_id}
                    className="flex shrink-0 flex-col gap-1 rounded-xl bg-primary-50 p-5 shadow-[4px_4px_4px_rgba(0,0,0,0.04)]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-fig-sh7 text-neutral-900">{candidateLabel(candidate)}</p>
                      <span className="shrink-0 rounded-[20px] bg-primary-teal-20 px-3 py-1 text-fig-sh9 text-primary-teal-70">
                        {Math.round(candidate.matching_score)}% cocok
                      </span>
                    </div>
                    <p className="text-b8 text-neutral-700">
                      {candidate.distance_m.toFixed(0)}m dari lokasi Anda
                      {candidate.crossed_district ? " • Lintas kawasan" : ""}
                    </p>
                    <Link
                      href={`/reallocation/?candidate=${candidate.recommended_grid_id}`}
                      className="mt-1 w-fit rounded-lg bg-primary-teal-60 px-3 py-1.5 text-fig-sh9 text-neutral-0 transition-opacity hover:opacity-90"
                    >
                      Lihat Realokasi
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <>
                {!sortedRecommendations.length && (
                  <p className="text-b9 text-neutral-500">Belum ada rekomendasi tersedia.</p>
                )}
                <div className="no-scrollbar flex max-h-[420px] flex-col gap-4 overflow-y-auto">
                  {sortedRecommendations.slice(0, 3).map((item) => {
                    const riskStyle =
                      item.recommendation_type === "realokasi"
                        ? "bg-behavior-red-20 text-behavior-red-10"
                        : item.recommendation_type === "pemantauan"
                          ? "bg-behavior-green-20 text-behavior-green-10"
                          : "bg-behavior-yellow-20 text-behavior-yellow-10";
                    return (
                      <div
                        key={item.grid_id}
                        className="flex shrink-0 flex-col gap-1 rounded-xl bg-primary-50 p-5 shadow-[4px_4px_4px_rgba(0,0,0,0.04)]"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-fig-sh7 text-neutral-900">{regionLabel(item.district_name)}</p>
                          <span className={`shrink-0 rounded-[20px] px-3 py-1 text-fig-sh9 ${riskStyle}`}>
                            {RECOMMENDATION_LABEL[item.recommendation_type] ?? item.recommendation_type}
                          </span>
                        </div>
                        <NarrativeBlock text={item.narrative} className="mt-1" />
                        {mode === "umkm" && ownZoneIsDanger && (
                          <Link
                            href="/reallocation/"
                            className="mt-1 w-fit rounded-lg bg-primary-teal-60 px-3 py-1.5 text-fig-sh9 text-neutral-0 transition-opacity hover:opacity-90"
                          >
                            Lihat Realokasi
                          </Link>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function distanceToGridCentroid(
  item: PolicyRecommendation,
  grid: NonNullable<ReturnType<typeof useGrid>["data"]>,
  from: { lat: number; lng: number },
): number {
  const feature = grid.features.find((f) => f.properties.grid_id === item.grid_id);
  const ring = feature?.geometry.coordinates[0];
  if (!ring) return Infinity;
  const [lat, lng] = centroidOf(ring);
  return Math.hypot(lat - from.lat, lng - from.lng);
}

function UmkmDetailCard({ umkm, onClose }: { umkm: UmkmBusiness; onClose: () => void }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-s7 font-semibold text-neutral-900">{umkm.name ?? "-"}</p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup detail usaha"
          className="text-b9 text-neutral-500 hover:text-neutral-700"
        >
          &times;
        </button>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-b9">
        <dt className="text-neutral-500">Kategori</dt>
        <dd className="text-neutral-800">{umkm.category ?? "-"}</dd>
        <dt className="text-neutral-500">Kawasan</dt>
        <dd className="text-neutral-800">{regionLabel(umkm.district_name)}</dd>
        {umkm.reference_price_per_txn_idr !== null && (
          <>
            <dt className="text-neutral-500">Referensi Harga</dt>
            <dd className="text-neutral-800">
              {currencyFormatter.format(umkm.reference_price_per_txn_idr)}
            </dd>
          </>
        )}
        {umkm.vulnerability_index !== null && (
          <>
            <dt className="text-neutral-500">Indeks Kerentanan</dt>
            <dd className="text-neutral-800">{umkm.vulnerability_index.toFixed(3)}</dd>
          </>
        )}
      </dl>
      {umkm.zone_label && (
        <Badge variant={ZONE_BADGE_VARIANT[umkm.zone_label]} selectable={false} className="w-fit">
          {umkm.zone_label.toUpperCase()}
        </Badge>
      )}
      <Link
        href={`/discovery-map/?lat=${umkm.latitude}&lng=${umkm.longitude}`}
        className="mt-1 text-center text-b9 font-semibold text-primary-600 hover:underline"
      >
        Lihat di Discovery Map
      </Link>
    </div>
  );
}

"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/app/components/ui/badge";
import { Input } from "@/app/components/ui/input";
import { Skeleton } from "@/app/components/ui/skeleton";
import { AiPanel } from "@/app/components/modules/ai-panel";
import { MapLegend } from "@/app/components/map/map-legend";
import { useAuth } from "@/app/lib/auth";
import { useCurrentLocation } from "@/app/hooks/use-current-location";
import { useGrid } from "@/app/hooks/use-grid";
import { useModelAccuracy } from "@/app/hooks/use-model-accuracy";
import { useZoneLookup } from "@/app/hooks/use-zone-lookup";
import { useUmkm } from "@/app/hooks/use-umkm";
import { useDashboardSummary } from "@/app/hooks/use-dashboard-summary";
import { usePolicy } from "@/app/hooks/use-policy";
import { NarrativeBlock } from "@/app/components/modules/narrative-block";
import type { ZoneLabel } from "@/app/types/zones";
import type { UmkmBusiness } from "@/app/types/umkm";

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

export default function Home() {
  const { user, role } = useAuth();
  const mode: "umkm" | "operator" = role === "operator_tod" ? "operator" : "umkm";

  const [clickedLocation, setClickedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [affordableOnly, setAffordableOnly] = useState(false);
  const [safeOnly, setSafeOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedUmkmId, setSelectedUmkmId] = useState<string | null>(null);

  const { data: grid, isLoading: isGridLoading } = useGrid();
  const { data: modelAccuracy } = useModelAccuracy();
  const { location: currentLocation, status: locationStatus } = useCurrentLocation();
  const { data: zone, isLoading: isZoneLoading } = useZoneLookup(clickedLocation);
  // The user's OWN zone (from their real geolocated position), used to
  // surface a "Lihat Realokasi" prompt for UMKM users sitting in a bahaya
  // zone -- distinct from `zone`, which is whatever the user last clicked.
  const { data: ownZone } = useZoneLookup(mode === "umkm" ? currentLocation : null);

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

  const zonaRawanPct = summary ? Math.round((summary.danger_zone_count / summary.total_grid_cells) * 100) : null;
  const zonaAmanPct = summary ? Math.round((summary.safe_zone_count / summary.total_grid_cells) * 100) : null;
  const zonaWaspadaPct = summary ? Math.round((summary.moderate_zone_count / summary.total_grid_cells) * 100) : null;

  return (
    <div className="flex flex-col gap-4 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
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
        <div className="flex items-center gap-2 rounded-lg border border-behavior-yellow-20/40 bg-behavior-yellow-10 px-4 py-2 text-b9 text-behavior-yellow-30">
          Akses lokasi ditolak -- aktifkan izin lokasi di pengaturan browser Anda agar posisi Anda dan
          rekomendasi realokasi terdekat dapat ditampilkan di peta.
        </div>
      )}

      <div className="flex flex-col gap-4 lg:flex-row">
        {/* Fixed viewport-relative height (not max-h+flex-1) so the map has
            a real, non-zero height on mobile/tablet where this row becomes
            flex-col -- flex-1 alone collapses to 0px without an explicit
            cross-axis height from a sibling. lg:sticky keeps the map in
            view while the info panel beside it scrolls, instead of it
            scrolling away with the rest of the page. */}
        <div className="relative h-[min(70vh,768px)] min-h-[420px] w-full flex-1 overflow-hidden rounded-xl lg:sticky lg:top-6 lg:h-[calc(100vh-8rem)]">
          {!isGridLoading && (
            <LeafletMap
              className="h-full w-full rounded-xl"
              onClick={(lat, lng) => {
                setSelectedUmkmId(null);
                setClickedLocation({ lat, lng });
              }}
              flyTo={selectedUmkm ? { lat: selectedUmkm.latitude, lng: selectedUmkm.longitude, zoom: 16 } : null}
            >
              <GeoJsonLayer data={grid} modelAccuracy={modelAccuracy} />
              {currentLocation && (
                <CurrentLocationMarker lat={currentLocation.lat} lng={currentLocation.lng} />
              )}
            </LeafletMap>
          )}
          <MapLegend />
          <AiPanel role={mode === "operator" ? "operator" : "umkm"} />
        </div>

        {mode === "umkm" ? (
          <aside className="flex w-95 shrink-0 flex-col gap-7 bg-neutral-0 pt-2 pb-6 px-4">
            <h2 className="text-fig-h5 text-neutral-900">Panel Informasi</h2>
            <div className="h-px w-full shrink-0 bg-neutral-200" />

            {ownZone && ownZone.ews_code === 2 && (
              <div className="flex shrink-0 flex-col gap-2 rounded-xl border border-behavior-red-20/30 bg-behavior-red-10 p-4">
                <p className="text-fig-sh7 text-behavior-red-30">Lokasi Anda berada di zona bahaya</p>
                <p className="text-b9 text-neutral-700">
                  {ownZone.district_name ?? `Grid ${ownZone.grid_id}`} terindikasi berisiko tinggi tergusur.
                  Lihat rekomendasi lokasi realokasi terdekat.
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
              </div>
            )}

            <div className="h-px w-full shrink-0 bg-neutral-200" />

            {summary && (
              <div className="flex shrink-0 flex-col gap-3">
                <p className="text-fig-sh6 text-neutral-900">Status Tiap Zona</p>
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
              {!recommendations?.length && (
                <p className="text-b9 text-neutral-500">Belum ada rekomendasi tersedia.</p>
              )}
              <div className="no-scrollbar flex max-h-[420px] flex-col gap-4 overflow-y-auto">
                {recommendations?.slice(0, 3).map((item) => {
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
                        <p className="text-fig-sh7 text-neutral-900">
                          {item.district_name ?? item.grid_id}
                        </p>
                        <span className={`shrink-0 rounded-[20px] px-3 py-1 text-fig-sh9 ${riskStyle}`}>
                          {RECOMMENDATION_LABEL[item.recommendation_type] ?? item.recommendation_type}
                        </span>
                      </div>
                      <NarrativeBlock text={item.narrative} className="mt-1" />
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>
        ) : (
          <aside className="flex w-95 shrink-0 flex-col gap-7 bg-neutral-0 pt-2 pb-6 px-4">
            <h2 className="text-fig-h5 text-neutral-900">Panel Informasi</h2>
            <div className="h-px w-full shrink-0 bg-neutral-200" />

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
              </div>
            )}

            <div className="h-px w-full shrink-0 bg-neutral-200" />

            {summary && (
              <div className="flex shrink-0 flex-col gap-3">
                <p className="text-fig-sh6 text-neutral-900">Status Tiap Zona</p>
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
              {!recommendations?.length && (
                <p className="text-b9 text-neutral-500">Belum ada rekomendasi tersedia.</p>
              )}
              <div className="no-scrollbar flex max-h-[420px] flex-col gap-4 overflow-y-auto">
                {recommendations?.slice(0, 3).map((item) => {
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
                        <p className="text-fig-sh7 text-neutral-900">
                          {item.district_name ?? item.grid_id}
                        </p>
                        <span className={`shrink-0 rounded-[20px] px-3 py-1 text-fig-sh9 ${riskStyle}`}>
                          {RECOMMENDATION_LABEL[item.recommendation_type] ?? item.recommendation_type}
                        </span>
                      </div>
                      <NarrativeBlock text={item.narrative} className="mt-1" />
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
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
        <dt className="text-neutral-500">Blok</dt>
        <dd className="text-neutral-800">{umkm.grid_id}</dd>
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

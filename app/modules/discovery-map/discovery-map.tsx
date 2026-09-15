"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Download } from "lucide-react";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { ConfidenceBadge } from "@/app/components/ui/confidence-badge";
import { Input } from "@/app/components/ui/input";
import { Skeleton } from "@/app/components/ui/skeleton";
import { MapLegend } from "@/app/components/map/map-legend";
import { AiPanel } from "@/app/components/modules/ai-panel";
import { useCurrentLocation } from "@/app/hooks/use-current-location";
import { useGrid } from "@/app/hooks/use-grid";
import { useModelAccuracy } from "@/app/hooks/use-model-accuracy";
import { useZoneLookup } from "@/app/hooks/use-zone-lookup";
import { useUmkm } from "@/app/hooks/use-umkm";
import { downloadCsv } from "@/app/lib/csv";
import { NarrativeBlock } from "@/app/components/modules/narrative-block";
import type { ZoneLabel } from "@/app/types/zones";

// react-leaflet touches `window` at module-load time, which crashes Next's
// server-side prerender pass -- both of these must be dynamically imported
// with ssr:false, not just the outer <LeafletMap>.
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
const UmkmMarkerLayer = dynamic(
  () => import("@/app/components/map/umkm-marker-layer").then((mod) => mod.UmkmMarkerLayer),
  { ssr: false },
);
const MapControls = dynamic(
  () => import("@/app/components/map/map-controls").then((mod) => mod.MapControls),
  { ssr: false },
);

const ZONE_BADGE_VARIANT: Record<ZoneLabel, "secondary" | "default" | "primary"> = {
  aman: "secondary",
  waspada: "default",
  bahaya: "primary",
};

const FILTERS = [
  { label: "Semua Titik", ews: undefined, variant: "secondary" as const },
  { label: "Bahaya", ews: 2, variant: "primary" as const },
  { label: "Waspada", ews: 1, variant: "default" as const },
  { label: "Aman", ews: 0, variant: "secondary" as const },
];

const ZONE_TEXT_COLOR: Record<ZoneLabel, string> = {
  aman: "text-behavior-green-30",
  waspada: "text-behavior-yellow-30",
  bahaya: "text-behavior-red-30",
};

// Pill styling per Figma (node 15004:6724): the real 3-category zone_label
// taxonomy (aman/waspada/bahaya) is intentionally kept as-is -- only the
// chip's visual chrome is restyled to Figma's pill/active look.
const FILTER_CHIP_CLASSNAME =
  "h-auto min-w-0 rounded-[23px] border-[1.6px] border-primary-teal-60 bg-neutral-50 px-5 py-2 text-b9 text-primary-teal-70 hover:bg-neutral-100 aria-pressed:border-primary-teal-60 aria-pressed:bg-primary-teal-60 aria-pressed:text-white";

export default function DiscoveryMap() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { data: grid, isLoading: isGridLoading, isError: isGridError } = useGrid();
  const { data: modelAccuracy } = useModelAccuracy();
  const { location: currentLocation } = useCurrentLocation();

  const [ewsFilter, setEwsFilter] = useState<number | undefined>(undefined);
  const [search, setSearch] = useState("");
  const [mapExpanded, setMapExpanded] = useState(false);
  const { data: candidates, isLoading: isCandidatesLoading } = useUmkm({
    search: search || undefined,
    ews_code: ewsFilter,
    limit: 50,
  });

  const selectedId = searchParams.get("umkm");
  const selected = candidates?.rows.find((row) => row.id === selectedId) ?? null;
  const clickedLocationFromParams = (() => {
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");
    return lat && lng ? { lat: Number(lat), lng: Number(lng) } : null;
  })();
  const activeLocation = selected
    ? { lat: selected.latitude, lng: selected.longitude }
    : clickedLocationFromParams;

  const { data: zone, isLoading: isZoneLoading } = useZoneLookup(activeLocation);

  // Selection is reflected in the URL (deep-linkable/shareable) rather than
  // only in component state -- per UX guidance on reflecting dynamic view
  // state in the URL.
  function selectUmkm(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("umkm", id);
    params.delete("lat");
    params.delete("lng");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function selectMapPoint(lat: number, lng: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("umkm");
    params.set("lat", String(lat));
    params.set("lng", String(lng));
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function exportCsv() {
    if (!candidates?.rows.length) return;
    downloadCsv(
      `discovery-map-${ewsFilter ?? "semua"}.csv`,
      candidates.rows.map((row) => ({
        nama: row.name,
        kategori: row.category,
        kawasan: row.district_name,
        grid_id: row.grid_id,
        status: row.zone_label,
        indeks_kerentanan: row.vulnerability_index,
        jarak_ke_stasiun_m: row.dist_to_station_m,
      })),
    );
  }

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      <div className="shrink-0 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-sans text-[30px] text-primary-teal-70">Discovery Map</h1>
          <p className="text-[16px] text-neutral-900">
            Peta sebaran risiko gentrifikasi seluruh UMKM di kawasan
          </p>
        </div>
        <div className="w-full sm:w-64">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari Kandidat"
            aria-label="Cari kandidat UMKM"
          />
        </div>
      </div>

      <div className="shrink-0 flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <Badge
            key={filter.label}
            variant={filter.variant}
            selected={ewsFilter === filter.ews}
            onSelectedChange={() => setEwsFilter(filter.ews)}
            className={FILTER_CHIP_CLASSNAME}
          >
            {filter.label}
            {candidates && filter.ews !== undefined && (
              <span className="ml-1">({candidates.rows.filter((r) => r.ews_code === filter.ews).length})</span>
            )}
          </Badge>
        ))}
      </div>

      {isGridError && (
        <p className="shrink-0 text-b8 text-destructive">
          Tidak dapat memuat peta zona -- pastikan backend berjalan di{" "}
          {process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}.
        </p>
      )}

      {/* flex-1 min-h-0 fills exactly the remaining viewport height (see
          app/(app)/layout.tsx) -- the map never moves as the page scrolls
          because the page itself doesn't scroll; only the candidate list
          in the aside does. */}
      <div className="flex flex-1 min-h-0 flex-col gap-4 lg:flex-row">
        <div
          className={
            mapExpanded
              ? "fixed inset-4 z-50 flex flex-col rounded-[12px] bg-neutral-0 p-2 shadow-2xl"
              : "relative h-[min(70vh,600px)] w-full shrink-0 overflow-clip rounded-[12px] lg:h-full lg:flex-1"
          }
        >
          {!isGridLoading && (
            <LeafletMap
              className={`w-full rounded-[12px] ${mapExpanded ? "h-full flex-1" : "h-full"}`}
              onClick={selectMapPoint}
              flyTo={selected ? { lat: selected.latitude, lng: selected.longitude, zoom: 16 } : null}
            >
              <GeoJsonLayer data={grid} modelAccuracy={modelAccuracy} />
              <UmkmMarkerLayer rows={candidates?.rows ?? []} selectedId={selectedId} onSelect={selectUmkm} />
              {currentLocation && (
                <CurrentLocationMarker lat={currentLocation.lat} lng={currentLocation.lng} />
              )}
              <MapControls expanded={mapExpanded} onExpandToggle={() => setMapExpanded((prev) => !prev)} />
            </LeafletMap>
          )}
          <MapLegend caption="Skor disusun dari indeks gabungan data survei dan data spasial terbuka. Sifatnya alat bantu keputusan, bukan model prediktif yang tervalidasi secara statistik." />
          <AiPanel role="operator" />
        </div>

        <aside className="flex w-full shrink-0 flex-col gap-3 overflow-y-auto lg:w-80">
          <div className="flex items-center justify-between">
            <h2 className="text-s6 font-semibold text-neutral-900">
              {FILTERS.find((f) => f.ews === ewsFilter)?.label} ({candidates?.total ?? 0})
            </h2>
            <Button
              size="sm"
              variant="outline"
              onClick={exportCsv}
              disabled={!candidates?.rows.length}
              title="Unduh daftar UMKM yang sedang ditampilkan sebagai file CSV"
              className="gap-1.5 rounded-[8px] border-primary-teal-60 bg-primary-teal-20/40 text-primary-teal-70 font-semibold shadow-[0px_4px_24px_0px_rgba(0,0,0,0.04)] hover:bg-primary-teal-20"
            >
              <Download className="size-4" strokeWidth={2} />
              Unduh CSV
            </Button>
          </div>

          <div className="flex max-h-[520px] flex-col gap-2 overflow-y-auto">
            {isCandidatesLoading &&
              Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
            {!isCandidatesLoading && candidates?.rows.length === 0 && (
              <p className="text-b9 text-neutral-500">Tidak ada UMKM yang cocok dengan filter ini.</p>
            )}
            {!isCandidatesLoading &&
              candidates?.rows.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => selectUmkm(row.id)}
                  aria-pressed={selectedId === row.id}
                  className={`flex items-center gap-3 rounded-[12px] border p-3 text-left transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 ${
                    selectedId === row.id ? "border-primary-500 bg-primary-50" : "border-neutral-200"
                  }`}
                >
                  <div className="flex-1">
                    <p className="text-[16px] font-semibold text-black">{row.name ?? "-"}</p>
                    <p className="text-b9 text-neutral-600">
                      {row.dist_to_station_m !== null ? `${Math.round(row.dist_to_station_m)}m` : "-"} &middot;{" "}
                      {row.district_name ?? "Kawasan tidak diketahui"}
                    </p>
                  </div>
                  {row.zone_label && (
                    <span className={`shrink-0 text-fig-sh9 ${ZONE_TEXT_COLOR[row.zone_label]}`}>
                      {row.zone_label.toUpperCase()}
                    </span>
                  )}
                </button>
              ))}
          </div>

          {(selected || clickedLocationFromParams) && (
            <div className="rounded-xl border border-border p-4">
              <h2 className="text-s6 font-semibold text-neutral-900">Detail Zona</h2>
              {isZoneLoading && <Skeleton className="mt-2 h-24 w-full" />}
              {!isZoneLoading && !zone && (
                <p className="mt-2 text-b8 text-neutral-500">Lokasi ini di luar area studi.</p>
              )}
              {!isZoneLoading && zone && (
                <div className="mt-2 flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={ZONE_BADGE_VARIANT[zone.zone_label]} selectable={false}>
                      {zone.zone_label.toUpperCase()}
                    </Badge>
                    <ConfidenceBadge modelAccuracy={zone.model_accuracy} />
                  </div>
                  <dl className="flex flex-col gap-1 text-b8">
                    <div>
                      <dt className="inline font-semibold">Kawasan: </dt>
                      <dd className="inline">{zone.district_name ?? "Tidak diketahui"}</dd>
                    </div>
                    <div>
                      <dt className="inline font-semibold">Indeks Kerentanan: </dt>
                      <dd className="inline">{zone.vulnerability_index.toFixed(3)}</dd>
                    </div>
                    <div>
                      <dt className="inline font-semibold">Matching Score: </dt>
                      <dd className="inline">{zone.matching_score.toFixed(1)}</dd>
                    </div>
                  </dl>
                  {zone.narrative && <NarrativeBlock text={zone.narrative} className="mt-1" />}
                  {zone.ews_code > 0 && (
                    <Button
                      size="sm"
                      render={<Link href={`/tenant-matching/?lat=${activeLocation?.lat}&lng=${activeLocation?.lng}`} />}
                    >
                      Lihat Realokasi
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

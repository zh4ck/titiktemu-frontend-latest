"use client";

import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from "chart.js";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Bar } from "react-chartjs-2";
import { Dropdown } from "@/app/components/ui/dropdown";
import { Input } from "@/app/components/ui/input";
import { Skeleton } from "@/app/components/ui/skeleton";
import { useDashboardSummary } from "@/app/hooks/use-dashboard-summary";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

// Same aman/waspada/bahaya color convention as ZONE_BADGE_VARIANT and the
// zone stat cards on beranda/home.tsx (green/yellow/red) -- previously this
// chart used an ad-hoc teal for "waspada" instead of yellow, which diverged
// from that convention; aligned here to match both the rest of the app and
// the Figma spec (node 15004:6438/6468).
const COLORS = { aman: "#00a85e", waspada: "#ff9600", bahaya: "#D90E10" };

function vulnerabilityTier(index: number): { label: string; colorClass: string } {
  if (index >= 0.66) return { label: "Tinggi", colorClass: "text-behavior-red-30" };
  if (index >= 0.33) return { label: "Sedang", colorClass: "text-behavior-yellow-30" };
  return { label: "Rendah", colorClass: "text-behavior-green-30" };
}

// Placeholder rows -- no backend event/audit log exists yet for zone status
// changes (each analytics batch run only persists the latest snapshot, not
// a history of transitions). This panel ships as UI-only scaffolding per
// explicit user decision, same pattern as RiwayatLengkapOverlay in
// umkm-self-tracker/overlays.tsx. Do not wire this to fabricated backend
// data -- replace with a real event log once one exists.
const PLACEHOLDER_HISTORY = [
  { time: "09:12", event: "Blok G-104 berubah dari Aman menjadi Butuh Perhatian" },
  { time: "08:47", event: "Blok G-088 berubah dari Butuh Perhatian menjadi Perlu Dipantau" },
  { time: "Kemarin, 17:30", event: "Blok G-021 berubah dari Perlu Dipantau menjadi Aman" },
  { time: "Kemarin, 14:05", event: "Blok G-057 berubah dari Aman menjadi Butuh Perhatian" },
];

export default function EsgDashboard() {
  const { data: summary, isLoading, isError } = useDashboardSummary();
  const [selectedDistrict, setSelectedDistrict] = useState("all");
  const [historyQuery, setHistoryQuery] = useState("");

  const districts = useMemo(
    () => (summary ? Object.entries(summary.by_district) : []),
    [summary],
  );
  const districtOptions = useMemo(
    () => [
      { value: "all", label: "Semua Kawasan" },
      ...districts.map(([name]) => ({ value: name, label: name })),
    ],
    [districts],
  );

  const distribution = useMemo(() => {
    if (selectedDistrict !== "all") {
      const found = summary?.by_district[selectedDistrict];
      return found
        ? { safe: found.safe, moderate: found.moderate, danger: found.danger }
        : { safe: 0, moderate: 0, danger: 0 };
    }
    return districts.reduce(
      (acc, [, d]) => ({
        safe: acc.safe + d.safe,
        moderate: acc.moderate + d.moderate,
        danger: acc.danger + d.danger,
      }),
      { safe: 0, moderate: 0, danger: 0 },
    );
  }, [summary, selectedDistrict, districts]);
  const distributionTotal = distribution.safe + distribution.moderate + distribution.danger;
  const pct = (n: number) => (distributionTotal > 0 ? Math.round((n / distributionTotal) * 100) : 0);

  const umkmProtected = summary
    ? summary.total_tenants_tracked - summary.tenants_needing_reallocation
    : null;

  const filteredHistory = useMemo(() => {
    const q = historyQuery.trim().toLowerCase();
    if (!q) return PLACEHOLDER_HISTORY;
    return PLACEHOLDER_HISTORY.filter((entry) => entry.event.toLowerCase().includes(q));
  }, [historyQuery]);

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto p-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-fig-sh4 text-primary-teal-70">ESG Dashboard</h1>
        <p className="text-b7 text-neutral-900">
          Pantau distribusi risiko dan dampak sosial kawasan secara real-time.
        </p>
      </header>

      {isError && (
        <p className="text-b8 text-destructive">
          Tidak dapat memuat ringkasan dashboard -- pastikan backend berjalan.
        </p>
      )}

      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}

      {!isLoading && !summary && !isError && (
        <p className="text-b8 text-neutral-500">
          Belum ada data dashboard -- jalankan batch pipeline analytics terlebih dahulu.
        </p>
      )}

      {summary && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-[12px] border-[1.2px] border-neutral-200 bg-neutral-0 p-4 shadow-[0px_4px_4px_rgba(0,0,0,0.02)]">
              <p className="text-b7 text-neutral-500">Grid Berstatus Bahaya</p>
              <p className="text-fig-sh5 text-neutral-900">{summary.danger_zone_pct}%</p>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-neutral-100">
                <div
                  className="h-full rounded-full bg-primary-500"
                  style={{ width: `${Math.min(100, summary.danger_zone_pct)}%` }}
                />
              </div>
              <p className="mt-2 text-b9 text-neutral-500">
                {summary.danger_zone_count} dari {summary.total_grid_cells} grid cell
              </p>
            </div>
            <div className="rounded-[12px] border-[1.2px] border-neutral-200 bg-neutral-0 p-4 shadow-[0px_4px_4px_rgba(0,0,0,0.02)]">
              <p className="text-b7 text-neutral-500">UMKM Terlindungi (zona subsidi)</p>
              <p className="text-fig-sh5 text-neutral-900">{umkmProtected} Usaha</p>
              <p className="mt-2 text-b9 text-neutral-500">
                dari {summary.total_tenants_tracked} total UMKM yang dipantau
              </p>
            </div>
            <div className="rounded-[12px] border-[1.2px] border-neutral-200 bg-neutral-0 p-4 shadow-[0px_4px_4px_rgba(0,0,0,0.02)]">
              <p className="text-b7 text-neutral-500">Rata-rata Indeks Kerentanan</p>
              <p className={`text-fig-sh5 ${vulnerabilityTier(summary.avg_vulnerability_index).colorClass}`}>
                {vulnerabilityTier(summary.avg_vulnerability_index).label}
              </p>
              <p className="mt-2 text-b9 text-neutral-500">
                skor {summary.avg_vulnerability_index.toFixed(3)} dari 1.000
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-4 lg:flex-row">
            <div className="flex flex-1 flex-col gap-5 rounded-[12px] border-[1.2px] border-neutral-200 bg-neutral-0 p-4 shadow-[0px_4px_4px_rgba(0,0,0,0.02)]">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <h2 className="text-fig-sh6 text-neutral-900">
                    Distribusi Tingkat Perhatian per Kawasan
                  </h2>
                  {summary.ews_validation_accuracy_pct !== null && (
                    <p className="text-b9 text-neutral-500">
                      Akurasi model tervalidasi: {summary.ews_validation_accuracy_pct}% (keyakinan{" "}
                      {summary.confidence_level})
                    </p>
                  )}
                </div>
                {districtOptions.length > 1 && (
                  <Dropdown
                    options={districtOptions}
                    value={selectedDistrict}
                    onValueChange={setSelectedDistrict}
                    placeholder="Pilih Kawasan"
                    className="w-48"
                  />
                )}
              </div>

              <div className="flex flex-col gap-10">
                {districts.length > 0 ? (
                  <div className="h-80">
                    {/* Chart previously always rendered ALL districts regardless of
                        the dropdown above -- the dropdown only filtered the summary
                        numbers below. Now the chart itself narrows to the selected
                        district (a single bar) and clicking any bar in the "all
                        districts" view drills into it, syncing back to the dropdown --
                        selectedDistrict is the single source of truth either way. */}
                    <Bar
                      data={{
                        labels: selectedDistrict === "all" ? districts.map(([name]) => name) : [selectedDistrict],
                        datasets: [
                          {
                            label: "Relatif Aman",
                            data:
                              selectedDistrict === "all"
                                ? districts.map(([, d]) => d.safe)
                                : [distribution.safe],
                            backgroundColor: COLORS.aman,
                          },
                          {
                            label: "Butuh Perhatian",
                            data:
                              selectedDistrict === "all"
                                ? districts.map(([, d]) => d.moderate)
                                : [distribution.moderate],
                            backgroundColor: COLORS.waspada,
                          },
                          {
                            label: "Perlu Dipantau",
                            data:
                              selectedDistrict === "all"
                                ? districts.map(([, d]) => d.danger)
                                : [distribution.danger],
                            backgroundColor: COLORS.bahaya,
                          },
                        ],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        animation: { duration: 300 },
                        scales: { x: { stacked: false }, y: { beginAtZero: true, ticks: { precision: 0 } } },
                        plugins: {
                          legend: { position: "bottom" },
                          tooltip: {
                            callbacks: {
                              footer: () =>
                                selectedDistrict === "all" ? "Klik batang untuk fokus ke kawasan ini" : undefined,
                            },
                          },
                        },
                        onHover: (event, elements) => {
                          if (event.native?.target instanceof HTMLElement) {
                            event.native.target.style.cursor =
                              selectedDistrict === "all" && elements.length > 0 ? "pointer" : "default";
                          }
                        },
                        onClick: (_event, elements) => {
                          if (selectedDistrict !== "all" || elements.length === 0) return;
                          const clickedDistrict = districts[elements[0].index]?.[0];
                          if (clickedDistrict) setSelectedDistrict(clickedDistrict);
                        },
                      }}
                    />
                  </div>
                ) : (
                  <p className="text-b9 text-neutral-500">Belum ada data kawasan.</p>
                )}
                {selectedDistrict !== "all" && (
                  <button
                    type="button"
                    onClick={() => setSelectedDistrict("all")}
                    className="-mt-6 w-fit text-b9 font-semibold text-primary-teal-70 hover:underline"
                  >
                    &larr; Kembali ke semua kawasan
                  </button>
                )}

                {/* "Ringkasan Kawasan" (Kawasan/Radius/Periode/Jumlah Zona) from
                    the Figma frame is intentionally omitted here: this app's
                    data model (DashboardSummary.by_district) only carries
                    safe/moderate/danger counts per district -- there's no
                    radius or periode field to show honestly, so rather than
                    show a partially-fabricated box we skip it entirely and
                    keep the distribution summary below (which is fully real
                    data) in its place. */}
                <div className="grid grid-cols-3 gap-3 border-t border-border pt-4 text-center">
                  <p className="col-span-3 -mb-1 text-left text-fig-sh8 text-neutral-700">
                    Ringkasan Distribusi ({summary.total_grid_cells} Blok)
                  </p>
                  <div>
                    <p className="text-s6 font-semibold text-behavior-green-30">
                      {distribution.safe} ({pct(distribution.safe)}%)
                    </p>
                    <p className="text-b9 text-neutral-500">Relatif Aman</p>
                  </div>
                  <div>
                    <p className="text-s6 font-semibold text-behavior-yellow-30">
                      {distribution.moderate} ({pct(distribution.moderate)}%)
                    </p>
                    <p className="text-b9 text-neutral-500">Butuh Perhatian</p>
                  </div>
                  <div>
                    <p className="text-s6 font-semibold text-behavior-red-30">
                      {distribution.danger} ({pct(distribution.danger)}%)
                    </p>
                    <p className="text-b9 text-neutral-500">Perlu Dipantau</p>
                  </div>
                </div>
              </div>
            </div>

            <aside className="flex w-full shrink-0 flex-col gap-4 rounded-[12px] border-[1.2px] border-neutral-200 bg-neutral-0 p-4 shadow-[0px_4px_4px_rgba(0,0,0,0.02)] lg:w-80">
              <h2 className="text-fig-sh6 text-neutral-900">Riwayat Perubahan Status</h2>

              <Input
                type="text"
                placeholder="Cari Histori"
                value={historyQuery}
                onChange={(event) => setHistoryQuery(event.target.value)}
                startIcon={<Search className="size-4" />}
              />

              {/* Non-functional placeholder log -- see PLACEHOLDER_HISTORY
                  comment above. No real zone-status event log exists yet;
                  this UI ships ahead of that backend feature per explicit
                  user decision (2026-09-13), matching the RiwayatLengkapOverlay
                  placeholder pattern in umkm-self-tracker/overlays.tsx. */}
              <div className="flex max-h-64 flex-col gap-3 overflow-y-auto rounded-lg bg-primary-50 p-3">
                {filteredHistory.length > 0 ? (
                  filteredHistory.map((entry, index) => (
                    <div key={index} className="flex flex-col gap-0.5">
                      <p className="text-b9 text-neutral-600">{entry.time}</p>
                      <p className="text-b8 text-neutral-900">{entry.event}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-b9 text-neutral-500">Tidak ada histori yang cocok.</p>
                )}
              </div>

              <p className="text-b9 text-neutral-400">
                Terakhir update:{" "}
                {new Date(summary.computed_at).toLocaleString("id-ID", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}

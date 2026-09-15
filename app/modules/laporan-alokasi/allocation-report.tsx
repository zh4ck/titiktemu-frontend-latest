"use client";

import { ListFilter, UserSearch } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/app/components/ui/sheet";
import { Skeleton } from "@/app/components/ui/skeleton";
import { usePolicy } from "@/app/hooks/use-policy";
import { useReallocationRequests, useReviewReallocationRequest } from "@/app/hooks/use-reallocation-requests";
import { regionLabel } from "@/app/lib/format";
import type { PolicyRecommendation } from "@/app/types/umkm";
import type { ReallocationRequestStatus } from "@/app/types/reallocation-request";

const TYPE_LABEL: Record<PolicyRecommendation["recommendation_type"], string> = {
  mitigasi: "Mitigasi",
  realokasi: "Realokasi",
  pemantauan: "Pemantauan",
};

const FILTERS = [undefined, "mitigasi", "realokasi", "pemantauan"] as const;

// Same tier thresholds as vulnerabilityTier() in esg-dashboard.tsx, mapped to
// the behavior-* color tokens instead of a plain label so the index reads as
// a severity signal in this table (rendah=green, sedang=yellow, tinggi=red).
function vulnerabilityColor(index: number): string {
  if (index >= 0.66) return "text-behavior-red-30";
  if (index >= 0.33) return "text-behavior-yellow-30";
  return "text-behavior-green-30";
}

function vulnerabilityTierLabel(index: number): string {
  if (index >= 0.66) return "Tinggi";
  if (index >= 0.33) return "Sedang";
  return "Rendah";
}

function NarrativeCell({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > 160;
  const shown = expanded || !isLong ? text : `${text.slice(0, 160)}...`;

  return (
    <p className="text-b9 text-neutral-700">
      {shown}{" "}
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="font-semibold text-primary-600 hover:underline"
        >
          {expanded ? "See less..." : "See more..."}
        </button>
      )}
    </p>
  );
}

const TABS = [
  { key: "ai", label: "Rekomendasi AI" },
  { key: "pengajuan", label: "Pengajuan Realokasi Pengguna" },
] as const;

export default function AllocationReport() {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("ai");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>(undefined);
  const [search, setSearch] = useState("");
  const [detailItem, setDetailItem] = useState<PolicyRecommendation | null>(null);
  const { data, isLoading, isError } = usePolicy(filter);

  const recommendations = useMemo(() => {
    const all = data ?? [];
    if (!search.trim()) return all;
    const query = search.trim().toLowerCase();
    return all.filter(
      (item) =>
        item.grid_id.toLowerCase().includes(query) ||
        (item.district_name ?? "").toLowerCase().includes(query) ||
        item.narrative.toLowerCase().includes(query),
    );
  }, [data, search]);

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-6">
      <header className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-sans text-fig-sh4 text-primary-teal-70">Laporan Alokasi</h1>
          <p className="text-[16px] text-neutral-900">
            Usulan pemanfaatan ruang per blok beserta dasar pertimbangannya.
          </p>
        </div>
        {tab === "ai" && (
          <div className="flex w-full items-center gap-3 rounded-[12px] bg-neutral-100 px-4 py-3 shadow-[0px_4px_32px_0px_rgba(0,0,0,0.04)] sm:w-[399px]">
            <UserSearch className="size-5 shrink-0 text-primary-teal-70" aria-hidden="true" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari Laporan"
              aria-label="Cari laporan alokasi"
              className="h-auto border-none bg-transparent p-0 text-b7 text-neutral-900 shadow-none hover:border-none focus:border-none focus:ring-0"
            />
            <ListFilter className="size-5 shrink-0 text-neutral-500" aria-hidden="true" />
          </div>
        )}
      </header>

      <div className="flex gap-2 border-b border-neutral-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            aria-pressed={tab === t.key}
            className={`px-4 py-2 text-b8 font-semibold transition-colors ${
              tab === t.key
                ? "border-b-2 border-primary-teal-60 text-primary-teal-70"
                : "text-neutral-500 hover:text-neutral-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "pengajuan" ? (
        <ReallocationRequestsPanel />
      ) : (
        <>
      <div className="flex flex-wrap gap-3">
        {FILTERS.map((type) => (
          <button
            key={type ?? "all"}
            type="button"
            onClick={() => setFilter(type)}
            aria-pressed={filter === type}
            className={`rounded-[23px] px-5 py-2 text-[16px] transition-colors ${
              filter === type
                ? "bg-primary-teal-60 text-white"
                : "border-[1.6px] border-primary-teal-60 bg-neutral-50 text-primary-teal-70"
            }`}
          >
            {type ? TYPE_LABEL[type] : "Semua Laporan"}
          </button>
        ))}
      </div>

      {isError && (
        <p className="text-b8 text-destructive">
          Tidak dapat memuat laporan alokasi -- pastikan backend berjalan.
        </p>
      )}

      <div className="overflow-x-auto rounded-[12px] border-[0.8px] border-neutral-200">
        <table className="w-full text-left text-b9">
          <thead>
            <tr>
              <th className="w-40 p-3 font-sans text-fig-sh7 tracking-[0.64px] text-neutral-900">
                KAWASAN
              </th>
              <th className="w-44 p-3 font-sans text-fig-sh7 tracking-[0.64px] text-neutral-900">
                INDEKS KERENTANAN
              </th>
              <th className="p-3 font-sans text-fig-sh7 tracking-[0.64px] text-neutral-900">
                USULAN ALOKASI
              </th>
              <th className="w-24 p-3 font-sans text-fig-sh7 tracking-[0.64px] text-neutral-900">
                JENIS
              </th>
              <th className="w-28 p-3 font-sans text-fig-sh7 tracking-[0.64px] text-neutral-900">
                DETAIL
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading &&
              Array.from({ length: 3 }).map((_, index) => (
                <tr key={index} className="border-b border-neutral-200 last:border-0">
                  <td className="p-3" colSpan={5}>
                    <Skeleton className="h-12 w-full" />
                  </td>
                </tr>
              ))}
            {!isLoading && recommendations.length === 0 && (
              <tr>
                <td className="p-6 text-center text-neutral-500" colSpan={5}>
                  Belum ada laporan alokasi. Laporan dibuat otomatis oleh AI untuk setiap grid berstatus
                  waspada/bahaya pada siklus batch berikutnya -- coba lagi setelah batch run berikutnya selesai.
                </td>
              </tr>
            )}
            {!isLoading &&
              recommendations.map((item) => (
                <tr key={item.grid_id} className="border-b border-neutral-200 align-top last:border-0">
                  <td className="p-3 font-medium text-neutral-900">{regionLabel(item.district_name)}</td>
                  <td className="p-3">
                    <span className={`font-medium ${vulnerabilityColor(item.vulnerability_index)}`}>
                      {vulnerabilityTierLabel(item.vulnerability_index)}
                    </span>
                    <br />
                    <span className="text-neutral-500">{item.vulnerability_index.toFixed(3)}</span>
                  </td>
                  <td className="p-3">
                    <NarrativeCell text={item.narrative} />
                  </td>
                  <td className="p-3 text-neutral-600">{TYPE_LABEL[item.recommendation_type]}</td>
                  <td className="p-3">
                    <Button
                      size="sm"
                      onClick={() => setDetailItem(item)}
                      className="rounded-[8px] bg-primary-teal-60 px-3 py-3 text-white shadow-[0px_4px_32px_0px_rgba(0,0,0,0.04)] hover:bg-primary-teal-70"
                    >
                      Tinjau Usulan
                    </Button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <Sheet open={detailItem !== null} onOpenChange={(open) => !open && setDetailItem(null)}>
        <SheetContent>
          {detailItem && (
            <>
              <SheetHeader>
                <SheetTitle>{regionLabel(detailItem.district_name)}</SheetTitle>
                <SheetDescription>{TYPE_LABEL[detailItem.recommendation_type]}</SheetDescription>
              </SheetHeader>
              <div className="flex flex-col gap-3 px-4 pb-4">
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-b9">
                  <dt className="text-neutral-500">Indeks Kerentanan</dt>
                  <dd className="text-neutral-800">{detailItem.vulnerability_index.toFixed(3)}</dd>
                  <dt className="text-neutral-500">Dibuat</dt>
                  <dd className="text-neutral-800">
                    {new Date(detailItem.generated_at).toLocaleString("id-ID", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </dd>
                </dl>
                <div>
                  <p className="mb-1 text-b9 font-semibold text-neutral-500">Usulan Alokasi</p>
                  <p className="text-b9 text-neutral-700">{detailItem.narrative}</p>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
        </>
      )}
    </div>
  );
}

const REQUEST_STATUS_LABEL: Record<ReallocationRequestStatus, string> = {
  pending: "Menunggu",
  approved: "Disetujui",
  rejected: "Ditolak",
};

const REQUEST_STATUS_CHIP: Record<ReallocationRequestStatus, string> = {
  pending: "bg-behavior-yellow-10 text-behavior-yellow-30",
  approved: "bg-behavior-green-10 text-behavior-green-30",
  rejected: "bg-behavior-red-10 text-behavior-red-30",
};

/**
 * "Pengajuan Realokasi Pengguna" tab -- operator review queue for
 * reallocation requests UMKM users submit from app/modules/reallocation
 * (a separate resource from the AI-generated policy recommendations above;
 * see app/types/reallocation-request.ts for why it isn't called
 * "Laporan Alokasi" in the backend).
 */
function ReallocationRequestsPanel() {
  const [statusFilter, setStatusFilter] = useState<ReallocationRequestStatus | undefined>("pending");
  const { data, isLoading, isError } = useReallocationRequests(statusFilter);
  const review = useReviewReallocationRequest();

  const statusFilters: (ReallocationRequestStatus | undefined)[] = [undefined, "pending", "approved", "rejected"];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-3">
        {statusFilters.map((status) => (
          <button
            key={status ?? "all"}
            type="button"
            onClick={() => setStatusFilter(status)}
            aria-pressed={statusFilter === status}
            className={`rounded-[23px] px-5 py-2 text-[16px] transition-colors ${
              statusFilter === status
                ? "bg-primary-teal-60 text-white"
                : "border-[1.6px] border-primary-teal-60 bg-neutral-50 text-primary-teal-70"
            }`}
          >
            {status ? REQUEST_STATUS_LABEL[status] : "Semua"}
          </button>
        ))}
      </div>

      {isError && (
        <p className="text-b8 text-destructive">Tidak dapat memuat pengajuan realokasi.</p>
      )}

      <div className="overflow-x-auto rounded-[12px] border-[0.8px] border-neutral-200">
        <table className="w-full text-left text-b9">
          <thead>
            <tr>
              <th className="p-3 font-sans text-fig-sh7 tracking-[0.64px] text-neutral-900">TUJUAN</th>
              <th className="p-3 font-sans text-fig-sh7 tracking-[0.64px] text-neutral-900">CATATAN</th>
              <th className="p-3 font-sans text-fig-sh7 tracking-[0.64px] text-neutral-900">STATUS</th>
              <th className="p-3 font-sans text-fig-sh7 tracking-[0.64px] text-neutral-900">AKSI</th>
            </tr>
          </thead>
          <tbody>
            {isLoading &&
              Array.from({ length: 3 }).map((_, index) => (
                <tr key={index} className="border-b border-neutral-200 last:border-0">
                  <td className="p-3" colSpan={4}>
                    <Skeleton className="h-12 w-full" />
                  </td>
                </tr>
              ))}
            {!isLoading && (data?.rows.length ?? 0) === 0 && (
              <tr>
                <td className="p-6 text-center text-neutral-500" colSpan={4}>
                  Belum ada pengajuan realokasi dari pengguna.
                </td>
              </tr>
            )}
            {!isLoading &&
              data?.rows.map((req) => (
                <tr key={req.id} className="border-b border-neutral-200 align-top last:border-0">
                  <td className="p-3 font-medium text-neutral-900">
                    {regionLabel(req.requested_district)}
                    {req.matching_score !== null && (
                      <>
                        <br />
                        <span className="text-neutral-500">Skor {req.matching_score.toFixed(1)}</span>
                      </>
                    )}
                  </td>
                  <td className="p-3 text-neutral-700">{req.note ?? "-"}</td>
                  <td className="p-3">
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-fig-sh9 ${REQUEST_STATUS_CHIP[req.status]}`}>
                      {REQUEST_STATUS_LABEL[req.status]}
                    </span>
                  </td>
                  <td className="p-3">
                    {req.status === "pending" ? (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          disabled={review.isPending}
                          onClick={() => review.mutate({ id: req.id, status: "approved" })}
                          className="rounded-[8px] bg-primary-teal-60 px-3 py-2 text-white hover:bg-primary-teal-70"
                        >
                          Setujui
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={review.isPending}
                          onClick={() => review.mutate({ id: req.id, status: "rejected" })}
                          className="rounded-[8px] border-behavior-red-20 px-3 py-2 text-behavior-red-20"
                        >
                          Tolak
                        </Button>
                      </div>
                    ) : (
                      <span className="text-neutral-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

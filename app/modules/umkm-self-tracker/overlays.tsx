"use client";

// Overlay/modal content for the UMKM Self-Tracker's operator workflow
// (Figma frames 15004:7690, 7856, 7869/7877, 7774/7820, 7829, 7751).
//
// UI-ONLY: this whole file is visual scaffolding, not a working approval
// workflow. There's no backend support yet for submission status, an
// audit trail, owner contact info, or field-documentation photos (see
// umkm-self-tracker.tsx's own comment on why operational status isn't
// fabricated from EWS data). Every button here is either a no-op or just
// closes the dialog -- nothing is persisted. Treat the copy/fields below
// that aren't sourced from `UmkmBusiness` as placeholder content standing
// in for a future real data source.

import { useState } from "react";
import { ChevronLeft, ChevronRight, Mail, X } from "lucide-react";
import { regionLabel } from "@/app/lib/format";
import type { UmkmBusiness } from "@/app/types/umkm";
import type { ZoneLabel } from "@/app/types/zones";

const ZONE_STATUS_LABEL: Record<ZoneLabel, string> = {
  aman: "Aktif",
  waspada: "Perlu Dipantau",
  bahaya: "Butuh Perhatian",
};

const ZONE_STATUS_CHIP: Record<ZoneLabel, string> = {
  aman: "bg-behavior-green-10 text-behavior-green-30",
  waspada: "bg-behavior-yellow-10 text-behavior-yellow-30",
  bahaya: "bg-behavior-red-10 text-behavior-red-30",
};

function ActionButton({
  variant = "solid",
  tone = "primary",
  onClick,
  children,
}: {
  variant?: "solid" | "outline";
  tone?: "primary" | "danger" | "muted";
  onClick?: () => void;
  children: React.ReactNode;
}) {
  const toneStyles = {
    primary:
      variant === "solid"
        ? "bg-primary-teal-60 text-neutral-0"
        : "border-[1.6px] border-primary-teal-60 text-primary-teal-60",
    danger: "bg-behavior-red-20 text-neutral-0",
    muted: "bg-neutral-200 text-neutral-400",
  }[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={tone === "muted"}
      className={`flex w-full items-center justify-center gap-3 rounded-lg p-3 text-fig-sh7 shadow-[0_4px_32px_rgba(0,0,0,0.04)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed ${toneStyles}`}
    >
      {children}
    </button>
  );
}

// --- Overlay Detail Usaha (15004:7690) --------------------------------

export function DetailUsahaOverlay({
  umkm,
  onClose,
  onOpenHistory,
  onOpenContact,
  onOpenDocs,
  onOpenApprove,
}: {
  umkm: UmkmBusiness;
  onClose: () => void;
  onOpenHistory: () => void;
  onOpenContact: () => void;
  onOpenDocs: () => void;
  onOpenApprove: () => void;
}) {
  return (
    <div className="flex flex-col gap-8 p-8">
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <p className="text-fig-sh5 text-neutral-900">{umkm.name ?? "Usaha"}</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="flex size-7 items-center justify-center text-neutral-500 hover:text-neutral-700"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex items-start justify-between gap-6">
          <dl className="flex flex-1 flex-col gap-4">
            <div className="flex flex-col gap-1">
              <dt className="text-b8 text-neutral-600">Kategori</dt>
              <dd className="text-b7 text-neutral-900">{umkm.category ?? "-"}</dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-b8 text-neutral-600">Lokasi</dt>
              <dd className="text-b7 text-neutral-900">{regionLabel(umkm.district_name)}</dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-b8 text-neutral-600">Jarak ke stasiun</dt>
              <dd className="text-b7 text-neutral-900">
                {umkm.dist_to_station_m !== null
                  ? `${Math.round(umkm.dist_to_station_m)} m dari pintu keluar stasiun`
                  : "-"}
              </dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-b8 text-neutral-600">Indeks Kerentanan</dt>
              <dd className="text-b7 text-neutral-900">
                {umkm.vulnerability_index !== null ? umkm.vulnerability_index.toFixed(3) : "-"}
              </dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-b8 text-neutral-600">Keyakinan Data</dt>
              <dd className="text-b7 text-neutral-900">
                {umkm.data_confidence !== null ? `${Math.round(umkm.data_confidence * 100)}%` : "-"}
              </dd>
            </div>
            {umkm.zone_label && (
              <div className="flex flex-col gap-1">
                <dt className="text-b8 text-neutral-600">Status</dt>
                <dd>
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-fig-sh8 ${ZONE_STATUS_CHIP[umkm.zone_label]}`}
                  >
                    {ZONE_STATUS_LABEL[umkm.zone_label]}
                  </span>
                </dd>
              </div>
            )}
            {/* No backend field for a human-written vulnerability rationale
                yet (only the numeric index above is real) -- placeholder
                copy standing in for that future field. */}
            <div className="flex flex-col gap-1">
              <dt className="text-b8 text-neutral-600">Alasan Kerentanan</dt>
              <dd className="text-b7 text-neutral-900">Beban sewa naik lebih cepat dari omzet</dd>
            </div>
          </dl>

          {/* Placeholder metadata -- no data-provenance table exists yet. */}
          <dl className="flex w-[220px] shrink-0 flex-col gap-4">
            <div className="flex flex-col gap-1">
              <dt className="text-b8 text-neutral-600">Sumber data</dt>
              <dd className="text-b7 text-neutral-900">{umkm.source ?? "-"}</dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-b8 text-neutral-600">Periode data</dt>
              <dd className="text-b7 text-neutral-900">Agu - Sep 2026</dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-b8 text-neutral-600">Terakhir diperbarui</dt>
              <dd className="text-b7 text-neutral-900">2 Sep 2026, 14:30</dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-b8 text-neutral-600">Keterbatasan Data</dt>
              <dd className="text-b7 text-neutral-900">
                Struk merupakan contoh transaksi, bukan catatan pendapatan
              </dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-b8 text-neutral-600">Dokumentasi Lapangan</dt>
              <dd>
                <button
                  type="button"
                  onClick={onOpenDocs}
                  className="text-fig-sh8 text-primary-teal-60 hover:underline"
                >
                  Lihat dokumentasi
                </button>
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <ActionButton onClick={onOpenApprove}>Tandai Untuk Program Subsidi</ActionButton>
        <div className="flex items-center gap-5">
          <ActionButton variant="outline" onClick={onOpenContact}>
            Hubungi Pemilik Usaha
          </ActionButton>
          <ActionButton variant="outline" onClick={onOpenHistory}>
            Lihat Riwayat Lengkap
          </ActionButton>
        </div>
      </div>
    </div>
  );
}

// --- Overlay Konfirmasi Setujui Usaha (15004:7856) ---------------------

export function ApproveConfirmOverlay({
  umkmName,
  onConfirm,
  onCancel,
}: {
  umkmName: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [dontShowAgain, setDontShowAgain] = useState(false);
  return (
    <div className="flex flex-col items-center gap-9 p-8">
      <p className="text-center text-fig-sh5 text-neutral-900">
        Setujui Pengajuan dari Usaha <span className="text-primary-teal-60">{umkmName}</span>?
      </p>
      <div className="flex w-full flex-col gap-3">
        <button
          type="button"
          onClick={() => setDontShowAgain((v) => !v)}
          aria-pressed={dontShowAgain}
          className="flex items-center gap-3 text-left"
        >
          <span
            className={`flex size-6 shrink-0 items-center justify-center rounded-md border-2 ${
              dontShowAgain ? "border-primary-teal-60 bg-primary-teal-60" : "border-neutral-300"
            }`}
          />
          <span className="text-b7 text-neutral-900">Jangan tampilkan ini lagi</span>
        </button>
        <ActionButton onClick={onConfirm}>Setujui</ActionButton>
        <ActionButton tone="danger" onClick={onCancel}>
          Batal
        </ActionButton>
      </div>
    </div>
  );
}

// --- Overlay Konfirmasi Tolak Usaha, Default + Filled (15004:7869/7877) -

export function RejectConfirmOverlay({
  umkmName,
  onConfirm,
  onCancel,
}: {
  umkmName: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState("");
  const filled = reason.trim().length > 0;
  return (
    <div className="flex flex-col items-center gap-9 p-8">
      <p className="text-center text-fig-sh5 text-neutral-900">
        Tolak Pengajuan dari Usaha <span className="text-primary-teal-60">{umkmName}</span>?
      </p>
      <div className="flex w-full flex-col gap-6">
        <p className="text-fig-b6 text-neutral-800">
          Berikan masukkan/alasan kepada pemilik usaha mengenai pembatalan pengajuan formulir dari usaha
          terkait.
        </p>
        <div className="flex flex-col gap-2">
          <p className="text-fig-sh7 text-primary-teal-70">
            Alasan/Masukan Penolakan Pengajuan <span className="text-behavior-red-20">*</span>
          </p>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Masukkan alasan disini"
            rows={3}
            className={`w-full resize-none rounded-lg p-3 text-b7 shadow-[0_4px_32px_rgba(0,0,0,0.04)] focus:outline-none ${
              filled
                ? "border-[0.8px] border-primary-teal-70 bg-neutral-50 text-primary-teal-70"
                : "bg-neutral-100 text-neutral-500"
            }`}
          />
        </div>
      </div>
      <div className="flex w-full flex-col gap-3">
        <ActionButton tone={filled ? "danger" : "muted"} onClick={() => filled && onConfirm(reason)}>
          Tolak & Kirim Alasan
        </ActionButton>
        <ActionButton onClick={onCancel}>Kembali</ActionButton>
      </div>
    </div>
  );
}

// --- Overlay Riwayat Lengkap, with entries + empty state (15004:7774/7820)

export type HistoryEntry = {
  date: string;
  action: string;
  actor: string;
  status: "Dalam Pengajuan" | "Disetujui" | "Ditolak";
};

const HISTORY_STATUS_COLOR: Record<HistoryEntry["status"], string> = {
  "Dalam Pengajuan": "text-primary-teal-60",
  Disetujui: "text-behavior-green-20",
  Ditolak: "text-behavior-red-20",
};

export function RiwayatLengkapOverlay({
  umkmName,
  history,
  onClose,
}: {
  umkmName: string;
  history: HistoryEntry[];
  onClose: () => void;
}) {
  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center gap-16 p-8">
        <div className="flex w-full flex-col gap-8">
          <p className="text-fig-sh5 text-neutral-900">Riwayat Lengkap</p>
          <div className="flex flex-col gap-1">
            <p className="text-b7 text-neutral-600">Nama Usaha</p>
            <p className="text-fig-b6 text-neutral-900">{umkmName}</p>
          </div>
        </div>
        <p className="text-fig-b6 text-neutral-600">Belum ada perubahan tercatat.</p>
        <ActionButton onClick={onClose}>Kembali</ActionButton>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 p-8">
      <div className="flex flex-col gap-1">
        <p className="text-fig-sh5 text-neutral-900">Riwayat Lengkap</p>
        <p className="text-fig-b6 text-neutral-600">{umkmName}</p>
      </div>
      <div className="flex flex-col gap-3">
        {history.map((entry, index) => (
          <div key={index} className="flex flex-wrap items-center justify-between gap-2 text-b7">
            <p className="w-28 shrink-0 text-neutral-700">{entry.date}</p>
            <p className="flex-1 text-neutral-700">{entry.action}</p>
            <p className="w-36 shrink-0 text-neutral-700">oleh {entry.actor}</p>
            <p className={`w-32 shrink-0 font-semibold ${HISTORY_STATUS_COLOR[entry.status]}`}>
              {entry.status}
            </p>
          </div>
        ))}
      </div>
      <ActionButton onClick={onClose}>Kembali</ActionButton>
    </div>
  );
}

// --- Overlay Hubungi Pemilik Usaha (15004:7829) ------------------------

export function HubungiPemilikOverlay({
  umkmName,
  onCancel,
}: {
  umkmName: string;
  onCancel: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-9 p-8 text-center">
      <div className="flex flex-col gap-6">
        <p className="text-fig-sh5 text-neutral-900">
          Hubungi Pemilik Usaha <span className="text-primary-teal-70">{umkmName}</span>?
        </p>
        <p className="text-fig-b6 text-neutral-800">
          Jika iya, pilih metode berikut untuk menghubungi pemilik usaha
        </p>
      </div>
      <div className="flex w-full flex-col gap-4">
        <div className="flex gap-4">
          <ActionButton>
            <Mail className="size-6" />
            G-mail
          </ActionButton>
          <ActionButton>WhatsApp</ActionButton>
        </div>
        <ActionButton tone="danger" onClick={onCancel}>
          Batal Hubungi
        </ActionButton>
      </div>
    </div>
  );
}

// --- Overlay Dokumentasi Lapangan (15004:7751) -------------------------

export function DokumentasiLapanganOverlay({
  umkmName,
  photos,
  onClose,
}: {
  umkmName: string;
  photos: string[];
  onClose: () => void;
}) {
  const [index, setIndex] = useState(0);
  const hasPhotos = photos.length > 0;

  return (
    <div className="flex flex-col gap-8 p-8">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-fig-sh5 text-neutral-900">Dokumentasi Lapangan</p>
          <p className="text-fig-b6 text-neutral-600">{umkmName}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup"
          className="flex size-7 items-center justify-center text-neutral-500 hover:text-neutral-700"
        >
          <X className="size-5" />
        </button>
      </div>

      {hasPhotos ? (
        <div className="flex flex-col items-center gap-3">
          <div className="relative h-[332px] w-full max-w-[500px] overflow-hidden rounded-xl bg-neutral-100">
            <img
              src={photos[index]}
              alt={`Dokumentasi ${index + 1}`}
              className="size-full object-cover"
            />
            {photos.length > 1 && (
              <div className="absolute inset-y-0 flex w-full items-center justify-between px-3">
                <button
                  type="button"
                  onClick={() => setIndex((i) => (i - 1 + photos.length) % photos.length)}
                  aria-label="Foto sebelumnya"
                  className="flex size-8 items-center justify-center rounded-full bg-neutral-0/40 backdrop-blur-sm"
                >
                  <ChevronLeft className="size-5 text-neutral-0" />
                </button>
                <button
                  type="button"
                  onClick={() => setIndex((i) => (i + 1) % photos.length)}
                  aria-label="Foto berikutnya"
                  className="flex size-8 items-center justify-center rounded-full bg-neutral-0/40 backdrop-blur-sm"
                >
                  <ChevronRight className="size-5 text-neutral-0" />
                </button>
              </div>
            )}
          </div>
          {photos.length > 1 && (
            <div className="flex gap-1.5">
              {photos.map((photo, i) => (
                <span
                  key={photo}
                  className={`h-1.5 w-4 rounded-full ${i === index ? "bg-primary-teal-60" : "bg-neutral-200"}`}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="text-b7 text-neutral-500">Belum ada dokumentasi lapangan untuk usaha ini.</p>
      )}
    </div>
  );
}

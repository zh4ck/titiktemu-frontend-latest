"use client";

// UMKM-facing self-service form for the "UMKM Self-Tracker" page.
//
// Fields here mirror what titiktemu-analytics' survey ingestion actually
// consumes (src/ingestion/umkm_survey.py: tenant_type, revenue_per_month,
// transaction_per_day high/normal/low split, transaction_per_buyer,
// rent amount+period, rent_expiry_date, rent_trend) instead of the
// earlier version's invented fields (a price-range dropdown, free-text
// "Titik Lokasi" instead of real coordinates) -- see
// app/types/self-report.ts. Submission now goes to a real backend
// endpoint (POST /api/umkm-self-reports); the draft/saved/pending/history
// workflow around it is still simulated client-side (persisted to
// localStorage) since there is no per-user submission-status endpoint yet,
// but the actual submitted data is real, not a demo fabrication.

import { useMemo, useState } from "react";
import {
  Alert,
  AlertAction,
  AlertClose,
  AlertDescription,
  AlertIcon,
  AlertTitle,
} from "@/app/components/ui/alert";
import { Dropdown, type DropdownOption } from "@/app/components/ui/dropdown";
import { FieldLabel, Input } from "@/app/components/ui/input";
import { FileInput } from "@/app/components/ui/file-input";
import { CheckCircle2, Info, LocateFixed, XCircle } from "lucide-react";
import { useCurrentLocation } from "@/app/hooks/use-current-location";
import { useSubmitSelfReport } from "@/app/hooks/use-self-reports";
import { useZoneLookup } from "@/app/hooks/use-zone-lookup";
import { useDashboardSummary } from "@/app/hooks/use-dashboard-summary";
import { useLocationStore } from "@/app/lib/location-store";
import { regionLabel } from "@/app/lib/format";
import { ConfidenceBadge } from "@/app/components/ui/confidence-badge";
import { Badge } from "@/app/components/ui/badge";
import type { BusinessCategory, RentPeriodUnit, TenantType } from "@/app/types/self-report";
import type { ZoneLabel } from "@/app/types/zones";

const ZONE_BADGE_VARIANT: Record<ZoneLabel, "secondary" | "default" | "primary"> = {
  aman: "secondary",
  waspada: "default",
  bahaya: "primary",
};

const STORAGE_PREFIX = "titiktemu:umkm-self-tracker:";
const FORM_KEY = `${STORAGE_PREFIX}form`;
const STATUS_KEY = `${STORAGE_PREFIX}status`;
const HISTORY_KEY = `${STORAGE_PREFIX}history`;
const HISTORY_LIMIT = 20;

type SubmissionStatus = "draft" | "saved" | "pending" | "approved" | "rejected";

type FormState = {
  fotoUsahaName: string;
  namaUsaha: string;
  deskripsi: string;
  kategori: BusinessCategory | "";
  tenantType: TenantType | "";
  latitude: string;
  longitude: string;
  luasTempatM2: string;
  targetPasar: string;
  hargaSewa: string;
  periodeSewa: RentPeriodUnit | "";
  tanggalBerakhirSewa: string;
  pendapatanPerBulan: string;
  transaksiTinggi: string;
  transaksiNormal: string;
  transaksiRendah: string;
  rataRataPerPembeli: string;
  trenSewaPersen: string;
  statusUsaha: string;
};

type HistoryEntry = {
  id: string;
  action: string;
  timestamp: string; // ISO -- real local timestamp of the action, not fabricated.
};

const EMPTY_FORM: FormState = {
  fotoUsahaName: "",
  namaUsaha: "",
  deskripsi: "",
  kategori: "",
  tenantType: "",
  latitude: "",
  longitude: "",
  luasTempatM2: "",
  targetPasar: "",
  hargaSewa: "",
  periodeSewa: "",
  tanggalBerakhirSewa: "",
  pendapatanPerBulan: "",
  transaksiTinggi: "",
  transaksiNormal: "",
  transaksiRendah: "",
  rataRataPerPembeli: "",
  trenSewaPersen: "",
  statusUsaha: "",
};

// Fixed option lists for the form's own dropdown choices -- these are just
// form inputs, not fabricated business data.
const KATEGORI_OPTIONS: DropdownOption[] = [
  { value: "makanan-ringan", label: "Makanan Ringan" },
  { value: "kuliner", label: "Kuliner" },
  { value: "kerajinan", label: "Kerajinan" },
  { value: "jasa", label: "Jasa" },
  { value: "dagang-retail", label: "Dagang / Retail" },
  { value: "lainnya", label: "Lainnya" },
];

// Mirrors titiktemu-analytics' TENANT_TYPE_MAP normalized values exactly
// (src/ingestion/umkm_survey.py) -- this is the field the pipeline's GWR
// modeling actually reads, distinct from the informal "Kategori" above.
const TENANT_TYPE_OPTIONS: DropdownOption[] = [
  { value: "umkm_tetap", label: "UMKM Tetap" },
  { value: "umkm_seasonal", label: "UMKM Musiman" },
  { value: "franchise_tetap", label: "Franchise Tetap" },
  { value: "franchise_seasonal", label: "Franchise Musiman" },
];

const RENT_PERIOD_OPTIONS: DropdownOption[] = [
  { value: "hari", label: "Per Hari" },
  { value: "bulan", label: "Per Bulan" },
  { value: "tahun", label: "Per Tahun" },
];

const STATUS_USAHA_OPTIONS: DropdownOption[] = [
  { value: "aktif", label: "Aktif" },
  { value: "non-aktif", label: "Non-Aktif" },
];

function isFormComplete(form: FormState): boolean {
  return (
    form.fotoUsahaName.trim().length > 0 &&
    form.namaUsaha.trim().length > 0 &&
    form.kategori.trim().length > 0 &&
    // Required: this is the real chain/franchise-vs-independent signal
    // titiktemu-analytics needs reliably captured (the old free-text
    // survey field this replaces left it null/wrong for most chains --
    // see that repo's TODO.md). A self-reporting owner always knows their
    // own tenancy type, unlike a third-party surveyor guessing.
    form.tenantType.trim().length > 0 &&
    form.latitude.trim().length > 0 &&
    form.longitude.trim().length > 0 &&
    form.statusUsaha.trim().length > 0
  );
}

function loadForm(): FormState {
  try {
    const raw = window.localStorage.getItem(FORM_KEY);
    if (!raw) return EMPTY_FORM;
    const parsed = JSON.parse(raw);
    return { ...EMPTY_FORM, ...parsed };
  } catch {
    return EMPTY_FORM;
  }
}

function loadStatus(): SubmissionStatus {
  try {
    const raw = window.localStorage.getItem(STATUS_KEY);
    if (
      raw === "draft" ||
      raw === "saved" ||
      raw === "pending" ||
      raw === "approved" ||
      raw === "rejected"
    ) {
      return raw;
    }
    return "draft";
  } catch {
    return "draft";
  }
}

function loadHistory(): HistoryEntry[] {
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveForm(form: FormState) {
  try {
    window.localStorage.setItem(FORM_KEY, JSON.stringify(form));
  } catch {
    // localStorage unavailable (private mode, quota, etc) -- degrade silently.
  }
}

function saveStatus(status: SubmissionStatus) {
  try {
    window.localStorage.setItem(STATUS_KEY, status);
  } catch {
    // ignore
  }
}

function saveHistory(history: HistoryEntry[]) {
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch {
    // ignore
  }
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return iso;
  const diffMs = Date.now() - then;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diffMs < minute) return "baru saja";
  if (diffMs < hour) return `${Math.floor(diffMs / minute)} menit lalu`;
  if (diffMs < day) return `${Math.floor(diffMs / hour)} jam lalu`;
  if (diffMs < 2 * day) return "kemarin";
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatFull(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function toNumberOrUndefined(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : undefined;
}

type BannerState = { variant: "info" | "success" | "error"; title: string; description: string } | null;

const STATUS_PANEL_LABEL: Record<Extract<SubmissionStatus, "pending" | "approved" | "rejected">, string> = {
  pending: "Menunggu Peninjauan",
  approved: "Aktif",
  rejected: "Ditolak",
};

const STATUS_PANEL_CHIP: Record<Extract<SubmissionStatus, "pending" | "approved" | "rejected">, string> = {
  pending: "bg-behavior-yellow-10 text-behavior-yellow-30",
  approved: "bg-behavior-green-10 text-behavior-green-30",
  rejected: "bg-behavior-red-10 text-behavior-red-30",
};

export default function UmkmSelfTrackerForm() {
  // Hydrated once from localStorage via lazy `useState` initializers (see
  // the same convention in profil-usaha.tsx) rather than an effect, so
  // there's no extra render pass and no cascading setState-in-effect.
  const [status, setStatus] = useState<SubmissionStatus>(() => loadStatus());
  const [form, setForm] = useState<FormState>(() => loadForm());
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory());
  const [banner, setBanner] = useState<BannerState>(null);
  const { location: currentLocation, status: locationStatus } = useCurrentLocation();
  const submitSelfReport = useSubmitSelfReport();
  const setLocationOverride = useLocationStore((s) => s.setOverride);

  // Once a business location has actually been submitted, that's the real
  // "informative dashboard" location -- not necessarily the form's current
  // (possibly still-being-edited) draft values. Persisted via `form` itself
  // (loadForm/saveForm already round-trip latitude/longitude), so it
  // survives reloads.
  const submittedLocation = useMemo(() => {
    const lat = toNumberOrUndefined(form.latitude);
    const lng = toNumberOrUndefined(form.longitude);
    return lat !== undefined && lng !== undefined ? { lat, lng } : null;
  }, [form.latitude, form.longitude]);
  const hasSubmitted = status === "pending" || status === "approved" || status === "rejected";
  const { data: submittedZone, isLoading: isSubmittedZoneLoading } = useZoneLookup(
    hasSubmitted ? submittedLocation : null,
  );
  const { data: summary } = useDashboardSummary();
  const districtStats = submittedZone?.district_name ? summary?.by_district[submittedZone.district_name] : undefined;

  function pushHistory(action: string) {
    setHistory((prev) => {
      const next = [{ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, action, timestamp: new Date().toISOString() }, ...prev].slice(
        0,
        HISTORY_LIMIT,
      );
      saveHistory(next);
      return next;
    });
  }

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      saveForm(next);
      return next;
    });
  }

  function useMyLocation() {
    if (!currentLocation) return;
    updateField("latitude", String(currentLocation.lat));
    updateField("longitude", String(currentLocation.lng));
  }

  function handleSimpan() {
    if (!isFormComplete(form)) return;
    saveForm(form);
    setStatus("saved");
    saveStatus("saved");
    pushHistory("Data usaha disimpan");
  }

  function handleEdit() {
    setStatus("draft");
    saveStatus("draft");
    setBanner(null);
  }

  function handleAjukan() {
    const lat = toNumberOrUndefined(form.latitude);
    const lng = toNumberOrUndefined(form.longitude);
    if (lat === undefined || lng === undefined) {
      setBanner({
        variant: "error",
        title: "Lokasi belum lengkap",
        description: "Gunakan tombol \"Gunakan Lokasi Saat Ini\" atau isi koordinat secara manual.",
      });
      return;
    }

    submitSelfReport.mutate(
      {
        business_name: form.namaUsaha,
        latitude: lat,
        longitude: lng,
        description: form.deskripsi.trim() || undefined,
        category: form.kategori || undefined,
        tenant_type: form.tenantType || undefined,
        tenant_area_m2: toNumberOrUndefined(form.luasTempatM2),
        target_market: form.targetPasar.trim() || undefined,
        rent_price_amount: toNumberOrUndefined(form.hargaSewa),
        rent_period_unit: form.periodeSewa || undefined,
        rent_expiry_date: form.tanggalBerakhirSewa || undefined,
        revenue_per_month_idr: toNumberOrUndefined(form.pendapatanPerBulan),
        txn_high_idr: toNumberOrUndefined(form.transaksiTinggi),
        txn_normal_idr: toNumberOrUndefined(form.transaksiNormal),
        txn_low_idr: toNumberOrUndefined(form.transaksiRendah),
        transaction_per_buyer_idr: toNumberOrUndefined(form.rataRataPerPembeli),
        rent_trend_pct: toNumberOrUndefined(form.trenSewaPersen),
      },
      {
        onSuccess: () => {
          setStatus("pending");
          saveStatus("pending");
          pushHistory("Formulir diajukan");
          // The submitted business location becomes "where I am" across the
          // app (Beranda's map, etc.) -- it's a real, deliberately-entered
          // coordinate, a better signal than raw device GPS for "where is
          // this user's business."
          setLocationOverride({ lat, lng });
          setBanner({
            variant: "info",
            title: "Pengajuan Terkirim",
            description: "Formulir usaha kamu telah dikirim dan sedang menunggu peninjauan.",
          });
        },
        onError: () => {
          setBanner({
            variant: "error",
            title: "Gagal mengirim",
            description: "Formulir gagal dikirim ke server. Periksa koneksi Anda dan coba lagi.",
          });
        },
      },
    );
  }

  function handleDemoApprove() {
    setStatus("approved");
    saveStatus("approved");
    pushHistory("Pengajuan disetujui");
    setBanner({
      variant: "success",
      title: "Pengajuan disetujui",
      description: "Data usaha kamu telah disetujui dan kini aktif tercatat.",
    });
  }

  function handleDemoReject() {
    setStatus("rejected");
    saveStatus("rejected");
    pushHistory("Pengajuan ditolak");
    setBanner({
      variant: "error",
      title: "Pengajuan ditolak",
      description: "Pengajuan usaha kamu ditolak. Silakan periksa kembali data lalu ajukan ulang.",
    });
  }

  const complete = useMemo(() => isFormComplete(form), [form]);
  const isEditable = status === "draft";
  const showStatusPanel = status === "pending" || status === "approved" || status === "rejected";
  const lastUpdate = history[0]?.timestamp;

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col gap-6 overflow-y-auto p-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-fig-sh4 text-neutral-900">UMKM Self-Tracker</h1>
        <p className="text-b7 text-neutral-600">
          Kelola dan ajukan data usahamu sendiri untuk tercatat pada program TOD.
        </p>
      </header>

      {banner && (
        <Alert variant={banner.variant} className="w-full">
          <AlertIcon>
            {banner.variant === "info" && <Info className="size-6" />}
            {banner.variant === "success" && <CheckCircle2 className="size-6" />}
            {banner.variant === "error" && <XCircle className="size-6" />}
          </AlertIcon>
          <AlertTitle>{banner.title}</AlertTitle>
          <AlertDescription>{banner.description}</AlertDescription>
          <AlertAction>
            <AlertClose onClick={() => setBanner(null)} />
          </AlertAction>
        </Alert>
      )}

      <section className="flex flex-col gap-5 rounded-xl border border-neutral-300 bg-neutral-0 p-6">
        <h2 className="text-fig-sh6 text-neutral-900">Data Usaha</h2>

        <div className="flex flex-col gap-2">
          <FieldLabel required>Foto Usaha</FieldLabel>
          <FileInput
            disabled={!isEditable}
            selectedLabel={form.fotoUsahaName || undefined}
            placeholder="Unggah foto usaha"
            onFileChange={(file) => updateField("fotoUsahaName", file?.name ?? "")}
          />
        </div>

        <div className="flex flex-col gap-2">
          <FieldLabel required>Nama Usaha</FieldLabel>
          <Input
            value={form.namaUsaha}
            disabled={!isEditable}
            onChange={(event) => updateField("namaUsaha", event.target.value)}
            placeholder="Contoh: Warung Sari Rasa"
          />
        </div>

        <div className="flex flex-col gap-2">
          <FieldLabel>Deskripsi Produk</FieldLabel>
          <Input
            value={form.deskripsi}
            disabled={!isEditable}
            onChange={(event) => updateField("deskripsi", event.target.value)}
            placeholder="Contoh: Nasi goreng dan aneka minuman"
          />
        </div>

        <div className="flex flex-col gap-2">
          <FieldLabel required>Kategori</FieldLabel>
          <Dropdown
            options={KATEGORI_OPTIONS}
            value={form.kategori || undefined}
            disabled={!isEditable}
            onValueChange={(value) => updateField("kategori", value as BusinessCategory)}
            placeholder="Pilih kategori usaha"
          />
        </div>

        <div className="flex flex-col gap-2">
          <FieldLabel required>Jenis Penyewa</FieldLabel>
          <Dropdown
            options={TENANT_TYPE_OPTIONS}
            value={form.tenantType || undefined}
            disabled={!isEditable}
            onValueChange={(value) => updateField("tenantType", value as TenantType)}
            placeholder="Pilih jenis penyewa"
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <FieldLabel required>Titik Lokasi (Koordinat)</FieldLabel>
            <button
              type="button"
              disabled={!isEditable || !currentLocation}
              onClick={useMyLocation}
              className="flex items-center gap-1 text-b9 font-semibold text-primary-teal-70 hover:underline disabled:cursor-not-allowed disabled:text-neutral-400 disabled:no-underline"
            >
              <LocateFixed className="size-3.5" />
              Gunakan Lokasi Saat Ini
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input
              value={form.latitude}
              disabled={!isEditable}
              onChange={(event) => updateField("latitude", event.target.value)}
              placeholder="Latitude, contoh: -6.202065"
            />
            <Input
              value={form.longitude}
              disabled={!isEditable}
              onChange={(event) => updateField("longitude", event.target.value)}
              placeholder="Longitude, contoh: 106.821"
            />
          </div>
          {locationStatus === "denied" && (
            <p className="text-b9 text-behavior-red-30">
              Akses lokasi ditolak -- isi koordinat secara manual atau aktifkan izin lokasi browser.
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-2">
            <FieldLabel>Luas Tempat Usaha (m&sup2;)</FieldLabel>
            <Input
              type="number"
              value={form.luasTempatM2}
              disabled={!isEditable}
              onChange={(event) => updateField("luasTempatM2", event.target.value)}
              placeholder="Contoh: 12"
            />
          </div>
          <div className="flex flex-col gap-2">
            <FieldLabel>Target Pasar</FieldLabel>
            <Input
              value={form.targetPasar}
              disabled={!isEditable}
              onChange={(event) => updateField("targetPasar", event.target.value)}
              placeholder="Contoh: Pekerja kantoran"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-2">
            <FieldLabel>Harga Sewa</FieldLabel>
            <Input
              type="number"
              value={form.hargaSewa}
              disabled={!isEditable}
              onChange={(event) => updateField("hargaSewa", event.target.value)}
              placeholder="Contoh: 13000000"
            />
          </div>
          <div className="flex flex-col gap-2">
            <FieldLabel>Periode Sewa</FieldLabel>
            <Dropdown
              options={RENT_PERIOD_OPTIONS}
              value={form.periodeSewa || undefined}
              disabled={!isEditable}
              onValueChange={(value) => updateField("periodeSewa", value as RentPeriodUnit)}
              placeholder="Pilih periode"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-2">
            <FieldLabel>Tanggal Berakhir Sewa</FieldLabel>
            <Input
              type="date"
              value={form.tanggalBerakhirSewa}
              disabled={!isEditable}
              onChange={(event) => updateField("tanggalBerakhirSewa", event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <FieldLabel>Tren Sewa (%/tahun)</FieldLabel>
            <Input
              type="number"
              value={form.trenSewaPersen}
              disabled={!isEditable}
              onChange={(event) => updateField("trenSewaPersen", event.target.value)}
              placeholder="Contoh: 10"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <FieldLabel>Pendapatan per Bulan (Rp)</FieldLabel>
          <Input
            type="number"
            value={form.pendapatanPerBulan}
            disabled={!isEditable}
            onChange={(event) => updateField("pendapatanPerBulan", event.target.value)}
            placeholder="Contoh: 15000000"
          />
        </div>

        <div className="flex flex-col gap-2">
          <FieldLabel>Transaksi per Hari (Rp) -- Ramai / Normal / Sepi</FieldLabel>
          <div className="grid grid-cols-3 gap-2">
            <Input
              type="number"
              value={form.transaksiTinggi}
              disabled={!isEditable}
              onChange={(event) => updateField("transaksiTinggi", event.target.value)}
              placeholder="Ramai"
            />
            <Input
              type="number"
              value={form.transaksiNormal}
              disabled={!isEditable}
              onChange={(event) => updateField("transaksiNormal", event.target.value)}
              placeholder="Normal"
            />
            <Input
              type="number"
              value={form.transaksiRendah}
              disabled={!isEditable}
              onChange={(event) => updateField("transaksiRendah", event.target.value)}
              placeholder="Sepi"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <FieldLabel>Rata-rata Transaksi per Pembeli (Rp)</FieldLabel>
          <Input
            type="number"
            value={form.rataRataPerPembeli}
            disabled={!isEditable}
            onChange={(event) => updateField("rataRataPerPembeli", event.target.value)}
            placeholder="Contoh: 35000"
          />
        </div>

        <div className="flex flex-col gap-2">
          <FieldLabel required>Status Usaha</FieldLabel>
          <Dropdown
            options={STATUS_USAHA_OPTIONS}
            value={form.statusUsaha || undefined}
            disabled={!isEditable}
            onValueChange={(value) => updateField("statusUsaha", value)}
            placeholder="Pilih status usaha"
          />
        </div>

        {status === "draft" && (
          <button
            type="button"
            disabled={!complete}
            onClick={handleSimpan}
            className={`mt-2 flex h-12 w-full items-center justify-center rounded-lg text-fig-sh7 transition-opacity disabled:cursor-not-allowed ${
              complete ? "bg-primary-teal-60 text-neutral-0 hover:opacity-90" : "bg-neutral-200 text-neutral-500"
            }`}
          >
            Simpan Data
          </button>
        )}

        {status !== "draft" && (
          <div className="mt-2 flex items-center gap-4">
            <button
              type="button"
              onClick={handleEdit}
              className="flex h-12 flex-1 items-center justify-center rounded-lg border-[1.6px] border-primary-teal-60 text-fig-sh7 text-primary-teal-60 transition-opacity hover:opacity-90"
            >
              Edit Data
            </button>
            {status === "saved" && (
              <button
                type="button"
                disabled={submitSelfReport.isPending}
                onClick={handleAjukan}
                className="flex h-12 flex-1 items-center justify-center rounded-lg bg-primary-teal-60 text-fig-sh7 text-neutral-0 transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {submitSelfReport.isPending ? "Mengirim..." : "Ajukan Formulir"}
              </button>
            )}
          </div>
        )}
      </section>

      {/* Once the form has been submitted, the page stops being just an
          editable form and starts showing real metrics for the submitted
          location and its region -- reusing the same zone-lookup and
          dashboard-summary data every other page already relies on, not
          fabricated numbers. */}
      {hasSubmitted && submittedLocation && (
        <section className="flex flex-col gap-5 rounded-xl border border-neutral-300 bg-neutral-0 p-6">
          <h2 className="text-fig-sh7 text-neutral-900">Dashboard Usaha Anda</h2>

          {isSubmittedZoneLoading && (
            <div className="flex flex-col gap-2">
              <div className="h-4 w-1/3 animate-pulse rounded bg-neutral-200" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-neutral-200" />
            </div>
          )}

          {!isSubmittedZoneLoading && !submittedZone && (
            <p className="text-b8 text-neutral-500">
              Lokasi usaha Anda berada di luar area studi TitikTemu, sehingga metrik zona belum tersedia.
            </p>
          )}

          {submittedZone && (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant={ZONE_BADGE_VARIANT[submittedZone.zone_label]} selectable={false}>
                  {submittedZone.zone_label.toUpperCase()}
                </Badge>
                <ConfidenceBadge modelAccuracy={submittedZone.model_accuracy} />
                <span className="text-b8 text-neutral-600">{regionLabel(submittedZone.district_name)}</span>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-neutral-200 p-3">
                  <p className="text-b9 text-neutral-500">Indeks Kerentanan</p>
                  <p className="text-fig-sh6 text-neutral-900">
                    {submittedZone.vulnerability_index.toFixed(3)}
                  </p>
                </div>
                <div className="rounded-xl border border-neutral-200 p-3">
                  <p className="text-b9 text-neutral-500">Matching Score</p>
                  <p className="text-fig-sh6 text-neutral-900">{submittedZone.matching_score.toFixed(1)}</p>
                </div>
                {districtStats && (
                  <>
                    <div className="rounded-xl border border-neutral-200 p-3">
                      <p className="text-b9 text-neutral-500">Zona Bahaya di Kawasan</p>
                      <p className="text-fig-sh6 text-behavior-red-30">{districtStats.danger}</p>
                    </div>
                    <div className="rounded-xl border border-neutral-200 p-3">
                      <p className="text-b9 text-neutral-500">Zona Aman di Kawasan</p>
                      <p className="text-fig-sh6 text-behavior-green-30">{districtStats.safe}</p>
                    </div>
                  </>
                )}
              </div>

              {submittedZone.narrative && (
                <p className="whitespace-pre-line text-b8 text-neutral-700">{submittedZone.narrative}</p>
              )}
            </>
          )}
        </section>
      )}

      {showStatusPanel && (
        <section
          className={`flex flex-col gap-5 rounded-xl border border-neutral-300 bg-neutral-0 p-6 transition-opacity ${
            status === "pending" ? "opacity-40" : "opacity-100"
          }`}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-fig-sh7 text-neutral-900">Status Pengajuan</h2>
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-fig-sh8 ${STATUS_PANEL_CHIP[status as "pending" | "approved" | "rejected"]}`}
            >
              {STATUS_PANEL_LABEL[status as "pending" | "approved" | "rejected"]}
            </span>
          </div>
          {lastUpdate && (
            <p className="text-b9 text-neutral-500">Terakhir update pada {formatFull(lastUpdate)}</p>
          )}

          <div className="flex flex-col gap-1">
            <h3 className="text-fig-sh8 text-neutral-900">Riwayat Laporan</h3>
            <div className="flex flex-col divide-y divide-neutral-200 border-t border-neutral-200">
              {history.length === 0 && (
                <p className="py-3 text-b8 text-neutral-500">Belum ada riwayat.</p>
              )}
              {history.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between gap-3 py-3">
                  <span className="text-b8 text-neutral-800">{entry.action}</span>
                  <span className="shrink-0 text-b9 text-neutral-500">{formatRelative(entry.timestamp)}</span>
                </div>
              ))}
            </div>
          </div>

          {status === "pending" && (
            <p className="text-b9 text-neutral-400">
              ( demo: tandai{" "}
              <button type="button" onClick={handleDemoApprove} className="underline hover:text-primary-teal-60">
                disetujui
              </button>{" "}
              /{" "}
              <button type="button" onClick={handleDemoReject} className="underline hover:text-behavior-red-20">
                ditolak
              </button>{" "}
              -- status peninjauan operator sungguhan belum tersedia untuk laporan ini )
            </p>
          )}
        </section>
      )}
    </div>
  );
}

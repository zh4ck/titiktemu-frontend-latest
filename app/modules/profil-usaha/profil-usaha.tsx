"use client";

// Profil Pelaku Usaha (Figma frame 15004:7039) + its delete-confirm
// overlay (Figma frame 15004:7862).
//
// UI-ONLY, NO BACKEND: there is no endpoint for a UMKM to edit their own
// profile, no "kode pengelolaan" (management code) concept, no
// public-map-visibility toggle, no contact-consent toggle, and no
// delete-own-business endpoint anywhere in the backend. Everything on
// this page is local component state persisted to `localStorage` only
// (for demo continuity across reloads) -- nothing here is ever sent to a
// real API. The "kode pengelolaan" shown below is generated client-side
// once and cached locally; it is NOT a real backend-issued code.

import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/app/components/ui/dialog";

const STORAGE_KEYS = {
  form: "titiktemu:profil-usaha:form",
  tampilPeta: "titiktemu:profil-usaha:tampil-peta",
  tampilKontak: "titiktemu:profil-usaha:tampil-kontak",
  kodePengelolaan: "titiktemu:profil-usaha:kode-pengelolaan",
} as const;

type ProfilForm = {
  namaPemilik: string;
  whatsapp: string;
  email: string;
  username: string;
  password: string;
};

const EMPTY_FORM: ProfilForm = {
  namaPemilik: "",
  whatsapp: "",
  email: "",
  username: "",
  password: "",
};

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore (e.g. private browsing storage quota/availability errors) --
    // this is a demo convenience only, not a source of truth.
  }
}

function readBoolean(key: string, fallback: boolean): boolean {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    return raw === "true";
  } catch {
    return fallback;
  }
}

function writeBoolean(key: string, value: boolean) {
  try {
    window.localStorage.setItem(key, value ? "true" : "false");
  } catch {
    // Ignore -- see writeJson.
  }
}

// Generates a short fake management code (e.g. "K7X9-QP2M"). This stands
// in for a code that, in a real system, a backend would issue and own --
// there is no such backend endpoint today, so we fabricate one client-side
// and cache it so it stays stable across reloads for this browser only.
function generateFakeKodePengelolaan(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const randomChunk = () =>
    Array.from({ length: 4 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
  return `${randomChunk()}-${randomChunk()}`;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-fig-sh8 text-primary-teal-70">
      {children}
      <span className="ml-0.5 text-behavior-red-20">*</span>
    </label>
  );
}

function TextField({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabel>{label}</FieldLabel>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-lg bg-neutral-100 p-3 text-b8 text-neutral-900 shadow-[0px_4px_32px_rgba(0,0,0,0.04)] outline-none placeholder:text-neutral-500 focus:ring-2 focus:ring-primary-teal-60"
      />
    </div>
  );
}

// Plain accessible on/off pill toggle. Stands in for the Figma
// "basil:toggle-on-outline" icon-toggle without hardcoding that SVG.
function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={(event) => {
        // Prevent the click from also bubbling to the row's own onClick
        // below (this button is nested inside a row button/click target for
        // a larger tap area) -- without this, a tap on the switch itself
        // toggles twice (once here, once via the row) and visibly does
        // nothing.
        event.stopPropagation();
        onChange(!checked);
      }}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
        checked ? "bg-primary-teal-60" : "bg-neutral-300"
      }`}
    >
      <span
        className={`absolute top-0.5 size-5 rounded-full bg-neutral-0 shadow-sm transition-transform ${
          checked ? "translate-x-[22px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

// Reads (and, if missing, creates) the cached fake management code. Lives
// outside the component so it stays a plain lazy `useState` initializer --
// per the read-storage-once pattern below, not a setState-in-effect.
function loadOrCreateKodePengelolaan(): string {
  let kode = "";
  try {
    kode = window.localStorage.getItem(STORAGE_KEYS.kodePengelolaan) ?? "";
  } catch {
    kode = "";
  }
  if (!kode) {
    kode = generateFakeKodePengelolaan();
    try {
      window.localStorage.setItem(STORAGE_KEYS.kodePengelolaan, kode);
    } catch {
      // Ignore -- code just won't persist across reloads this session.
    }
  }
  return kode;
}

export default function ProfilUsaha() {
  // Hydrated once from localStorage via lazy `useState` initializers
  // (rather than an effect) so there's no synchronous setState-in-effect
  // render cascade for this one-time, client-only local read.
  const [form, setForm] = useState<ProfilForm>(() => readJson(STORAGE_KEYS.form, EMPTY_FORM));
  const [tampilPeta, setTampilPeta] = useState(() => readBoolean(STORAGE_KEYS.tampilPeta, false));
  const [tampilKontak, setTampilKontak] = useState(() =>
    readBoolean(STORAGE_KEYS.tampilKontak, false),
  );
  const [kodePengelolaan] = useState(() => loadOrCreateKodePengelolaan());
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);

  useEffect(() => {
    writeBoolean(STORAGE_KEYS.tampilPeta, tampilPeta);
  }, [tampilPeta]);

  useEffect(() => {
    writeBoolean(STORAGE_KEYS.tampilKontak, tampilKontak);
  }, [tampilKontak]);

  function updateField(field: keyof ProfilForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSaveMessage(null);
  }

  function handleEditProfil() {
    // No backend to send this to -- just persists locally so the demo
    // form survives a reload.
    writeJson(STORAGE_KEYS.form, form);
    setSaveMessage("Perubahan disimpan (lokal, belum terhubung ke server).");
  }

  async function handleSalinKode() {
    try {
      await navigator.clipboard.writeText(kodePengelolaan);
      setCopyMessage("Kode disalin.");
    } catch {
      setCopyMessage("Gagal menyalin kode.");
    }
    window.setTimeout(() => setCopyMessage(null), 2000);
  }

  function handleConfirmDelete() {
    // Local-only reset: there is no delete-business endpoint, so this
    // simply clears the locally persisted form/toggle state and resets
    // the UI. Nothing is sent to a server and no navigation happens.
    setForm(EMPTY_FORM);
    setTampilPeta(false);
    setTampilKontak(false);
    try {
      window.localStorage.removeItem(STORAGE_KEYS.form);
      window.localStorage.removeItem(STORAGE_KEYS.tampilPeta);
      window.localStorage.removeItem(STORAGE_KEYS.tampilKontak);
    } catch {
      // Ignore.
    }
    setDeleteOpen(false);
    setDeleteMessage("Data usaha (lokal) telah dihapus dari perangkat ini.");
  }

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto p-6">
      <header>
        <h1 className="text-fig-sh4 text-neutral-900">Profil Pelaku Usaha</h1>
        <p className="text-b8 text-neutral-600">
          Kelola data akun dan preferensi tampilan usaha Anda di peta publik.
        </p>
      </header>

      <div className="flex flex-col gap-8 lg:flex-row lg:gap-12">
        {/* Left column: Data Pemilik */}
        <div className="flex w-full max-w-[440px] flex-col gap-5">
          <h2 className="text-fig-sh6 text-neutral-900">Data Pemilik</h2>

          <TextField
            label="Nama pemilik usaha"
            value={form.namaPemilik}
            onChange={(value) => updateField("namaPemilik", value)}
          />
          <TextField
            label="Nomor WhatsApp"
            type="tel"
            value={form.whatsapp}
            onChange={(value) => updateField("whatsapp", value)}
          />
          <TextField
            label="Email"
            type="email"
            value={form.email}
            onChange={(value) => updateField("email", value)}
          />
          <TextField
            label="Username"
            value={form.username}
            onChange={(value) => updateField("username", value)}
          />
          <TextField
            label="Password"
            type="password"
            value={form.password}
            onChange={(value) => updateField("password", value)}
          />

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={handleEditProfil}
              className="w-[200px] rounded-lg bg-primary-teal-60 p-3 text-fig-sh8 text-neutral-0 transition-opacity hover:opacity-90"
            >
              Edit Profil
            </button>
            {saveMessage && <p className="text-b9 text-neutral-600">{saveMessage}</p>}
          </div>
        </div>

        {/* Right column: Pengaturan Tampil / Akses Pengelolaan / Hapus Data */}
        <div className="flex w-full flex-col gap-8">
          <section className="flex flex-col gap-3">
            <div>
              <h2 className="text-fig-sh6 text-neutral-900">Pengaturan Tampil</h2>
              <p className="text-b8 text-neutral-600">
                Dua pilihan ini terpisah. Anda bisa tampil di peta tanpa bersedia dihubungi.
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-300">
              {/* The whole row toggles, not just the small 44x24 switch --
                  tapping the label text used to do nothing, which read as
                  "the toggle doesn't work" on touch devices where missing
                  the switch itself by a few pixels is easy. A <div> (not a
                  nested <button>) wraps the row, since the real <Toggle>
                  button is already inside it and buttons can't nest. */}
              <div
                onClick={() => setTampilPeta((prev) => !prev)}
                className="flex w-full cursor-pointer items-center justify-between gap-4 p-4"
              >
                <span className="text-b7 text-neutral-900">Tampil di peta publik</span>
                <Toggle checked={tampilPeta} onChange={setTampilPeta} label="Tampil di peta publik" />
              </div>
              <div className="h-px bg-neutral-300" />
              <div
                onClick={() => setTampilKontak((prev) => !prev)}
                className="flex w-full cursor-pointer items-center justify-between gap-4 p-4"
              >
                <span className="text-b7 text-neutral-900">Bersedia dihubungi pengunjung</span>
                <Toggle
                  checked={tampilKontak}
                  onChange={setTampilKontak}
                  label="Bersedia dihubungi pengunjung"
                />
              </div>
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <div>
              <h2 className="text-fig-sh6 text-neutral-900">Akses Pengelolaan</h2>
              <p className="text-b8 text-neutral-600">
                Gunakan kode ini untuk mengelola data usaha Anda tanpa akun.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                readOnly
                value={kodePengelolaan}
                aria-label="Kode pengelolaan"
                className="flex-1 rounded-lg bg-neutral-100 p-3 text-b8 text-neutral-500 shadow-[0px_4px_32px_rgba(0,0,0,0.04)] outline-none"
              />
              <button
                type="button"
                onClick={handleSalinKode}
                className="shrink-0 rounded-lg bg-primary-teal-60 p-3 text-fig-sh8 text-neutral-0 transition-opacity hover:opacity-90"
              >
                Salin kode
              </button>
            </div>
            {copyMessage && <p className="text-b9 text-neutral-600">{copyMessage}</p>}
          </section>

          <section className="flex flex-col gap-3">
            <div>
              <h2 className="text-fig-sh6 text-neutral-900">Hapus Data</h2>
              <p className="text-b8 text-neutral-600">
                Data akan dihapus dari peta publik dalam 7 hari kerja.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setDeleteMessage(null);
                setDeleteOpen(true);
              }}
              className="w-full rounded-lg bg-behavior-red-20 p-3 text-fig-sh8 text-neutral-0 transition-opacity hover:opacity-90"
            >
              Hapus data usaha saya
            </button>
            {deleteMessage && <p className="text-b9 text-neutral-600">{deleteMessage}</p>}
          </section>
        </div>
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <div className="flex flex-col gap-6 p-8">
            <div className="flex flex-col gap-2">
              <p className="text-center text-[24px] font-semibold text-neutral-900">
                Anda yakin ingin menghapus data usaha Anda?
              </p>
              <p className="text-center text-[20px] text-neutral-600">
                Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="w-full rounded-lg bg-behavior-red-20 p-3 text-fig-sh8 text-neutral-0 transition-opacity hover:opacity-90"
              >
                Hapus Data Usaha
              </button>
              <button
                type="button"
                onClick={() => setDeleteOpen(false)}
                className="w-full rounded-lg bg-primary-teal-60 p-3 text-fig-sh8 text-neutral-0 transition-opacity hover:opacity-90"
              >
                Kembali
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

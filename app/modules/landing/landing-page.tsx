"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  BarChart3,
  ChevronDown,
  Home as HomeIcon,
  Map as MapIcon,
  MapPin,
  Menu,
  Shield,
  Sparkles,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { useGrid } from "@/app/hooks/use-grid";
import { useModelAccuracy } from "@/app/hooks/use-model-accuracy";
import { useCurrentLocation } from "@/app/hooks/use-current-location";
import { useZoneLookup } from "@/app/hooks/use-zone-lookup";
import { useUmkm } from "@/app/hooks/use-umkm";
import { Dropdown, type DropdownOption } from "@/app/components/ui/dropdown";
import type { UmkmTenantCategory } from "@/app/types/umkm";

const LeafletMap = dynamic(
  () =>
    import("@/app/components/map/leaflet-map").then((mod) => mod.LeafletMap),
  { ssr: false },
);
const GeoJsonLayer = dynamic(
  () =>
    import("@/app/components/map/geojson-layer").then(
      (mod) => mod.GeoJsonLayer,
    ),
  { ssr: false },
);
const CurrentLocationMarker = dynamic(
  () =>
    import("@/app/components/map/current-location-marker").then(
      (mod) => mod.CurrentLocationMarker,
    ),
  { ssr: false },
);
const UmkmMarkerLayer = dynamic(
  () =>
    import("@/app/components/map/umkm-marker-layer").then(
      (mod) => mod.UmkmMarkerLayer,
    ),
  { ssr: false },
);

// Same aman/waspada/bahaya convention as geojson-layer.tsx/home.tsx --
// colors the visitor's own pulse marker by their real zone status instead
// of a fixed color. Neutral teal (not red) when the zone is still loading
// or the visitor is outside the study area, so "we don't know yet" is
// never mistaken for "you're in danger."
const EWS_MARKER_COLOR: Record<number, string> = {
  0: "#39b332",
  1: "#eab308",
  2: "#dc2626",
};
const NEUTRAL_MARKER_COLOR = "#00aaaa";

const NAV_LINKS = [
  { label: "Fitur", href: "#fitur" },
  { label: "Panduan", href: "#panduan" },
  { label: "Peta", href: "#peta" },
  { label: "Tentang Kami", href: "#tentang-kami" },
];

type Role = {
  key: string;
  icon: LucideIcon;
  iconBg: string;
  tag: string;
  heading: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
};

const ROLES: Role[] = [
  {
    key: "umkm",
    icon: HomeIcon,
    iconBg: "bg-primary-teal-60",
    tag: "UMKM",
    heading: "Usaha lokal lebih terlihat.",
    body: "Isi profil usaha dan tentukan izin untuk tampil di peta serta mengikuti pencocokan tenant.",
    ctaLabel: "Daftarkan UMKM",
    ctaHref: "/signup/",
  },
  {
    key: "komuter",
    icon: Users,
    iconBg: "bg-brand-forest-600",
    tag: "KOMUTER",
    heading: "Temukan usaha di perjalanan.",
    body: "Jelajahi UMKM sekitar stasiun berdasarkan kategori, kisaran harga, dan radius.",
    ctaLabel: "Jelajahi UMKM",
    ctaHref: "/beranda/",
  },
  {
    key: "operator",
    icon: Shield,
    iconBg: "bg-brand-forest-900",
    tag: "OPERATOR",
    heading: "Tinjau kandidat beserta alasannya.",
    body: "Pahami kondisi kawasan dan kecocokan calon tenant sebagai bahan pertimbangan.",
    ctaLabel: "Log In",
    ctaHref: "/login/",
  },
];

type Feature = {
  icon: LucideIcon;
  iconBg: string;
  tag: string;
  title: string;
  body: string;
};

const FEATURES: Feature[] = [
  {
    icon: MapIcon,
    iconBg: "bg-primary-teal-60",
    tag: "DISCOVERY MAP",
    title: "Temukan UMKM di peta",
    body: "Peta publik tanpa login. Cari berdasarkan kategori, kisaran harga, dan radius sekitar stasiun. Profil usaha tampil setelah pemeriksaan dan sesuai izin pemilik.",
  },
  {
    icon: HomeIcon,
    iconBg: "bg-brand-forest-600",
    tag: "UMKM SELF-TRACKER",
    title: "Kenalkan usaha Anda",
    body: "Pengisian profil ringan: lokasi, informasi usaha, dan pilihan izin publik serta matching yang terpisah. Status pemeriksaan ditampilkan dengan jelas sebelum publikasi.",
  },
  {
    icon: BarChart3,
    iconBg: "bg-brand-forest-900",
    tag: "AREA OPERATOR",
    title: "Pahami kondisi kawasan",
    body: "Untuk operator dan admin. Informasi tekanan komersial, peluang pasar, dan tingkat keyakinan data disajikan sebagai bahan pertimbangan, bukan keputusan otomatis.",
  },
  {
    icon: Sparkles,
    iconBg: "bg-primary-teal-70",
    tag: "TENANT MATCHING & AI INSIGHT",
    title: "Periksa kecocokan dan alasannya",
    body: "Matching berbasis aturan menghasilkan kandidat tenant beserta faktor kecocokan. AI Insight membantu menjelaskan informasi yang tersedia. Keputusan akhir tetap pada operator.",
  },
];

type Step = {
  icon: LucideIcon;
  iconBg: string;
  title: string;
  body: string;
};

const STEPS: Step[] = [
  {
    icon: MapIcon,
    iconBg: "bg-primary-teal-60",
    title: "Mulai dari peta",
    body: "Pahami pencarian berdasarkan kategori, harga, dan radius. Lihat profil usaha yang sudah diverifikasi.",
  },
  {
    icon: HomeIcon,
    iconBg: "bg-brand-forest-600",
    title: "Daftarkan usaha Anda",
    body: "Isi profil, atur izin publik dan matching, dan pantau status pemeriksaan sebelum tampil di peta.",
  },
  {
    icon: BarChart3,
    iconBg: "bg-brand-forest-900",
    title: "Pahami analisis dan AI",
    body: "Baca faktor kecocokan, sumber data, periode, kualitas, dan alasan rekomendasi untuk operator kawasan.",
  },
];

const FAQS = [
  {
    q: "Apakah komuter perlu login untuk menjelajahi peta?",
    a: "Tidak. Discovery Map dapat dijelajahi tanpa login -- Anda hanya perlu masuk saat ingin mendaftarkan usaha atau meninjau kandidat sebagai operator.",
  },
  {
    q: "Bagaimana profil UMKM bisa tampil di peta?",
    a: "Pemilik usaha mengisi profil melalui UMKM Self-Tracker, lalu profil akan tampil di peta publik setelah melalui proses pemeriksaan dan sesuai izin yang dipilih pemilik.",
  },
  {
    q: "Apa peran AI Insight dalam keputusan tenant?",
    a: "AI Insight membantu menjelaskan faktor kecocokan yang dihasilkan sistem pencocokan tenant. Ini adalah alat bantu penjelasan, bukan pengganti keputusan operator.",
  },
  {
    q: "Bagaimana radius pencarian dihitung?",
    a: "Radius dihitung dari jarak ke stasiun transit terdekat, lalu disaring lebih lanjut berdasarkan kategori dan kisaran harga yang Anda pilih di peta.",
  },
];

type TeamMember = {
  name: string;
  role: string;
  accent: string;
  profile: string;
};

const TEAM: TeamMember[] = [
  {
    name: "Umar Faiz Rahman",
    role: "Project Leader",
    accent: "bg-primary-teal-60",
    profile: "/img/fizi.png",
  },
  {
    name: "Steven Dyanizha Ananda",
    role: "Geospatial Data Scientist",
    accent: "bg-brand-forest-600",
    profile: "/img/tipen.png",
  },
  {
    name: "Zayyan Ramadzaki Firdaus",
    role: "Fullstack WebGIS Developer",
    accent: "bg-brand-forest-900",
    profile: "/img/zayyan.png",
  },
  {
    name: "Rahel Meilinda Aruan",
    role: "UI/UX Designer",
    accent: "bg-primary-teal-70",
    profile: "/img/acel.png",
  },
  {
    name: "Salwa Alifa Putri",
    role: "Product & Business Impact Strategist",
    accent: "bg-brand-forest-700",
    profile: "/img/salwa.png",
  },
];

// Real, working filters (backed by GET /api/umkm's category/min_price/
// max_price/max_dist_m params) -- matches design/map-landing-page.png's
// search/filter row, but this is the actual live preview, not a decorative
// mockup. "Kategori" filters on the real tenant-type value the analytics
// pipeline populates on umkm_businesses.category (umkm_tetap/umkm_seasonal/
// franchise_tetap) -- verified directly against the live database that
// there is no food/retail/service-style "business category" column
// anywhere in the real data, so the options here are the honest ones.
const CATEGORY_OPTIONS: DropdownOption[] = [
  { value: "all", label: "Semua Jenis" },
  { value: "umkm_tetap", label: "UMKM Tetap" },
  { value: "umkm_seasonal", label: "UMKM Musiman" },
  { value: "franchise_tetap", label: "Franchise Tetap" },
];

type PriceBand = { value: string; label: string; min?: number; max?: number };
// Bands chosen from the real reference_price_per_txn_idr range in the
// live data (Rp10.000-Rp150.000), not arbitrary round numbers.
const PRICE_RANGE_OPTIONS: PriceBand[] = [
  { value: "all", label: "Semua Harga" },
  { value: "under-50k", label: "< Rp 50.000", max: 50_000 },
  { value: "50k-100k", label: "Rp 50.000 - Rp 100.000", min: 50_000, max: 100_000 },
  { value: "over-100k", label: "> Rp 100.000", min: 100_000 },
];

type RadiusBand = { value: string; label: string; max?: number };
// Thresholds chosen from the real dist_to_station_m range in the live
// data (18m-4.6km, avg ~1km).
const RADIUS_OPTIONS: RadiusBand[] = [
  { value: "all", label: "Semua Radius" },
  { value: "500", label: "< 500 m", max: 500 },
  { value: "1000", label: "< 1 km", max: 1_000 },
  { value: "2000", label: "< 2 km", max: 2_000 },
];

const FILTER_DROPDOWN_CLASSNAME =
  "h-auto w-auto min-w-0 rounded-xl border-neutral-200 bg-neutral-0 px-4 py-3 font-jakarta text-b8 text-neutral-600 shadow-sm hover:bg-neutral-50 focus-visible:ring-primary-teal-60";

function SectionHeading({
  title,
  subtitle,
  className = "",
}: {
  title: string;
  subtitle?: string;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center gap-2 text-center ${className}`}
    >
      <h2 className="text-h5 font-jakarta font-bold text-brand-forest-900 sm:text-h3">
        {title}
      </h2>
      {subtitle && (
        <p className="max-w-xl font-jakarta text-b8 text-neutral-600 sm:text-b7">
          {subtitle}
        </p>
      )}
    </div>
  );
}

function RoleCard({ role }: { role: Role }) {
  const Icon = role.icon;
  return (
    <div className="flex w-full flex-col gap-4 rounded-2xl border border-neutral-200 bg-neutral-0/60 p-6">
      <span
        className={`flex size-10 shrink-0 items-center justify-center rounded-xl text-neutral-0 ${role.iconBg}`}
      >
        <Icon className="size-5" strokeWidth={2} aria-hidden="true" />
      </span>
      <div className="flex flex-col gap-1">
        <p className="text-b9 font-jakarta font-semibold tracking-wide text-brand-forest-700">
          {role.tag}
        </p>
        <h3 className="text-s5 font-jakarta font-bold text-neutral-900">
          {role.heading}
        </h3>
      </div>
      <p className="text-b8 font-jakarta text-neutral-600">{role.body}</p>
      <Link
        href={role.ctaHref}
        className="mt-1 flex w-fit items-center gap-1.5 font-jakarta text-b8 font-semibold text-primary-teal-70 hover:underline"
      >
        {role.ctaLabel} <span aria-hidden="true">&rarr;</span>
      </Link>
    </div>
  );
}

function FeatureCard({ feature }: { feature: Feature }) {
  const Icon = feature.icon;
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-neutral-0 p-6 sm:p-7">
      <span
        className={`flex size-10 shrink-0 items-center justify-center rounded-xl text-neutral-0 ${feature.iconBg}`}
      >
        <Icon className="size-5" strokeWidth={2} aria-hidden="true" />
      </span>
      <div className="flex flex-col gap-1">
        <p className="text-b9 font-jakarta font-semibold tracking-wide text-primary-teal-70">
          {feature.tag}
        </p>
        <h3 className="text-s5 font-jakarta font-bold text-neutral-900">
          {feature.title}
        </h3>
      </div>
      <p className="text-b8 font-jakarta text-neutral-600">{feature.body}</p>
    </div>
  );
}

function StepCard({ step }: { step: Step }) {
  const Icon = step.icon;
  return (
    <div className="flex flex-1 flex-col gap-3 rounded-2xl border border-neutral-200 bg-neutral-0/60 p-6">
      <span
        className={`flex size-10 shrink-0 items-center justify-center rounded-xl text-neutral-0 ${step.iconBg}`}
      >
        <Icon className="size-5" strokeWidth={2} aria-hidden="true" />
      </span>
      <h3 className="text-s6 font-jakarta font-bold text-neutral-900">
        {step.title}
      </h3>
      <p className="text-b8 font-jakarta text-neutral-600">{step.body}</p>
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-neutral-200 py-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between font-jakarta gap-4 text-left text-b7 font-semibold text-neutral-900"
      >
        {q}
        <ChevronDown
          className={`size-5 shrink-0 text-neutral-500 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>
      {open && (
        <p className="mt-3 text-b8 font-jakarta text-neutral-600">{a}</p>
      )}
    </div>
  );
}

function TeamCard({ member }: { member: TeamMember }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-neutral-200 bg-neutral-0 p-6 text-center">
      <Image
        src={member.profile}
        alt={member.name.split(" ")[0]}
        width={80}
        height={80}
        className="size-20 rounded-full object-cover"
      />
      <div>
        <p className="text-s6 font-jakarta font-bold text-neutral-900">
          {member.name}
        </p>
        <p className="text-b8 font-jakarta text-primary-teal-70">
          {member.role}
        </p>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { data: grid } = useGrid();
  const { data: modelAccuracy } = useModelAccuracy();

  // Real browser geolocation (same shared store every other page uses --
  // see app/lib/location-store.ts) -- asked here too so an unauthenticated
  // visitor sees themselves on the preview map, colored by their own real
  // zone status once it resolves.
  const { location, status: locationStatus } = useCurrentLocation();
  const { data: ownZone } = useZoneLookup(location);
  const userMarkerColor = ownZone
    ? EWS_MARKER_COLOR[ownZone.ews_code]
    : NEUTRAL_MARKER_COLOR;

  // Map preview search/filter state -- real, working filters against
  // GET /api/umkm (search now also matches district/kecamatan, i.e. a
  // station/area name, not just a business name).
  const [mapSearch, setMapSearch] = useState("");
  const [mapCategory, setMapCategory] = useState("all");
  const [mapPriceRange, setMapPriceRange] = useState("all");
  const [mapRadius, setMapRadius] = useState("all");

  const selectedPriceBand = PRICE_RANGE_OPTIONS.find((o) => o.value === mapPriceRange);
  const selectedRadiusBand = RADIUS_OPTIONS.find((o) => o.value === mapRadius);
  const hasActiveMapFilter =
    mapSearch.trim() !== "" || mapCategory !== "all" || mapPriceRange !== "all" || mapRadius !== "all";

  const { data: mapCandidates, isLoading: isMapCandidatesLoading } = useUmkm({
    search: mapSearch.trim() || undefined,
    category: mapCategory !== "all" ? (mapCategory as UmkmTenantCategory) : undefined,
    min_price: selectedPriceBand?.min,
    max_price: selectedPriceBand?.max,
    max_dist_m: selectedRadiusBand?.max,
    limit: 100,
  });

  // Only fly/zoom to the results while a filter is actually active -- on
  // the unfiltered "all 200+ businesses" default view there's nothing
  // useful to fit bounds to (they're scattered across every district),
  // and it would fight the user's own panning on first load.
  const mapFlyToBounds =
    hasActiveMapFilter && mapCandidates
      ? mapCandidates.rows.map((row) => [row.latitude, row.longitude] as [number, number])
      : null;

  return (
    <div className="flex min-h-svh flex-col bg-neutral-0 text-neutral-900">
      {/* NAV */}
      <header className="sticky  top-0 z-50 border-b border-neutral-200 bg-neutral-0/95 backdrop-blur-sm">
        <div className="mx-auto flex h-[72px] w-full max-w-[1200px] items-center justify-evenly px-5 sm:px-8">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="TitikTemu"
              width={32}
              height={32}
              className="hidden size-8 md:block"
            />
            <span className="text-s5 font-bold font-jakarta text-brand-forest-900">
              TitikTemu
            </span>
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-b8 font-jakarta font-medium text-neutral-700 hover:text-brand-forest-900"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <Link
              href="/login/"
              className="rounded-lg border font-jakarta border-primary-teal-60 px-4 py-2 text-b8 font-semibold text-primary-teal-70 hover:bg-primary-teal-20/40"
            >
              Log In
            </Link>
            <Link
              href="/beranda/"
              className="rounded-lg font-jakarta bg-brand-forest-600 px-4 py-2 text-b8 font-semibold text-neutral-0 hover:bg-brand-forest-700"
            >
              Jelajahi UMKM
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setMobileNavOpen((v) => !v)}
            aria-label={mobileNavOpen ? "Tutup menu" : "Buka menu"}
            className="flex size-10 items-center justify-center rounded-lg text-neutral-700 md:hidden"
          >
            {mobileNavOpen ? (
              <X className="size-6" />
            ) : (
              <Menu className="size-6" />
            )}
          </button>
        </div>

        {mobileNavOpen && (
          <div className="border-t border-neutral-200 bg-neutral-0 px-5 py-4 md:hidden">
            <nav className="flex flex-col gap-3">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileNavOpen(false)}
                  className="text-b7 font-jakarta font-medium text-neutral-700"
                >
                  {link.label}
                </a>
              ))}
            </nav>
            <div className="mt-4 flex flex-col gap-2">
              <Link
                href="/login/"
                className="rounded-lg font-jakarta border border-primary-teal-60 px-4 py-2 text-center text-b8 font-semibold text-primary-teal-70"
              >
                Log In
              </Link>
              <Link
                href="/beranda/"
                className="rounded-lg font-jakarta bg-brand-forest-600 px-4 py-2 text-center text-b8 font-semibold text-neutral-0"
              >
                Jelajahi UMKM
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Every section below chains its background gradient into the next
          section's own starting color, so the whole page reads as one
          continuous wash (mint -> white -> mint -> ... -> dark green)
          instead of hard flat-color seams between sections. */}

      {/* HERO */}
      <section className="bg-gradient-to-b from-brand-forest-50 to-neutral-0 px-5 pb-16 pt-14 sm:px-8 sm:pt-0 lg:pb-2">
        <div className="mx-auto grid w-full max-w-[1200px] grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="flex flex-col items-start gap-5">
            <span className="flex items-center gap-2 text-b8 font-semibold text-primary-teal-70">
              <h3
                className="h-px w-6 font-jakarta bg-primary-teal-70"
                aria-hidden="true"
              />
              Usaha lokal. Transportasi umum. Peluang bersama.
            </span>
            <h1 className="text-h3 font-jakarta font-bold leading-tight text-brand-forest-900 sm:text-h2">
              Beri Ruang untuk Usaha Tumbuh. Bangun Kawasan untuk Masa Depan.
            </h1>
            <p className="max-w-lg font-jakarta text-b8 text-neutral-600 sm:text-b7">
              TitikTemu menghubungkan UMKM, komuter, dan operator melalui peta
              interaktif. Temukan usaha lokal di sekitar stasiun dan permudah
              peninjauan calon tenant.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/beranda/"
                className="flex items-center font-jakarta gap-1.5 rounded-lg bg-brand-forest-600 px-5 py-3 text-b7 font-semibold text-neutral-0 hover:bg-brand-forest-700"
              >
                Jelajahi UMKM <span aria-hidden="true">&rarr;</span>
              </Link>
              <Link
                href="/signup/"
                className="rounded-lg font-jakarta border border-primary-teal-60 px-5 py-3 text-b7 font-semibold text-primary-teal-70 hover:bg-primary-teal-20/40"
              >
                Daftarkan Usaha Anda
              </Link>
            </div>
            <p className="text-b9 font-jakarta text-neutral-500">
              Jelajahi peta tanpa login.
            </p>
          </div>

          <img
            src="/illustration-1.svg"
            alt="Ilustrasi stasiun transit dengan UMKM di sekitarnya"
            className="w-full hidden md:block"
          />
        </div>
      </section>

      {/* ROLES */}
      <section className="bg-gradient-to-b from-neutral-0 to-brand-forest-50 px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-10">
          <SectionHeading
            title="Usaha, perjalanan, dan peluang. Bertemu di TitikTemu."
            subtitle="Satu simpul yang menghubungkan tiga peran berbeda."
          />
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {ROLES.map((role) => (
              <RoleCard key={role.key} role={role} />
            ))}
          </div>
          <div className="mx-auto font-jakarta flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-0 px-4 py-2 text-b8 font-semibold text-neutral-900">
            <span
              className="size-2 rounded-full bg-primary-teal-60"
              aria-hidden="true"
            />
            <MapIcon className="size-4 text-neutral-500" aria-hidden="true" />
            TitikTemu
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section
        id="fitur"
        className="bg-gradient-to-b from-brand-forest-50 to-neutral-0 px-5 py-16 sm:px-8 sm:py-20"
      >
        <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-10">
          <SectionHeading
            title="Dari informasi lokasi, menuju peluang yang terhubung."
            subtitle="Empat area fitur yang bekerja bersama untuk menciptakan ekosistem UMKM dan transportasi yang saling mendukung."
          />
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {FEATURES.map((feature) => (
              <FeatureCard key={feature.tag} feature={feature} />
            ))}
          </div>
        </div>
      </section>

      {/* MAP PREVIEW -- matches design/map-landing-page.png: a search/filter
          bar (decorative -- see MAP_FILTERS), the real live zone map (not a
          static mockup), the visitor's own pulsing location colored by
          their real EWS status, and a small "TitikTemu" pill on the map
          itself. */}
      <section
        id="peta"
        className="bg-gradient-to-b from-neutral-0 to-brand-forest-50 px-5 py-16 sm:px-8 sm:py-20"
      >
        <div className="mx-auto flex w-full max-w-[1200px] flex-col items-center gap-6">
          <SectionHeading
            title="Temukan usaha lokal di sekitar Anda!"
            subtitle="Dukung pertumbuhan ekonomi lokal dengan menemukan berbagai usaha menarik di sekitar stasiun transit."
          />

          <div className="flex w-full flex-col gap-3 sm:flex-row">
            <div className="flex flex-1 items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-0 px-4 py-3 shadow-sm">
              <MapPin
                className="size-4 shrink-0 text-neutral-400"
                aria-hidden="true"
              />
              <input
                type="text"
                value={mapSearch}
                onChange={(event) => setMapSearch(event.target.value)}
                placeholder="Cari stasiun atau nama usaha..."
                aria-label="Cari stasiun atau nama usaha"
                className="w-full bg-transparent font-jakarta text-b8 text-neutral-700 outline-none placeholder:text-neutral-400"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Dropdown
                options={CATEGORY_OPTIONS}
                value={mapCategory}
                onValueChange={setMapCategory}
                placeholder="Kategori"
                className={FILTER_DROPDOWN_CLASSNAME}
              />
              <Dropdown
                options={PRICE_RANGE_OPTIONS}
                value={mapPriceRange}
                onValueChange={setMapPriceRange}
                placeholder="Kisaran Harga"
                className={FILTER_DROPDOWN_CLASSNAME}
              />
              <Dropdown
                options={RADIUS_OPTIONS}
                value={mapRadius}
                onValueChange={setMapRadius}
                placeholder="Radius"
                className={FILTER_DROPDOWN_CLASSNAME}
              />
            </div>
          </div>

          <div className="flex w-full flex-wrap items-center justify-between gap-2">
            <p className="font-jakarta text-b9 text-neutral-500">
              {isMapCandidatesLoading
                ? "Memuat usaha..."
                : `${mapCandidates?.total ?? 0} usaha ditemukan`}
            </p>
            {/* "make sure the user knows you are here" -- surface WHY the
                pulse marker might be missing instead of silently showing
                nothing when permission is denied/unavailable. */}
            {locationStatus === "denied" && (
              <p className="font-jakarta text-b9 text-behavior-red-30">
                Akses lokasi ditolak -- aktifkan izin lokasi browser untuk melihat posisi Anda di peta.
              </p>
            )}
            {locationStatus === "unsupported" && (
              <p className="font-jakarta text-b9 text-neutral-500">
                Perangkat/browser ini tidak mendukung deteksi lokasi.
              </p>
            )}
            {locationStatus === "error" && (
              <p className="font-jakarta text-b9 text-behavior-red-30">
                Tidak dapat mendeteksi lokasi Anda saat ini.
              </p>
            )}
          </div>

          <div className="relative h-[320px] w-full overflow-hidden rounded-2xl border border-neutral-200 shadow-lg sm:h-[420px] md:h-[480px]">
            <LeafletMap className="h-full w-full" scrollWheelZoom={false} flyToBounds={mapFlyToBounds}>
              <GeoJsonLayer data={grid} modelAccuracy={modelAccuracy} />
              <UmkmMarkerLayer rows={mapCandidates?.rows ?? []} />
              {location && (
                <CurrentLocationMarker
                  lat={location.lat}
                  lng={location.lng}
                  color={userMarkerColor}
                />
              )}
            </LeafletMap>
            {!isMapCandidatesLoading && hasActiveMapFilter && mapCandidates?.rows.length === 0 && (
              <div className="absolute inset-0 z-[850] flex items-center justify-center bg-neutral-0/70 backdrop-blur-[1px]">
                <p className="rounded-xl bg-neutral-0 px-4 py-2 font-jakarta text-b8 text-neutral-600 shadow-sm">
                  Tidak ada usaha yang cocok dengan pencarian ini.
                </p>
              </div>
            )}
            <div className="absolute bottom-3 right-3 z-[900] flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-0/95 px-3 py-1.5 font-jakarta text-b9 font-semibold text-neutral-900 shadow-sm backdrop-blur-sm">
              <MapPin
                className="size-3.5 text-primary-teal-70"
                aria-hidden="true"
              />
              TitikTemu
            </div>
          </div>

          <Link
            href="/beranda/"
            className="flex font-jakarta items-center gap-1.5 rounded-lg bg-brand-forest-600 px-5 py-3 text-b7 font-semibold text-neutral-0 hover:bg-brand-forest-700"
          >
            Buka Peta Lengkap <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      </section>

      {/* STEPS + FAQ */}
      <section
        id="panduan"
        className="bg-gradient-to-b from-brand-forest-50 to-neutral-0 px-5 py-16 sm:px-8 sm:py-20"
      >
        <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-14">
          <div className="flex flex-col gap-10">
            <SectionHeading
              title="Lebih mudah mulai. Lebih paham informasi."
              subtitle="Tiga pintu masuk yang mudah dipindai."
            />
            <div className="flex flex-col gap-5 md:flex-row">
              {STEPS.map((step) => (
                <StepCard key={step.title} step={step} />
              ))}
            </div>
          </div>

          <div className="mx-auto w-full max-w-2xl">
            <h2 className="mb-2 font-jakarta text-s5 font-bold text-brand-forest-900">
              Pertanyaan yang sering ditanyakan
            </h2>
            <div>
              {FAQS.map((faq) => (
                <FaqItem key={faq.q} q={faq.q} a={faq.a} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* TEAM */}
      <section
        id="tentang-kami"
        className="bg-gradient-to-b from-neutral-0 to-brand-forest-50 px-5 py-16 sm:px-8 sm:py-20"
      >
        <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-10">
          <SectionHeading
            title="Di balik TitikTemu."
            subtitle={undefined}
            className="[&>p]:hidden"
          />
          <p className="mx-auto -mt-6 font-jakarta max-w-2xl text-center text-b7 text-neutral-600">
            Kami adalah tim{" "}
            <span className="font-semibold text-primary-teal-70">
              &quot;Nama tim nya apa&quot;
            </span>{" "}
            dari{" "}
            <span className="font-semibold text-primary-teal-70">
              Universitas Indonesia
            </span>{" "}
            yang mengembangkan TitikTemu untuk menghubungkan usaha lokal,
            komuter, dan operator kawasan transportasi.
          </p>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {TEAM.map((member) => (
              <TeamCard key={member.name} member={member} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA -- matches design/footer-updated.png. */}
      <section className="bg-[#173E32] px-5 py-16 text-center sm:px-8 sm:py-20">
        <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-5">
          <h2 className="text-h5 font-jakarta font-bold text-neutral-0 sm:text-h3">
            Mulai dari perjalanan Anda. Temukan usaha lokal di sekitarnya.
          </h2>
          <p className="text-b7 font-jakarta text-neutral-300">
            Mulai dari mengenal usaha lokal di sekitar stasiun.
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row">
            <Link
              href="/beranda/"
              className="flex font-jakarta items-center gap-1.5 rounded-lg bg-brand-forest-600 px-5 py-3 text-b7 font-semibold text-neutral-0 hover:bg-brand-forest-700"
            >
              Jelajahi Peta <span aria-hidden="true">&rarr;</span>
            </Link>
            <Link
              href="/signup/"
              className="rounded-lg font-jakarta border border-neutral-0/40 px-5 py-3 text-b7 font-semibold text-neutral-0 hover:bg-neutral-0/10"
            >
              Daftarkan UMKM
            </Link>
            <Link
              href="/login/"
              className="text-b7 font-jakarta font-semibold text-neutral-300 hover:text-neutral-0"
            >
              Log In &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER -- restored: an earlier edit had merged this into the CTA
          section above (relabeling it <footer>) and dropped the logo/nav/
          copyright content entirely. Kept as its own element since a page
          shouldn't have its CTA banner double as the <footer> landmark
          when a real footer exists right below it. */}
      <footer className="bg-gradient-to-b from-brand-forest-900 to-[#0F2A22] px-5 py-8 sm:px-8">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col items-center gap-6 border-t border-neutral-0/10 pt-8 md:flex-row md:items-center md:justify-between">
          <div className="flex font-jakarta flex-col items-center gap-1 md:items-start">
            <span className="flex items-center gap-2 text-s6 font-bold text-neutral-0">
              <Image
                src="/logo.png"
                alt=""
                width={24}
                height={24}
                className="size-6"
                aria-hidden="true"
              />
              TitikTemu
            </span>
            <p className="text-b9 font-jakarta text-neutral-400">
              UMKM tumbuh bersama transportasi kita.
            </p>
          </div>

          <nav className="flex flex-wrap items-center justify-center gap-5">
            {NAV_LINKS.filter((l) => l.label !== "Peta").map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-b9 font-jakarta text-neutral-300 hover:text-neutral-0"
              >
                {link.label}
              </a>
            ))}
            <Link
              href="/login/"
              className="text-b9 font-jakarta text-neutral-300 hover:text-neutral-0"
            >
              Log In
            </Link>
          </nav>

          <p className="text-b9 font-jakarta text-neutral-500">
            &copy; 2026 TitikTemu &middot; Universitas Indonesia
          </p>
        </div>
      </footer>
    </div>
  );
}

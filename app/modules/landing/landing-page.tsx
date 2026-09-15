"use client";

// Public marketing homepage ("/"), matching design/landing.png (Figma
// export). Previously app/page.tsx just redirected straight to /beranda/ --
// there was no real landing page. Team photos are placeholder initial
// avatars (no source photos available), the hero illustration is an
// original simplified station/transit graphic (not a recreation of the
// Figma artwork), and the map preview embeds the app's own real
// GeoJsonLayer/LeafletMap with live data instead of a static mockup image
// -- all per explicit decisions made before building this.

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import {
  BarChart3,
  ChevronDown,
  Home as HomeIcon,
  Map as MapIcon,
  Menu,
  Shield,
  Sparkles,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { useGrid } from "@/app/hooks/use-grid";
import { useModelAccuracy } from "@/app/hooks/use-model-accuracy";

const LeafletMap = dynamic(
  () => import("@/app/components/map/leaflet-map").then((mod) => mod.LeafletMap),
  { ssr: false },
);
const GeoJsonLayer = dynamic(
  () => import("@/app/components/map/geojson-layer").then((mod) => mod.GeoJsonLayer),
  { ssr: false },
);

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

type TeamMember = { name: string; role: string; accent: string };

const TEAM: TeamMember[] = [
  { name: "Umar Faiz Rahman", role: "Project Leader", accent: "bg-primary-teal-60" },
  { name: "Steven Dyanizha Ananda", role: "Geospatial Data Scientist", accent: "bg-brand-forest-600" },
  { name: "Zayyan Ramadzaki Firdaus", role: "Fullstack WebGIS Developer", accent: "bg-brand-forest-900" },
  { name: "Rahel Meilinda Aruan", role: "UI/UX Designer", accent: "bg-primary-teal-70" },
  { name: "Salwa Alifa Putri", role: "Product & Business Impact Strategist", accent: "bg-brand-forest-700" },
];

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

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
    <div className={`flex flex-col items-center gap-2 text-center ${className}`}>
      <h2 className="text-h5 font-bold text-brand-forest-900 sm:text-h3">{title}</h2>
      {subtitle && <p className="max-w-xl text-b8 text-neutral-600 sm:text-b7">{subtitle}</p>}
    </div>
  );
}

/** Original simplified station/transit illustration -- not a recreation of
 * the Figma artwork (see file header), captures the same idea (a covered
 * platform, a train, trees, a passenger) using plain shapes/gradients in
 * the brand palette. */
function HeroIllustration() {
  return (
    <svg
      viewBox="0 0 480 380"
      className="h-auto w-full max-w-md mx-auto lg:max-w-none"
      role="img"
      aria-label="Ilustrasi stasiun transit dengan UMKM di sekitarnya"
    >
      <ellipse cx="240" cy="345" rx="200" ry="24" fill="#d7ece4" />

      {/* trees */}
      <g>
        <rect x="56" y="230" width="10" height="60" rx="3" fill="#8a6b4a" />
        <circle cx="61" cy="205" r="38" fill="#2e8e29" />
        <circle cx="35" cy="225" r="26" fill="#39b332" />
        <circle cx="90" cy="222" r="24" fill="#39b332" />
      </g>

      {/* platform base */}
      <rect x="70" y="270" width="340" height="26" rx="6" fill="#173e32" />
      <rect x="70" y="264" width="340" height="10" rx="4" fill="#16734e" />

      {/* canopy roof */}
      <path d="M150 90 L340 90 L370 140 L120 140 Z" fill="#16734e" />
      <rect x="150" y="140" width="190" height="8" fill="#125e40" />
      <rect x="170" y="148" width="10" height="120" fill="#0f4a35" />
      <rect x="310" y="148" width="10" height="120" fill="#0f4a35" />

      {/* train */}
      <rect x="230" y="150" width="180" height="90" rx="16" fill="#ffffff" stroke="#173e32" strokeWidth="3" />
      <rect x="230" y="150" width="180" height="34" rx="16" fill="#16734e" />
      <rect x="248" y="192" width="34" height="26" rx="4" fill="#bfe6db" />
      <rect x="292" y="192" width="34" height="26" rx="4" fill="#bfe6db" />
      <rect x="336" y="192" width="34" height="26" rx="4" fill="#bfe6db" />
      <rect x="230" y="234" width="180" height="10" fill="#173e32" />
      <circle cx="255" cy="248" r="8" fill="#173e32" />
      <circle cx="385" cy="248" r="8" fill="#173e32" />
      <rect x="405" y="160" width="6" height="80" fill="#173e32" />

      {/* UMKM stalls */}
      <g>
        <rect x="90" y="190" width="70" height="55" rx="4" fill="#fff" stroke="#173e32" strokeWidth="2" />
        <path d="M84 190 L166 190 L156 170 L94 170 Z" fill="#16734e" />
        <rect x="105" y="210" width="18" height="35" fill="#00a8a8" />
        <rect x="130" y="210" width="18" height="35" fill="#eef6f3" stroke="#173e32" strokeWidth="1.5" />
      </g>

      {/* person walking */}
      <g>
        <circle cx="200" cy="255" r="9" fill="#16734e" />
        <rect x="192" y="264" width="16" height="26" rx="6" fill="#173e32" />
        <rect x="188" y="288" width="8" height="14" rx="3" fill="#173e32" />
        <rect x="204" y="288" width="8" height="14" rx="3" fill="#173e32" />
      </g>
    </svg>
  );
}

function RoleCard({ role }: { role: Role }) {
  const Icon = role.icon;
  return (
    <div className="flex w-full flex-col gap-4 rounded-2xl border border-neutral-200 bg-brand-forest-50/60 p-6">
      <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl text-neutral-0 ${role.iconBg}`}>
        <Icon className="size-5" strokeWidth={2} aria-hidden="true" />
      </span>
      <div className="flex flex-col gap-1">
        <p className="text-b9 font-semibold tracking-wide text-brand-forest-700">{role.tag}</p>
        <h3 className="text-s5 font-bold text-neutral-900">{role.heading}</h3>
      </div>
      <p className="text-b8 text-neutral-600">{role.body}</p>
      <Link
        href={role.ctaHref}
        className="mt-1 flex w-fit items-center gap-1.5 text-b8 font-semibold text-primary-teal-70 hover:underline"
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
      <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl text-neutral-0 ${feature.iconBg}`}>
        <Icon className="size-5" strokeWidth={2} aria-hidden="true" />
      </span>
      <div className="flex flex-col gap-1">
        <p className="text-b9 font-semibold tracking-wide text-primary-teal-70">{feature.tag}</p>
        <h3 className="text-s5 font-bold text-neutral-900">{feature.title}</h3>
      </div>
      <p className="text-b8 text-neutral-600">{feature.body}</p>
    </div>
  );
}

function StepCard({ step }: { step: Step }) {
  const Icon = step.icon;
  return (
    <div className="flex flex-1 flex-col gap-3 rounded-2xl border border-neutral-200 bg-brand-forest-50/60 p-6">
      <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl text-neutral-0 ${step.iconBg}`}>
        <Icon className="size-5" strokeWidth={2} aria-hidden="true" />
      </span>
      <h3 className="text-s6 font-bold text-neutral-900">{step.title}</h3>
      <p className="text-b8 text-neutral-600">{step.body}</p>
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
        className="flex w-full items-center justify-between gap-4 text-left text-b7 font-semibold text-neutral-900"
      >
        {q}
        <ChevronDown
          className={`size-5 shrink-0 text-neutral-500 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>
      {open && <p className="mt-3 text-b8 text-neutral-600">{a}</p>}
    </div>
  );
}

function TeamCard({ member }: { member: TeamMember }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-neutral-200 bg-neutral-0 p-6 text-center">
      <span
        className={`flex size-20 shrink-0 items-center justify-center rounded-full text-h6 font-bold text-neutral-0 ${member.accent}`}
        aria-hidden="true"
      >
        {initials(member.name)}
      </span>
      <div>
        <p className="text-s6 font-bold text-neutral-900">{member.name}</p>
        <p className="text-b8 text-primary-teal-70">{member.role}</p>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { data: grid } = useGrid();
  const { data: modelAccuracy } = useModelAccuracy();

  return (
    <div className="flex min-h-svh flex-col bg-neutral-0 text-neutral-900">
      {/* NAV */}
      <header className="sticky top-0 z-50 border-b border-neutral-200 bg-neutral-0/95 backdrop-blur-sm">
        <div className="mx-auto flex h-[72px] w-full max-w-[1200px] items-center justify-between px-5 sm:px-8">
          <Link href="/" className="flex items-center gap-2">
            <img src="/titiktemu.png" alt="TitikTemu" className="h-8 w-auto" />
            <span className="text-s5 font-bold text-brand-forest-900">TitikTemu</span>
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href} className="text-b8 font-medium text-neutral-700 hover:text-brand-forest-900">
                {link.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <Link
              href="/login/"
              className="rounded-lg border border-primary-teal-60 px-4 py-2 text-b8 font-semibold text-primary-teal-70 hover:bg-primary-teal-20/40"
            >
              Log In
            </Link>
            <Link
              href="/beranda/"
              className="rounded-lg bg-brand-forest-600 px-4 py-2 text-b8 font-semibold text-neutral-0 hover:bg-brand-forest-700"
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
            {mobileNavOpen ? <X className="size-6" /> : <Menu className="size-6" />}
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
                  className="text-b7 font-medium text-neutral-700"
                >
                  {link.label}
                </a>
              ))}
            </nav>
            <div className="mt-4 flex flex-col gap-2">
              <Link
                href="/login/"
                className="rounded-lg border border-primary-teal-60 px-4 py-2 text-center text-b8 font-semibold text-primary-teal-70"
              >
                Log In
              </Link>
              <Link
                href="/beranda/"
                className="rounded-lg bg-brand-forest-600 px-4 py-2 text-center text-b8 font-semibold text-neutral-0"
              >
                Jelajahi UMKM
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* HERO */}
      <section className="bg-gradient-to-b from-brand-forest-50 to-neutral-0 px-5 pb-16 pt-14 sm:px-8 sm:pt-20 lg:pb-24">
        <div className="mx-auto grid w-full max-w-[1200px] grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="flex flex-col items-start gap-5">
            <span className="flex items-center gap-2 text-b8 font-semibold text-primary-teal-70">
              <span className="h-px w-6 bg-primary-teal-70" aria-hidden="true" />
              Usaha lokal. Transportasi umum. Peluang bersama.
            </span>
            <h1 className="text-h3 font-bold leading-tight text-brand-forest-900 sm:text-h2">
              Jadikan Setiap Perjalanan Peluang bagi UMKM.
            </h1>
            <p className="max-w-lg text-b8 text-neutral-600 sm:text-b7">
              TitikTemu menghubungkan UMKM, komuter, dan operator melalui peta interaktif. Temukan
              usaha lokal di sekitar stasiun dan permudah peninjauan calon tenant.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/beranda/"
                className="flex items-center gap-1.5 rounded-lg bg-brand-forest-600 px-5 py-3 text-b7 font-semibold text-neutral-0 hover:bg-brand-forest-700"
              >
                Jelajahi UMKM <span aria-hidden="true">&rarr;</span>
              </Link>
              <Link
                href="/signup/"
                className="rounded-lg border border-primary-teal-60 px-5 py-3 text-b7 font-semibold text-primary-teal-70 hover:bg-primary-teal-20/40"
              >
                Daftarkan Usaha Anda
              </Link>
            </div>
            <p className="text-b9 text-neutral-500">Jelajahi peta tanpa login.</p>
          </div>

          <HeroIllustration />
        </div>
      </section>

      {/* ROLES */}
      <section className="bg-brand-forest-50/50 px-5 py-16 sm:px-8 sm:py-20">
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
          <div className="mx-auto flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-0 px-4 py-2 text-b8 font-semibold text-neutral-900">
            <span className="size-2 rounded-full bg-primary-teal-60" aria-hidden="true" />
            <MapIcon className="size-4 text-neutral-500" aria-hidden="true" />
            TitikTemu
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="fitur" className="bg-neutral-0 px-5 py-16 sm:px-8 sm:py-20">
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

      {/* MAP PREVIEW */}
      <section id="peta" className="bg-brand-forest-50/50 px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col items-center gap-8">
          <SectionHeading
            title="Mulai Jelajahi UMKM Lokal di Sekitar Anda!"
            subtitle="Dukung pertumbuhan ekonomi lokal dengan menemukan berbagai usaha menarik di sekitar stasiun transit. Temukan kebutuhan Anda sekarang, langsung dari peta!"
          />
          <div className="relative h-[320px] w-full overflow-hidden rounded-2xl border border-neutral-200 shadow-lg sm:h-[420px] md:h-[480px]">
            <LeafletMap className="h-full w-full" scrollWheelZoom={false}>
              <GeoJsonLayer data={grid} modelAccuracy={modelAccuracy} />
            </LeafletMap>
          </div>
          <Link
            href="/beranda/"
            className="flex items-center gap-1.5 rounded-lg bg-brand-forest-600 px-5 py-3 text-b7 font-semibold text-neutral-0 hover:bg-brand-forest-700"
          >
            Buka Peta Lengkap <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      </section>

      {/* STEPS + FAQ */}
      <section id="panduan" className="bg-neutral-0 px-5 py-16 sm:px-8 sm:py-20">
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
            <h2 className="mb-2 text-s5 font-bold text-brand-forest-900">Pertanyaan yang sering ditanyakan</h2>
            <div>
              {FAQS.map((faq) => (
                <FaqItem key={faq.q} q={faq.q} a={faq.a} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* TEAM */}
      <section id="tentang-kami" className="bg-brand-forest-50/50 px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-10">
          <SectionHeading
            title="Di balik TitikTemu."
            subtitle={undefined}
            className="[&>p]:hidden"
          />
          <p className="mx-auto -mt-6 max-w-2xl text-center text-b7 text-neutral-600">
            Kami adalah tim <span className="font-semibold text-primary-teal-70">&quot;Nama tim nya apa&quot;</span> dari{" "}
            <span className="font-semibold text-primary-teal-70">Universitas Indonesia</span> yang mengembangkan
            TitikTemu untuk menghubungkan usaha lokal, komuter, dan operator kawasan transportasi.
          </p>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {TEAM.map((member) => (
              <TeamCard key={member.name} member={member} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-brand-forest-900 px-5 py-16 text-center sm:px-8 sm:py-20">
        <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-5">
          <h2 className="text-h5 font-bold text-neutral-0 sm:text-h3">
            Mari beri UMKM ruang untuk tumbuh bersama transportasi kita.
          </h2>
          <p className="text-b7 text-neutral-300">Mulai dari mengenal usaha lokal di sekitar stasiun.</p>
          <div className="flex flex-col items-center gap-3 sm:flex-row">
            <Link
              href="/beranda/"
              className="flex items-center gap-1.5 rounded-lg bg-primary-teal-60 px-5 py-3 text-b7 font-semibold text-neutral-0 hover:bg-primary-teal-70"
            >
              Jelajahi UMKM <span aria-hidden="true">&rarr;</span>
            </Link>
            <Link
              href="/signup/"
              className="rounded-lg border border-neutral-0/40 px-5 py-3 text-b7 font-semibold text-neutral-0 hover:bg-neutral-0/10"
            >
              Daftarkan UMKM
            </Link>
            <Link href="/login/" className="text-b7 font-semibold text-neutral-300 hover:text-neutral-0">
              Log In &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-brand-forest-900/95 px-5 py-8 sm:px-8">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col items-center gap-6 border-t border-neutral-0/10 pt-8 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col items-center gap-1 md:items-start">
            <span className="flex items-center gap-2 text-s6 font-bold text-neutral-0">
              <img src="/titiktemu.png" alt="" className="h-6 w-auto" aria-hidden="true" />
              TitikTemu
            </span>
            <p className="text-b9 text-neutral-400">UMKM tumbuh bersama transportasi kita.</p>
          </div>

          <nav className="flex flex-wrap items-center justify-center gap-5">
            {NAV_LINKS.filter((l) => l.label !== "Peta").map((link) => (
              <a key={link.href} href={link.href} className="text-b9 text-neutral-300 hover:text-neutral-0">
                {link.label}
              </a>
            ))}
            <Link href="/login/" className="text-b9 text-neutral-300 hover:text-neutral-0">
              Log In
            </Link>
          </nav>

          <p className="text-b9 text-neutral-500">&copy; 2026 TitikTemu &middot; Universitas Indonesia</p>
        </div>
      </footer>
    </div>
  );
}

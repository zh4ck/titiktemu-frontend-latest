"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthShell } from "@/app/(auth)/_components/auth-shell";
import { Button } from "@/app/components/ui/button";
import { Dropdown } from "@/app/components/ui/dropdown";
import { FieldLabel, Input } from "@/app/components/ui/input";
import type { UserRole } from "@/app/lib/auth";
import { createClient } from "@/app/lib/supabase/client";

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "umkm", label: "Pelaku Usaha / UMKM" },
  { value: "operator_tod", label: "Operator TOD" },
];

export default function SignUpPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<UserRole>("umkm");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Konfirmasi password tidak cocok.");
      return;
    }
    if (password.length < 8) {
      setError("Password minimal 8 karakter.");
      return;
    }

    setIsSubmitting(true);
    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { role, full_name: fullName } },
    });

    if (signUpError) {
      setIsSubmitting(false);
      if (
        signUpError.status === 429 ||
        signUpError.message.toLowerCase().includes("rate limit") ||
        signUpError.message.toLowerCase().includes("too many requests") ||
        signUpError.message.toLowerCase().includes("over_email_send_rate_limit")
      ) {
        setError(
          "Terlalu banyak percobaan pendaftaran dalam waktu singkat (Rate Limit). Silakan tunggu beberapa saat atau coba masuk jika akun sudah terdaftar.",
        );
      } else {
        setError(signUpError.message);
      }
      return;
    }

    // If session is already created (email confirmation disabled in Supabase),
    // redirect directly to beranda.
    if (data.session) {
      setIsSubmitting(false);
      router.push("/beranda/");
      router.refresh();
      return;
    }

    // If no session returned (e.g. email confirmation setting still active on project),
    // attempt one graceful login fallback.
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setIsSubmitting(false);

    if (signInError) {
      if (
        signInError.status === 429 ||
        signInError.message.toLowerCase().includes("rate limit") ||
        signInError.message.toLowerCase().includes("too many requests")
      ) {
        setError(
          "Pendaftaran berhasil dibuat, namun server membatasi frekuensi login (429). Silakan coba masuk melalui halaman Login.",
        );
      } else {
        // Redirect to login page if email confirmation is still required by supabase project
        router.push("/login");
      }
      return;
    }

    if (signInData.session) {
      router.push("/beranda/");
      router.refresh();
    } else {
      router.push("/login");
    }
  }

  return (
    <AuthShell>
      <div className="mb-8 flex flex-col gap-3">
        <h1 className="font-sans text-[36px] font-bold leading-[40px] text-neutral-900">
          Buat Akun Baru
        </h1>
        <p className="font-sans text-[20px] leading-[28px] text-neutral-700">
          Ruang Tepat untuk Usaha Tumbuh, Kawasan Tepat untuk Masa Depan.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          <div>
            <FieldLabel htmlFor="fullName" required>
              Nama Lengkap
            </FieldLabel>
            <Input
              id="fullName"
              autoComplete="name"
              required
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Nama Anda"
            />
          </div>
          <div>
            <FieldLabel htmlFor="email" required>
              Email
            </FieldLabel>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="nama@email.com"
            />
          </div>
          <div>
            <FieldLabel required>Mendaftar sebagai</FieldLabel>
            <Dropdown
              options={ROLE_OPTIONS}
              value={role}
              onValueChange={(value) => setRole(value as UserRole)}
              placeholder="Pilih peran"
            />
          </div>
          <div>
            <FieldLabel htmlFor="password" required>
              Password
            </FieldLabel>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Minimal 8 karakter"
            />
          </div>
          <div>
            <FieldLabel htmlFor="confirmPassword" required>
              Konfirmasi Password
            </FieldLabel>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Ulangi password"
            />
          </div>
        </div>

        {error && (
          <p className="font-sans text-b8 text-destructive" role="alert">
            {error}
          </p>
        )}

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? "Memproses..." : "Daftar"}
        </Button>
      </form>

      <p className="mt-6 text-center font-sans text-b7 text-neutral-800">
        Sudah Punya Akun?{" "}
        <Link href="/login" className="font-semibold text-primary-600 hover:underline">
          Masuk
        </Link>
      </p>
    </AuthShell>
  );
}

"use client";

import { ChevronDown } from "lucide-react";
import { useAuth } from "@/app/lib/auth";

export function ModeHeader() {
  const { role } = useAuth();
  const mode = role === "operator_tod" ? "Mode Operator" : "Mode UMKM";

  return (
    <header className="flex h-16 items-center justify-end border-b border-border/60 bg-neutral-0 px-4 sm:px-6 shadow-[0_2px_4px_rgba(0,0,0,0.02)]">
      <div className="flex items-center gap-2">
        <ChevronDown className="size-5 text-neutral-900" aria-hidden="true" />
        <p className="text-b7 font-medium text-neutral-900">{mode}</p>
      </div>
    </header>
  );
}

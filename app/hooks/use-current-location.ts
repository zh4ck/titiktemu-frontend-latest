"use client";

import { useEffect } from "react";
import { useLocationStore } from "@/app/lib/location-store";

/**
 * Real, honest "where am I" signal from the browser's own Geolocation API --
 * NOT derived from any backend/auth user record. No fallback/fabricated
 * coordinate: permission denied or an unsupported browser both surface as
 * an honest "no location" state rather than defaulting to a guessed point.
 *
 * Backed by app/lib/location-store.ts's shared Zustand store, so every page
 * that calls this hook reads/writes the SAME coordinate instead of each
 * running its own independent watch -- a location picked up on Beranda is
 * immediately available on Discovery Map, Tenant Matching, etc.
 */
export function useCurrentLocation() {
  const location = useLocationStore((s) => s.location);
  const status = useLocationStore((s) => s.status);
  const start = useLocationStore((s) => s.start);

  useEffect(() => {
    start();
  }, [start]);

  return { location, status };
}

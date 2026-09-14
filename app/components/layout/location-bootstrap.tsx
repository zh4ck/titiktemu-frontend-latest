"use client";

import { useCurrentLocation } from "@/app/hooks/use-current-location";

/**
 * Kicks off the shared geolocation watch (app/lib/location-store.ts) as
 * soon as the authenticated app shell mounts -- i.e. immediately after
 * login, on whichever page the user lands on -- rather than waiting for
 * Beranda specifically to call useCurrentLocation() itself. Renders
 * nothing; every page still reads the resulting coordinate via the same
 * useCurrentLocation() hook.
 */
export function LocationBootstrap() {
  useCurrentLocation();
  return null;
}

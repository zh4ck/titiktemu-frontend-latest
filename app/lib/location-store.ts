import { create } from "zustand";

export type LocationStatus = "idle" | "found" | "denied" | "unsupported" | "error";

type LocationState = {
  location: { lat: number; lng: number } | null;
  status: LocationStatus;
  watchId: number | null;
  /** Idempotent -- safe to call from every page/component that needs the
   * user's location; only the first caller actually starts a
   * geolocation watch, so the browser's permission prompt fires once and
   * every consumer shares the same coordinate instead of each page running
   * its own independent watchPosition(). */
  start: () => void;
};

/**
 * Single app-wide source of truth for "where is the user right now,"
 * backed by the real browser Geolocation API (never a fabricated/default
 * coordinate). Previously each page called its own `useCurrentLocation`
 * with local component state, so a location picked up on one page (e.g.
 * Beranda) wasn't available on another (e.g. Tenant Matching) without that
 * page independently re-requesting permission and re-watching position.
 */
export const useLocationStore = create<LocationState>((set, get) => ({
  location: null,
  status: typeof navigator !== "undefined" && navigator.geolocation ? "idle" : "unsupported",
  watchId: null,
  start: () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    if (get().watchId !== null) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        set({
          location: { lat: position.coords.latitude, lng: position.coords.longitude },
          status: "found",
        });
      },
      (error) => {
        set({ location: null, status: error.code === error.PERMISSION_DENIED ? "denied" : "error" });
      },
      { enableHighAccuracy: true, maximumAge: 30_000 },
    );
    set({ watchId });
  },
}));

import { create } from "zustand";

export type LocationStatus = "idle" | "found" | "denied" | "unsupported" | "error";

type LocationState = {
  location: { lat: number; lng: number } | null;
  status: LocationStatus;
  watchId: number | null;
  /** Set once a UMKM user submits a real business location (the
   * Self-Tracker form) -- takes priority over the raw browser geolocation
   * everywhere `useCurrentLocation()` is read, so the map immediately
   * reflects "where my business actually is" instead of wherever the
   * device's GPS happens to be (which may be inaccurate/unavailable, or
   * simply not where the submitted business sits). */
  override: { lat: number; lng: number } | null;
  /** Idempotent -- safe to call from every page/component that needs the
   * user's location; only the first caller actually starts a
   * geolocation watch, so the browser's permission prompt fires once and
   * every consumer shares the same coordinate instead of each page running
   * its own independent watchPosition(). */
  start: () => void;
  setOverride: (location: { lat: number; lng: number }) => void;
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
  // Always "idle" at module-init time, on both server and client -- this
  // used to branch on `typeof navigator`, which is undefined during SSR
  // but defined in the browser, so the very first server-rendered HTML
  // and the client's first render disagreed on `status` (a real
  // hydration-mismatch bug: any component rendering different content
  // for "unsupported" vs "idle" would fail to hydrate cleanly). Detecting
  // "unsupported" now happens inside start() below instead, which only
  // ever runs client-side (from a useEffect), so it can never run during
  // SSR in the first place.
  status: "idle",
  watchId: null,
  override: null,
  setOverride: (location) => set({ override: location }),
  start: () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      set({ status: "unsupported" });
      return;
    }
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

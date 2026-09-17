"use client";

import { useEffect, useRef } from "react";
import L, { type LatLngExpression, type LatLngTuple } from "leaflet";
import { MapContainer, TileLayer, useMap, useMapEvent } from "react-leaflet";

const STUDY_AREA_CENTER: LatLngExpression = [-6.216, 106.811];

export function LeafletMap({
  center = STUDY_AREA_CENTER,
  zoom = 14,
  flyTo,
  flyToBounds,
  className,
  children,
  onClick,
  scrollWheelZoom = true,
}: {
  center?: LatLngExpression;
  zoom?: number;
  /** Pans/zooms the already-mounted map when this changes -- `center` above
   * only sets the INITIAL view (react-leaflet doesn't re-pan on prop change
   * after mount). Use this for "click a list item, map flies there." */
  flyTo?: { lat: number; lng: number; zoom?: number } | null;
  /** Pans/zooms to fit ALL of the given [lat, lng] points (e.g. the
   * results of a search/filter) -- takes priority over `flyTo` when both
   * are given. A single point flies in at a reasonable fixed zoom instead
   * of trying to "fit bounds" around one coordinate. */
  flyToBounds?: LatLngTuple[] | null;
  className?: string;
  children?: React.ReactNode;
  onClick?: (lat: number, lng: number) => void;
  /** Default true everywhere the map is a real working tool. Pass false (or
   * a value that starts false and flips true once the visitor engages,
   * e.g. the public landing page's click-to-activate preview) so the mouse
   * wheel keeps scrolling the page instead of hijacking it into a zoom
   * until the user has clearly chosen to interact with the map. Kept in
   * sync with the live map after mount too (see ScrollWheelZoomSync below)
   * -- react-leaflet's MapContainer only applies option props once, at
   * `new L.Map(node, options)` construction time, so a prop change alone
   * would otherwise silently do nothing after the initial render. */
  scrollWheelZoom?: boolean;
}) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      className={className ?? "h-[600px] w-full rounded-xl"}
      scrollWheelZoom={scrollWheelZoom}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {onClick && <MapClickHandler onClick={onClick} />}
      {/* MapContainer's own `center` prop only applies on first mount --
          this re-pans the map whenever a caller (e.g. clicking a list item)
          changes `center` afterwards. */}
      <RecenterOnChange center={center} />
      {flyToBounds && flyToBounds.length > 0 ? (
        <FitBounds points={flyToBounds} />
      ) : (
        flyTo && <FlyToLocation lat={flyTo.lat} lng={flyTo.lng} zoom={flyTo.zoom} />
      )}
      <InvalidateOnResize />
      <ScrollWheelZoomSync enabled={scrollWheelZoom} />
      {children}
    </MapContainer>
  );
}

/**
 * Applies `scrollWheelZoom` to the already-mounted map on every change, not
 * just at construction -- see the prop's doc comment above for why this is
 * needed (MapContainer's own `options` only apply once, at mount).
 */
function ScrollWheelZoomSync({ enabled }: { enabled: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (enabled) {
      map.scrollWheelZoom.enable();
    } else {
      map.scrollWheelZoom.disable();
    }
  }, [map, enabled]);
  return null;
}

/**
 * Leaflet lays out tiles for whatever size its container div was when it
 * last measured it, and never re-measures on its own -- so when the
 * sidebar's CSS width transition (see app/components/ui/sidebar.tsx)
 * resizes the map's container, Leaflet keeps rendering at the old size
 * until a manual pan/zoom, leaving gray/blank tile gaps. A ResizeObserver
 * on the map's own container + `map.invalidateSize()` fixes this for any
 * resize cause (sidebar collapse, window resize, expand/collapse toggles),
 * not just the sidebar specifically.
 */
function InvalidateOnResize() {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    let frame: number | null = null;
    const observer = new ResizeObserver(() => {
      // Match the sidebar's own 200ms width transition so invalidateSize
      // runs after layout has actually settled, not mid-transition.
      if (frame !== null) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        window.setTimeout(() => map.invalidateSize(), 210);
      });
    });
    observer.observe(container);
    return () => {
      observer.disconnect();
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, [map]);
  return null;
}

/**
 * Fits the map to a set of points (e.g. search/filter results) instead of
 * a single target -- used so typing "Blok M" or picking a filter actually
 * moves/zooms the map to where the matches are, rather than leaving it on
 * whatever the initial default view was.
 */
function FitBounds({ points }: { points: LatLngTuple[] }) {
  const map = useMap();
  const lastSignature = useRef<string | null>(null);
  // Cheap content-equality check so this only re-runs when the actual SET
  // of points changes, not on every render the parent happens to do (the
  // `points` array itself is a fresh reference each render).
  const signature = points.map(([lat, lng]) => `${lat.toFixed(5)},${lng.toFixed(5)}`).join("|");

  useEffect(() => {
    if (signature === lastSignature.current) return;
    lastSignature.current = signature;
    if (points.length === 0) return;

    if (points.length === 1) {
      map.flyTo(points[0], Math.max(map.getZoom(), 15), { duration: 0.75 });
      return;
    }

    const bounds = L.latLngBounds(points);
    map.flyToBounds(bounds, { padding: [48, 48], maxZoom: 16, duration: 0.75 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  return null;
}

function FlyToLocation({ lat, lng, zoom }: { lat: number; lng: number; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], zoom ?? map.getZoom(), { duration: 0.75 });
    // Only re-run when the target itself changes -- including `map`/`zoom`
    // in deps would re-trigger the animation on every zoom/pan the user
    // does themselves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng]);
  return null;
}

function MapClickHandler({
  onClick,
}: {
  onClick: (lat: number, lng: number) => void;
}) {
  useMapEvent("click", (event) => {
    onClick(event.latlng.lat, event.latlng.lng);
  });
  return null;
}

function RecenterOnChange({ center }: { center: LatLngExpression }) {
  const map = useMap();
  const [lat, lng] = Array.isArray(center)
    ? (center as [number, number])
    : [center.lat, center.lng];

  useEffect(() => {
    map.setView([lat, lng], map.getZoom());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng]);

  return null;
}

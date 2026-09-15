"use client";

import { useEffect } from "react";
import type { LatLngExpression } from "leaflet";
import { MapContainer, TileLayer, useMap, useMapEvent } from "react-leaflet";

const STUDY_AREA_CENTER: LatLngExpression = [-6.216, 106.811];

export function LeafletMap({
  center = STUDY_AREA_CENTER,
  zoom = 14,
  flyTo,
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
  className?: string;
  children?: React.ReactNode;
  onClick?: (lat: number, lng: number) => void;
  /** Default true everywhere the map is a real working tool. Pass false for
   * a purely decorative/preview embed (e.g. the public landing page) so
   * the mouse wheel keeps scrolling the page instead of zooming the map. */
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
      {flyTo && <FlyToLocation lat={flyTo.lat} lng={flyTo.lng} zoom={flyTo.zoom} />}
      <InvalidateOnResize />
      {children}
    </MapContainer>
  );
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

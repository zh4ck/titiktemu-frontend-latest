"use client";

import { Marker, Popup, Tooltip } from "react-leaflet";
import { pulseIcon } from "@/app/lib/pulse-icon";

const DEFAULT_COLOR = "#dc2626"; // red -- used when the caller doesn't know the user's own zone status yet

/**
 * The real "you are here" dot -- pulses so it reads as "live" at a glance.
 * Only rendered when a real browser-geolocated coordinate exists (see
 * app/hooks/use-current-location.ts) -- no default/fabricated position.
 *
 * `color` lets callers match the marker to the user's own zone status
 * (red/yellow/green for bahaya/waspada/aman) instead of always red --
 * pass it once a zone lookup for the user's own position resolves.
 */
export function CurrentLocationMarker({
  lat,
  lng,
  color = DEFAULT_COLOR,
}: {
  lat: number;
  lng: number;
  color?: string;
}) {
  return (
    <Marker position={[lat, lng]} icon={pulseIcon(color)}>
      <Tooltip direction="top" offset={[0, -8]} opacity={1}>
        Lokasi Anda
      </Tooltip>
      <Popup>Lokasi Anda saat ini</Popup>
    </Marker>
  );
}

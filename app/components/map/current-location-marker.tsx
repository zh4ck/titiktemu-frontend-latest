"use client";

import { Marker, Popup, Tooltip } from "react-leaflet";
import { pulseIcon } from "@/app/lib/pulse-icon";

const CURRENT_LOCATION_COLOR = "#dc2626"; // distinct red -- never reused for EWS red (see EWS_TO_HEX), so
// "your location" and "a bahaya zone" never look like the same color in a tooltip-free glance.

/**
 * The real "you are here" dot -- red with a pulse animation so it reads as
 * "live" at a glance, distinct from static EWS zone colors. Only rendered
 * when a real browser-geolocated coordinate exists (see
 * app/hooks/use-current-location.ts) -- no default/fabricated position.
 */
export function CurrentLocationMarker({ lat, lng }: { lat: number; lng: number }) {
  return (
    <Marker position={[lat, lng]} icon={pulseIcon(CURRENT_LOCATION_COLOR)}>
      <Tooltip direction="top" offset={[0, -8]} opacity={1}>
        Lokasi Anda
      </Tooltip>
      <Popup>Lokasi Anda saat ini</Popup>
    </Marker>
  );
}

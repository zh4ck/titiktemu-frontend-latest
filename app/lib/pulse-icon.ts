import L from "leaflet";

/**
 * A pulsing dot divIcon (see the `.titiktemu-pulse-marker` keyframes in
 * app/globals.css) -- used for "your current location" (red) and the
 * top-recommended reallocation destination (green), so both stand out from
 * the plain static CircleMarkers used for every other zone/candidate.
 */
export function pulseIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: "", // avoid Leaflet's default `leaflet-div-icon` box/border
    html: `<div class="titiktemu-pulse-marker" style="--pulse-color:${color}"><span class="pulse-ring"></span><span class="pulse-dot"></span></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

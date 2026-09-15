"use client";

import { CircleMarker, Marker, Popup, Tooltip } from "react-leaflet";
import { pulseIcon } from "@/app/lib/pulse-icon";
import { regionLabel } from "@/app/lib/format";
import type { UmkmBusiness } from "@/app/types/umkm";
import type { ZoneLabel } from "@/app/types/zones";

const ZONE_LABEL_COLOR: Record<ZoneLabel, string> = {
  aman: "#39b332",
  waspada: "#eab308",
  bahaya: "#d90e10",
};

function MarkerPopup({ row }: { row: UmkmBusiness }) {
  return (
    <div className="flex flex-col gap-0.5">
      <strong>{row.name ?? "-"}</strong>
      <span>{row.category ?? "-"}</span>
      <span className="text-neutral-500">{regionLabel(row.district_name)}</span>
    </div>
  );
}

/**
 * Renders one dot per UMKM business on the operator Discovery Map. Clicking
 * a row in the sidebar list flies the map to that business (see
 * discovery-map.tsx's `flyTo`), but until now nothing actually drew a
 * marker there -- the map panned to an empty spot. This closes that gap.
 * The selected/observed business also gets a pulsing marker so it's
 * unmistakable once the map has flown there.
 */
export function UmkmMarkerLayer({
  rows,
  selectedId,
  onSelect,
}: {
  rows: UmkmBusiness[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}) {
  return (
    <>
      {rows.map((row) => {
        const isSelected = row.id === selectedId;
        const color = row.zone_label ? ZONE_LABEL_COLOR[row.zone_label] : "#6f797b";

        if (isSelected) {
          return (
            <Marker
              key={row.id}
              position={[row.latitude, row.longitude]}
              icon={pulseIcon(color)}
              eventHandlers={onSelect ? { click: () => onSelect(row.id) } : undefined}
            >
              <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
                {row.name ?? "UMKM"}
              </Tooltip>
              <Popup>
                <MarkerPopup row={row} />
              </Popup>
            </Marker>
          );
        }

        return (
          <CircleMarker
            key={row.id}
            center={[row.latitude, row.longitude]}
            radius={6}
            pathOptions={{ color: "#ffffff", weight: 1.5, fillColor: color, fillOpacity: 0.9 }}
            eventHandlers={onSelect ? { click: () => onSelect(row.id) } : undefined}
          >
            <Tooltip direction="top" offset={[0, -6]} opacity={0.95}>
              {row.name ?? "UMKM"}
            </Tooltip>
            <Popup>
              <MarkerPopup row={row} />
            </Popup>
          </CircleMarker>
        );
      })}
    </>
  );
}

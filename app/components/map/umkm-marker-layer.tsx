"use client";

import { CircleMarker, Popup, Tooltip } from "react-leaflet";
import type { UmkmBusiness } from "@/app/types/umkm";
import type { ZoneLabel } from "@/app/types/zones";

const ZONE_LABEL_COLOR: Record<ZoneLabel, string> = {
  aman: "#39b332",
  waspada: "#eab308",
  bahaya: "#d90e10",
};

/**
 * Renders one dot per UMKM business on the operator Discovery Map. Clicking
 * a row in the sidebar list flies the map to that business (see
 * discovery-map.tsx's `flyTo`), but until now nothing actually drew a
 * marker there -- the map panned to an empty spot. This closes that gap.
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
        return (
          <CircleMarker
            key={row.id}
            center={[row.latitude, row.longitude]}
            radius={isSelected ? 10 : 6}
            pathOptions={{
              color: isSelected ? "#00696b" : "#ffffff",
              weight: isSelected ? 3 : 1.5,
              fillColor: color,
              fillOpacity: 0.9,
            }}
            eventHandlers={onSelect ? { click: () => onSelect(row.id) } : undefined}
          >
            <Tooltip direction="top" offset={[0, -6]} opacity={0.95}>
              {row.name ?? "UMKM"}
            </Tooltip>
            <Popup>
              <div className="flex flex-col gap-0.5">
                <strong>{row.name ?? "-"}</strong>
                <span>{row.category ?? "-"}</span>
                <span className="text-neutral-500">{row.district_name ?? `Grid ${row.grid_id}`}</span>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </>
  );
}

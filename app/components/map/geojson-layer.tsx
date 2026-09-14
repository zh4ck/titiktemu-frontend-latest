"use client";

import { CircleMarker, Popup, Tooltip } from "react-leaflet";
import { centroidOf } from "@/app/lib/geo";
import { CONFIDENCE_COLOR, CONFIDENCE_LABEL } from "@/app/lib/confidence";
import type { ModelAccuracy, ZoneFeature, ZoneFeatureCollection } from "@/app/types/zones";

const EWS_TO_HEX: Record<number, string> = {
  0: "#39b332", // aman / green
  1: "#eab308", // waspada / yellow
  2: "#d90e10", // bahaya / red
};

const EWS_TO_LABEL: Record<number, string> = {
  0: "Aman",
  1: "Waspada",
  2: "Bahaya",
};

// Uniform weight/fillOpacity on every one of 3000+ cells, and drawing the
// raw grid mesh itself, painted the whole map as a solid checkerboard --
// hard to read, and exposed an internal modeling artifact (the training
// grid) as if it were a user-facing feature. Fix: render one small circle
// per scored cell, centered on its centroid, sized/colored by how much
// attention it needs -- "bahaya" cells are largest/most opaque, "aman"
// recedes to a small faint dot. Cells with no EWS classification at all
// (ews_code null -- not part of the scored surface, i.e. the underlying
// training/reference grid) are skipped entirely rather than drawn gray.
const EWS_RADIUS: Record<number, number> = { 0: 5, 1: 7, 2: 9 };
const EWS_FILL_OPACITY: Record<number, number> = { 0: 0.35, 1: 0.55, 2: 0.75 };
const EWS_BORDER_WEIGHT: Record<number, number> = { 0: 0, 1: 1, 2: 1.5 };

function AccuracyBadge({ modelAccuracy }: { modelAccuracy?: ModelAccuracy | null }) {
  if (!modelAccuracy) return null;
  const color = CONFIDENCE_COLOR[modelAccuracy.confidence_level];
  const label = CONFIDENCE_LABEL[modelAccuracy.confidence_level];
  return (
    <span
      style={{
        display: "inline-block",
        marginTop: 4,
        padding: "1px 8px",
        border: `1px solid ${color}`,
        borderRadius: 9999,
        color,
        fontSize: 12,
      }}
    >
      {modelAccuracy.accuracy_pct.toFixed(1)}% -- {label}
    </span>
  );
}

/** Human-friendly popup: region name leads, grid id is a secondary/technical
 * detail rather than the primary identifier a user has to parse. */
function ZonePopup({ feature, modelAccuracy }: { feature: ZoneFeature; modelAccuracy?: ModelAccuracy | null }) {
  const { grid_id, district_name, kecamatan, ews_code, matching_score } = feature.properties;
  const title = district_name ?? kecamatan ?? `Zona ${grid_id}`;
  const statusLabel = ews_code !== null && ews_code !== undefined ? EWS_TO_LABEL[ews_code] : "-";
  return (
    <div className="flex flex-col gap-0.5">
      <strong>{title}</strong>
      <span className="text-[11px] text-neutral-500">Grid {grid_id}</span>
      <span>Status: {statusLabel}</span>
      <span>Matching score: {matching_score?.toFixed(1) ?? "-"}</span>
      <AccuracyBadge modelAccuracy={modelAccuracy} />
    </div>
  );
}

export function GeoJsonLayer({
  data,
  modelAccuracy,
  onFeatureClick,
}: {
  data?: ZoneFeatureCollection;
  modelAccuracy?: ModelAccuracy | null;
  onFeatureClick?: (feature: ZoneFeature) => void;
}) {
  if (!data) return null;

  return (
    <>
      {data.features.map((feature) => {
        const ewsCode = feature.properties.ews_code;
        if (ewsCode === null || ewsCode === undefined) return null; // hide ungraded/training-only cells

        const ring = feature.geometry.coordinates[0];
        if (!ring) return null;
        const centroid = centroidOf(ring);
        const color = EWS_TO_HEX[ewsCode];
        const label = feature.properties.district_name ?? `Grid ${feature.properties.grid_id}`;

        return (
          <CircleMarker
            key={feature.properties.grid_id}
            center={centroid}
            radius={EWS_RADIUS[ewsCode]}
            pathOptions={{
              color,
              weight: EWS_BORDER_WEIGHT[ewsCode],
              fillColor: color,
              fillOpacity: EWS_FILL_OPACITY[ewsCode],
            }}
            eventHandlers={onFeatureClick ? { click: () => onFeatureClick(feature) } : undefined}
          >
            <Tooltip direction="top" offset={[0, -6]} opacity={0.95}>
              {label} &middot; {EWS_TO_LABEL[ewsCode]}
            </Tooltip>
            <Popup>
              <ZonePopup feature={feature} modelAccuracy={modelAccuracy} />
            </Popup>
          </CircleMarker>
        );
      })}
    </>
  );
}

"use client";

import { CircleMarker, Marker, Polyline, Popup } from "react-leaflet";
import { ConfidenceBadge } from "@/app/components/ui/confidence-badge";
import { centroidOf } from "@/app/lib/geo";
import { pulseIcon } from "@/app/lib/pulse-icon";
import type { ModelAccuracy, ReallocationCandidate } from "@/app/types/zones";

export { centroidOf };

const TOP_CANDIDATE_COLOR = "#39b332"; // matches EWS "aman" green -- the destination is a safe zone

/** Human-friendly label for a candidate: region name first, grid id as a
 * secondary/technical detail rather than the primary identifier. */
function candidateLabel(candidate: ReallocationCandidate): string {
  return candidate.recommended_district ?? `Grid ${candidate.recommended_grid_id}`;
}

export function ReallocationLayer({
  origin,
  candidates,
  modelAccuracy,
}: {
  origin: { lat: number; lng: number };
  candidates: ReallocationCandidate[];
  modelAccuracy?: ModelAccuracy | null;
}) {
  return (
    <>
      <CircleMarker
        center={[origin.lat, origin.lng]}
        radius={10}
        pathOptions={{ color: "#00a6a8", fillColor: "#00a6a8", fillOpacity: 0.8 }}
      >
        <Popup>Lokasi asal</Popup>
      </CircleMarker>

      {candidates.map((candidate) => {
        const ring = candidate.recommended_feature.geometry.coordinates[0];
        if (!ring) return null;
        const centroid = centroidOf(ring);
        // Rank 1 is "the" reallocated place the user is being pointed to --
        // give it the pulsing marker so it's unmistakable on the map;
        // other candidates stay as plain static dots.
        const isTopPick = candidate.rank === 1;

        return (
          <div key={candidate.recommended_grid_id}>
            {isTopPick ? (
              <Marker position={centroid} icon={pulseIcon(TOP_CANDIDATE_COLOR)}>
                <Popup>
                  <div className="flex flex-col gap-1">
                    <span className="font-semibold">Rekomendasi utama: {candidateLabel(candidate)}</span>
                    <span>
                      {candidate.distance_m.toFixed(0)}m &middot; skor kecocokan{" "}
                      {candidate.matching_score.toFixed(1)}
                    </span>
                    <ConfidenceBadge modelAccuracy={modelAccuracy ?? null} />
                  </div>
                </Popup>
              </Marker>
            ) : (
              <CircleMarker
                center={centroid}
                radius={8}
                pathOptions={{ color: "#39b332", fillColor: "#39b332", fillOpacity: 0.8 }}
              >
                <Popup>
                  <div className="flex flex-col gap-1">
                    <span>
                      #{candidate.rank} {candidateLabel(candidate)} -- {candidate.distance_m.toFixed(0)}m,
                      skor {candidate.matching_score.toFixed(1)}
                    </span>
                    <ConfidenceBadge modelAccuracy={modelAccuracy ?? null} />
                  </div>
                </Popup>
              </CircleMarker>
            )}
            <Polyline
              positions={[[origin.lat, origin.lng], centroid]}
              pathOptions={{ color: "#00a6a8", dashArray: "4 6" }}
            />
          </div>
        );
      })}
    </>
  );
}

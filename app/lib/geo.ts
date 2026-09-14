// Shared geometry helpers for map components. Extracted from
// reallocation-layer.tsx so geojson-layer.tsx can reuse the same centroid
// math for circle-marker rendering instead of duplicating it.

/** Coordinates are [lng, lat] pairs (GeoJSON ring order). Simple vertex
 * average -- precise enough for centering a small grid-cell circle/label,
 * not meant for large or highly irregular polygons. */
export function centroidOf(coordinates: number[][]): [number, number] {
  const [lngSum, latSum] = coordinates.reduce<[number, number]>(
    (sum, [lng, lat]) => [sum[0] + (lng ?? 0), sum[1] + (lat ?? 0)],
    [0, 0],
  );
  return [latSum / coordinates.length, lngSum / coordinates.length];
}

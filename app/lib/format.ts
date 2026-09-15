// Real UMKM survey data is entered inconsistently (all-lowercase, ALL CAPS,
// etc.) -- this normalizes display only, never the underlying data, so
// exports/CSV/API payloads still carry the original value.
export function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split(" ")
    .map((word) => (word.length > 0 ? word[0].toUpperCase() + word.slice(1) : word))
    .join(" ");
}

// A grid_id (e.g. "grid_1042") is an internal modeling identifier, not a
// label a UMKM user or operator should ever have to read -- this is the
// one place that decides what to show instead. Never falls back to the raw
// id; grid_id may still be used internally (React keys, URL query params,
// equality checks), just never rendered as text.
export function regionLabel(districtName: string | null | undefined): string {
  return districtName ?? "Kawasan tidak diketahui";
}

import { Badge } from "@/app/components/ui/badge";
import { CONFIDENCE_COLOR, CONFIDENCE_LABEL } from "@/app/lib/confidence";
import type { ModelAccuracy } from "@/app/types/zones";

// Shown next to every prediction (zone tiles, zone detail, reallocation
// candidates) -- the design system's Badge variants don't have red/yellow
// options, so color comes from an inline style keyed off the level the
// backend already computed (>=80% high/green, 40-79% moderate/yellow,
// <40% low/red), not re-derived here.
export function ConfidenceBadge({ modelAccuracy }: { modelAccuracy: ModelAccuracy | null }) {
  if (!modelAccuracy) return null;

  const color = CONFIDENCE_COLOR[modelAccuracy.confidence_level];

  return (
    <Badge
      selectable={false}
      style={{ borderColor: color, color }}
      title={
        `Validated against ${modelAccuracy.n} real surveyed UMKM points ` +
        `(95% CI ${modelAccuracy.ci_95_low_pct.toFixed(1)}-${modelAccuracy.ci_95_high_pct.toFixed(1)}%). ` +
        `As of the last analytics batch run (${new Date(modelAccuracy.computed_at).toLocaleString()}).`
      }
    >
      {modelAccuracy.accuracy_pct.toFixed(1)}% -- {CONFIDENCE_LABEL[modelAccuracy.confidence_level]}
    </Badge>
  );
}

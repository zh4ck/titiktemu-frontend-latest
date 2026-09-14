// Shared "professional" presentation for AI-generated narrative/insight
// text (policy recommendations, zone-lookup narratives). Previously this
// text was dropped in as a single unstyled <p>, indistinguishable from
// surrounding UI copy -- this gives it a labeled, quoted treatment so it
// reads as a distinct analytical insight rather than plain body text, and
// preserves the model's own paragraph breaks (whitespace-pre-line) instead
// of collapsing them into one run-on line.
export function NarrativeBlock({
  text,
  label = "Analisis AI",
  className = "",
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  return (
    <div className={`border-l-2 border-primary-teal-60/40 pl-3 ${className}`}>
      <p className="text-b9 font-semibold uppercase tracking-wide text-primary-teal-70/80">{label}</p>
      <p className="mt-0.5 whitespace-pre-line text-b8 text-neutral-700">{text}</p>
    </div>
  );
}

/**
 * Plain-language "why this score" for a capability, built only from engine output.
 * Used at the top of the score explanation panel.
 */
import {
  DIMENSION_LABELS,
  formatScore,
  gateLabel,
  getRubricDimension,
  levelDescriptor,
  type CapabilityResult,
} from "@/lib/engine";
import { DIMENSIONS, OBJECTIVE_SOURCE_TYPES } from "@/lib/schema";
import { seed } from "@/lib/seed";

export interface ScoreExplanation {
  headline: string;
  reasons: string[];
  next: string;
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export function explainScore(c: CapabilityResult): ScoreExplanation {
  const ai = formatScore(c.evidenceScore);
  const self = formatScore(c.self);
  const diff = c.evidenceScore - c.self;

  const headline = !c.hasEvidence
    ? `There is no evidence yet, so this shows Himalaya’s own 2025 rating of ${self} out of 5.`
    : Math.abs(diff) < 0.5
      ? `The AI suggests ${ai} out of 5 — in line with Himalaya’s own 2025 rating of ${self}.`
      : `The AI suggests ${ai} out of 5 — ${diff < 0 ? "lower" : "higher"} than Himalaya’s own 2025 rating of ${self}.`;

  const reasons: string[] = [];
  const all = DIMENSIONS.flatMap((d) => c.dimensions[d]?.contributing ?? []).filter((i) => i.sourceType !== "self_assessment");
  if (all.length) {
    const docs = all.filter((i) => OBJECTIVE_SOURCE_TYPES.includes(i.sourceType)).length;
    const answers = all.filter((i) => i.sourceType === "questionnaire").length;
    const said = all.filter((i) => i.sourceType === "interview").length;
    const parts = [docs && plural(docs, "document or KPI fact", "documents or KPI facts"), answers && plural(answers, "workshop answer"), said && plural(said, "interview statement")].filter(Boolean);
    reasons.push(`It is based on ${parts.join(", ")}.`);
  }

  const scored = DIMENSIONS.filter((d) => c.dimensions[d]);
  if (c.hasEvidence && scored.length) {
    const lo = scored.reduce((a, b) => (c.dimensions[a]!.final <= c.dimensions[b]!.final ? a : b));
    const hi = scored.reduce((a, b) => (c.dimensions[a]!.final >= c.dimensions[b]!.final ? a : b));
    const loD = c.dimensions[lo]!;
    if (c.dimensions[hi]!.final - loD.final >= 0.5) {
      reasons.push(
        `Strongest area: ${DIMENSION_LABELS[hi]} (${formatScore(c.dimensions[hi]!.final)}). Weakest: ${DIMENSION_LABELS[lo]} (${formatScore(loD.final)}), which on the scale means: ${levelDescriptor(getRubricDimension(seed.rubric, lo), loD.final).toLowerCase()}.`,
      );
    }
    for (const d of scored) {
      const ds = c.dimensions[d]!;
      if (ds.gate && ds.gated < ds.raw && ds.gate.missingGate) {
        reasons.push(
          `${DIMENSION_LABELS[d]} is held at ${formatScore(ds.final)}: the evidence points higher, but nothing yet proves ${gateLabel(ds.gate.missingGate)} — and a level can’t be claimed without that.`,
        );
        break;
      }
    }
  }

  const b = DIMENSIONS.map((d) => c.dimensions[d]?.confidenceBreakdown).filter(Boolean);
  const avgCoverage = b.reduce((a, x) => a + x!.coverage, 0) / Math.max(1, b.length);
  const avgAgreement = b.reduce((a, x) => a + x!.agreement, 0) / Math.max(1, b.length);
  reasons.push(
    c.confidenceBand === "high"
      ? "Confidence is high: several independent sources point the same way."
      : avgAgreement < 0.6
        ? `Confidence is ${c.confidenceBand}: the sources don’t agree with each other.`
        : avgCoverage < 0.5
          ? `Confidence is ${c.confidenceBand}: few documents or KPIs back it up — it rests mostly on what people said.`
          : `Confidence is ${c.confidenceBand}.`,
  );

  const has = (k: string) => c.flags.some((f) => f.kind === k);
  const next = !c.hasEvidence
    ? "Next step: upload a document or answer the questionnaire for this area."
    : has("INCONSISTENT")
      ? "Next step: check the conflicting sources in the Evidence tab before accepting."
      : has("SELF_VARIANCE")
        ? "Next step: discuss the difference with the function owner, then accept or override with a reason."
        : has("LACKS_EVIDENCE")
          ? "Next step: ask for a document or KPI that shows how this really works today."
          : "Next step: this looks ready to accept.";

  return { headline, reasons, next };
}

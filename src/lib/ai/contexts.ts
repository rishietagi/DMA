/**
 * Build agent-narrative context from real engine output, so every number the Agent Console
 * prints is traceable to the engine.
 */
import { formatMean, formatScore, type AssessmentResult } from "@/lib/engine";
import { capabilityLabel } from "@/lib/labels";
import type { Dimension } from "@/lib/schema";
import type { AgentContext } from "./types";

export function scoreContext(r: AssessmentResult, counts: { responses: number; evidence: number }): AgentContext {
  const caps = r.capabilities.filter((c) => c.inScope);
  const dims = caps.flatMap((c) => Object.values(c.dimensions));
  const indicators = dims.reduce((a, d) => a + (d?.contributing.length ?? 0), 0);
  const top = [...caps].sort((a, b) => Math.abs(b.evidenceScore - b.self) - Math.abs(a.evidenceScore - a.self))[0];
  return {
    capabilities: caps.length,
    indicators,
    responses: counts.responses,
    evidence: counts.evidence,
    gated: dims.filter((d) => d?.flags.some((f) => f.kind === "GATED")).length,
    high: caps.filter((c) => c.confidenceBand === "high").length,
    medium: caps.filter((c) => c.confidenceBand === "medium").length,
    low: caps.filter((c) => c.confidenceBand === "low").length,
    lacks: caps.filter((c) => c.flags.some((f) => f.kind === "LACKS_EVIDENCE")).length,
    variance: caps.filter((c) => c.flags.some((f) => f.kind === "SELF_VARIANCE")).length,
    inconsistent: caps.filter((c) => c.flags.some((f) => f.kind === "INCONSISTENT")).length,
    topVariance: top
      ? `${capabilityLabel(top.capability.id)} (self ${formatScore(top.self)} → evidence ${formatScore(top.evidenceScore)})`
      : "none",
  };
}

export function recalcContext(r: AssessmentResult): AgentContext {
  const w = r.weights;
  const sum = (Object.values(w) as number[]).reduce((a, b) => a + b, 0) || 1;
  const pct = (d: Dimension) => `${Math.round((w[d] / sum) * 100)}%`;
  return {
    weights: `process ${pct("process")}, data ${pct("data")}, AI ${pct("ai")}, people ${pct("people")}`,
    mean: formatMean(r.kpis.enterprise.mean),
  };
}

export function synthesisContext(r: AssessmentResult, headline: string): AgentContext {
  const top = Object.values(r.opportunities)
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 3)
    .map((o) => capabilityLabel(o.capabilityId));
  return {
    validated: r.kpis.all.validated,
    suggested: r.kpis.all.awaitingValidation,
    headline,
    top: top.join(", "),
  };
}

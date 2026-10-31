/** Aggregation: capability, function and KPI level. docs/SCORING_ENGINE.md §5. Pure. */
import {
  DIMENSIONS,
  type Capability,
  type ConfidenceBand,
  type Dimension,
  type FunctionDef,
  type Validation,
} from "@/lib/schema";
import { KPI } from "./config";
import { confidenceBand, type DimensionScore } from "./dimension";
import { mean, roundHalf, weightedMean } from "./math";
import type { CapabilityResult, FunctionResult, Kpis, ValidationStatus } from "./types";

/** Normalise weights to sum to 1 over the given dimensions (equal split if all zero). */
export function normaliseWeights(
  weights: Record<Dimension, number>,
  over: readonly Dimension[] = DIMENSIONS,
): Partial<Record<Dimension, number>> {
  const sum = over.reduce((a, d) => a + Math.max(0, weights[d] ?? 0), 0);
  const out: Partial<Record<Dimension, number>> = {};
  for (const d of over) out[d] = sum > 0 ? Math.max(0, weights[d] ?? 0) / sum : 1 / over.length;
  return out;
}

/** Capability score = Σ w_d · final_d, weights normalised over dimensions actually scored. */
export function capabilityScore(
  dims: Partial<Record<Dimension, DimensionScore>>,
  weights: Record<Dimension, number>,
): { score: number; confidence: number; band: ConfidenceBand; weightsUsed: Partial<Record<Dimension, number>> } | null {
  const scored = DIMENSIONS.filter((d) => dims[d]);
  if (scored.length === 0) return null;
  const w = normaliseWeights(weights, scored);
  const score = weightedMean(scored.map((d) => ({ value: dims[d]!.final, weight: w[d]! })))!;
  const conf = weightedMean(scored.map((d) => ({ value: dims[d]!.confidence, weight: w[d]! })))!;
  return { score, confidence: conf, band: confidenceBand(conf), weightsUsed: w };
}

/**
 * Effective score: an override pins the consultant's score; an acceptance endorses the
 * engine's method, so it follows the live evidence score (weight changes still flow through).
 */
export function effectiveScore(
  evidenceScore: number,
  validation: Validation | undefined,
): { score: number; status: ValidationStatus } {
  if (!validation) return { score: evidenceScore, status: "suggested" };
  if (validation.kind === "overridden") return { score: validation.after, status: "overridden" };
  return { score: evidenceScore, status: "accepted" };
}

/** Function score = mean of effective capability scores where fn ∈ functionIds. */
export function functionResults(
  functions: readonly FunctionDef[],
  caps: readonly CapabilityResult[],
  opts: { weightByCriticality?: boolean } = {},
): FunctionResult[] {
  return functions.map((fn) => {
    const members = caps.filter((c) => c.inScope && c.capability.functionIds.includes(fn.id));
    const w = (c: CapabilityResult) => (opts.weightByCriticality ? c.capability.criticality : 1);
    const dims: Partial<Record<Dimension, number>> = {};
    for (const d of DIMENSIONS) {
      const vals = members.map((c) => c.dimensions[d]?.final).filter((v): v is number => v !== undefined);
      if (vals.length) dims[d] = mean(vals);
    }
    return {
      fn,
      capabilityIds: members.map((c) => c.capability.id),
      score: weightedMean(members.map((c) => ({ value: c.effectiveScore, weight: w(c) }))),
      selfScore: weightedMean(members.map((c) => ({ value: c.self, weight: w(c) }))),
      dimensions: dims,
      confidence: weightedMean(members.map((c) => ({ value: c.confidence, weight: w(c) }))),
    };
  });
}

/**
 * KPIs over UNIQUE in-scope capabilities (a shared capability counts once). Threshold counts
 * use the half-point-rounded score so they agree with what the UI displays.
 */
export function computeKpis(
  caps: readonly CapabilityResult[],
  filter: (c: Capability) => boolean = () => true,
): Kpis {
  const set = caps.filter((c) => c.inScope && filter(c.capability));
  const n = set.length;
  const rounded = set.map((c) => roundHalf(c.effectiveScore));
  return {
    capabilities: n,
    mean: n ? mean(set.map((c) => c.effectiveScore)) : 0,
    selfMean: n ? mean(set.map((c) => c.self)) : 0,
    pctAtOrBelow2: n ? rounded.filter((s) => s <= KPI.lowThreshold).length / n : 0,
    countAtOrAbove4: rounded.filter((s) => s >= KPI.highThreshold).length,
    countAt5: rounded.filter((s) => s >= KPI.topLevel).length,
    lacksEvidence: set.filter((c) => c.flags.some((f) => f.kind === "LACKS_EVIDENCE")).length,
    awaitingValidation: set.filter((c) => c.status === "suggested").length,
    validated: set.filter((c) => c.status !== "suggested").length,
    evidenceCoverage: n ? set.filter((c) => c.hasEvidence).length / n : 0,
    highConfidence: set.filter((c) => c.confidenceBand === "high").length,
  };
}

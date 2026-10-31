/**
 * Gap, prioritisation and roadmap alignment. docs/SCORING_ENGINE.md §6.1 – §6.4. Pure.
 */
import type { Baseline, Capability, Dimension, Initiative, Roadmap } from "@/lib/schema";
import { ALIGNMENT, PRIORITISATION, TARGETS } from "./config";
import { clamp } from "./math";
import type { AlignmentStatus, CapabilityOpportunity, CapabilityResult, Quadrant } from "./types";

/** §6.1 target: seed/user override → 4 if priority-linked → 3.5 if revenue-facing → 3. */
export function targetFor(
  cap: Capability,
  baseline: Baseline,
  overrides: Readonly<Record<string, number>> = {},
): number {
  const o = overrides[cap.id] ?? baseline.targets.overrides[cap.id];
  if (o !== undefined) return o;
  if (baseline.priorities2026.some((p) => p.capabilityIds.includes(cap.id))) return TARGETS.priorityLinked;
  const fn = baseline.functions.find((f) => f.id === cap.primaryFunctionId);
  if (fn?.revenueFacing) return TARGETS.revenueFacing;
  return TARGETS.default;
}

export function gapFor(target: number, effective: number): number {
  return Math.max(0, target - effective);
}

export function initiativesFor(capabilityId: string, roadmap: Roadmap): Initiative[] {
  return roadmap.initiatives.filter((i) => i.mapsTo.includes(capabilityId));
}

/** Capabilities this one depends on whose effective score is below the threshold. */
export function unmetDependencies(
  capabilityId: string,
  roadmap: Roadmap,
  effectiveById: Readonly<Record<string, number>>,
): string[] {
  return roadmap.dependencies
    .filter((d) => d.to === capabilityId)
    .filter((d) => (effectiveById[d.from] ?? Infinity) < PRIORITISATION.unmetDependencyBelow)
    .map((d) => d.from);
}

export interface ValueInputs {
  priorityLinked: boolean;
  revenueFacing: boolean;
  painItems: number;
}
/** §6.2 value = 2 + 2 (priority) + 1 (revenue-facing) + 1 (≥2 pain items), cap 5 */
export function valueScore(v: ValueInputs): number {
  const P = PRIORITISATION;
  return Math.min(
    5,
    P.valueBase +
      (v.priorityLinked ? P.valuePriorityBonus : 0) +
      (v.revenueFacing ? P.valueRevenueBonus : 0) +
      (v.painItems >= P.painItemsForBonus ? P.valuePainBonus : 0),
  );
}

export interface FeasibilityInputs {
  dataScore: number;
  hasUnmetDependency: boolean;
  initiativeUnderway: boolean;
}
/** §6.2 feasibility = 1 + round(data) − 1 (unmet dep) + 1 (initiative in progress/completed), clamp 1..5 */
export function feasibilityScore(f: FeasibilityInputs): number {
  return clamp(
    1 + Math.round(f.dataScore) - (f.hasUnmetDependency ? 1 : 0) + (f.initiativeUnderway ? 1 : 0),
    1,
    5,
  );
}

export interface RiskInputs {
  peopleScore: number;
  lowConfidence: boolean;
  functionCount: number;
}
/** §6.2 risk = 1 + (people ≤ 2) + (confidence low) + (>2 functions) */
export function riskScore(r: RiskInputs): number {
  const P = PRIORITISATION;
  return (
    1 +
    (r.peopleScore <= P.peopleRiskAtOrBelow ? 1 : 0) +
    (r.lowConfidence ? 1 : 0) +
    (r.functionCount > P.crossFunctionalAbove ? 1 : 0)
  );
}

/** §6.3 priority = 100 × (gap/4) × (0.5·value + 0.3·feasibility + 0.2·(6 − risk)) / 5 */
export function priorityScore(gap: number, value: number, feasibility: number, risk: number): number {
  const P = PRIORITISATION;
  return 100 * (gap / 4) * ((P.wValue * value + P.wFeasibility * feasibility + P.wRisk * (6 - risk)) / 5);
}

export function quadrantFor(value: number, feasibility: number): Quadrant {
  const P = PRIORITISATION;
  if (value >= P.quickWinValue && feasibility >= P.quickWinFeasibility) return "Quick win";
  if (value >= P.quickWinValue) return "Strategic bet";
  if (feasibility >= P.quickWinFeasibility) return "Fill-in";
  return "Deprioritise";
}

/**
 * §6.4 roadmap alignment. Precedence: WHITESPACE → REVISIT → ACCELERATE → ON_TRACK → PLANNED.
 * ACCELERATE also covers in-progress initiatives (demo script §5.6: Finifi is in progress yet
 * the gap is ≥ 2) — see spec note.
 */
export function alignmentFor(gap: number, initiatives: readonly Initiative[]): AlignmentStatus {
  const A = ALIGNMENT;
  if (initiatives.length === 0) return gap >= A.whitespaceGap ? "WHITESPACE" : "AT_TARGET";
  const has = (s: Initiative["status"]) => initiatives.some((i) => i.status === s);
  if (has("completed") && gap >= A.revisitGap) return "REVISIT";
  if (gap >= A.accelerateGap && (has("planned") || has("in_progress"))) return "ACCELERATE";
  if ((has("in_progress") || has("completed")) && gap < A.onTrackGapBelow) return "ON_TRACK";
  if (gap <= 0) return "AT_TARGET";
  return "PLANNED";
}

/**
 * Effective dimension score: the evidence dimension score shifted by any consultant override
 * at capability level (so rules see the validated picture).
 */
export function effectiveDimension(c: CapabilityResult, d: Dimension): number {
  const ds = c.dimensions[d];
  const base = ds ? ds.final : c.self;
  return clamp(base + (c.effectiveScore - c.evidenceScore), 1, 5);
}

export function opportunityFor(
  c: CapabilityResult,
  ctx: {
    baseline: Baseline;
    roadmap: Roadmap;
    effectiveById: Readonly<Record<string, number>>;
    painItems: number;
    targetOverrides?: Readonly<Record<string, number>>;
  },
): CapabilityOpportunity {
  const cap = c.capability;
  const target = targetFor(cap, ctx.baseline, ctx.targetOverrides);
  const gap = gapFor(target, c.effectiveScore);
  const priorityIds = ctx.baseline.priorities2026.filter((p) => p.capabilityIds.includes(cap.id)).map((p) => p.id);
  const fn = ctx.baseline.functions.find((f) => f.id === cap.primaryFunctionId);
  const initiatives = initiativesFor(cap.id, ctx.roadmap);
  const unmet = unmetDependencies(cap.id, ctx.roadmap, ctx.effectiveById);
  const dataReadiness = effectiveDimension(c, "data");

  const value = valueScore({
    priorityLinked: priorityIds.length > 0,
    revenueFacing: !!fn?.revenueFacing,
    painItems: ctx.painItems,
  });
  const feasibility = feasibilityScore({
    dataScore: dataReadiness,
    hasUnmetDependency: unmet.length > 0,
    initiativeUnderway: initiatives.some((i) => i.status !== "planned"),
  });
  const risk = riskScore({
    peopleScore: effectiveDimension(c, "people"),
    lowConfidence: c.confidenceBand === "low",
    functionCount: cap.functionIds.length,
  });
  return {
    capabilityId: cap.id,
    target,
    gap,
    value,
    feasibility,
    risk,
    priority: priorityScore(gap, value, feasibility, risk),
    quadrant: quadrantFor(value, feasibility),
    alignment: alignmentFor(gap, initiatives),
    initiatives,
    unmetDependencies: unmet,
    dataReadiness,
    painItems: ctx.painItems,
    priorityIds,
  };
}

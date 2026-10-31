/**
 * Every tunable constant of the scoring engine lives here
 * (docs/SCORING_ENGINE.md). Some are exposed in the Scope screen.
 */
import type { Dimension, EvidenceCategory, SourceType } from "@/lib/schema";

/** §3.1 Source reliability r */
export const SOURCE_RELIABILITY: Record<SourceType, number> = {
  artifact: 1.0,
  kpi: 1.0,
  system: 1.0,
  questionnaire: 0.85,
  interview: 0.8,
  self_assessment: 0.5,
};

/** Weight of the implicit self-assessment indicator added per (capability, dimension) */
export const SELF_INDICATOR_WEIGHT = 1 as const;

/** §5 default dimension weights */
export const DEFAULT_WEIGHTS: Record<Dimension, number> = {
  process: 0.35,
  data: 0.25,
  ai: 0.2,
  people: 0.2,
};

/** §3.5 Confidence */
export const CONFIDENCE = {
  /** distinct objective source types expected per (capability, dimension) */
  expectedObjectiveTypes: 2,
  wCoverage: 0.4,
  wAgreement: 0.3,
  wQuality: 0.3,
  high: 0.75,
  medium: 0.5,
  /** stdev divisor in agreement = 1 − min(1, stdev / divisor) */
  stdevDivisor: 2,
} as const;

/** §3.6 Flags */
export const FLAGS = {
  inconsistentLevelDiff: 2,
  selfVarianceThreshold: 1.0,
} as const;

/** §3.3 gating bonus: +0.5 when ≥ this share of indicators sit at ≥ gateCap+1 */
export const GATE_HALF_STEP_SHARE = 0.5;

/** §5 KPI thresholds (applied to half-point-rounded capability scores) */
export const KPI = {
  lowThreshold: 2,
  highThreshold: 4,
  topLevel: 5,
} as const;

/** §6.1 target ambition defaults */
export const TARGETS = {
  priorityLinked: 4,
  revenueFacing: 3.5,
  default: 3,
} as const;

/** §6.2 – §6.3 prioritisation */
export const PRIORITISATION = {
  valueBase: 2,
  valuePriorityBonus: 2,
  valueRevenueBonus: 1,
  valuePainBonus: 1,
  painItemsForBonus: 2,
  unmetDependencyBelow: 3,
  peopleRiskAtOrBelow: 2,
  crossFunctionalAbove: 2,
  wValue: 0.5,
  wFeasibility: 0.3,
  wRisk: 0.2,
  quickWinValue: 3.5,
  quickWinFeasibility: 3,
} as const;

/** §6.4 roadmap alignment */
export const ALIGNMENT = {
  whitespaceGap: 1,
  accelerateGap: 2,
  onTrackGapBelow: 2,
  revisitGap: 1.5,
} as const;

/**
 * §6.6 roadmap phasing. Rescaled from the spec's 60 / 40: with Himalaya's targets of 3–4 the
 * gap rarely exceeds 3, so priority tops out near 75 and nothing would ever land in "Now".
 */
export const PHASING = {
  nowPriority: 45,
  nowFeasibility: 3,
  nextPriority: 25,
} as const;

/** §7.8 evidence category → indicator source type */
export const CATEGORY_SOURCE_TYPE: Record<EvidenceCategory, SourceType> = {
  self_assessment: "self_assessment",
  it_strategy: "artifact",
  process_docs: "artifact",
  application_landscape: "system",
  data_architecture: "artifact",
  policies_sops: "artifact",
  transformation_portfolio: "artifact",
  interview_notes: "interview",
  kpi_extracts: "kpi",
};

export const EVIDENCE_CATEGORY_LABELS: Record<EvidenceCategory, string> = {
  self_assessment: "Self-assessment",
  it_strategy: "Digital / IT strategy",
  process_docs: "Process documentation",
  application_landscape: "Application landscape",
  data_architecture: "Data architecture",
  policies_sops: "Policies / SOPs",
  transformation_portfolio: "Transformation portfolio",
  interview_notes: "Interview / workshop notes",
  kpi_extracts: "KPI extracts",
};

export const DIMENSION_LABELS: Record<Dimension, string> = {
  process: "Process",
  data: "Data & Analytics",
  ai: "AI",
  people: "People",
};

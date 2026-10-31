/** Engine input / output types. */
import type {
  Baseline,
  Capability,
  ConfidenceBand,
  Dimension,
  EvidenceCategory,
  Flag,
  FunctionDef,
  FunctionId,
  Initiative,
  QuestionBank,
  QuestionnaireResponse,
  Roadmap,
  Rubric,
  SourceType,
  UseCaseRules,
  Validation,
} from "@/lib/schema";
import type { DimensionScore } from "./dimension";

export type Polarity = "pain" | "strength" | "neutral";

/** One extracted piece of evidence (classifier output or seeded). */
export interface EvidenceItem {
  id: string;
  docId: string;
  docTitle: string;
  category: EvidenceCategory;
  sourceType: SourceType;
  location: string;
  quote: string;
  functionId: FunctionId | null;
  capabilityId: string | null;
  dimension: Dimension | null;
  level: 1 | 2 | 3 | 4 | 5 | null;
  polarity: Polarity;
  weight: 1 | 2 | 3;
  gateKey?: string;
  stakeholder?: string;
  /** matched cue words, used to highlight the quote */
  cues: string[];
  /** cross-functional theme ids (SCORING_ENGINE.md §7) */
  themes?: string[];
}

export type AssessmentMode = "baseline" | "evidence";

export interface AssessmentInput {
  baseline: Baseline;
  rubric: Rubric;
  roadmap: Roadmap;
  questionBank: QuestionBank;
  useCaseRules: UseCaseRules;
  mode: AssessmentMode;
  /** relative weights; normalised over scored dimensions */
  weights: Record<Dimension, number>;
  excludedCapabilityIds?: readonly string[];
  responses?: readonly QuestionnaireResponse[];
  evidence?: readonly EvidenceItem[];
  validations?: Readonly<Record<string, Validation>>;
  targetOverrides?: Readonly<Record<string, number>>;
  /**
   * Evidence categories present per function. When provided, LOW_COVERAGE is evaluated
   * against the categories the question bank expects for that function.
   */
  evidenceCategoriesByFunction?: Readonly<Partial<Record<FunctionId, readonly EvidenceCategory[]>>>;
  weightFunctionScoresByCriticality?: boolean;
}

export type ValidationStatus = "suggested" | "accepted" | "overridden";

export interface CapabilityResult {
  capability: Capability;
  inScope: boolean;
  self: number;
  dimensions: Partial<Record<Dimension, DimensionScore>>;
  /** engine output (full precision) */
  evidenceScore: number;
  /** validated score if accepted/overridden, else evidence score */
  effectiveScore: number;
  status: ValidationStatus;
  validation?: Validation;
  confidence: number;
  confidenceBand: ConfidenceBand;
  /** dimension flags + capability-level flags (SELF_VARIANCE, LOW_COVERAGE) */
  flags: Flag[];
  hasEvidence: boolean;
  /** 0–100 index of the effective score */
  index: number;
  /** effective weights used for this capability (normalised over scored dims) */
  weightsUsed: Partial<Record<Dimension, number>>;
}

export interface FunctionResult {
  fn: FunctionDef;
  capabilityIds: string[];
  score: number | null;
  selfScore: number | null;
  dimensions: Partial<Record<Dimension, number>>;
  confidence: number | null;
}

export interface Kpis {
  capabilities: number;
  mean: number;
  selfMean: number;
  pctAtOrBelow2: number;
  countAtOrAbove4: number;
  countAt5: number;
  lacksEvidence: number;
  awaitingValidation: number;
  validated: number;
  /** share of capabilities with at least one objective evidence indicator */
  evidenceCoverage: number;
  highConfidence: number;
}

export type Quadrant = "Quick win" | "Strategic bet" | "Fill-in" | "Deprioritise";
export type AlignmentStatus =
  | "WHITESPACE"
  | "ACCELERATE"
  | "REVISIT"
  | "ON_TRACK"
  | "PLANNED"
  | "AT_TARGET";

export interface CapabilityOpportunity {
  capabilityId: string;
  target: number;
  gap: number;
  value: number;
  feasibility: number;
  risk: number;
  priority: number;
  quadrant: Quadrant;
  alignment: AlignmentStatus;
  initiatives: Initiative[];
  unmetDependencies: string[];
  dataReadiness: number;
  painItems: number;
  priorityIds: string[];
}

export type Phase = "Now" | "Next" | "Later";

export interface UseCaseTrigger {
  capabilityId: string;
  dimension: Dimension;
  score: number;
  gap: number;
  priority: number;
}

export interface UseCase {
  id: string;
  title: string;
  description: string;
  aiPattern: string;
  kpis: string[];
  dataPrerequisites: string[];
  effort: "S" | "M" | "L";
  dependsOn: string[];
  triggers: UseCaseTrigger[];
  /** metrics of the highest-priority trigger */
  primaryCapabilityId: string;
  functionIds: FunctionId[];
  gap: number;
  value: number;
  feasibility: number;
  risk: number;
  priority: number;
  quadrant: Quadrant;
  dataReadiness: number;
  initiatives: Initiative[];
  alignment: AlignmentStatus;
  phase: Phase;
  /** order within the topological sort */
  order: number;
  /** brought forward as a prerequisite of an earlier-phase use case */
  pulledForward: boolean;
}

export interface AssessmentResult {
  mode: AssessmentMode;
  weights: Record<Dimension, number>;
  capabilities: CapabilityResult[];
  byId: Record<string, CapabilityResult>;
  functions: FunctionResult[];
  kpis: { all: Kpis; cpd: Kpis; enterprise: Kpis };
  opportunities: Record<string, CapabilityOpportunity>;
  useCases: UseCase[];
}

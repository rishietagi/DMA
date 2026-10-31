/** Shared test fixtures for engine tests (not shipped). */
import type { Indicator, RubricDimension } from "@/lib/schema";
import { seed } from "@/lib/seed";
import { DEFAULT_WEIGHTS } from "./config";
import type { AssessmentInput, EvidenceItem } from "./types";

let n = 0;
export function ind(p: Partial<Indicator> & Pick<Indicator, "level" | "sourceType">): Indicator {
  return {
    id: p.id ?? `i${++n}`,
    capabilityId: p.capabilityId ?? "cap",
    dimension: p.dimension ?? "process",
    weight: p.weight ?? 1,
    ...p,
  };
}

export const processDim = seed.rubric.dimensions.find((d) => d.id === "process") as RubricDimension;
export const dataDim = seed.rubric.dimensions.find((d) => d.id === "data") as RubricDimension;
export const peopleDim = seed.rubric.dimensions.find((d) => d.id === "people") as RubricDimension;

export function baselineInput(over: Partial<AssessmentInput> = {}): AssessmentInput {
  return {
    baseline: seed.baseline,
    rubric: seed.rubric,
    roadmap: seed.roadmap,
    questionBank: seed.questionBank,
    useCaseRules: seed.useCaseRules,
    mode: "baseline",
    weights: DEFAULT_WEIGHTS,
    ...over,
  };
}

export function demoEvidence(): EvidenceItem[] {
  return seed.demoResponses.evidence.map((e) => ({ ...e, functionId: null, cues: [] }));
}

export function demoInput(over: Partial<AssessmentInput> = {}): AssessmentInput {
  return baselineInput({
    mode: "evidence",
    responses: seed.demoResponses.responses,
    evidence: demoEvidence(),
    ...over,
  });
}

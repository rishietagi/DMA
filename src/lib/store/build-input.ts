/** Session → capability-engine input, and evidence coverage by function. */
import { DEFAULT_WEIGHTS, type AssessmentInput, type AssessmentResult, type EvidenceItem, type IdeaScoreInput } from "@/lib/engine";
import type { EvidenceCategory, FunctionId, QuestionnaireResponse } from "@/lib/schema";
import { seed } from "@/lib/seed";
import type { EvidenceDoc } from "./types";

const capPrimary = new Map(seed.baseline.capabilities.map((c) => [c.id, c.primaryFunctionId]));

export function coverageByFunction(
  evidence: readonly EvidenceItem[],
  documents: readonly EvidenceDoc[],
): Partial<Record<FunctionId, EvidenceCategory[]>> {
  const cats: Partial<Record<FunctionId, EvidenceCategory[]>> = {};
  const add = (f: FunctionId | null | undefined, c: EvidenceCategory) => {
    if (!f) return;
    const list = (cats[f] ??= []);
    if (!list.includes(c)) list.push(c);
  };
  for (const e of evidence) add(e.functionId ?? (e.capabilityId ? capPrimary.get(e.capabilityId) : null), e.category);
  for (const d of documents) if (d.status === "analysed") add(d.dominantFunctionId, d.category);
  return cats;
}

/** Capability-engine input for the session: its evidence, the seed questionnaire, default weights. */
export function capabilityInput(
  evidence: readonly EvidenceItem[],
  documents: readonly EvidenceDoc[],
  responses: readonly QuestionnaireResponse[] = seed.demoResponses.responses,
): AssessmentInput {
  return {
    ...seed,
    mode: "evidence",
    weights: DEFAULT_WEIGHTS,
    responses,
    evidence,
    evidenceCategoriesByFunction: coverageByFunction(evidence, documents),
  };
}

/** Value / feasibility / risk per capability, for scoring process ideas. */
export function ideaScoresFrom(r: AssessmentResult): Record<string, IdeaScoreInput> {
  return Object.fromEntries(
    Object.values(r.opportunities).map((o) => [o.capabilityId, { value: o.value, feasibility: o.feasibility, risk: o.risk }]),
  );
}

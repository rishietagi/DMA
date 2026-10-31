/** Session state → engine input. Shared by the AssessmentProvider and client actions. */
import type { AssessmentInput, EvidenceItem } from "@/lib/engine";
import type { EvidenceCategory, FunctionId } from "@/lib/schema";
import { seed } from "@/lib/seed";
import type { SessionState } from "./session";

const capPrimary = new Map(seed.baseline.capabilities.map((c) => [c.id, c.primaryFunctionId]));

export function coverageByFunction(
  evidence: readonly EvidenceItem[],
  documents: SessionState["documents"],
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

export function buildInput(
  s: Pick<SessionState, "mode" | "weights" | "excluded" | "responses" | "evidence" | "validations" | "targetOverrides" | "documents">,
): AssessmentInput {
  return {
    ...seed,
    mode: s.mode,
    weights: s.weights,
    excludedCapabilityIds: s.excluded,
    responses: s.responses,
    evidence: s.evidence,
    validations: s.validations,
    targetOverrides: s.targetOverrides,
    evidenceCategoriesByFunction: coverageByFunction(s.evidence, s.documents),
  };
}

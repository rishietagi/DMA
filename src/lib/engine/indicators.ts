/**
 * Turning inputs into indicators: the implicit self-assessment indicator,
 * questionnaire responses (SCORING_ENGINE.md §4) and evidence items (§7.8). Pure.
 */
import {
  DIMENSIONS,
  OBJECTIVE_SOURCE_TYPES,
  type Capability,
  type Dimension,
  type EvidenceCategory,
  type FunctionId,
  type Indicator,
  type Question,
  type QuestionBank,
  type QuestionnaireResponse,
} from "@/lib/schema";
import { CATEGORY_SOURCE_TYPE, SELF_INDICATOR_WEIGHT } from "./config";
import type { EvidenceItem } from "./types";

export function selfIndicators(cap: Capability): Indicator[] {
  return DIMENSIONS.map((dimension) => ({
    id: `self:${cap.id}:${dimension}`,
    capabilityId: cap.id,
    dimension,
    level: cap.selfScore,
    weight: SELF_INDICATOR_WEIGHT,
    sourceType: "self_assessment",
    category: "self_assessment",
    label: "2025 self-assessment (capability-level)",
    sourceRef: { docId: "baseline-2025", docTitle: "2025 self-assessment" },
  }));
}

export interface QuestionIndex {
  byId: Map<string, { question: Question; functionId: FunctionId | "*"; l1Chain: string[] }>;
}

export function indexQuestionBank(bank: QuestionBank): QuestionIndex {
  const byId: QuestionIndex["byId"] = new Map();
  for (const f of bank.functions)
    for (const q of f.questions) byId.set(q.id, { question: q, functionId: f.functionId, l1Chain: f.l1Chain });
  return { byId };
}

/** Capabilities a question applies to when answered for `functionId` ('*' → all of that function). */
export function questionCapabilities(
  q: Question,
  functionId: FunctionId,
  capabilities: readonly Capability[],
): string[] {
  if (q.capabilityIds.includes("*"))
    return capabilities.filter((c) => c.functionIds.includes(functionId)).map((c) => c.id);
  return q.capabilityIds;
}

export function responseIndicators(
  responses: readonly QuestionnaireResponse[],
  index: QuestionIndex,
  capabilities: readonly Capability[],
): Indicator[] {
  const out: Indicator[] = [];
  for (const r of responses) {
    const entry = index.byId.get(r.questionId);
    if (!entry) continue;
    const q = entry.question;
    const option = q.options.find((o) => o.level === r.level);
    for (const capabilityId of questionCapabilities(q, r.functionId, capabilities)) {
      out.push({
        id: `q:${q.id}:${r.functionId}:${capabilityId}`,
        capabilityId,
        dimension: q.dimension,
        level: r.level,
        weight: q.weight,
        sourceType: "questionnaire",
        gateKey: q.gateKey,
        label: q.text,
        sourceRef: {
          docId: "questionnaire",
          docTitle: "Workshop questionnaire",
          location: `${q.id.toUpperCase()} · ${q.l2}`,
          quote: option?.label,
          stakeholder: r.answeredBy,
        },
      });
    }
  }
  return out;
}

export function evidenceIndicators(evidence: readonly EvidenceItem[]): Indicator[] {
  return evidence
    .filter((e) => e.capabilityId && e.dimension && e.level !== null)
    .map((e) => ({
      id: `ev:${e.id}`,
      capabilityId: e.capabilityId as string,
      dimension: e.dimension as Dimension,
      level: e.level,
      weight: e.weight,
      sourceType: e.sourceType,
      category: e.category,
      gateKey: e.gateKey,
      label: e.quote,
      sourceRef: {
        docId: e.docId,
        docTitle: e.docTitle,
        location: e.location,
        quote: e.quote,
        stakeholder: e.stakeholder,
      },
    }));
}

/**
 * Expected number of distinct objective source types for (capability, dimension), derived
 * from the evidenceExpected of the questions that score it. 0 when questions exist but expect
 * only affirmations (interview notes); null when no question scores it → config default.
 */
export function expectedObjectiveTypes(
  bank: QuestionBank,
  cap: Capability,
  dimension: Dimension,
  categorySource: Record<EvidenceCategory, string> = CATEGORY_SOURCE_TYPE,
): number | null {
  const types = new Set<string>();
  let questions = 0;
  for (const f of bank.functions) {
    for (const q of f.questions) {
      if (q.dimension !== dimension) continue;
      const applies =
        q.capabilityIds.includes(cap.id) ||
        (q.capabilityIds.includes("*") &&
          (f.functionId === "*" || cap.functionIds.includes(f.functionId as FunctionId)));
      if (!applies) continue;
      questions++;
      for (const c of q.evidenceExpected) {
        const st = categorySource[c];
        if (st && (OBJECTIVE_SOURCE_TYPES as readonly string[]).includes(st)) types.add(st);
      }
    }
  }
  return questions === 0 ? null : types.size;
}

/** Evidence categories the question bank expects for a function (for LOW_COVERAGE). */
export function expectedCategoriesForFunction(bank: QuestionBank, functionId: FunctionId): EvidenceCategory[] {
  const set = new Set<EvidenceCategory>();
  for (const f of bank.functions)
    if (f.functionId === functionId) for (const q of f.questions) q.evidenceExpected.forEach((c) => set.add(c));
  return [...set];
}

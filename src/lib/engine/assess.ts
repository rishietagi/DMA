/**
 * assess(): the single entry point that turns a session into scores, KPIs, opportunities
 * and a phased roadmap. Same input → same output.
 */
import {
  DIMENSIONS,
  OBJECTIVE_SOURCE_TYPES,
  type Dimension,
  type Flag,
  type Indicator,
} from "@/lib/schema";
import { FLAGS } from "./config";
import { capabilityScore, computeKpis, effectiveScore, functionResults } from "./aggregate";
import { scoreDimension, type DimensionScore } from "./dimension";
import {
  evidenceIndicators,
  expectedCategoriesForFunction,
  expectedObjectiveTypes,
  indexQuestionBank,
  responseIndicators,
  selfIndicators,
} from "./indicators";
import { toIndex } from "./math";
import { opportunityFor } from "./prioritise";
import { getRubricDimension } from "./rubric";
import type { AssessmentInput, AssessmentResult, CapabilityOpportunity, CapabilityResult } from "./types";
import { generateUseCases, phaseUseCases } from "./usecases";

/** Collect every indicator for the session, keyed `${capabilityId}|${dimension}`. */
export function collectIndicators(input: AssessmentInput): Map<string, Indicator[]> {
  const caps = input.baseline.capabilities;
  const all: Indicator[] = caps.flatMap(selfIndicators);
  if (input.mode === "evidence") {
    all.push(...responseIndicators(input.responses ?? [], indexQuestionBank(input.questionBank), caps));
    all.push(...evidenceIndicators(input.evidence ?? []));
  }
  const map = new Map<string, Indicator[]>();
  for (const i of all) {
    const k = `${i.capabilityId}|${i.dimension}`;
    const list = map.get(k);
    if (list) list.push(i);
    else map.set(k, [i]);
  }
  return map;
}

export function assess(input: AssessmentInput): AssessmentResult {
  const excluded = new Set(input.excludedCapabilityIds ?? []);
  const indicators = collectIndicators(input);
  const validations = input.validations ?? {};

  const capabilities: CapabilityResult[] = input.baseline.capabilities.map((cap) => {
    const dims: Partial<Record<Dimension, DimensionScore>> = {};
    for (const d of DIMENSIONS) {
      const list = indicators.get(`${cap.id}|${d}`) ?? [];
      const expected = expectedObjectiveTypes(input.questionBank, cap, d) ?? undefined;
      const ds = scoreDimension(cap.id, getRubricDimension(input.rubric, d), list, {
        expectedObjectiveTypes: expected,
      });
      if (ds) dims[d] = ds;
    }
    const agg = capabilityScore(dims, input.weights);
    const evidenceScore = agg?.score ?? cap.selfScore;
    const validation = validations[cap.id];
    const eff = effectiveScore(evidenceScore, validation);
    const hasEvidence = DIMENSIONS.some((d) => dims[d]?.hasEvidence);

    // Capability-level flags: INCONSISTENT / GATED surface from dimensions; LACKS_EVIDENCE is
    // judged on the capability as a whole (People/AI rarely have artefacts, so a per-dimension
    // union would flag everything — see spec §3.6 note).
    const flags: Flag[] = DIMENSIONS.flatMap((d) =>
      (dims[d]?.flags ?? []).filter((f) => f.kind === "INCONSISTENT" || f.kind === "GATED"),
    );
    const anyObjective = DIMENSIONS.some((d) =>
      dims[d]?.contributing.some((i) => OBJECTIVE_SOURCE_TYPES.includes(i.sourceType)),
    );
    if (!hasEvidence) {
      flags.unshift({ kind: "LACKS_EVIDENCE", reason: "Only the 2025 self-assessment — no supporting evidence" });
    } else if (!anyObjective) {
      flags.unshift({ kind: "LACKS_EVIDENCE", reason: "No artefact, KPI or system evidence — affirmations only" });
    } else if (agg && agg.band === "low") {
      flags.unshift({ kind: "LACKS_EVIDENCE", reason: `Low confidence (${agg.confidence.toFixed(2)})` });
    }
    if (hasEvidence && Math.abs(evidenceScore - cap.selfScore) >= FLAGS.selfVarianceThreshold) {
      flags.push({ kind: "SELF_VARIANCE", self: cap.selfScore, evidence: evidenceScore });
    }
    const present = input.evidenceCategoriesByFunction?.[cap.primaryFunctionId];
    if (input.mode === "evidence" && present) {
      const missing = expectedCategoriesForFunction(input.questionBank, cap.primaryFunctionId).filter(
        (c) => !present.includes(c),
      );
      if (missing.length) flags.push({ kind: "LOW_COVERAGE", missing });
    }

    return {
      capability: cap,
      inScope: !excluded.has(cap.id),
      self: cap.selfScore,
      dimensions: dims,
      evidenceScore,
      effectiveScore: eff.score,
      status: eff.status,
      validation,
      confidence: agg?.confidence ?? 0,
      confidenceBand: agg?.band ?? "low",
      flags,
      hasEvidence,
      index: toIndex(eff.score),
      weightsUsed: agg?.weightsUsed ?? {},
    };
  });

  const byId = Object.fromEntries(capabilities.map((c) => [c.capability.id, c]));
  const effectiveById = Object.fromEntries(capabilities.map((c) => [c.capability.id, c.effectiveScore]));

  const painByCap: Record<string, number> = {};
  for (const e of input.mode === "evidence" ? (input.evidence ?? []) : [])
    if (e.capabilityId && e.polarity === "pain") painByCap[e.capabilityId] = (painByCap[e.capabilityId] ?? 0) + 1;

  const opportunities: Record<string, CapabilityOpportunity> = {};
  for (const c of capabilities) {
    if (!c.inScope) continue;
    opportunities[c.capability.id] = opportunityFor(c, {
      baseline: input.baseline,
      roadmap: input.roadmap,
      effectiveById,
      painItems: painByCap[c.capability.id] ?? 0,
      targetOverrides: input.targetOverrides,
    });
  }

  const useCases = phaseUseCases(
    generateUseCases(input.useCaseRules.rules, capabilities, opportunities),
    opportunities,
  );

  return {
    mode: input.mode,
    weights: input.weights,
    capabilities,
    byId,
    functions: functionResults(input.baseline.functions, capabilities, {
      weightByCriticality: input.weightFunctionScoresByCriticality,
    }),
    kpis: {
      all: computeKpis(capabilities),
      cpd: computeKpis(capabilities, (c) => c.group === "cpd"),
      enterprise: computeKpis(capabilities, (c) => c.group === "enterprise"),
    },
    opportunities,
    useCases,
  };
}

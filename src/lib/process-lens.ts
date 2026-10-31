/**
 * Process analysis per function (SCORING_ENGINE.md §7, "Process analysis"): map evidence and
 * questionnaire answers onto each L1 step, find manual workarounds and hand-offs, and compute
 * the fragmentation index. Pure.
 */
import {
  fragmentationIndex,
  handoffsIn,
  isManualWorkaround,
  systemsIn,
  type ProcessStepAnalysis,
} from "@/lib/classifier/insights";
import type { EvidenceItem } from "@/lib/engine";
import type { FunctionId, QuestionnaireResponse } from "@/lib/schema";
import { seed } from "@/lib/seed";

export interface FunctionProcess {
  functionId: FunctionId;
  steps: (ProcessStepAnalysis & { capabilityIds: string[]; reentry: number })[];
  index: number;
}

const capById = new Map(seed.baseline.capabilities.map((c) => [c.id, c]));

/** Which L1 step a capability belongs to, via the L2 section of the questions that score it. */
export function stepForCapability(functionId: FunctionId, capabilityId: string): string | null {
  const bank = seed.questionBank.functions.find((f) => f.functionId === functionId);
  if (!bank) return null;
  const q = bank.questions.find((x) => x.capabilityIds.includes(capabilityId) && bank.l1Chain.includes(x.l2));
  return q?.l2 ?? null;
}

export function analyseFunctionProcess(
  functionId: FunctionId,
  evidence: readonly EvidenceItem[],
  responses: readonly QuestionnaireResponse[],
): FunctionProcess {
  const bank = seed.questionBank.functions.find((f) => f.functionId === functionId)!;
  const steps = bank.l1Chain.map((step) => {
    const qs = bank.questions.filter((q) => q.l2 === step);
    const capabilityIds = [...new Set(qs.flatMap((q) => q.capabilityIds))];
    const levels = qs
      .filter((q) => q.dimension === "process")
      .map((q) => responses.find((r) => r.questionId === q.id && r.functionId === functionId)?.level)
      .filter((v): v is 1 | 2 | 3 | 4 | 5 => typeof v === "number");
    const ev = evidence.filter(
      (e) =>
        e.capabilityId &&
        (e.functionId === functionId || capById.get(e.capabilityId)?.primaryFunctionId === functionId) &&
        stepForCapability(functionId, e.capabilityId) === step,
    );
    const evLevels = ev.filter((e) => e.dimension === "process" && e.level !== null).map((e) => e.level as number);
    const all = [...levels, ...evLevels];
    const systems = [
      ...new Set([
        ...capabilityIds.map((id) => capById.get(id)?.system).filter((s): s is string => !!s && !/agency/i.test(s)),
        ...ev.flatMap((e) => systemsIn(e.quote)),
      ]),
    ];
    return {
      step,
      capabilityIds,
      level: all.length ? all.reduce((a, b) => a + b, 0) / all.length : null,
      systems,
      workarounds: ev.filter(isManualWorkaround),
      handoffs: ev.reduce((a, e) => a + handoffsIn(e), 0),
      reentry: ev.filter((e) => e.themes?.includes("data-re-entry")).length,
      evidence: ev,
    };
  });
  return { functionId, steps, index: fragmentationIndex(steps) };
}

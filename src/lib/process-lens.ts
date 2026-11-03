/**
 * Process lens per L1 step (SCORING_ENGINE.md §7 "Process analysis"): systems named, manual
 * workarounds, hand-offs between systems, re-keying, strengths and pain points, and the function's
 * fragmentation index. Pure; uses the process-ladder mapping of sentences to steps.
 */
import { fragmentationIndex, handoffsIn, isManualWorkaround, systemsIn } from "@/lib/classifier/insights";
import type { EvidenceItem } from "@/lib/engine";
import { capabilitiesForStep, l1Processes, processKey, stepForEvidence, type CustomProcess } from "@/lib/process-input";
import type { FunctionId } from "@/lib/schema";
import { seed } from "@/lib/seed";

const capById = new Map(seed.baseline.capabilities.map((c) => [c.id, c]));

export interface StepLens {
  id: string;
  step: string;
  systems: string[];
  workarounds: EvidenceItem[];
  handoffs: number;
  reentry: number;
  strengths: EvidenceItem[];
  pains: EvidenceItem[];
  evidence: EvidenceItem[];
}

export interface FunctionLens {
  functionId: FunctionId;
  steps: StepLens[];
  /** (#systems + #manual hand-offs) / #steps */
  index: number;
}

export function processLens(functionId: FunctionId, evidence: readonly EvidenceItem[], custom: readonly CustomProcess[] = []): FunctionLens {
  const steps = l1Processes(functionId, custom).map((step): StepLens => {
    const ev = evidence.filter((e) => stepForEvidence(functionId, e, custom) === step);
    const systems = [
      ...new Set([
        ...capabilitiesForStep(functionId, step)
          .map((id) => capById.get(id)?.system)
          .filter((s): s is string => !!s && !/agency/i.test(s)),
        ...ev.flatMap((e) => systemsIn(e.quote)),
      ]),
    ];
    return {
      id: processKey(functionId, step),
      step,
      systems,
      workarounds: ev.filter(isManualWorkaround),
      handoffs: ev.reduce((a, e) => a + handoffsIn(e), 0),
      reentry: ev.filter((e) => e.themes?.includes("data-re-entry")).length,
      strengths: ev.filter((e) => e.polarity === "strength"),
      pains: ev.filter((e) => e.polarity === "pain"),
      evidence: ev,
    };
  });
  return {
    functionId,
    steps,
    index: fragmentationIndex(steps.map((s) => ({ ...s, level: null }))),
  };
}

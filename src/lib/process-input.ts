/**
 * Turns session state into the process-ladder engine input (SCORING_ENGINE.md §11.3): which L1
 * processes a function has, which capabilities and evidence belong to each, and the quick-check
 * answers. Seed lookups live here so the engine stays pure.
 */
import { matchCues } from "@/lib/classifier/classify";
import { toLadder, type EvidenceItem, type FunctionProcessResult, type LadderLevel, type ProcessDef, type ProcessInput, type ProcessValidation, type QuestionAnswer } from "@/lib/engine";
import { FUNCTION_IDS, type Dimension, type FunctionId, type Question, type QuestionnaireResponse } from "@/lib/schema";
import { seed } from "@/lib/seed";

const capById = new Map(seed.baseline.capabilities.map((c) => [c.id, c]));
const STOP = new Set(["planning", "management", "process", "processes", "control", "tower", "analytics", "visibility", "execution"]);

export const processKey = (functionId: FunctionId, step: string) => `${functionId}:${step}`;

function bankFor(functionId: FunctionId) {
  return seed.questionBank.functions.find((f) => f.functionId === functionId);
}

/** The function's L1 process chain. */
export function l1Processes(functionId: FunctionId): string[] {
  return bankFor(functionId)?.l1Chain ?? [];
}

/** Words that place a sentence on a step: the seed list, else the distinctive words of its name. */
export function stepKeywords(functionId: FunctionId, step: string): string[] {
  const listed = bankFor(functionId)?.l1Keywords?.[step];
  if (listed) return listed;
  return step
    .toLowerCase()
    .split(/[^a-z&]+/)
    .filter((w) => w.length >= 5 && !STOP.has(w));
}

/** Which L1 step a capability belongs to, via the L2 section of the first question that scores it. */
export function stepForCapability(functionId: FunctionId, capabilityId: string): string | null {
  const bank = bankFor(functionId);
  if (!bank) return null;
  const q = bank.questions.find((x) => x.capabilityIds.includes(capabilityId) && bank.l1Chain.includes(x.l2));
  return q?.l2 ?? null;
}

export function belongsToFunction(e: EvidenceItem, functionId: FunctionId): boolean {
  return e.functionId === functionId || (!!e.capabilityId && capById.get(e.capabilityId)?.primaryFunctionId === functionId);
}

/** A step named in the sentence wins; otherwise the step of the tagged capability. */
export function stepForEvidence(functionId: FunctionId, e: EvidenceItem): string | null {
  if (!belongsToFunction(e, functionId)) return null;
  for (const step of l1Processes(functionId)) if (matchCues(e.quote, stepKeywords(functionId, step)).length) return step;
  return e.capabilityId ? stepForCapability(functionId, e.capabilityId) : null;
}

/** Capabilities owned by a step (each capability belongs to one step). */
export function capabilitiesForStep(functionId: FunctionId, step: string): string[] {
  const bank = bankFor(functionId);
  if (!bank) return [];
  const ids = new Set(bank.questions.filter((q) => q.l2 === step).flatMap((q) => q.capabilityIds));
  return [...ids].filter((id) => capById.has(id) && stepForCapability(functionId, id) === step);
}

/** A question the consultant added to a process; answered directly on the ladder. */
export interface CustomQuestion {
  id: string;
  functionId: FunctionId;
  step: string;
  text: string;
  dimension: Dimension;
  weight: 1 | 2 | 3;
  answer: LadderLevel | null;
}

/** Question-bank questions asked for a step. */
export function questionsForStep(functionId: FunctionId, step: string): Question[] {
  return bankFor(functionId)?.questions.filter((q) => q.l2 === step) ?? [];
}

/** Answered questions for a step: bank answers crosswalked to the ladder, custom answers as given. */
export function answersForStep(
  functionId: FunctionId,
  step: string,
  responses: readonly QuestionnaireResponse[],
  custom: readonly CustomQuestion[],
): QuestionAnswer[] {
  const bank = questionsForStep(functionId, step).flatMap((q): QuestionAnswer[] => {
    const r = responses.find((x) => x.questionId === q.id && x.functionId === functionId);
    if (!r || r.level === null) return [];
    return [{ questionId: q.id, text: q.text, value: toLadder(r.level), weight: q.weight, custom: false }];
  });
  const own = custom
    .filter((c) => c.functionId === functionId && c.step === step && c.answer !== null)
    .map((c) => ({ questionId: c.id, text: c.text, value: c.answer!, weight: c.weight, custom: true }));
  return [...bank, ...own];
}

/** Roadmap initiatives that map to any of the given capabilities. */
export function initiativesFor(capabilityIds: readonly string[]) {
  return seed.roadmap.initiatives.filter((i) => i.mapsTo.some((c) => capabilityIds.includes(c)));
}

export interface ProcessSession {
  functionId: FunctionId;
  processes: string[];
  target: LadderLevel;
  evidence: readonly EvidenceItem[];
  quickCheck: Record<string, number>;
  processValidations: Record<string, ProcessValidation>;
  responses?: readonly QuestionnaireResponse[];
  customQuestions?: readonly CustomQuestion[];
  /** capability value / feasibility / risk from the capability engine, when available */
  ideaScores?: ProcessInput["ideaScores"];
}

/** Every function on the ladder with all its processes, same evidence (cross-function view). */
export function assessAllFunctions(
  s: Pick<ProcessSession, "evidence" | "quickCheck" | "target" | "responses" | "customQuestions">,
  assess: (input: ProcessInput) => FunctionProcessResult,
): FunctionProcessResult[] {
  return FUNCTION_IDS.map((functionId) =>
    assess(
      buildProcessInput({
        ...s,
        functionId,
        processes: l1Processes(functionId).map((step) => processKey(functionId, step)),
        processValidations: {},
      }),
    ),
  );
}

export function buildProcessInput(s: ProcessSession): ProcessInput {
  const chain = l1Processes(s.functionId);
  const steps = chain.filter((step) => s.processes.includes(processKey(s.functionId, step)));
  const byStep = new Map<string, EvidenceItem[]>();
  for (const e of s.evidence) {
    const step = stepForEvidence(s.functionId, e);
    if (step) byStep.set(step, [...(byStep.get(step) ?? []), e]);
  }
  const processes: ProcessDef[] = steps.map((step) => {
    const id = processKey(s.functionId, step);
    const capabilityIds = capabilitiesForStep(s.functionId, step);
    const qc = s.quickCheck[id];
    return {
      id,
      name: step,
      capabilityIds,
      selfScores: capabilityIds.map((c) => capById.get(c)!.selfScore),
      evidence: byStep.get(step) ?? [],
      quickCheck: qc === undefined ? null : (qc as LadderLevel),
      answers: answersForStep(s.functionId, step, s.responses ?? [], s.customQuestions ?? []),
      validation: s.processValidations[id],
      initiatives: initiativesFor(capabilityIds),
    };
  });
  return { functionId: s.functionId, target: s.target, processes, rules: seed.useCaseRules.rules, ideaScores: s.ideaScores };
}

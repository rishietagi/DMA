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

/** Capabilities left out of the process view (MDM: not a CPG process in this demo). */
export const HIDDEN_CAPABILITIES: readonly string[] = ["mdm"];
export const isHiddenCapability = (id: string | null | undefined) => !!id && HIDDEN_CAPABILITIES.includes(id);

/** 2025 capabilities shown for a function. */
export function capabilitiesOf(functionId: FunctionId) {
  return seed.baseline.capabilities.filter((c) => c.functionIds.includes(functionId) && !isHiddenCapability(c.id));
}
const STOP = new Set(["planning", "management", "process", "processes", "control", "tower", "analytics", "visibility", "execution"]);

export const processKey = (functionId: FunctionId, step: string) => `${functionId}:${step}`;

function bankFor(functionId: FunctionId) {
  return seed.questionBank.functions.find((f) => f.functionId === functionId);
}

/** A process the consultant added to a function; scored like any other, with no 2025 capabilities. */
export interface CustomProcess {
  id: string;
  functionId: FunctionId;
  name: string;
  /** words that place a sentence on it; empty = the distinctive words of its name */
  keywords: string[];
}

const customFor = (functionId: FunctionId, custom: readonly CustomProcess[]) => custom.filter((c) => c.functionId === functionId);

/** The function's L1 process chain: the seed chain, then the processes the consultant added. */
export function l1Processes(functionId: FunctionId, custom: readonly CustomProcess[] = []): string[] {
  return [...(bankFor(functionId)?.l1Chain ?? []), ...customFor(functionId, custom).map((c) => c.name)];
}

/** Words that place a sentence on a step: the seed or custom list, else the distinctive words of its name. */
export function stepKeywords(functionId: FunctionId, step: string, custom: readonly CustomProcess[] = []): string[] {
  const own = customFor(functionId, custom).find((c) => c.name === step)?.keywords;
  const listed = own?.length ? own : bankFor(functionId)?.l1Keywords?.[step];
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
export function stepForEvidence(functionId: FunctionId, e: EvidenceItem, custom: readonly CustomProcess[] = []): string | null {
  if (isHiddenCapability(e.capabilityId) || !belongsToFunction(e, functionId)) return null;
  // the consultant's own processes are checked first: their words are the more deliberate signal
  const order = [...customFor(functionId, custom).map((c) => c.name), ...l1Processes(functionId)];
  for (const step of order) if (matchCues(e.quote, stepKeywords(functionId, step, custom)).length) return step;
  return e.capabilityId ? stepForCapability(functionId, e.capabilityId) : null;
}

/** Capabilities owned by a step (each capability belongs to one step). */
export function capabilitiesForStep(functionId: FunctionId, step: string): string[] {
  const bank = bankFor(functionId);
  if (!bank) return [];
  const ids = new Set(bank.questions.filter((q) => q.l2 === step).flatMap((q) => q.capabilityIds));
  return [...ids].filter((id) => capById.has(id) && !isHiddenCapability(id) && stepForCapability(functionId, id) === step);
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
  return seed.roadmap.initiatives.filter((i) => i.mapsTo.some((c) => capabilityIds.includes(c) && !isHiddenCapability(c)));
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
  customProcesses?: readonly CustomProcess[];
  /** capability value / feasibility / risk from the capability engine, when available */
  ideaScores?: ProcessInput["ideaScores"];
}

/** Every function on the ladder with all its processes, same evidence (cross-function view). */
export function assessAllFunctions(
  s: Pick<ProcessSession, "evidence" | "quickCheck" | "target" | "responses" | "customQuestions" | "customProcesses">,
  assess: (input: ProcessInput) => FunctionProcessResult,
): FunctionProcessResult[] {
  return FUNCTION_IDS.map((functionId) =>
    assess(
      buildProcessInput({
        ...s,
        functionId,
        processes: l1Processes(functionId, s.customProcesses).map((step) => processKey(functionId, step)),
        processValidations: {},
      }),
    ),
  );
}

export function buildProcessInput(s: ProcessSession): ProcessInput {
  const custom = s.customProcesses ?? [];
  const chain = l1Processes(s.functionId, custom);
  const steps = chain.filter((step) => s.processes.includes(processKey(s.functionId, step)));
  const byStep = new Map<string, EvidenceItem[]>();
  for (const e of s.evidence) {
    const step = stepForEvidence(s.functionId, e, custom);
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

/** The session fields keyed by process. */
export interface ProcessKeyed {
  processes: string[];
  quickCheck: Record<string, number>;
  validations: Record<string, ProcessValidation>;
  customQuestions: CustomQuestion[];
  audit: { processId: string }[];
}

/**
 * Moves everything keyed on a process from one name to another (rename), or drops it (`to` null, delete).
 * Audit entries are renamed but never dropped.
 */
export function renameProcessKeys<T extends ProcessKeyed>(s: T, functionId: FunctionId, from: string, to: string | null): Pick<T, keyof ProcessKeyed> {
  const oldKey = processKey(functionId, from);
  const newKey = to === null ? null : processKey(functionId, to);
  const move = <V>(rec: Record<string, V>) => {
    const out: Record<string, V> = {};
    for (const [k, v] of Object.entries(rec)) {
      if (k !== oldKey) out[k] = v;
      else if (newKey) out[newKey] = v;
    }
    return out;
  };
  return {
    processes: s.processes.flatMap((k) => (k !== oldKey ? [k] : newKey ? [newKey] : [])),
    quickCheck: move(s.quickCheck),
    validations: move(s.validations),
    customQuestions: s.customQuestions.flatMap((q) =>
      q.functionId !== functionId || q.step !== from ? [q] : to === null ? [] : [{ ...q, step: to }],
    ),
    audit: s.audit.map((a) => (a.processId === oldKey && newKey ? { ...a, processId: newKey } : a)),
  } as Pick<T, keyof ProcessKeyed>;
}

/**
 * Turns session state into the process-ladder engine input (SCORING_ENGINE.md §11.3): which L1
 * processes a function has, which capabilities and evidence belong to each, and the quick-check
 * answers. Seed lookups live here so the engine stays pure.
 */
import { matchCues } from "@/lib/classifier/classify";
import { dependencyLoad, toLadder, type Criticality, type EvidenceItem, type FunctionProcessResult, type IdeaContext, type LadderLevel, type ProcessDef, type ProcessInput, type ProcessValidation, type QuestionAnswer } from "@/lib/engine";
import { FUNCTION_IDS, type Dimension, type FunctionId, type Question, type QuestionnaireResponse, type UseCaseRule } from "@/lib/schema";
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

/** Capabilities named by the 2026 focus areas (baseline priorities). */
const FOCUS = new Set(seed.baseline.priorities2026.flatMap((p) => p.capabilityIds));

/** The consultant's per-process choices on Define & Focus. */
export interface ProcessSetting {
  criticality?: Criticality;
  target?: LadderLevel;
}

/**
 * Business criticality of a process (§11.6): High when it owns a capability named by a 2026 focus
 * area, Medium when it owns a capability or a roadmap initiative, else Low.
 */
export function suggestedCriticality(functionId: FunctionId, step: string): Criticality {
  const caps = capabilitiesForStep(functionId, step);
  if (caps.some((c) => FOCUS.has(c))) return "High";
  if (caps.length || initiativesFor(caps).length) return "Medium";
  return "Low";
}

/** Target by strategic importance: the function's ambition +1 for High, −1 for Low (§11.6). */
export function suggestedTarget(ambition: LadderLevel, criticality: Criticality): LadderLevel {
  const t = ambition + (criticality === "High" ? 1 : criticality === "Low" ? -1 : 0);
  return Math.min(5, Math.max(1, t)) as LadderLevel;
}

export function criticalityOf(functionId: FunctionId, step: string, settings: Readonly<Record<string, ProcessSetting>> = {}): Criticality {
  return settings[processKey(functionId, step)]?.criticality ?? suggestedCriticality(functionId, step);
}

export function targetOf(
  functionId: FunctionId,
  step: string,
  ambition: LadderLevel,
  settings: Readonly<Record<string, ProcessSetting>> = {},
): LadderLevel {
  return settings[processKey(functionId, step)]?.target ?? suggestedTarget(ambition, criticalityOf(functionId, step, settings));
}

/** The processes a rule speaks to: its named steps and the steps of its capabilities. */
export function stepsForRule(functionId: FunctionId, rule: { when: { capabilityIds: string[]; steps?: string[] } }, custom: readonly CustomProcess[] = []): string[] {
  const chain = l1Processes(functionId, custom);
  const fromCaps = rule.when.capabilityIds.map((c) => stepForCapability(functionId, c)).filter((x): x is string => !!x);
  return [...new Set([...(rule.when.steps ?? []), ...fromCaps])].filter((x) => chain.includes(x));
}

/**
 * §11.4 strategic alignment and dependency load per rule: alignment starts at 2, +2 when the rule
 * hits a 2026 focus-area capability, +1 when a process it serves is High criticality.
 */
export function ideaContextFor(
  functionId: FunctionId,
  rules: readonly UseCaseRule[],
  settings: Readonly<Record<string, ProcessSetting>> = {},
  custom: readonly CustomProcess[] = [],
): Record<string, IdeaContext> {
  return Object.fromEntries(
    rules.map((r) => {
      const focus = r.when.capabilityIds.some((c) => FOCUS.has(c));
      const high = stepsForRule(functionId, r, custom).some((st) => criticalityOf(functionId, st, settings) === "High");
      const alignment = Math.min(5, 2 + (focus ? 2 : 0) + (high ? 1 : 0));
      return [r.id, { alignment, dependencies: dependencyLoad(r.useCase.dependsOn.length, r.useCase.dataPrerequisites.length) }];
    }),
  );
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
  processSettings?: Readonly<Record<string, ProcessSetting>>;
  /** capability value / feasibility / risk from the capability engine, when available */
  ideaScores?: ProcessInput["ideaScores"];
}

/** Every function on the ladder with all its processes, same evidence (cross-function view). */
export function assessAllFunctions(
  s: Pick<ProcessSession, "evidence" | "quickCheck" | "target" | "responses" | "customQuestions" | "customProcesses" | "processSettings">,
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
      criticality: criticalityOf(s.functionId, step, s.processSettings),
      target: targetOf(s.functionId, step, s.target, s.processSettings),
    };
  });
  const rules = seed.useCaseRules.rules;
  return {
    functionId: s.functionId,
    target: s.target,
    processes,
    rules,
    ideaScores: s.ideaScores,
    ideaContext: ideaContextFor(s.functionId, rules, s.processSettings, custom),
  };
}

/** The session fields keyed by process. */
export interface ProcessKeyed {
  processes: string[];
  quickCheck: Record<string, number>;
  validations: Record<string, ProcessValidation>;
  customQuestions: CustomQuestion[];
  audit: { processId: string }[];
  processSettings?: Record<string, ProcessSetting>;
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
    ...(s.processSettings ? { processSettings: move(s.processSettings) } : {}),
  } as Pick<T, keyof ProcessKeyed>;
}

/**
 * Process ladder scoring (SCORING_ENGINE.md §11): each L1 process of one function gets a level on
 * the KPMG 0–5 ladder (Digitized → Autonomous) from three kinds of indicator — the quick-check
 * answer, mapped evidence and the 2025 self score — then gaps to target and phased ideas. Pure.
 */
import type { FunctionId, Initiative, UseCaseRule } from "@/lib/schema";
import { CONFIDENCE, SOURCE_RELIABILITY } from "./config";
import { clamp, mean, stdev, weightedMean } from "./math";
import { alignmentFor, priorityScore, quadrantFor } from "./prioritise";
import { topoSort } from "./usecases";
import type { AlignmentStatus, EvidenceItem, Phase, Quadrant } from "./types";

export type LadderLevel = 0 | 1 | 2 | 3 | 4 | 5;
export const LADDER_LEVELS: readonly LadderLevel[] = [0, 1, 2, 3, 4, 5];

export const LADDER: Record<LadderLevel, { name: string; short: string; meaning: string }> = {
  0: { name: "Digitized processes", short: "Digitized", meaning: "Runs in systems, but steps between them are manual (Excel, email)" },
  1: { name: "Connected systems", short: "Connected", meaning: "Systems are linked, so there are few manual hand-offs" },
  2: { name: "Real-time data capture", short: "Real-time", meaning: "Data is captured live from systems, partners and the floor" },
  3: { name: "Visibility & transparency", short: "Visibility", meaning: "Live dashboards show what is happening and why" },
  4: { name: "Predictive & intelligent", short: "Predictive", meaning: "Forecasts and alerts show what will happen next" },
  5: { name: "Autonomous & adaptive", short: "Autonomous", meaning: "AI decides and acts; people handle the exceptions" },
};

/** §11.1 weights and thresholds */
export const PROCESS = {
  quickCheckWeight: 3,
  quickCheckReliability: SOURCE_RELIABILITY.questionnaire,
  selfWeight: 1,
  /** distinct sources (documents + the quick check) for full coverage */
  expectedSources: 3,
  /** spread (max − min, ladder units) between non-self indicators that raises "Sources disagree" */
  inconsistentSpread: 2.5,
  /** stdev divisor for agreement, in ladder units (the engine's 2 × 1.25) */
  stdevDivisor: 2.5,
  minIdeaGap: 1,
  maxIdeas: 6,
} as const;

/** §11.2 crosswalk: engine level 1–5 → ladder 0–5, linear, full precision. */
export function toLadder(engineLevel: number): number {
  return clamp((engineLevel - 1) * 1.25, 0, 5);
}

/** How a ladder level is written in the UI — "Stage", so it never reads like the L0 / L1 process hierarchy. */
export function stageLabel(level: number): string {
  return `Stage ${level}`;
}

/** The ladder level a score sits on (whole level, half rounds up). */
export function ladderLevel(score: number): LadderLevel {
  return clamp(Math.round(score + 1e-9), 0, 5) as LadderLevel;
}

export interface ProcessValidation {
  kind: "accepted" | "overridden";
  before: number;
  after: number;
  rationale: string;
  by: string;
  at: string;
}

/** An answered questionnaire question for a process — from the bank (crosswalked) or added by the user. */
export interface QuestionAnswer {
  questionId: string;
  text: string;
  /** ladder 0–5 */
  value: number;
  weight: number;
  custom: boolean;
}

export interface ProcessDef {
  id: string;
  name: string;
  /** capabilities whose evidence, self score and ideas belong to this process */
  capabilityIds: string[];
  selfScores: number[];
  evidence: readonly EvidenceItem[];
  quickCheck: LadderLevel | null;
  /** answered questions for this process */
  answers?: readonly QuestionAnswer[];
  validation?: ProcessValidation;
  /** 2026-27 roadmap initiatives mapped to the process's capabilities */
  initiatives?: readonly Initiative[];
}

/** Value / feasibility / risk (1–5) of a capability, from the capability engine (§6.2). */
export interface IdeaScoreInput {
  value: number;
  feasibility: number;
  risk: number;
}

export interface ProcessInput {
  functionId: FunctionId;
  target: LadderLevel;
  processes: readonly ProcessDef[];
  rules: readonly UseCaseRule[];
  /** by capability id; ideas without one fall back to gap and effort (§11.5) */
  ideaScores?: Readonly<Record<string, IdeaScoreInput>>;
}

export type ProcessIndicator =
  | { kind: "quick-check"; value: number; weight: number; reliability: number }
  | { kind: "question"; value: number; weight: number; reliability: number; questionId: string; text: string; custom: boolean }
  | { kind: "evidence"; value: number; weight: number; reliability: number; evidence: EvidenceItem }
  | { kind: "self"; value: number; weight: number; reliability: number };

export type ProcessFlag = "LACKS_EVIDENCE" | "INCONSISTENT";
export type ProcessStatus = "suggested" | "accepted" | "overridden";

export interface ProcessResult {
  id: string;
  name: string;
  indicators: ProcessIndicator[];
  /** null when there is nothing to score */
  suggested: number | null;
  effective: number | null;
  level: LadderLevel | null;
  status: ProcessStatus;
  validation?: ProcessValidation;
  confidence: number;
  band: "high" | "medium" | "low";
  flags: ProcessFlag[];
  /** up to 3 quotes, strongest first */
  quotes: EvidenceItem[];
  documents: number;
  /** whole levels to target; null when unscored */
  gap: number | null;
  /** 2025 self-assessment of the owned capabilities, on the ladder; null when none */
  self: number | null;
  initiatives: Initiative[];
  /** roadmap alignment (§6.4 rules on ladder gaps); null when unscored */
  alignment: AlignmentStatus | null;
}

export interface ProcessIdea {
  id: string;
  title: string;
  description: string;
  aiPattern: string;
  kpis: string[];
  effort: "S" | "M" | "L";
  dependsOn: string[];
  processId: string;
  processName: string;
  gap: number;
  phase: Phase;
  value: number;
  feasibility: number;
  risk: number;
  /** 0–100 (§6.3) */
  priority: number;
  quadrant: Quadrant;
  /** the process's current score, for colouring */
  processScore: number | null;
}

export interface FunctionProcessResult {
  functionId: FunctionId;
  target: LadderLevel;
  processes: ProcessResult[];
  /** mean of effective process scores */
  overall: number | null;
  overallLevel: LadderLevel | null;
  /** mean 2025 self level of processes that have one */
  self: number | null;
  validated: number;
  ideas: ProcessIdea[];
  /** processes on each level L0…L5 */
  distribution: number[];
}

function indicatorsFor(p: ProcessDef): ProcessIndicator[] {
  const out: ProcessIndicator[] = [];
  if (p.quickCheck !== null)
    out.push({ kind: "quick-check", value: p.quickCheck, weight: PROCESS.quickCheckWeight, reliability: PROCESS.quickCheckReliability });
  for (const a of p.answers ?? [])
    out.push({
      kind: "question",
      value: clamp(a.value, 0, 5),
      weight: a.weight,
      reliability: SOURCE_RELIABILITY.questionnaire,
      questionId: a.questionId,
      text: a.text,
      custom: a.custom,
    });
  for (const e of p.evidence) {
    if (e.level === null) continue;
    out.push({ kind: "evidence", value: toLadder(e.level), weight: e.weight, reliability: SOURCE_RELIABILITY[e.sourceType], evidence: e });
  }
  for (const s of p.selfScores)
    out.push({ kind: "self", value: toLadder(s), weight: PROCESS.selfWeight, reliability: SOURCE_RELIABILITY.self_assessment });
  return out;
}

function band(value: number): ProcessResult["band"] {
  return value >= CONFIDENCE.high ? "high" : value >= CONFIDENCE.medium ? "medium" : "low";
}

/** Score one process: weighted mean, confidence, flags, quotes. */
export function scoreProcess(p: ProcessDef, target: LadderLevel): ProcessResult {
  const indicators = indicatorsFor(p);
  const suggested = weightedMean(indicators.map((i) => ({ value: i.value, weight: i.weight * i.reliability })));
  const evidence = indicators.filter((i): i is Extract<ProcessIndicator, { kind: "evidence" }> => i.kind === "evidence");
  const documents = new Set(evidence.map((i) => i.evidence.docId)).size;

  // the interview (quick check and/or questionnaire answers) counts as one source
  const sources = documents + (p.quickCheck !== null || (p.answers?.length ?? 0) > 0 ? 1 : 0);
  const coverage = Math.min(1, sources / PROCESS.expectedSources);
  const agreement = indicators.length ? 1 - Math.min(1, stdev(indicators.map((i) => i.value)) / PROCESS.stdevDivisor) : 0;
  const totalWeight = indicators.reduce((a, i) => a + i.weight, 0);
  const quality = totalWeight ? indicators.reduce((a, i) => a + i.weight * i.reliability, 0) / totalWeight : 0;
  const confidence = indicators.length
    ? CONFIDENCE.wCoverage * coverage + CONFIDENCE.wAgreement * agreement + CONFIDENCE.wQuality * quality
    : 0;

  const flags: ProcessFlag[] = [];
  if (documents === 0) flags.push("LACKS_EVIDENCE");
  const objective = indicators.filter((i) => i.kind !== "self").map((i) => i.value);
  if (objective.length > 1 && Math.max(...objective) - Math.min(...objective) >= PROCESS.inconsistentSpread) flags.push("INCONSISTENT");

  const quotes = [...evidence]
    .sort(
      (a, b) =>
        b.weight * b.reliability - a.weight * a.reliability ||
        Math.abs(a.value - (suggested ?? 0)) - Math.abs(b.value - (suggested ?? 0)) ||
        a.evidence.id.localeCompare(b.evidence.id),
    )
    .slice(0, 3)
    .map((i) => i.evidence);

  const effective = p.validation ? p.validation.after : suggested;
  const level = effective === null ? null : ladderLevel(effective);
  const gap = level === null ? null : Math.max(0, target - level);
  return {
    id: p.id,
    name: p.name,
    indicators,
    suggested,
    effective,
    level,
    status: p.validation?.kind ?? "suggested",
    validation: p.validation,
    confidence,
    band: band(confidence),
    flags,
    quotes,
    documents,
    gap,
    self: p.selfScores.length ? mean(p.selfScores.map(toLadder)) : null,
    initiatives: [...(p.initiatives ?? [])],
    alignment: gap === null ? null : alignmentFor(gap, p.initiatives ?? []),
  };
}

/** Each indicator's share of the score (weight × reliability ÷ total) and its contribution. */
export function indicatorShares(p: Pick<ProcessResult, "indicators">): { indicator: ProcessIndicator; share: number; contribution: number }[] {
  const total = p.indicators.reduce((a, i) => a + i.weight * i.reliability, 0);
  return p.indicators.map((indicator) => {
    const share = total ? (indicator.weight * indicator.reliability) / total : 0;
    return { indicator, share, contribution: share * indicator.value };
  });
}

/** How many processes sit on each level, L0…L5. */
export function levelDistribution(processes: readonly Pick<ProcessResult, "level">[]): number[] {
  const out = [0, 0, 0, 0, 0, 0];
  for (const p of processes) if (p.level !== null) out[p.level]!++;
  return out;
}

/** §11.5 fallback when no capability scores apply: value from the gap, feasibility and risk from effort. */
export function fallbackIdeaScores(gap: number, effort: ProcessIdea["effort"]): IdeaScoreInput {
  return {
    value: clamp(2 + gap, 1, 5),
    feasibility: effort === "S" ? 4 : effort === "M" ? 3 : 2,
    risk: effort === "S" ? 2 : effort === "M" ? 3 : 4,
  };
}

const PHASE_ORDER: Record<Phase, number> = { Now: 0, Next: 1, Later: 2 };
const PHASES: Phase[] = ["Now", "Next", "Later"];

/** §11.4 base phase: big gaps first, large-effort items one phase later. */
export function ideaPhase(gap: number, effort: ProcessIdea["effort"]): Phase {
  const base = gap >= 2 ? 0 : 1;
  return PHASES[Math.min(2, base + (effort === "L" ? 1 : 0))]!;
}

/**
 * §11.4 ideas: a rule belongs to a process through its capabilities or a named step. It fires when
 * that process is at least one level short of target. An idea never lands before a dependency.
 */
export function ideasFor(
  processes: readonly ProcessResult[],
  defs: readonly ProcessDef[],
  rules: readonly UseCaseRule[],
  ideaScores: Readonly<Record<string, IdeaScoreInput>> = {},
): ProcessIdea[] {
  const raw: (Omit<ProcessIdea, "phase"> & { order: number })[] = [];
  for (const rule of rules) {
    let best: ProcessResult | null = null;
    for (const p of processes) {
      const def = defs.find((d) => d.id === p.id)!;
      const hit =
        rule.when.capabilityIds.some((c) => def.capabilityIds.includes(c)) || (rule.when.steps ?? []).includes(p.name);
      if (!hit || p.gap === null || p.gap < PROCESS.minIdeaGap) continue;
      if (!best || p.gap > best.gap!) best = p;
    }
    if (!best) continue;
    const u = rule.useCase;
    const capScore = rule.when.capabilityIds.map((c) => ideaScores[c]).find((x) => x !== undefined);
    const sc = capScore ?? fallbackIdeaScores(best.gap!, u.effort);
    raw.push({
      id: rule.id,
      title: u.title,
      description: u.description,
      aiPattern: u.aiPattern,
      kpis: u.kpis,
      effort: u.effort,
      dependsOn: u.dependsOn,
      processId: best.id,
      processName: best.name,
      gap: best.gap!,
      value: sc.value,
      feasibility: sc.feasibility,
      risk: sc.risk,
      priority: priorityScore(Math.min(4, best.gap!), sc.value, sc.feasibility, sc.risk),
      quadrant: quadrantFor(sc.value, sc.feasibility),
      processScore: best.effective,
      order: best.gap! * 10 - (u.effort === "L" ? 2 : u.effort === "M" ? 1 : 0),
    });
  }
  // topoSort breaks ties on `priority`; feed it the gap/effort order, keep the 0–100 score aside
  const sorted = topoSort(raw.map((i) => ({ ...i, priority: i.order, score: i.priority })));
  const phase = new Map<string, number>();
  for (const i of sorted) {
    const deps = i.dependsOn.map((d) => phase.get(d)).filter((x): x is number => x !== undefined);
    phase.set(i.id, Math.max(PHASE_ORDER[ideaPhase(i.gap, i.effort)], ...deps));
  }
  return sorted
    .map(({ order, priority, score, ...i }) => {
      void order;
      void priority;
      return { ...i, priority: score, phase: PHASES[phase.get(i.id)!]! };
    })
    .sort((a, b) => PHASE_ORDER[a.phase] - PHASE_ORDER[b.phase] || sorted.findIndex((x) => x.id === a.id) - sorted.findIndex((x) => x.id === b.id))
    .slice(0, PROCESS.maxIdeas);
}

/** Single entry point for the 4-step flow. */
export function assessProcesses(input: ProcessInput): FunctionProcessResult {
  const processes = input.processes.map((p) => scoreProcess(p, input.target));
  const scored = processes.filter((p) => p.effective !== null).map((p) => p.effective!);
  const overall = scored.length ? scored.reduce((a, b) => a + b, 0) / scored.length : null;
  const selfs = processes.filter((p) => p.self !== null).map((p) => p.self!);
  return {
    functionId: input.functionId,
    target: input.target,
    processes,
    overall,
    overallLevel: overall === null ? null : ladderLevel(overall),
    self: selfs.length ? mean(selfs) : null,
    validated: processes.filter((p) => p.status !== "suggested").length,
    ideas: ideasFor(processes, input.processes, input.rules, input.ideaScores),
    distribution: levelDistribution(processes),
  };
}

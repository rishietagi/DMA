/**
 * Portfolio views on top of the process engine (SCORING_ENGINE.md §11.6): the criticality × maturity
 * 2×2, the leadership narrative, the opportunity portfolio by theme, the roadmap by layer and the
 * activation / value-governance view. Pure — built only from engine output and seeds.
 */
import { LADDER, type Criticality, type FunctionProcessResult, type IdeaQuadrant, type Phase, type ProcessIdea, type ProcessResult } from "@/lib/engine";
import { PORTFOLIO_THEMES, ROADMAP_LAYERS, type FunctionId, type Initiative } from "@/lib/schema";

/** Deck horizons: the engine's three phases, labelled and sized as in the roadmap output. */
export const PHASES: Phase[] = ["Now", "Next", "Later"];
export const PHASE_LABEL: Record<Phase, string> = { Now: "Now", Next: "Next", Later: "Beyond" };
export const PHASE_MONTHS: Record<Phase, string> = { Now: "0–6 months", Next: "6–18 months", Later: "18–36 months" };

// ─── Output 2: criticality × maturity ───────────────────────────────────────

export type PortfolioResponse = "Transform now" | "Sustain & differentiate" | "Scale selectively" | "Rationalize / monitor";

export const RESPONSE_NOTE: Record<PortfolioResponse, string> = {
  "Transform now": "High criticality / lower maturity",
  "Sustain & differentiate": "High criticality / higher maturity",
  "Scale selectively": "Lower criticality / higher maturity",
  "Rationalize / monitor": "Lower criticality / lower maturity",
};

/** Criticality on the 1–5 axis; Medium sits just above the mid-line, so it counts as business-critical. */
export const CRITICALITY_SCORE: Record<Criticality, number> = { High: 4.3, Medium: 3.2, Low: 1.8 };
/** Maturity at or above this is "higher maturity" (Stage 3 · Scaled). */
export const MATURITY_MIDLINE = 3;

export function portfolioResponse(criticality: Criticality, maturity: number): PortfolioResponse {
  const critical = CRITICALITY_SCORE[criticality] >= 3;
  const mature = maturity >= MATURITY_MIDLINE;
  return critical ? (mature ? "Sustain & differentiate" : "Transform now") : mature ? "Scale selectively" : "Rationalize / monitor";
}

export interface PortfolioPoint {
  id: string;
  name: string;
  criticality: Criticality;
  maturity: number;
  /** y on the 1–5 axis: the criticality score, nudged so points of the same tier don't overlap */
  y: number;
  response: PortfolioResponse;
}

export function portfolioPoints(processes: readonly ProcessResult[]): PortfolioPoint[] {
  const seen = new Map<Criticality, number>();
  return processes
    .filter((p) => p.effective !== null)
    .map((p) => {
      const c = p.criticality ?? "Medium";
      const n = seen.get(c) ?? 0;
      seen.set(c, n + 1);
      const nudge = n === 0 ? 0 : (n % 2 ? 1 : -1) * Math.ceil(n / 2) * 0.22;
      return { id: p.id, name: p.name, criticality: c, maturity: p.effective!, y: CRITICALITY_SCORE[c] + nudge, response: portfolioResponse(c, p.effective!) };
    });
}

// ─── Output 1: leadership narrative ─────────────────────────────────────────

const listOf = (xs: string[]) => (xs.length < 2 ? (xs[0] ?? "") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Four numbered leadership points: strongest start, largest gaps, the data constraint, the portfolio mix. */
export function leadershipNarrative(r: FunctionProcessResult): string[] {
  const scored = r.processes.filter((p) => p.effective !== null && p.gap !== null);
  if (!scored.length) return [];
  const out: string[] = [];
  const best = [...scored].sort((a, b) => b.effective! - a.effective!)[0]!;
  out.push(`${best.name} provides the strongest starting point (stage ${best.level} · ${LADDER[best.level!].short}).`);

  const maxGap = Math.max(...scored.map((p) => p.gap!));
  const widest = scored.filter((p) => p.gap === maxGap && maxGap > 0);
  out.push(
    widest.length
      ? `${listOf(widest.map((p) => p.name))} ${widest.length === 1 ? "shows" : "show"} the largest gap: ${plural(maxGap, "level", "levels")} to target.`
      : "Every process is at or above its target.",
  );

  const conflict = scored.filter((p) => p.flags.includes("INCONSISTENT"));
  const unplanned = scored.filter((p) => p.alignment === "WHITESPACE");
  out.push(
    conflict.length
      ? `Data ownership constrains scaling: sources disagree on ${listOf(conflict.map((p) => p.name))}.`
      : unplanned.length
        ? `${listOf(unplanned.map((p) => p.name))} ${unplanned.length === 1 ? "has" : "have"} no initiative on the 2026-27 roadmap.`
        : "Evidence, interviews and the 2025 baseline broadly agree.",
  );

  const count = (q: IdeaQuadrant) => r.ideas.filter((i) => i.quadrant === q).length;
  const parts = [
    count("Scale now") && plural(count("Scale now"), "scale-now initiative", "scale-now initiatives"),
    count("Quick wins") && plural(count("Quick wins"), "quick win", "quick wins"),
    count("Strategic bets") && plural(count("Strategic bets"), "strategic bet", "strategic bets"),
  ].filter((x): x is string => !!x);
  out.push(parts.length ? `Focus on ${listOf(parts)}.` : "No initiatives are needed at these targets.");
  return out;
}

// ─── Portfolio scope ─────────────────────────────────────────────────────────

export interface PortfolioIdea extends ProcessIdea {
  functionId: FunctionId;
}

const fnOf = (processId: string) => processId.split(":")[0] as FunctionId;

/**
 * Ideas in scope. The current function's come from its live result (with the consultant's reviews);
 * other functions come from the cross-function view. A rule that fires in several functions is kept
 * once, at its highest priority.
 */
export function portfolioIdeas(current: FunctionProcessResult, all: readonly FunctionProcessResult[], scope: "function" | "all"): PortfolioIdea[] {
  const results = scope === "function" ? [current] : [current, ...all.filter((f) => f.functionId !== current.functionId)];
  const byId = new Map<string, PortfolioIdea>();
  for (const r of results)
    for (const i of r.ideas) {
      const prev = byId.get(i.id);
      if (!prev || i.priority > prev.priority) byId.set(i.id, { ...i, functionId: fnOf(i.processId) });
    }
  return [...byId.values()].sort((a, b) => PHASES.indexOf(a.phase) - PHASES.indexOf(b.phase) || b.priority - a.priority);
}

// ─── Output 4: opportunity portfolio, Output 5: roadmap by layer ─────────────

export type Grid<K extends string> = Record<K, Record<Phase, PortfolioIdea[]>>;

function grid<K extends string>(keys: readonly K[], ideas: readonly PortfolioIdea[], keyOf: (i: PortfolioIdea) => K): Grid<K> {
  const g = Object.fromEntries(keys.map((k) => [k, { Now: [], Next: [], Later: [] }])) as unknown as Grid<K>;
  for (const i of ideas) g[keyOf(i)][i.phase].push(i);
  return g;
}

export function byTheme(ideas: readonly PortfolioIdea[]) {
  return grid(PORTFOLIO_THEMES, ideas, (i) => i.portfolio?.theme ?? "Run & enable");
}

export function byLayer(ideas: readonly PortfolioIdea[]) {
  return grid(ROADMAP_LAYERS, ideas, (i) => i.portfolio?.layer ?? "Operations");
}

/** The foundations strip: platform ideas first, then the data prerequisites they all lean on. */
export function foundations(ideas: readonly PortfolioIdea[], max = 6): string[] {
  const platforms = ideas.filter((i) => i.portfolio?.layer === "Data, AI & platforms").map((i) => i.title);
  const counts = new Map<string, number>();
  for (const i of ideas) for (const d of i.dataPrerequisites) counts.set(d, (counts.get(d) ?? 0) + 1);
  const prereqs = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([d]) => d);
  return [...new Set([...platforms, ...prereqs])].slice(0, max);
}

/** Distinct themes the ideas fall into (the "priority themes" KPI). */
export function priorityThemes(ideas: readonly ProcessIdea[]): string[] {
  return [...new Set(ideas.map((i) => i.portfolio?.theme).filter((t): t is NonNullable<typeof t> => !!t))];
}

// ─── Output 7: activation and value governance ──────────────────────────────

export type Rag = "green" | "amber" | "red";

export interface HealthRow {
  id: string;
  title: string;
  functionId: FunctionId;
  phase: Phase;
  rag: Rag;
  /** why the status is not green */
  reason: string | null;
  kpi: string;
  nextDecision: string;
}

export interface Governance {
  initiatives: number;
  inDelivery: number;
  atRisk: number;
  valueCr: [number, number];
  health: HealthRow[];
  decisions: string[];
}

/**
 * RAG per idea: red when its process's sources disagree or it is both hard and dependency-heavy;
 * amber when feasibility ≤ 2, dependencies ≥ 4 or risk ≥ 4; green otherwise.
 */
export function ideaRag(i: Pick<ProcessIdea, "feasibility" | "dependencies" | "risk">, conflicted: boolean): { rag: Rag; reason: string | null } {
  if (conflicted) return { rag: "red", reason: "Sources disagree on the process" };
  if (i.feasibility <= 2 && i.dependencies >= 4) return { rag: "red", reason: "Low feasibility and heavy dependencies" };
  if (i.feasibility <= 2) return { rag: "amber", reason: "Low feasibility" };
  if (i.dependencies >= 4) return { rag: "amber", reason: "Heavy dependencies" };
  if (i.risk >= 4) return { rag: "amber", reason: "High risk & obligation" };
  return { rag: "green", reason: null };
}

const NEXT_DECISION: Record<Phase, string> = { Now: "Approve pilot", Next: "Confirm data readiness", Later: "Confirm owner" };

export function governance(
  ideas: readonly PortfolioIdea[],
  processes: readonly ProcessResult[],
  initiatives: readonly Initiative[],
): Governance {
  const conflicted = new Set(processes.filter((p) => p.flags.includes("INCONSISTENT")).map((p) => p.id));
  const health = ideas.map((i): HealthRow => {
    const { rag, reason } = ideaRag(i, conflicted.has(i.processId));
    return {
      id: i.id,
      title: i.title,
      functionId: i.functionId,
      phase: i.phase,
      rag,
      reason,
      kpi: i.kpis[0] ?? "—",
      nextDecision: rag === "red" ? (conflicted.has(i.processId) ? "Resolve data ownership" : "Re-scope") : NEXT_DECISION[i.phase],
    };
  });
  const valueCr = ideas.reduce<[number, number]>((a, i) => [a[0] + (i.portfolio?.valuePotentialCr[0] ?? 0), a[1] + (i.portfolio?.valuePotentialCr[1] ?? 0)], [0, 0]);

  const decisions: string[] = [];
  const pilot = ideas.find((i) => i.phase === "Now");
  if (pilot) decisions.push(`Release pilot funding for ${pilot.title}`);
  const disputed = processes.filter((p) => p.flags.includes("INCONSISTENT"));
  if (disputed.length) decisions.push(`Resolve data ownership for ${disputed[0]!.name}`);
  const platform = ideas.find((i) => i.portfolio?.layer === "Data, AI & platforms");
  if (platform) decisions.push(`Confirm the platform pattern for ${platform.title}`);
  const unplanned = processes.filter((p) => p.alignment === "WHITESPACE");
  if (unplanned.length) decisions.push(`Nominate an owner for ${unplanned[0]!.name}`);

  return {
    initiatives: ideas.length + initiatives.filter((x) => x.status !== "completed").length,
    inDelivery: initiatives.filter((x) => x.status === "in_progress").length,
    atRisk: health.filter((h) => h.rag === "red").length,
    valueCr,
    health,
    decisions: decisions.slice(0, 4),
  };
}

// ─── Output 6: initiative charter ───────────────────────────────────────────

export interface Charter {
  title: string;
  horizon: string;
  problem: string;
  outcome: string;
  scope: string[];
  valueHypothesis: string;
  dependencies: string[];
  successMeasures: string[];
  first90: string[];
}

/**
 * The one-page charter: seed content where the rule has it; otherwise built from the assessment —
 * the process's strongest pain quote as the problem, the idea as the outcome, a standard first 90 days.
 */
export function charterFor(
  idea: ProcessIdea,
  process: Pick<ProcessResult, "name" | "quotes"> | undefined,
  context: { capabilities: string[]; dependsOnTitles: string[] },
): Charter {
  const pain = process?.quotes.find((q) => q.polarity === "pain")?.quote;
  const c = idea.charter;
  return {
    title: idea.title,
    horizon: PHASE_LABEL[idea.phase],
    problem: c?.problem ?? (pain ? `“${pain}”` : `${idea.processName} is ${idea.gap} ${idea.gap === 1 ? "level" : "levels"} below its target.`),
    outcome: c?.outcome ?? idea.description,
    scope: [idea.processName, ...context.capabilities, ...idea.dataPrerequisites.slice(0, 2)],
    valueHypothesis: c?.valueHypothesis ?? `Moves ${idea.kpis.slice(0, 3).join(" · ")}; to be sized in the value challenge.`,
    dependencies: [...context.dependsOnTitles, ...idea.dataPrerequisites].slice(0, 5),
    successMeasures: idea.kpis,
    first90: c?.first90 ?? [
      "Confirm sponsor",
      `Baseline ${idea.kpis[0]?.toLowerCase() ?? "KPIs"}`,
      "Assess data readiness",
      `Select pilot in ${idea.processName.toLowerCase()}`,
      "Finalise MVP and squad",
    ],
  };
}

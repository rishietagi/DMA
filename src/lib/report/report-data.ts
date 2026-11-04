/**
 * The exported PDF report as plain data, built only from engine output (CLAUDE.md rule 2). The
 * react-pdf document in components/report renders this; nothing here knows about layout.
 */
import { LADDER, LADDER_LEVELS, ladderLevel, stageLabel, type Criticality, type FunctionProcessResult, type LadderLevel, type Phase, type ProcessIdea } from "@/lib/engine";
import {
  byLayer,
  byTheme,
  charterFor,
  foundations,
  governance,
  leadershipNarrative,
  portfolioIdeas,
  portfolioPoints,
  priorityThemes,
  type Charter,
  type Governance,
  type PortfolioResponse,
} from "@/lib/portfolio";
import type { AreaScores } from "@/lib/process-areas";
import { sourceBreakdown, whyLine } from "@/lib/process-why";
import { PORTFOLIO_THEMES, ROADMAP_LAYERS, type Initiative } from "@/lib/schema";

export interface ReportSource {
  title: string;
  kind: "Document" | "Interview" | "Workshop pack";
  sentences?: number;
}

export interface ReportProcess {
  name: string;
  score: number | null;
  stage: string;
  stageName: string;
  target: LadderLevel;
  criticality: Criticality | null;
  status: string;
  validated: boolean;
  sources: { source: string; stages: string }[];
  why: string;
  rationale: string | null;
  quotes: { text: string; source: string }[];
}

export interface DiagnosticRow {
  name: string;
  criticality: Criticality | null;
  process: number | null;
  data: number | null;
  ai: number | null;
  people: number | null;
  overall: number | null;
  target: LadderLevel;
  gap: string;
  gapLevels: number | null;
  nothingPlanned: boolean;
}

type ReportIdea = Pick<ProcessIdea, "title" | "processName" | "value" | "alignment" | "feasibility" | "risk" | "dependencies" | "effort" | "description" | "quadrant"> & {
  priority: number;
  dependsOn: string[];
};

export interface ReportModel {
  title: string;
  client: string;
  functionName: string;
  date: string;
  headline: { current: number | null; target: number; ambitionGap: number | null; themes: number; below: number; scored: number; reviewed: number; total: number };
  narrative: string[];
  diagnostic: DiagnosticRow[];
  portfolio: { name: string; criticality: Criticality; maturity: number; response: PortfolioResponse }[];
  selfVsToday: { name: string; self: number | null; today: number | null }[];
  processes: ReportProcess[];
  ideas: Record<Phase, ReportIdea[]>;
  themes: { theme: string; cells: Record<Phase, string[]> }[];
  layers: { layer: string; cells: Record<Phase, string[]> }[];
  foundations: string[];
  charter: Charter | null;
  governance: Governance;
  nothingPlanned: { name: string; gap: number }[];
  ladder: { level: LadderLevel; stage: string; name: string; headline: string; meaning: string }[];
  sources: ReportSource[];
}

const gapText = (gap: number | null) => (gap === null ? "—" : gap === 0 ? "On target" : `${gap} ${gap === 1 ? "level" : "levels"}`);
const PHASES: Phase[] = ["Now", "Next", "Later"];

export function buildReport(
  r: FunctionProcessResult,
  areas: Record<string, AreaScores>,
  opts: { functionName: string; date: string; sources: ReportSource[]; client?: string; initiatives?: readonly Initiative[]; capabilitiesFor?: (processName: string) => string[] },
): ReportModel {
  const scored = r.processes.filter((p) => p.gap !== null);
  const titleOf = new Map(r.ideas.map((i) => [i.id, i.title]));
  const ideas = Object.fromEntries(PHASES.map((ph) => [ph, [] as ReportIdea[]])) as ReportModel["ideas"];
  for (const i of r.ideas)
    ideas[i.phase].push({
      title: i.title,
      processName: i.processName,
      description: i.description,
      value: i.value,
      alignment: i.alignment,
      feasibility: i.feasibility,
      risk: i.risk,
      dependencies: i.dependencies,
      effort: i.effort,
      quadrant: i.quadrant,
      priority: Math.round(i.priority),
      dependsOn: i.dependsOn.map((d) => titleOf.get(d)).filter((t): t is string => !!t),
    });

  const scoped = portfolioIdeas(r, [], "function");
  const tg = byTheme(scoped);
  const lg = byLayer(scoped);
  const cells = (row: Record<Phase, { title: string }[]>) => Object.fromEntries(PHASES.map((p) => [p, row[p].map((i) => i.title)])) as Record<Phase, string[]>;
  const top = [...r.ideas].sort((a, b) => b.priority - a.priority)[0];

  return {
    title: `Digital maturity assessment: ${opts.functionName}`,
    client: opts.client ?? "Himalaya",
    functionName: opts.functionName,
    date: opts.date,
    headline: {
      current: r.overall,
      target: r.targetMean,
      ambitionGap: r.overall === null ? null : Math.max(0, r.targetMean - r.overall),
      themes: priorityThemes(r.ideas).length,
      below: scored.filter((p) => p.gap! > 0).length,
      scored: scored.length,
      reviewed: r.validated,
      total: r.processes.length,
    },
    narrative: leadershipNarrative(r),
    diagnostic: r.processes.map((p) => ({
      name: p.name,
      criticality: p.criticality,
      process: areas[p.id]?.process?.value ?? null,
      data: areas[p.id]?.data?.value ?? null,
      ai: areas[p.id]?.ai?.value ?? null,
      people: areas[p.id]?.people?.value ?? null,
      overall: p.effective,
      target: p.target,
      gap: gapText(p.gap),
      gapLevels: p.gap,
      nothingPlanned: p.alignment === "WHITESPACE",
    })),
    portfolio: portfolioPoints(r.processes).map((p) => ({ name: p.name, criticality: p.criticality, maturity: p.maturity, response: p.response })),
    selfVsToday: r.processes.map((p) => ({ name: p.name, self: p.self, today: p.effective })),
    processes: r.processes.map((p) => {
      const level = p.effective === null ? null : ladderLevel(p.effective);
      const who = p.validation?.by.split(" (")[0];
      return {
        name: p.name,
        score: p.effective,
        stage: level === null ? "Not rated" : stageLabel(level),
        stageName: level === null ? "" : LADDER[level].name,
        target: p.target,
        criticality: p.criticality,
        status:
          p.status === "overridden" ? `Changed by ${who}` : p.status === "accepted" ? `Validated by ${who}` : "AI suggested, not yet reviewed",
        validated: p.status !== "suggested",
        sources: sourceBreakdown(p),
        why: whyLine(p),
        rationale: p.validation?.kind === "overridden" ? `Was ${stageLabel(ladderLevel(p.validation.before))}: ${p.validation.rationale}` : null,
        quotes: p.quotes.slice(0, 2).map((e) => ({ text: e.quote, source: [e.stakeholder ?? e.docTitle, e.location].filter(Boolean).join(" · ") })),
      };
    }),
    ideas,
    themes: PORTFOLIO_THEMES.map((t) => ({ theme: t, cells: cells(tg[t]) })).filter((x) => PHASES.some((p) => x.cells[p].length)),
    layers: ROADMAP_LAYERS.map((l) => ({ layer: l, cells: cells(lg[l]) })),
    foundations: foundations(scoped),
    charter: top
      ? charterFor(top, r.processes.find((p) => p.id === top.processId), {
          capabilities: opts.capabilitiesFor?.(top.processName) ?? [],
          dependsOnTitles: top.dependsOn.map((d) => titleOf.get(d) ?? d),
        })
      : null,
    governance: governance(scoped, r.processes, opts.initiatives ?? []),
    nothingPlanned: r.processes.filter((p) => p.alignment === "WHITESPACE" && p.gap !== null).map((p) => ({ name: p.name, gap: p.gap! })),
    ladder: LADDER_LEVELS.map((l) => ({ level: l, stage: stageLabel(l), name: LADDER[l].name, headline: LADDER[l].headline, meaning: LADDER[l].meaning })),
    sources: opts.sources,
  };
}

/** Level colours as hex (react-pdf can't read CSS variables); mirror --level-N, -soft and -ink. */
export const LEVEL_HEX: Record<LadderLevel, { strong: string; soft: string; ink: string }> = {
  1: { strong: "#c62828", soft: "#fde8e6", ink: "#a32a20" },
  2: { strong: "#e8742a", soft: "#fdeedd", ink: "#a8541a" },
  3: { strong: "#1f3a8a", soft: "#e4eaf8", ink: "#1f3a8a" },
  4: { strong: "#1b8a8a", soft: "#dff2f1", ink: "#1b6a6a" },
  5: { strong: "#4a8f29", soft: "#e6f3df", ink: "#3a6d1f" },
};

/** Fill and text colour for a 1–5 score: the soft tint of its stage and that stage's ink. */
export function ladderHex(score: number | null): { fill: string; text: string } {
  if (score === null) return { fill: "#f1f1f3", text: "#71717a" };
  const c = LEVEL_HEX[ladderLevel(score)];
  return { fill: c.soft, text: c.ink };
}

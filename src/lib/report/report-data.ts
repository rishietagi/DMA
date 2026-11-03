/**
 * The exported PDF report as plain data, built only from engine output (CLAUDE.md rule 2). The
 * react-pdf document in components/report renders this; nothing here knows about layout.
 */
import { LADDER, LADDER_LEVELS, ladderLevel, stageLabel, type FunctionProcessResult, type LadderLevel, type Phase, type ProcessIdea } from "@/lib/engine";
import { processInsights, type ProcessInsight } from "@/lib/narrative";
import type { AreaScores } from "@/lib/process-areas";
import { sourceBreakdown, whyLine } from "@/lib/process-why";

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
  status: string;
  validated: boolean;
  sources: { source: string; stages: string }[];
  why: string;
  rationale: string | null;
  quotes: { text: string; source: string }[];
}

export interface DiagnosticRow {
  name: string;
  overall: number | null;
  process: number | null;
  people: number | null;
  data: number | null;
  gap: string;
  gapLevels: number | null;
  nothingPlanned: boolean;
}

export interface ReportModel {
  title: string;
  client: string;
  functionName: string;
  date: string;
  headline: { current: number | null; target: LadderLevel; avgGap: number; below: number; scored: number; reviewed: number; total: number };
  insights: ProcessInsight[];
  diagnostic: DiagnosticRow[];
  selfVsToday: { name: string; self: number | null; today: number | null }[];
  processes: ReportProcess[];
  ideas: Record<Phase, (Pick<ProcessIdea, "title" | "processName" | "value" | "feasibility" | "effort" | "description"> & { priority: number; dependsOn: string[] })[]>;
  nothingPlanned: { name: string; gap: number }[];
  ladder: { stage: string; name: string; meaning: string; isTarget: boolean }[];
  sources: ReportSource[];
}

const gapText = (gap: number | null) => (gap === null ? "—" : gap === 0 ? "On target" : `${gap} ${gap === 1 ? "level" : "levels"}`);
const PHASES: Phase[] = ["Now", "Next", "Later"];

export function buildReport(
  r: FunctionProcessResult,
  areas: Record<string, AreaScores>,
  opts: { functionName: string; date: string; sources: ReportSource[]; client?: string },
): ReportModel {
  const scored = r.processes.filter((p) => p.gap !== null);
  const titleOf = new Map(r.ideas.map((i) => [i.id, i.title]));
  const ideas = Object.fromEntries(PHASES.map((ph) => [ph, [] as ReportModel["ideas"][Phase]])) as ReportModel["ideas"];
  for (const i of r.ideas)
    ideas[i.phase].push({
      title: i.title,
      processName: i.processName,
      description: i.description,
      value: i.value,
      feasibility: i.feasibility,
      effort: i.effort,
      priority: Math.round(i.priority),
      dependsOn: i.dependsOn.map((d) => titleOf.get(d)).filter((t): t is string => !!t),
    });

  return {
    title: `Digital maturity assessment: ${opts.functionName}`,
    client: opts.client ?? "Himalaya",
    functionName: opts.functionName,
    date: opts.date,
    headline: {
      current: r.overall,
      target: r.target,
      avgGap: scored.length ? scored.reduce((a, p) => a + p.gap!, 0) / scored.length : 0,
      below: scored.filter((p) => p.gap! > 0).length,
      scored: scored.length,
      reviewed: r.validated,
      total: r.processes.length,
    },
    insights: processInsights(r),
    diagnostic: r.processes.map((p) => ({
      name: p.name,
      overall: p.effective,
      process: areas[p.id]?.process?.value ?? null,
      people: areas[p.id]?.people?.value ?? null,
      data: areas[p.id]?.data?.value ?? null,
      gap: gapText(p.gap),
      gapLevels: p.gap,
      nothingPlanned: p.alignment === "WHITESPACE",
    })),
    selfVsToday: r.processes.map((p) => ({ name: p.name, self: p.self, today: p.effective })),
    processes: r.processes.map((p) => {
      const level = p.effective === null ? null : ladderLevel(p.effective);
      const who = p.validation?.by.split(" (")[0];
      return {
        name: p.name,
        score: p.effective,
        stage: level === null ? "Not rated" : stageLabel(level),
        stageName: level === null ? "" : LADDER[level].name,
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
    nothingPlanned: r.processes.filter((p) => p.alignment === "WHITESPACE" && p.gap !== null).map((p) => ({ name: p.name, gap: p.gap! })),
    ladder: LADDER_LEVELS.map((l) => ({ stage: stageLabel(l), name: LADDER[l].name, meaning: LADDER[l].meaning, isTarget: l === r.target })),
    sources: opts.sources,
  };
}

/** Light maturity ramp as hex (react-pdf can't read CSS variables); mirrors --maturity-1…5. */
const RAMP = ["#eef4fc", "#d3e3f8", "#a5c4ee", "#4f86d9", "#2d47a8"];

/** Fill and text colour for a 0–5 score, same mapping as the app's ladderStyle. */
export function ladderHex(score: number | null): { fill: string; text: string } {
  if (score === null) return { fill: "#f1f1f3", text: "#71717a" };
  const t = Math.min(5, Math.max(0, score)) * 0.8; // 0…4 along the ramp
  const i = Math.min(3, Math.floor(t));
  const mix = (a: string, b: string, f: number) => {
    const ch = (s: string, k: number) => parseInt(s.slice(1 + k * 2, 3 + k * 2), 16);
    return `#${[0, 1, 2].map((k) => Math.round(ch(a, k) + (ch(b, k) - ch(a, k)) * f).toString(16).padStart(2, "0")).join("")}`;
  };
  return { fill: mix(RAMP[i]!, RAMP[i + 1]!, t - i), text: t >= 2.6 ? "#ffffff" : "#18181b" };
}

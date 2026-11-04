/**
 * Scripted agent narratives (SCORING_ENGINE.md §7, §11): Plan → Read → Extract → Map → Score →
 * Draft. Numbers come from the caller's context, which is computed from real engine /
 * classifier output — the narration never invents results.
 */
import type { AgentStepKind } from "@/lib/store/types";
import type { AgentContext, AgentTask } from "./types";

export interface ScriptStep {
  kind: AgentStepKind;
  label: string;
  detail?: string;
  ms: number;
}
export interface AgentScript {
  title: string;
  steps: ScriptStep[];
  summary: string;
}

const s = (v: AgentContext[string], fallback = "—") =>
  v === undefined ? fallback : Array.isArray(v) ? v.join(", ") : String(v);
const n = (v: AgentContext[string]) => (typeof v === "number" ? v : Number(v ?? 0));
const plural = (k: number, one: string, many = `${one}s`) => `${k} ${k === 1 ? one : many}`;

export function agentScript(task: AgentTask, ctx: AgentContext): AgentScript {
  switch (task) {
    case "analyze-evidence": {
      const docs = (Array.isArray(ctx.docs) ? ctx.docs : []).map((d) => d.split("|"));
      return {
        title: "Reading documents",
        steps: [
          { kind: "plan", label: `Plan: read ${plural(docs.length, "document")} for ${s(ctx.functionName)}`, ms: 360 },
          ...docs.map(([title, segments, items]) => ({
            kind: "read" as const,
            label: `Reading ${title}`,
            detail: `${segments} sections, ${items} useful sentences`,
            ms: 300,
          })),
          { kind: "extract", label: "Pick out sentences that show how work gets done", detail: `${s(ctx.items)} sentences kept; ${s(ctx.negated)} negated phrases ignored`, ms: 460 },
          { kind: "map", label: "Place each sentence on a process and a ladder stage", detail: `${s(ctx.mapped)} sentences about ${s(ctx.functionName)}`, ms: 420 },
          { kind: "score", label: "Re-score the processes", detail: s(ctx.moves, "No process changed stage"), ms: 400 },
        ],
        summary: `${s(ctx.mapped)} sentences mapped to ${s(ctx.functionName)} processes.`,
      };
    }
    case "score":
      return {
        title: "Scoring processes",
        steps: [
          { kind: "plan", label: `Plan: score ${plural(n(ctx.processes), "process", "processes")} on the Stage 1–5 maturity scale`, ms: 380 },
          { kind: "read", label: "Combine quick-check answers, document quotes and the 2025 self-assessment", detail: `${s(ctx.indicators)} signals`, ms: 480 },
          { kind: "score", label: "Weigh each signal by how reliable its source is", ms: 420 },
          { kind: "check", label: "Check confidence and where sources disagree", detail: `${plural(n(ctx.disagree), "process", "processes")} to look at`, ms: 440 },
        ],
        summary: `Levels ready for review. ${s(ctx.headline)}`,
      };
    case "results":
      return {
        title: "Building the results",
        steps: [
          { kind: "read", label: "Gather the reviewed levels", detail: `${s(ctx.validated)} of ${s(ctx.processes)} reviewed`, ms: 360 },
          { kind: "map", label: "Compare each process with the target", detail: `${plural(n(ctx.gaps), "process", "processes")} below target`, ms: 380 },
          { kind: "draft", label: "Match gaps to improvement ideas and order them", detail: s(ctx.ideas), ms: 460 },
          { kind: "check", label: "Check every number traces back to a source", ms: 300 },
        ],
        summary: s(ctx.headline),
      };
  }
}

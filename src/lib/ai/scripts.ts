/**
 * Scripted agent narratives (SCORING_ENGINE.md §7): Plan → Read → Extract → Map → Detect →
 * Score → Draft. Numbers come from the caller's context, which is computed from real engine /
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
    case "score":
      return {
        title: "AI scoring pass",
        steps: [
          { kind: "plan", label: `Plan: score ${s(ctx.capabilities)} capabilities across 4 dimensions against the Himalaya rubric`, ms: 420 },
          { kind: "read", label: `Load ${s(ctx.indicators)} indicators`, detail: `${s(ctx.responses)} questionnaire answers, ${s(ctx.evidence)} evidence items, 2025 baseline`, ms: 520 },
          { kind: "map", label: "Map indicators to level descriptors (process, data, AI, people)", ms: 480 },
          { kind: "score", label: "Compute raw → gated → final scores", detail: `${plural(n(ctx.gated), "dimension")} capped by stage gates (acatech-style)`, ms: 560 },
          { kind: "check", label: "Estimate confidence from coverage, agreement and source quality", detail: `${s(ctx.high)} high, ${s(ctx.medium)} medium, ${s(ctx.low)} low`, ms: 460 },
          { kind: "detect", label: "Raise flags for consultant review", detail: `${plural(n(ctx.lacks), "capability", "capabilities")} lacking objective evidence, ${plural(n(ctx.variance), "self-assessment variance")}, ${plural(n(ctx.inconsistent), "inconsistency", "inconsistencies")}`, ms: 500 },
        ],
        summary: `${s(ctx.capabilities)} scores ready for validation. Largest variance: ${s(ctx.topVariance)}.`,
      };
    case "recalculate":
      return {
        title: "Re-weighting dimensions",
        steps: [
          { kind: "plan", label: `Apply weights: ${s(ctx.weights)}`, ms: 220 },
          { kind: "score", label: "Recompute capability, function and enterprise scores", detail: `Enterprise mean now ${s(ctx.mean)}`, ms: 280 },
        ],
        summary: "Scores, KPIs and synthesis updated.",
      };
    case "synthesis":
      return {
        title: "Drafting executive synthesis",
        steps: [
          { kind: "read", label: "Gather effective scores", detail: `${s(ctx.validated)} validated, ${s(ctx.suggested)} AI-suggested`, ms: 380 },
          { kind: "map", label: "Aggregate to function scorecards and the dimension heatmap", ms: 360 },
          { kind: "draft", label: "Draft the headline narrative from templates", detail: s(ctx.headline), ms: 520 },
          { kind: "draft", label: "Select top priorities by priority score", detail: s(ctx.top), ms: 420 },
          { kind: "check", label: "Check every statement traces to an engine output", ms: 320 },
        ],
        summary: "Boardroom view ready. Export to PDF from the toolbar.",
      };
    case "analyze-evidence": {
      const docs = (Array.isArray(ctx.docs) ? ctx.docs : []).map((d) => d.split("|"));
      return {
        title: "Analysing evidence",
        steps: [
          { kind: "plan", label: `Plan: read ${plural(docs.length, "document")} across ${s(ctx.categories)} evidence categories`, ms: 380 },
          ...docs.map(([title, segments, items]) => ({
            kind: "read" as const,
            label: `Reading ${title}`,
            detail: `${segments} segments, ${items} evidence items`,
            ms: 340,
          })),
          { kind: "extract", label: "Tag function, capability, dimension and level signal", detail: `${s(ctx.items)} evidence items extracted; ${s(ctx.negated)} negated phrases discarded`, ms: 520 },
          { kind: "map", label: "Map evidence to rubric criteria and stage gates", ms: 420 },
          { kind: "detect", label: "Look for contradictions across sources", detail: `${plural(n(ctx.contradictions), "contradiction")} surfaced for review`, ms: 480 },
          { kind: "check", label: "Check coverage by function × category", detail: s(ctx.coverageGap, "No gaps"), ms: 360 },
          { kind: "score", label: "Re-score affected capabilities", detail: `${s(ctx.moved)} capabilities moved`, ms: 420 },
        ],
        summary: `${s(ctx.items)} evidence items mapped. ${s(ctx.moved)} capability scores moved.`,
      };
    }
    case "interview-themes":
      return {
        title: "Structuring interview notes",
        steps: [
          { kind: "read", label: `Read ${plural(n(ctx.notes), "interview note")}`, detail: s(ctx.stakeholders), ms: 420 },
          { kind: "extract", label: "Classify statements as strengths or pain points", detail: `${s(ctx.strengths)} strengths, ${s(ctx.pains)} pain points`, ms: 520 },
          { kind: "map", label: "Group by capability and normalise to the theme taxonomy", ms: 440 },
          { kind: "detect", label: "Compare stakeholders against each other and against artefacts", detail: `${plural(n(ctx.contradictions), "contradiction")} found`, ms: 520 },
        ],
        summary: `${s(ctx.themes)} recurring themes, ${plural(n(ctx.contradictions), "contradiction")} to resolve.`,
      };
    case "process":
      return {
        title: "Process analysis",
        steps: [
          { kind: "read", label: `Combine process evidence for ${s(ctx.functionName)}`, ms: 360 },
          { kind: "detect", label: "Find manual workarounds next to system names", detail: `${s(ctx.workarounds)} workarounds`, ms: 460 },
          { kind: "map", label: "Trace hand-offs between systems and teams", detail: `${s(ctx.handoffs)} hand-offs`, ms: 400 },
          { kind: "score", label: "Compute fragmentation index", detail: s(ctx.index), ms: 300 },
        ],
        summary: `Fragmentation index ${s(ctx.index)} for ${s(ctx.functionName)}.`,
      };
    case "compare":
      return {
        title: "Cross-functional comparison",
        steps: [
          { kind: "read", label: "Normalise pain points to the theme taxonomy", ms: 380 },
          { kind: "map", label: "Count themes by function", detail: s(ctx.topTheme), ms: 420 },
          { kind: "check", label: "Compare self-assessment and evidence by function", ms: 360 },
        ],
        summary: `Top cross-functional theme: ${s(ctx.topTheme)}.`,
      };
    case "opportunities":
      return {
        title: "Generating opportunities",
        steps: [
          { kind: "plan", label: `Evaluate ${s(ctx.rules)} gap → use-case rules`, ms: 360 },
          { kind: "map", label: "Match rules to effective dimension scores and targets", detail: `${s(ctx.useCases)} use cases triggered`, ms: 460 },
          { kind: "score", label: "Score value, feasibility (data readiness) and risk", ms: 420 },
          { kind: "draft", label: "Place on the value × feasibility matrix", detail: `${s(ctx.quickWins)} quick wins`, ms: 380 },
        ],
        summary: `${s(ctx.useCases)} use cases, ${s(ctx.quickWins)} quick wins.`,
      };
    case "roadmap":
      return {
        title: "Sequencing the roadmap",
        steps: [
          { kind: "read", label: `Overlay ${s(ctx.initiatives)} existing 2026-27 initiatives`, ms: 360 },
          { kind: "map", label: "Sort use cases by dependency (MDM → forecasting → fill rate)", ms: 440 },
          { kind: "score", label: "Phase into Now, Next and Later", detail: s(ctx.phases), ms: 420 },
          { kind: "detect", label: "Find whitespaces and initiatives to accelerate", detail: `${s(ctx.whitespaces)} whitespaces, ${s(ctx.accelerate)} to accelerate`, ms: 420 },
        ],
        summary: `Whitespaces: ${s(ctx.whitespaceNames)}.`,
      };
  }
}

import type { AssessmentInput, AssessmentResult, EvidenceItem } from "@/lib/engine";
import type { EvidenceCategory } from "@/lib/schema";
import type { AgentStepKind } from "@/lib/store/types";

export type AgentTask =
  | "score"
  | "recalculate"
  | "synthesis"
  | "analyze-evidence"
  | "interview-themes"
  | "process"
  | "compare"
  | "opportunities"
  | "roadmap";

export type AgentContext = Record<string, string | number | string[] | undefined>;

export type AgentEvent =
  | { type: "start"; title: string }
  | { type: "step"; id: string; kind: AgentStepKind; label: string; detail?: string }
  | { type: "step-done"; id: string; detail?: string }
  | { type: "done"; summary: string }
  | { type: "error"; message: string };

export interface ParsedSegment {
  text: string;
  location: string;
}

export interface ParsedDocument {
  id: string;
  title: string;
  category: EvidenceCategory;
  segments: ParsedSegment[];
  stakeholder?: string;
}

/**
 * Every "AI" capability goes through this interface. MockProvider is deterministic
 * (classifier + engine + scripted agent narrative); LLMProvider is the phase-2 drop-in.
 */
export interface AIProvider {
  readonly name: string;
  readonly simulated: boolean;
  assess(input: AssessmentInput): AssessmentResult;
  classify(doc: ParsedDocument): EvidenceItem[];
  runAgent(task: AgentTask, ctx: AgentContext, opts?: { speed?: number }): AsyncGenerator<AgentEvent>;
}

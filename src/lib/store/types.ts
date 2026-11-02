import type { EvidenceCategory, FunctionId } from "@/lib/schema";

export type DocSource = "workshop" | "demo" | "upload";
export type DocStatus = "queued" | "parsing" | "analysed" | "error";

export interface EvidenceDoc {
  id: string;
  title: string;
  fileName: string;
  category: EvidenceCategory;
  source: DocSource;
  status: DocStatus;
  addedAt: string;
  size?: number;
  segments?: number;
  itemCount?: number;
  dominantFunctionId?: FunctionId | null;
  illustrative: boolean;
  error?: string;
}

export type AgentStepKind = "plan" | "read" | "extract" | "map" | "detect" | "score" | "draft" | "check" | "narrate";

export interface AgentStep {
  id: string;
  kind: AgentStepKind;
  label: string;
  detail?: string;
  status: "running" | "done";
}

export interface AgentRun {
  id: string;
  task: string;
  title: string;
  startedAt: string;
  status: "running" | "done" | "error";
  steps: AgentStep[];
  summary?: string;
}

export interface AuditEntry {
  id: string;
  at: string;
  by: string;
  processId: string;
  action: "accepted" | "changed" | "reverted" | "bulk-accepted";
  before: number;
  after: number;
  rationale: string;
}

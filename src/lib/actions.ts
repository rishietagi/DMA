"use client";
/**
 * User-level actions that combine the store, the classify route and the agent narrative.
 * Used by the steps and the guided tour.
 */
import { toast } from "sonner";
import { ai } from "@/lib/ai";
import { runAgent } from "@/lib/ai/client";
import type { EvidenceItem, FunctionProcessResult } from "@/lib/engine";
import { DEMO_DOCS } from "@/lib/demo-evidence";
import { functionName } from "@/lib/labels";
import { buildProcessInput, stepForEvidence } from "@/lib/process-input";
import type { EvidenceCategory, FunctionId } from "@/lib/schema";
import { useSession, type SessionState } from "@/lib/store/session";
import type { EvidenceDoc } from "@/lib/store/types";

interface ClassifyResponse {
  items: EvidenceItem[];
  segments: number;
  dominantFunctionId: FunctionId | null;
  negated: number;
}

export interface IngestFile {
  blob: Blob;
  docId: string;
  title: string;
  fileName: string;
  category: EvidenceCategory;
  stakeholder?: string;
  source: EvidenceDoc["source"];
}

/** Engine result for the session as it stands (or with different evidence). */
export function liveResult(s: SessionState = useSession.getState(), evidence = s.evidence): FunctionProcessResult {
  return ai.assessProcesses(buildProcessInput({ ...s, evidence, processValidations: s.validations }));
}

/** Evidence category from the file name — one drop zone instead of nine. */
export function guessCategory(fileName: string): EvidenceCategory {
  const n = fileName.toLowerCase();
  if (/interview|notes|workshop/.test(n)) return "interview_notes";
  if (/strategy|board/.test(n)) return "it_strategy";
  if (/polic|approval/.test(n)) return "policies_sops";
  if (/architecture/.test(n)) return "data_architecture";
  if (/landscape|application|system/.test(n)) return "application_landscape";
  if (/portfolio|initiative|programme/.test(n)) return "transformation_portfolio";
  if (/kpi|metric/.test(n) || n.endsWith(".csv")) return "kpi_extracts";
  return "process_docs";
}

async function classifyFile(f: IngestFile): Promise<ClassifyResponse> {
  const form = new FormData();
  form.set("file", f.blob, f.fileName);
  form.set("docId", f.docId);
  form.set("title", f.title);
  form.set("category", f.category);
  if (f.stakeholder) form.set("stakeholder", f.stakeholder);
  const res = await fetch("/api/classify", { method: "POST", body: form });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Could not read ${f.fileName}`);
  }
  return (await res.json()) as ClassifyResponse;
}

/** Processes whose displayed level changes between two evidence sets. */
function levelMoves(before: EvidenceItem[], after: EvidenceItem[]): string[] {
  const s = useSession.getState();
  const a = liveResult(s, before);
  const b = liveResult(s, after);
  return b.processes.flatMap((p) => {
    const old = a.processes.find((x) => x.id === p.id)!;
    if (old.level === p.level) return [];
    return [`${p.name} stage ${old.level ?? "–"} → ${p.level ?? "–"}`];
  });
}

/** Classify a batch of files, narrate it in the Agent Console, then apply the evidence. */
export async function ingest(files: IngestFile[]): Promise<{ items: number; moves: string[] }> {
  const store = useSession.getState();
  const at = new Date().toISOString();
  store.upsertDocuments(
    files.map((f) => ({
      id: f.docId,
      title: f.title,
      fileName: f.fileName,
      category: f.category,
      source: f.source,
      status: "parsing",
      addedAt: at,
      size: f.blob.size,
      illustrative: f.source !== "upload",
    })),
  );

  const results = await Promise.all(
    files.map(async (f) => {
      try {
        return { f, r: await classifyFile(f) };
      } catch (e) {
        useSession.getState().updateDocument(f.docId, { status: "error", error: String((e as Error).message ?? e) });
        return { f, r: null };
      }
    }),
  );
  const ok = results.filter((x): x is { f: IngestFile; r: ClassifyResponse } => x.r !== null);
  const newItems = ok.flatMap((x) => x.r.items);
  const before = useSession.getState().evidence;
  const ids = new Set(newItems.map((i) => i.id));
  const after = [...before.filter((e) => !ids.has(e.id)), ...newItems];
  const moves = levelMoves(before, after);
  const fn = useSession.getState().functionId;
  const mapped = newItems.filter((e) => e.level !== null && stepForEvidence(fn, e)).length;

  await runAgent("analyze-evidence", {
    functionName: functionName(fn),
    docs: ok.map((x) => `${x.f.title}|${x.r.segments}|${x.r.items.length}`),
    items: newItems.length,
    negated: ok.reduce((a, x) => a + x.r.negated, 0),
    mapped,
    moves: moves.length ? moves.join("; ") : undefined,
  });

  const st = useSession.getState();
  st.addEvidence(newItems);
  for (const { f, r } of ok)
    st.updateDocument(f.docId, { status: "analysed", segments: r.segments, itemCount: r.items.length, dominantFunctionId: r.dominantFunctionId });

  toast.success(`${mapped} ${mapped === 1 ? "sentence" : "sentences"} mapped to ${functionName(fn)}`, {
    description: moves.length ? `Stage changed: ${moves.slice(0, 3).join("; ")}` : "No process changed stage.",
  });
  return { items: newItems.length, moves };
}

export async function loadDemoEvidence() {
  const files = await Promise.all(
    DEMO_DOCS.map(async (d) => {
      const res = await fetch(`/demo-evidence/${d.fileName}`);
      return {
        blob: await res.blob(),
        docId: d.id,
        title: d.title,
        fileName: d.fileName,
        category: d.category,
        stakeholder: d.stakeholder,
        source: "demo" as const,
      };
    }),
  );
  return ingest(files);
}

export async function runScoring() {
  const r = liveResult();
  const top = [...r.processes].filter((p) => p.level !== null).sort((a, b) => a.effective! - b.effective!)[0];
  return runAgent("score", {
    processes: r.processes.length,
    indicators: r.processes.reduce((a, p) => a + p.indicators.length, 0),
    disagree: r.processes.filter((p) => p.flags.includes("INCONSISTENT")).length,
    headline: top ? `Lowest: ${top.name} at stage ${top.level}.` : "",
  });
}

export async function runResults() {
  const r = liveResult();
  return runAgent("results", {
    processes: r.processes.length,
    validated: r.validated,
    gaps: r.processes.filter((p) => (p.gap ?? 0) > 0).length,
    ideas: r.ideas.length ? `${r.ideas.length} ideas: ${r.ideas.filter((i) => i.phase === "Now").length} now` : "No gaps to target",
    headline:
      r.overallLevel === null
        ? "Not enough input to rate this function yet."
        : `${functionName(r.functionId)} is at stage ${r.overallLevel} overall against a target of stage ${r.target}.`,
  });
}

export function resetDemo() {
  useSession.getState().resetDemo();
  toast("Demo reset", { description: "Back to the starting documents and quick-check answers." });
}

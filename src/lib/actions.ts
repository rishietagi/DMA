"use client";
/**
 * User-level actions that combine the store, the classify route and the agent narrative.
 * Used by pages, the command palette and the guided tour.
 */
import * as React from "react";
import { toast } from "sonner";
import { runAgent } from "@/lib/ai/client";
import { scoreContext } from "@/lib/ai/contexts";
import { assess, roundHalf, type EvidenceItem } from "@/lib/engine";
import { EVIDENCE_CATEGORY_LABELS } from "@/lib/engine/config";
import { findContradictions } from "@/lib/classifier/insights";
import { DEMO_DOCS } from "@/lib/demo-evidence";
import { FUNCTION_SHORT } from "@/lib/labels";
import type { EvidenceCategory, FunctionId } from "@/lib/schema";
import { seed } from "@/lib/seed";
import { buildInput, coverageByFunction } from "@/lib/store/build-input";
import { useSession } from "@/lib/store/session";
import type { EvidenceDoc, InterviewNote } from "@/lib/store/types";

interface ClassifyResponse {
  items: EvidenceItem[];
  segments: number;
  dominantFunctionId: FunctionId | null;
  negated: number;
  text: string;
}

async function classifyFile(file: Blob, meta: { docId: string; title: string; fileName: string; category: EvidenceCategory; stakeholder?: string }): Promise<ClassifyResponse> {
  const form = new FormData();
  form.set("file", file, meta.fileName);
  form.set("docId", meta.docId);
  form.set("title", meta.title);
  form.set("category", meta.category);
  if (meta.stakeholder) form.set("stakeholder", meta.stakeholder);
  const res = await fetch("/api/classify", { method: "POST", body: form });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Could not read ${meta.fileName}`);
  }
  return (await res.json()) as ClassifyResponse;
}

/** Number of in-scope capabilities whose displayed (half-point) score changes. */
function movedCount(before: EvidenceItem[], after: EvidenceItem[]): { moved: number; changes: { id: string; from: number; to: number }[] } {
  const s = useSession.getState();
  const a = assess(buildInput({ ...s, evidence: before }));
  const b = assess(buildInput({ ...s, evidence: after }));
  const changes = a.capabilities
    .map((c) => ({ id: c.capability.id, from: c.evidenceScore, to: b.byId[c.capability.id]!.evidenceScore }))
    .filter((x) => roundHalf(x.from) !== roundHalf(x.to));
  return { moved: changes.length, changes };
}

/** Classify a batch of files, narrate it in the Agent Console, then apply the evidence. */
export async function ingest(
  files: { blob: Blob; docId: string; title: string; fileName: string; category: EvidenceCategory; stakeholder?: string; source: EvidenceDoc["source"]; functionId?: FunctionId; date?: string }[],
): Promise<{ items: number; moved: number }> {
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
        const r = await classifyFile(f.blob, f);
        return { f, r };
      } catch (e) {
        useSession.getState().updateDocument(f.docId, { status: "error", error: String((e as Error).message ?? e) });
        return { f, r: null };
      }
    }),
  );
  const ok = results.filter((x): x is { f: (typeof files)[number]; r: ClassifyResponse } => x.r !== null);
  const newItems = ok.flatMap((x) => x.r.items);
  const before = useSession.getState().evidence;
  const ids = new Set(newItems.map((i) => i.id));
  const after = [...before.filter((e) => !ids.has(e.id)), ...newItems];
  const { moved, changes } = movedCount(before, after);

  const s = useSession.getState();
  const cov = coverageByFunction(after, [
    ...s.documents.filter((d) => !ok.some((x) => x.f.docId === d.id)),
    ...ok.map((x) => ({ ...s.documents.find((d) => d.id === x.f.docId)!, status: "analysed" as const, dominantFunctionId: x.f.functionId ?? x.r.dominantFunctionId })),
  ]);
  const hrMissing = (["kpi_extracts"] as EvidenceCategory[]).filter((c) => !(cov.hr ?? []).includes(c));
  const contradictions = findContradictions(after).length;

  await runAgent("analyze-evidence", {
    docs: ok.map((x) => `${x.f.title}|${x.r.segments}|${x.r.items.length}`),
    categories: new Set(ok.map((x) => x.f.category)).size,
    items: newItems.length,
    negated: ok.reduce((a, x) => a + x.r.negated, 0),
    contradictions,
    coverageGap: hrMissing.length ? `No ${EVIDENCE_CATEGORY_LABELS[hrMissing[0]!].toLowerCase()} for ${FUNCTION_SHORT.hr}` : "No gaps in expected categories",
    moved,
  });

  const st = useSession.getState();
  st.addEvidence(newItems);
  for (const { f, r } of ok) {
    st.updateDocument(f.docId, {
      status: "analysed",
      segments: r.segments,
      itemCount: r.items.length,
      dominantFunctionId: f.functionId ?? r.dominantFunctionId,
    });
  }
  const notes: InterviewNote[] = ok
    .filter((x) => x.f.category === "interview_notes")
    .map((x) => ({
      id: x.f.docId,
      stakeholder: x.f.stakeholder ?? x.f.title,
      functionId: x.f.functionId ?? x.r.dominantFunctionId ?? "finance",
      date: x.f.date ?? at.slice(0, 10),
      text: x.r.text,
      source: x.f.source === "upload" ? "upload" : "demo",
    }));
  if (notes.length) st.addNotes(notes);

  if (changes.length) {
    const top = changes.slice(0, 2).map((c) => `${seed.baseline.capabilities.find((x) => x.id === c.id)?.name} ${c.from.toFixed(1)}→${c.to.toFixed(1)}`);
    toast.success(`${newItems.length} evidence items mapped`, { description: `${moved} scores moved — ${top.join(", ")}` });
  } else {
    toast.success(`${newItems.length} evidence items mapped`, { description: "No displayed scores changed." });
  }
  return { items: newItems.length, moved };
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
        functionId: d.functionId,
        date: d.date,
        source: "demo" as const,
      };
    }),
  );
  return ingest(files);
}

export async function runScoring() {
  const s = useSession.getState();
  const r = assess(buildInput(s));
  return runAgent("score", scoreContext(r, { responses: s.responses.length, evidence: s.evidence.length }));
}

export function useDemoActions() {
  return React.useMemo(
    () => ({
      loadDemoEvidence,
      runScoring,
      resetDemo: () => {
        useSession.getState().resetDemo();
        toast("Demo session reset", { description: "Back to the workshop pack and questionnaire answers." });
      },
    }),
    [],
  );
}

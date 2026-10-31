"use client";
/**
 * Assessment session state (Zustand, persisted to localStorage). The engine never reads this
 * directly — the AssessmentProvider turns it into an AssessmentInput.
 */
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { DEFAULT_WEIGHTS, type AssessmentMode, type EvidenceItem } from "@/lib/engine";
import type { Dimension, FunctionId, Level, QuestionnaireResponse, Validation } from "@/lib/schema";
import { seed } from "@/lib/seed";
import type { AgentRun, AgentStep, AuditEntry, EvidenceDoc, InterviewNote } from "./types";

export const CONSULTANT = "A. Consultant (KPMG)";

function workshopDocs(): EvidenceDoc[] {
  const seen = new Map<string, EvidenceDoc>();
  for (const e of seed.demoResponses.evidence) {
    const d = seen.get(e.docId);
    if (d) d.itemCount = (d.itemCount ?? 0) + 1;
    else
      seen.set(e.docId, {
        id: e.docId,
        title: e.docTitle,
        fileName: `${e.docId}.pdf`,
        category: e.category,
        source: "workshop",
        status: "analysed",
        addedAt: "2026-09-12T09:00:00.000Z",
        itemCount: 1,
        dominantFunctionId: seed.baseline.capabilities.find((c) => c.id === e.capabilityId)?.primaryFunctionId ?? null,
        illustrative: true,
      });
  }
  return [...seen.values()];
}

function workshopEvidence(): EvidenceItem[] {
  return seed.demoResponses.evidence.map((e) => ({
    ...e,
    functionId: seed.baseline.capabilities.find((c) => c.id === e.capabilityId)?.primaryFunctionId ?? null,
    cues: [],
  }));
}

export interface SessionState {
  hydrated: boolean;
  mode: AssessmentMode;
  weights: Record<Dimension, number>;
  excluded: string[];
  targetOverrides: Record<string, number>;
  responses: QuestionnaireResponse[];
  documents: EvidenceDoc[];
  evidence: EvidenceItem[];
  notes: InterviewNote[];
  validations: Record<string, Validation>;
  audit: AuditEntry[];
  runs: AgentRun[];
  agentOpen: boolean;
  ragView: boolean;
  tourCompleted: boolean;
  visited: string[];
  sidebarCollapsed: boolean;

  markVisited: (href: string) => void;
  setSidebarCollapsed: (v: boolean) => void;
  setMode: (m: AssessmentMode) => void;
  setWeight: (d: Dimension, v: number) => void;
  resetWeights: () => void;
  toggleScope: (capabilityId: string) => void;
  setTarget: (capabilityId: string, target: number | null) => void;
  setResponse: (r: { questionId: string; functionId: FunctionId; level: Level | null; notes?: string; answeredBy?: string }) => void;
  upsertDocuments: (docs: EvidenceDoc[]) => void;
  updateDocument: (id: string, patch: Partial<EvidenceDoc>) => void;
  addEvidence: (items: EvidenceItem[]) => void;
  removeDocument: (id: string) => void;
  addNotes: (notes: InterviewNote[]) => void;
  removeNote: (id: string) => void;
  accept: (capabilityId: string, score: number, rationale?: string) => void;
  override: (capabilityId: string, before: number, after: number, rationale: string) => void;
  bulkAccept: (items: { capabilityId: string; score: number }[]) => void;
  revert: (capabilityId: string) => void;
  startRun: (run: AgentRun) => void;
  pushStep: (runId: string, step: AgentStep) => void;
  completeStep: (runId: string, stepId: string, detail?: string) => void;
  finishRun: (runId: string, summary?: string, status?: AgentRun["status"]) => void;
  setAgentOpen: (open: boolean) => void;
  setRagView: (on: boolean) => void;
  setTourCompleted: (v: boolean) => void;
  resetDemo: () => void;
}

const now = () => new Date().toISOString();
const uid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 9)}`;

const initial = () => ({
  mode: "evidence" as AssessmentMode,
  weights: { ...DEFAULT_WEIGHTS },
  excluded: [] as string[],
  targetOverrides: {} as Record<string, number>,
  responses: seed.demoResponses.responses,
  documents: workshopDocs(),
  evidence: workshopEvidence(),
  notes: [] as InterviewNote[],
  validations: {} as Record<string, Validation>,
  audit: [] as AuditEntry[],
  runs: [] as AgentRun[],
  agentOpen: false,
  ragView: false,
  tourCompleted: false,
  visited: [] as string[],
  sidebarCollapsed: false,
});

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      hydrated: false,
      ...initial(),

      markVisited: (href) => set((s) => (s.visited.includes(href) ? {} : { visited: [...s.visited, href] })),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      setMode: (mode) => set({ mode }),
      setWeight: (d, v) => set((s) => ({ weights: { ...s.weights, [d]: v } })),
      resetWeights: () => set({ weights: { ...DEFAULT_WEIGHTS } }),
      toggleScope: (id) =>
        set((s) => ({ excluded: s.excluded.includes(id) ? s.excluded.filter((x) => x !== id) : [...s.excluded, id] })),
      setTarget: (id, target) =>
        set((s) => {
          const next = { ...s.targetOverrides };
          if (target === null) delete next[id];
          else next[id] = target;
          return { targetOverrides: next };
        }),
      setResponse: (r) =>
        set((s) => {
          const rest = s.responses.filter((x) => !(x.questionId === r.questionId && x.functionId === r.functionId));
          return { responses: [...rest, { ...r, date: now().slice(0, 10) }] };
        }),
      upsertDocuments: (docs) =>
        set((s) => {
          const ids = new Set(docs.map((d) => d.id));
          return { documents: [...s.documents.filter((d) => !ids.has(d.id)), ...docs] };
        }),
      updateDocument: (id, patch) =>
        set((s) => ({ documents: s.documents.map((d) => (d.id === id ? { ...d, ...patch } : d)) })),
      addEvidence: (items) =>
        set((s) => {
          const ids = new Set(items.map((i) => i.id));
          return { evidence: [...s.evidence.filter((e) => !ids.has(e.id)), ...items] };
        }),
      removeDocument: (id) =>
        set((s) => ({
          documents: s.documents.filter((d) => d.id !== id),
          evidence: s.evidence.filter((e) => e.docId !== id),
        })),
      addNotes: (notes) =>
        set((s) => {
          const ids = new Set(notes.map((n) => n.id));
          return { notes: [...s.notes.filter((n) => !ids.has(n.id)), ...notes] };
        }),
      removeNote: (id) => set((s) => ({ notes: s.notes.filter((n) => n.id !== id) })),

      accept: (capabilityId, score, rationale = "Accepted AI-suggested score") =>
        set((s) => ({
          validations: {
            ...s.validations,
            [capabilityId]: { capabilityId, kind: "accepted", before: score, after: score, rationale, by: CONSULTANT, at: now() },
          },
          audit: [
            { id: uid("a"), at: now(), by: CONSULTANT, capabilityId, action: "accepted", before: score, after: score, rationale },
            ...s.audit,
          ],
        })),
      override: (capabilityId, before, after, rationale) =>
        set((s) => ({
          validations: {
            ...s.validations,
            [capabilityId]: { capabilityId, kind: "overridden", before, after, rationale, by: CONSULTANT, at: now() },
          },
          audit: [
            { id: uid("a"), at: now(), by: CONSULTANT, capabilityId, action: "overridden", before, after, rationale },
            ...s.audit,
          ],
        })),
      bulkAccept: (items) =>
        set((s) => {
          const at = now();
          const rationale = "Bulk-accepted: high confidence, no open flags";
          const validations = { ...s.validations };
          const audit = [...s.audit];
          for (const { capabilityId, score } of items) {
            validations[capabilityId] = { capabilityId, kind: "accepted", before: score, after: score, rationale, by: CONSULTANT, at };
            audit.unshift({ id: uid("a"), at, by: CONSULTANT, capabilityId, action: "bulk-accepted", before: score, after: score, rationale });
          }
          return { validations, audit };
        }),
      revert: (capabilityId) =>
        set((s) => {
          const v = s.validations[capabilityId];
          if (!v) return {};
          const validations = { ...s.validations };
          delete validations[capabilityId];
          return {
            validations,
            audit: [
              { id: uid("a"), at: now(), by: CONSULTANT, capabilityId, action: "reverted", before: v.after, after: v.before, rationale: "Returned to AI-suggested" },
              ...s.audit,
            ],
          };
        }),

      startRun: (run) => set((s) => ({ runs: [run, ...s.runs].slice(0, 25) })),
      pushStep: (runId, step) =>
        set((s) => ({ runs: s.runs.map((r) => (r.id === runId ? { ...r, steps: [...r.steps, step] } : r)) })),
      completeStep: (runId, stepId, detail) =>
        set((s) => ({
          runs: s.runs.map((r) =>
            r.id === runId
              ? { ...r, steps: r.steps.map((st) => (st.id === stepId ? { ...st, status: "done", detail: detail ?? st.detail } : st)) }
              : r,
          ),
        })),
      finishRun: (runId, summary, status = "done") =>
        set((s) => ({
          runs: s.runs.map((r) =>
            r.id === runId
              ? { ...r, status, summary, steps: r.steps.map((st) => ({ ...st, status: "done" as const })) }
              : r,
          ),
        })),
      setAgentOpen: (agentOpen) => set({ agentOpen }),
      setRagView: (ragView) => set({ ragView }),
      setTourCompleted: (tourCompleted) => set({ tourCompleted }),
      resetDemo: () => set({ ...initial() }),
    }),
    {
      name: "himalaya-dma-session-v1",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (s) => {
        const { hydrated: _h, agentOpen: _a, ...rest } = s;
        void _h;
        void _a;
        return {
          ...rest,
          runs: rest.runs.map((r) => (r.status === "running" ? { ...r, status: "done" as const } : r)),
        };
      },
      onRehydrateStorage: () => () => {
        useSession.setState({ hydrated: true });
      },
    },
  ),
);

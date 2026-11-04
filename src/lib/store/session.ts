"use client";
/**
 * Assessment session state (Zustand, persisted to localStorage). The engine never reads this
 * directly — the ProcessProvider turns it into a ProcessInput.
 */
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { EvidenceItem, LadderLevel, ProcessValidation } from "@/lib/engine";
import { l1Processes, processKey, renameProcessKeys, type CustomProcess, type CustomQuestion, type ProcessSetting } from "@/lib/process-input";
import type { FunctionId, Level, QuestionnaireResponse } from "@/lib/schema";
import { withoutRetiredSamples } from "@/lib/demo-evidence";
import { seed } from "@/lib/seed";
import type { AgentRun, AgentStep, AuditEntry, EvidenceDoc } from "./types";

export const CONSULTANT = "A. Consultant (KPMG)";
export const DEFAULT_FUNCTION: FunctionId = "supply-chain";
export const DEFAULT_TARGET: LadderLevel = 3;

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

const allProcesses = (fn: FunctionId, custom: readonly CustomProcess[] = []) => l1Processes(fn, custom).map((s) => processKey(fn, s));

export interface SessionState {
  hydrated: boolean;
  functionId: FunctionId;
  /** selected L1 processes, as process keys */
  processes: string[];
  target: LadderLevel;
  /** quick-check answers on the 1–5 scale, by process key */
  quickCheck: Record<string, number>;
  /** question-bank answers (1–5 rubric levels) */
  responses: QuestionnaireResponse[];
  /** questions the consultant added, answered on the ladder */
  customQuestions: CustomQuestion[];
  /** processes the consultant added to a function */
  customProcesses: CustomProcess[];
  /** criticality and target the consultant set per process (else suggested) */
  processSettings: Record<string, ProcessSetting>;
  documents: EvidenceDoc[];
  evidence: EvidenceItem[];
  validations: Record<string, ProcessValidation>;
  audit: AuditEntry[];
  runs: AgentRun[];
  agentOpen: boolean;
  tourCompleted: boolean;

  setFunction: (fn: FunctionId) => void;
  toggleProcess: (key: string) => void;
  setTarget: (t: LadderLevel) => void;
  setQuickCheck: (key: string, level: LadderLevel | null) => void;
  setResponse: (r: { questionId: string; functionId: FunctionId; level: Level | null }) => void;
  addQuestion: (q: Omit<CustomQuestion, "id">) => void;
  answerQuestion: (id: string, answer: LadderLevel | null) => void;
  removeQuestion: (id: string) => void;
  /** null clears that field back to the suggestion */
  setProcessSetting: (key: string, patch: { criticality?: ProcessSetting["criticality"] | null; target?: ProcessSetting["target"] | null }) => void;
  addProcess: (functionId: FunctionId, name: string, keywords: string[]) => void;
  updateProcess: (id: string, name: string, keywords: string[]) => void;
  /** deletes a process; returns a function that puts it (and everything keyed on it) back */
  removeProcess: (id: string) => (() => void) | undefined;
  upsertDocuments: (docs: EvidenceDoc[]) => void;
  updateDocument: (id: string, patch: Partial<EvidenceDoc>) => void;
  addEvidence: (items: EvidenceItem[]) => void;
  removeDocument: (id: string) => void;
  accept: (processId: string, score: number) => void;
  acceptAll: (items: { processId: string; score: number }[]) => void;
  change: (processId: string, before: number, after: number, rationale: string) => void;
  revert: (processId: string) => void;
  startRun: (run: AgentRun) => void;
  pushStep: (runId: string, step: AgentStep) => void;
  completeStep: (runId: string, stepId: string, detail?: string) => void;
  finishRun: (runId: string, summary?: string, status?: AgentRun["status"]) => void;
  setAgentOpen: (open: boolean) => void;
  setTourCompleted: (v: boolean) => void;
  resetDemo: () => void;
}

const now = () => new Date().toISOString();
const uid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 9)}`;

const initial = () => ({
  functionId: DEFAULT_FUNCTION,
  processes: allProcesses(DEFAULT_FUNCTION),
  target: DEFAULT_TARGET,
  quickCheck: { ...seed.demoResponses.quickCheck },
  responses: [...seed.demoResponses.responses],
  customQuestions: [] as CustomQuestion[],
  customProcesses: [] as CustomProcess[],
  processSettings: {} as Record<string, ProcessSetting>,
  documents: workshopDocs(),
  evidence: workshopEvidence(),
  validations: {} as Record<string, ProcessValidation>,
  audit: [] as AuditEntry[],
  runs: [] as AgentRun[],
  agentOpen: false,
  tourCompleted: false,
});

export const useSession = create<SessionState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      ...initial(),

      setFunction: (functionId) => set((s) => ({ functionId, processes: allProcesses(functionId, s.customProcesses) })),
      toggleProcess: (key) =>
        set((s) => ({ processes: s.processes.includes(key) ? s.processes.filter((x) => x !== key) : [...s.processes, key] })),
      setTarget: (target) => set({ target }),
      setQuickCheck: (key, level) =>
        set((s) => {
          const quickCheck = { ...s.quickCheck };
          if (level === null) delete quickCheck[key];
          else quickCheck[key] = level;
          return { quickCheck };
        }),
      setResponse: (r) =>
        set((s) => {
          const rest = s.responses.filter((x) => !(x.questionId === r.questionId && x.functionId === r.functionId));
          return { responses: [...rest, { ...r, answeredBy: CONSULTANT, date: now().slice(0, 10) }] };
        }),
      addQuestion: (q) => set((s) => ({ customQuestions: [...s.customQuestions, { ...q, id: uid("cq") }] })),
      answerQuestion: (id, answer) =>
        set((s) => ({ customQuestions: s.customQuestions.map((q) => (q.id === id ? { ...q, answer } : q)) })),
      removeQuestion: (id) => set((s) => ({ customQuestions: s.customQuestions.filter((q) => q.id !== id) })),
      setProcessSetting: (key, patch) =>
        set((s) => {
          const next: ProcessSetting = { ...s.processSettings[key] };
          for (const k of ["criticality", "target"] as const) {
            if (patch[k] === null) delete next[k];
            else if (patch[k] !== undefined) (next as Record<string, unknown>)[k] = patch[k];
          }
          const processSettings = { ...s.processSettings };
          if (Object.keys(next).length) processSettings[key] = next;
          else delete processSettings[key];
          return { processSettings };
        }),
      addProcess: (functionId, name, keywords) =>
        set((s) => ({
          customProcesses: [...s.customProcesses, { id: uid("cp"), functionId, name, keywords }],
          processes: s.functionId === functionId ? [...s.processes, processKey(functionId, name)] : s.processes,
        })),
      updateProcess: (id, name, keywords) =>
        set((s) => {
          const old = s.customProcesses.find((c) => c.id === id);
          if (!old) return {};
          return {
            ...(old.name === name ? {} : renameProcessKeys(s, old.functionId, old.name, name)),
            customProcesses: s.customProcesses.map((c) => (c.id === id ? { ...c, name, keywords } : c)),
          };
        }),
      removeProcess: (id) => {
        const s = get();
        const old = s.customProcesses.find((c) => c.id === id);
        if (!old) return undefined;
        const snapshot = {
          customProcesses: s.customProcesses,
          processes: s.processes,
          quickCheck: s.quickCheck,
          validations: s.validations,
          customQuestions: s.customQuestions,
          audit: s.audit,
        };
        set({ ...renameProcessKeys(s, old.functionId, old.name, null), customProcesses: s.customProcesses.filter((c) => c.id !== id) });
        return () => set(snapshot);
      },
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

      accept: (processId, score) =>
        set((s) => {
          const rationale = "Accepted the AI-suggested level";
          return {
            validations: { ...s.validations, [processId]: { kind: "accepted", before: score, after: score, rationale, by: CONSULTANT, at: now() } },
            audit: [{ id: uid("a"), at: now(), by: CONSULTANT, processId, action: "accepted", before: score, after: score, rationale }, ...s.audit],
          };
        }),
      acceptAll: (items) =>
        set((s) => {
          const at = now();
          const rationale = "Accepted with all AI-suggested levels";
          const validations = { ...s.validations };
          const audit = [...s.audit];
          for (const { processId, score } of items) {
            validations[processId] = { kind: "accepted", before: score, after: score, rationale, by: CONSULTANT, at };
            audit.unshift({ id: uid("a"), at, by: CONSULTANT, processId, action: "bulk-accepted", before: score, after: score, rationale });
          }
          return { validations, audit };
        }),
      change: (processId, before, after, rationale) =>
        set((s) => ({
          validations: { ...s.validations, [processId]: { kind: "overridden", before, after, rationale, by: CONSULTANT, at: now() } },
          audit: [{ id: uid("a"), at: now(), by: CONSULTANT, processId, action: "changed", before, after, rationale }, ...s.audit],
        })),
      revert: (processId) =>
        set((s) => {
          const v = s.validations[processId];
          if (!v) return {};
          const validations = { ...s.validations };
          delete validations[processId];
          return {
            validations,
            audit: [
              { id: uid("a"), at: now(), by: CONSULTANT, processId, action: "reverted", before: v.after, after: v.before, rationale: "Returned to the AI suggestion" },
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
      setTourCompleted: (tourCompleted) => set({ tourCompleted }),
      resetDemo: () => set({ ...initial() }),
    }),
    {
      name: "himalaya-dma-session-v2",
      version: 5,
      migrate: (state, version) => {
        const s = state as Partial<SessionState>;
        if (version < 3) s.customProcesses = [];
        if (version < 4 && s.documents && s.evidence) Object.assign(s, withoutRetiredSamples({ documents: s.documents, evidence: s.evidence }));
        if (version < 5) {
          // the scale moved from 0–5 to the client's 1–5 levels: levels stored on the old scale no longer mean the same
          Object.assign(s, {
            quickCheck: { ...seed.demoResponses.quickCheck },
            validations: {},
            target: DEFAULT_TARGET,
            customQuestions: (s.customQuestions ?? []).map((q) => ({ ...q, answer: null })),
            processSettings: {},
          });
        }
        return s as SessionState;
      },
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

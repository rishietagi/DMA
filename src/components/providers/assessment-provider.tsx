"use client";
/**
 * Runs the pure engine on the live session. Every screen reads from this one memoised result,
 * so a weight change or override updates Workbench, Cockpit and Synthesis in the same render.
 */
import * as React from "react";
import { assess, type AssessmentInput, type AssessmentResult } from "@/lib/engine";
import { buildInput } from "@/lib/store/build-input";
import { useSession } from "@/lib/store/session";

interface Ctx {
  result: AssessmentResult;
  /** the same session in baseline mode (2025 self-assessment only) */
  baseline: AssessmentResult;
  input: AssessmentInput;
}
const AssessmentContext = React.createContext<Ctx | null>(null);

export function AssessmentProvider({ children }: { children: React.ReactNode }) {
  const mode = useSession((s) => s.mode);
  const weights = useSession((s) => s.weights);
  const excluded = useSession((s) => s.excluded);
  const responses = useSession((s) => s.responses);
  const evidence = useSession((s) => s.evidence);
  const validations = useSession((s) => s.validations);
  const targetOverrides = useSession((s) => s.targetOverrides);
  const documents = useSession((s) => s.documents);

  const value = React.useMemo<Ctx>(() => {
    const input = buildInput({ mode, weights, excluded, responses, evidence, validations, targetOverrides, documents });
    return {
      input,
      result: assess(input),
      baseline: assess({ ...input, mode: "baseline", validations: {} }),
    };
  }, [mode, weights, excluded, responses, evidence, validations, targetOverrides, documents]);

  return <AssessmentContext.Provider value={value}>{children}</AssessmentContext.Provider>;
}

export function useAssessment(): Ctx {
  const ctx = React.useContext(AssessmentContext);
  if (!ctx) throw new Error("useAssessment must be used inside <AssessmentProvider>");
  return ctx;
}

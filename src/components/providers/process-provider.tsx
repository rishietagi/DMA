"use client";
/**
 * Runs both engines on the live session: the process ladder (the headline) and the capability
 * engine underneath (areas, value / feasibility / risk, initiatives). Every step reads this one
 * memoised result, so an answer or a changed level updates Review and Results in the same render.
 */
import * as React from "react";
import { ai } from "@/lib/ai";
import { assess, type AssessmentResult, type FunctionProcessResult, type ProcessInput } from "@/lib/engine";
import { assessAllFunctions, buildProcessInput } from "@/lib/process-input";
import { capabilityInput, ideaScoresFrom } from "@/lib/store/build-input";
import { useSession } from "@/lib/store/session";

interface Ctx {
  result: FunctionProcessResult;
  input: ProcessInput;
  /** capability engine on the same evidence */
  caps: AssessmentResult;
  /** every function on the ladder, for comparison */
  all: FunctionProcessResult[];
}
const ProcessContext = React.createContext<Ctx | null>(null);

export function ProcessProvider({ children }: { children: React.ReactNode }) {
  const functionId = useSession((s) => s.functionId);
  const processes = useSession((s) => s.processes);
  const target = useSession((s) => s.target);
  const evidence = useSession((s) => s.evidence);
  const documents = useSession((s) => s.documents);
  const quickCheck = useSession((s) => s.quickCheck);
  const validations = useSession((s) => s.validations);
  const responses = useSession((s) => s.responses);
  const customQuestions = useSession((s) => s.customQuestions);
  const customProcesses = useSession((s) => s.customProcesses);

  const caps = React.useMemo(() => assess(capabilityInput(evidence, documents, responses)), [evidence, documents, responses]);
  const all = React.useMemo(
    () => assessAllFunctions({ evidence, quickCheck, target, responses, customQuestions, customProcesses }, ai.assessProcesses),
    [evidence, quickCheck, target, responses, customQuestions, customProcesses],
  );

  const value = React.useMemo<Ctx>(() => {
    const input = buildProcessInput({
      functionId,
      processes,
      target,
      evidence,
      quickCheck,
      responses,
      customQuestions,
      customProcesses,
      processValidations: validations,
      ideaScores: ideaScoresFrom(caps),
    });
    return { input, result: ai.assessProcesses(input), caps, all };
  }, [functionId, processes, target, evidence, quickCheck, responses, customQuestions, customProcesses, validations, caps, all]);

  return <ProcessContext.Provider value={value}>{children}</ProcessContext.Provider>;
}

export function useProcesses(): Ctx {
  const ctx = React.useContext(ProcessContext);
  if (!ctx) throw new Error("useProcesses must be used inside <ProcessProvider>");
  return ctx;
}

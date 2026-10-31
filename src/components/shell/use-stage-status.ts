"use client";
import { useAssessment } from "@/components/providers/assessment-provider";
import { useSession } from "@/lib/store/session";

export type StageStatus = "done" | "active" | "todo";

/** Journey status per route, derived from session state (not stored). */
export function useStageStatus(): Record<string, StageStatus> {
  const { result } = useAssessment();
  const documents = useSession((s) => s.documents);
  const notes = useSession((s) => s.notes);
  const responses = useSession((s) => s.responses);
  const visited = useSession((s) => s.visited);
  const k = result.kpis.all;

  const analysedUploads = documents.some((d) => d.source !== "workshop" && d.status === "analysed");
  const v = (href: string): StageStatus => (visited.includes(href) ? "done" : "todo");
  return {
    "/scope": "done",
    "/evidence": analysedUploads ? "done" : documents.length ? "active" : "todo",
    "/interviews": notes.length ? "done" : responses.length ? "active" : "todo",
    "/process": analysedUploads ? v("/process") : "todo",
    "/scoring": k.awaitingValidation === 0 ? "done" : k.validated > 0 ? "active" : "todo",
    "/compare": v("/compare"),
    "/opportunities": v("/opportunities"),
    "/roadmap": v("/roadmap"),
    "/synthesis": v("/synthesis"),
  };
}

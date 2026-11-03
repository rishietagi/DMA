/** Plain-language "why this level" line, built only from engine output. */
import { ladderLevel, type ProcessResult } from "@/lib/engine";

const range = (values: number[]) => {
  const lo = ladderLevel(Math.min(...values));
  const hi = ladderLevel(Math.max(...values));
  return lo === hi ? `stage ${lo}` : `stages ${lo}–${hi}`;
};

const SOURCE_LABEL = { "quick-check": "Interview", question: "Questionnaire", evidence: "Documents", self: "Baseline" } as const;

/** Where each source puts the process: "Interview Stage 3", "Documents Stages 0–3", … in a fixed order. */
export function sourceBreakdown(p: Pick<ProcessResult, "indicators">): { source: string; stages: string }[] {
  return (Object.keys(SOURCE_LABEL) as (keyof typeof SOURCE_LABEL)[]).flatMap((kind) => {
    const values = p.indicators.filter((i) => i.kind === kind).map((i) => i.value);
    if (!values.length) return [];
    const lo = ladderLevel(Math.min(...values));
    const hi = ladderLevel(Math.max(...values));
    return [{ source: SOURCE_LABEL[kind], stages: lo === hi ? `Stage ${lo}` : `Stages ${lo}–${hi}` }];
  });
}

export function whyLine(p: ProcessResult): string {
  if (!p.indicators.length) return "Nothing to go on yet. Add documents or answer the quick check.";
  const parts: string[] = [];
  const qc = p.indicators.find((i) => i.kind === "quick-check");
  if (qc) parts.push(`Interview says stage ${qc.value}`);
  const qs = p.indicators.filter((i) => i.kind === "question").map((i) => i.value);
  if (qs.length) parts.push(`${qs.length} ${qs.length === 1 ? "answer points" : "answers point"} to ${range(qs)}`);
  const ev = p.indicators.filter((i) => i.kind === "evidence").map((i) => i.value);
  if (ev.length) parts.push(`${ev.length} ${ev.length === 1 ? "quote points" : "quotes point"} to ${range(ev)}`);
  const self = p.indicators.filter((i) => i.kind === "self").map((i) => i.value);
  if (self.length) parts.push(`2025 self-assessment ${range(self)}`);
  return `${parts.join("; ")}.`;
}

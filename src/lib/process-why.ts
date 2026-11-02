/** Plain-language "why this level" line, built only from engine output. */
import { ladderLevel, type ProcessResult } from "@/lib/engine";

const range = (values: number[]) => {
  const lo = ladderLevel(Math.min(...values));
  const hi = ladderLevel(Math.max(...values));
  return lo === hi ? `L${lo}` : `L${lo}–L${hi}`;
};

export function whyLine(p: ProcessResult): string {
  if (!p.indicators.length) return "Nothing to go on yet. Add documents or answer the quick check.";
  const parts: string[] = [];
  const qc = p.indicators.find((i) => i.kind === "quick-check");
  if (qc) parts.push(`Interview says L${qc.value}`);
  const qs = p.indicators.filter((i) => i.kind === "question").map((i) => i.value);
  if (qs.length) parts.push(`${qs.length} ${qs.length === 1 ? "answer points" : "answers point"} to ${range(qs)}`);
  const ev = p.indicators.filter((i) => i.kind === "evidence").map((i) => i.value);
  if (ev.length) parts.push(`${ev.length} ${ev.length === 1 ? "quote points" : "quotes point"} to ${range(ev)}`);
  const self = p.indicators.filter((i) => i.kind === "self").map((i) => i.value);
  if (self.length) parts.push(`2025 self-assessment ${range(self)}`);
  return `${parts.join("; ")}.`;
}

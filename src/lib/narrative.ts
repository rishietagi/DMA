/** Templated executive summary for the Results step — every sentence comes from engine output. */
import { LADDER, type FunctionProcessResult } from "@/lib/engine";

const listOf = (xs: string[]) => (xs.length < 2 ? (xs[0] ?? "") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

export function processNarrative(r: FunctionProcessResult, fnName: string): string[] {
  const scored = r.processes.filter((p) => p.level !== null);
  if (r.overallLevel === null || r.overall === null || !scored.length) return [`${fnName} can't be rated yet: add documents or answer the quick check.`];
  const below = scored.filter((p) => (p.gap ?? 0) > 0);
  const sorted = [...scored].sort((a, b) => b.effective! - a.effective!);
  const best = sorted[0]!;
  const worst = sorted[sorted.length - 1]!;
  const out: string[] = [];

  out.push(
    `${fnName} sits at Level ${r.overallLevel} (${LADDER[r.overallLevel].name.toLowerCase()}) overall against a target of Level ${r.target}; ` +
      (below.length ? `${below.length} of ${scored.length} processes are below target.` : "every process is at or above target."),
  );
  if (best.id !== worst.id) {
    const nothing = worst.alignment === "WHITESPACE" ? ", with nothing on the 2026-27 roadmap to close it" : "";
    out.push(`${best.name} is the most mature at L${best.level}; ${worst.name} is furthest behind at L${worst.level}${nothing}.`);
  }
  if (r.self !== null) {
    const d = r.overall - r.self;
    out.push(
      Math.abs(d) < 0.25
        ? `That is in line with the 2025 self-assessment.`
        : `That is ${Math.abs(d).toFixed(1)} levels ${d < 0 ? "below" : "above"} what the 2025 self-assessment claimed, once documents and interviews are weighed in.`,
    );
  }
  const now = r.ideas.filter((i) => i.phase === "Now");
  if (now.length) {
    const rest = r.ideas.length - now.length;
    out.push(`Start now with ${listOf(now.map((i) => i.title))}${rest ? `; ${rest} more ${rest === 1 ? "idea follows" : "ideas follow"} once the foundations are in.` : "."}`);
  }
  const disagree = scored.filter((p) => p.flags.includes("INCONSISTENT"));
  if (disagree.length) out.push(`Sources disagree on ${listOf(disagree.map((p) => p.name))} — settle that before sign-off.`);
  return out;
}

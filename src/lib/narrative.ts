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
    `${fnName} sits at stage ${r.overallLevel} (${LADDER[r.overallLevel].name.toLowerCase()}) overall against a target of stage ${r.target}; ` +
      (below.length ? `${below.length} of ${scored.length} processes are below target.` : "every process is at or above target."),
  );
  if (best.id !== worst.id) {
    const nothing = worst.alignment === "WHITESPACE" ? ", with nothing on the 2026-27 roadmap to close it" : "";
    out.push(`${best.name} is the most mature at stage ${best.level}; ${worst.name} is furthest behind at stage ${worst.level}${nothing}.`);
  }
  if (r.self !== null) {
    const d = r.overall - r.self;
    out.push(
      Math.abs(d) < 0.25
        ? `That is in line with the 2025 self-assessment.`
        : `That is ${Math.abs(d).toFixed(1)} stages ${d < 0 ? "below" : "above"} what the 2025 self-assessment claimed, once documents and interviews are weighed in.`,
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

export interface ProcessInsight {
  kind: "strength" | "gap" | "priority";
  label: string;
  text: string;
}

const levels = (n: number) => `${n} ${n === 1 ? "level" : "levels"}`;

/** Three headline insights for the results step: closest to target, widest gap, where to start. */
export function processInsights(r: FunctionProcessResult): ProcessInsight[] {
  const scored = r.processes.filter((p) => p.gap !== null && p.effective !== null);
  if (!scored.length) return [];
  const out: ProcessInsight[] = [];
  const byGap = [...scored].sort((a, b) => a.gap! - b.gap! || b.effective! - a.effective!);
  const best = byGap[0]!;
  out.push({
    kind: "strength",
    label: "Strength",
    text: best.gap === 0 ? `${best.name} is already at target (stage ${best.level}).` : `${best.name} is closest to target, ${levels(best.gap!)} away.`,
  });
  const worst = byGap[byGap.length - 1]!;
  if (worst.gap! > 0 && worst.id !== best.id)
    out.push({
      kind: "gap",
      label: "Critical gap",
      text:
        `${worst.name} remains ${levels(worst.gap!)} below target` +
        (worst.alignment === "WHITESPACE" ? " with no initiative currently mapped." : "; the 2026-27 roadmap touches it."),
    });
  const now = [...r.ideas].filter((i) => i.phase === "Now").sort((a, b) => b.priority - a.priority)[0];
  if (now) out.push({ kind: "priority", label: "Priority", text: `Start with ${now.title} on ${now.processName}.` });
  return out;
}

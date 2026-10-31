/**
 * Templated executive narrative. Every clause is filled from engine output — no free text is
 * generated, so each sentence is traceable.
 */
import { formatMean, formatPct, formatScore, roundHalf, type AssessmentResult } from "@/lib/engine";
import { capabilityLabel } from "@/lib/labels";
import { seed } from "@/lib/seed";

export interface Narrative {
  headline: string;
  paragraphs: string[];
}

export function buildNarrative(r: AssessmentResult): Narrative {
  const ent = r.kpis.enterprise;
  const cpd = r.kpis.cpd;
  const moved = r.capabilities.filter((c) => c.inScope && c.hasEvidence && Math.abs(roundHalf(c.effectiveScore) - c.self) >= 1);
  const down = moved.filter((c) => c.effectiveScore < c.self).sort((a, b) => a.effectiveScore - a.self - (b.effectiveScore - b.self));
  const ws = Object.values(r.opportunities).filter((o) => o.alignment === "WHITESPACE");
  const acc = Object.values(r.opportunities).filter((o) => o.alignment === "ACCELERATE");
  const now = r.useCases.filter((u) => u.phase === "Now");

  const headline =
    ent.mean < 2.5
      ? `Enterprise functions average ${formatMean(ent.mean)} of 5: digitised, not yet integrated.`
      : `Enterprise functions average ${formatMean(ent.mean)} of 5: integration is in place; automation is next.`;

  const p1 = `${formatPct(ent.pctAtOrBelow2)} of the ${ent.capabilities} enterprise capabilities sit at level 2 or below and ${ent.countAt5 === 0 ? "none" : ent.countAt5} at level 5. CPD averages ${formatMean(cpd.mean)}, ahead of the enterprise functions${cpd.countAtOrAbove4 ? `, with ${cpd.countAtOrAbove4} capabilities at level 4 or above` : ""}.`;

  const p2 =
    moved.length === 0
      ? "Evidence gathered so far supports the 2025 self-assessment; no capability moves by a full level."
      : `Evidence moves ${moved.length} ${moved.length === 1 ? "capability" : "capabilities"} by a level or more against the 2025 self-assessment${
          down[0]
            ? ` — most notably ${capabilityLabel(down[0].capability.id)} (self ${formatScore(down[0].self)}, evidence ${formatScore(down[0].effectiveScore)})`
            : ""
        }. ${seed.baseline.meta.deckTagline}.`;

  const names = ws.map((o) => capabilityLabel(o.capabilityId));
  const list = names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}` : (names[0] ?? "");
  const p3 = `${ws.length === 0 ? "No capability has" : ws.length === 1 ? "One capability has" : `${ws.length} capabilities have`} a material gap and no initiative on the 2026-27 roadmap${ws.length ? `: ${list}` : ""}. ${
    acc.length === 1 ? "One capability needs its roadmap initiative" : `${acc.length} capabilities need their roadmap initiatives`
  } accelerated, and ${now.length} AI and digital use ${now.length === 1 ? "case is" : "cases are"} ready to start in the next six months.`;

  return { headline, paragraphs: [p1, p2, p3] };
}

/**
 * Process × area (process / data / AI / people) on the ladder. Owned capabilities give the capability
 * engine's area scores (crosswalked); a process with none (e.g. Warehousing) falls back to its own
 * sentences tagged with that area.
 */
import { mean, toLadder, type AssessmentResult, type ProcessDef } from "@/lib/engine";
import { DIMENSIONS, type Dimension } from "@/lib/schema";

export type AreaScores = Partial<Record<Dimension, { value: number; source: "capabilities" | "documents" }>>;

export function processAreas(defs: readonly ProcessDef[], caps: AssessmentResult): Record<string, AreaScores> {
  return Object.fromEntries(
    defs.map((d) => {
      const out: AreaScores = {};
      for (const dim of DIMENSIONS) {
        const fromCaps = d.capabilityIds
          .map((c) => caps.byId[c]?.dimensions[dim]?.final)
          .filter((v): v is number => typeof v === "number");
        if (fromCaps.length) {
          out[dim] = { value: toLadder(mean(fromCaps)), source: "capabilities" };
          continue;
        }
        const fromDocs = d.evidence.filter((e) => e.dimension === dim && e.level !== null).map((e) => toLadder(e.level!));
        if (fromDocs.length) out[dim] = { value: mean(fromDocs), source: "documents" };
      }
      return [d.id, out];
    }),
  );
}

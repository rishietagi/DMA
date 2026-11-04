/** Display lookups for seed entities. */
import type { AlignmentStatus, Phase } from "@/lib/engine";
import type { FunctionId, InitiativeStatus } from "@/lib/schema";
import { seed } from "@/lib/seed";

const fnById = new Map(seed.baseline.functions.map((f) => [f.id, f]));
const capById = new Map(seed.baseline.capabilities.map((c) => [c.id, c]));

export const functionName = (id: FunctionId | string) => fnById.get(id as FunctionId)?.name ?? id;

/** Short function names for dense grids. */
export const FUNCTION_SHORT: Record<FunctionId, string> = {
  "marketing-design": "Marketing",
  "sales-gt": "GT",
  "sales-nmt": "NMT",
  "sales-ecom": "E-com",
  "sales-retail": "Retail",
  "supply-chain": "Supply chain",
  procurement: "Procurement",
  finance: "Finance",
  "rnd-qa": "R&D / QA",
  hr: "HR",
};

export const capabilityName = (id: string) => capById.get(id)?.name ?? id;

/** "Reconciliation" is ambiguous across functions — qualify it with the function. */
export function capabilityLabel(id: string): string {
  const c = capById.get(id);
  if (!c) return id;
  const dupes = seed.baseline.capabilities.filter((x) => x.name === c.name).length > 1;
  return dupes ? `${c.name} (${FUNCTION_SHORT[c.primaryFunctionId]})` : c.name;
}

export const STATUS_LABEL: Record<InitiativeStatus, string> = {
  completed: "Completed",
  in_progress: "In progress",
  planned: "Planned",
};

export const ALIGNMENT_LABEL: Record<AlignmentStatus, string> = {
  WHITESPACE: "Whitespace",
  ACCELERATE: "Accelerate",
  REVISIT: "Revisit (adoption gap)",
  ON_TRACK: "On track",
  PLANNED: "Planned",
  AT_TARGET: "At target",
};

export const PHASE_LABEL: Record<Phase, string> = {
  Now: "Now · 0–6 months",
  Next: "Next · 6–18 months",
  Later: "Beyond · 18–36 months",
};

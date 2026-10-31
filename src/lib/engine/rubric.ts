/** Rubric helpers: level descriptors, gates and gate lookups. Pure. */
import type { Dimension, Rubric, RubricDimension } from "@/lib/schema";

export type GateLevel = 2 | 3 | 4 | 5;
const GATE_LEVELS: GateLevel[] = [2, 3, 4, 5];

export function getRubricDimension(rubric: Rubric, dimension: Dimension): RubricDimension {
  const d = rubric.dimensions.find((x) => x.id === dimension);
  if (!d) throw new Error(`Rubric has no dimension "${dimension}"`);
  return d;
}

/** Gate keys required at each level 2..5 (empty array if none). */
export function gatesByLevel(dim: RubricDimension): Record<GateLevel, string[]> {
  return {
    2: dim.gates["2"] ?? [],
    3: dim.gates["3"] ?? [],
    4: dim.gates["4"] ?? [],
    5: dim.gates["5"] ?? [],
  };
}

export function hasGates(dim: RubricDimension): boolean {
  return GATE_LEVELS.some((l) => (dim.gates[String(l) as "2"] ?? []).length > 0);
}

/** The level a gate key unlocks within its dimension, or null if unknown. */
export function gateLevel(dim: RubricDimension, gateKey: string): GateLevel | null {
  for (const l of GATE_LEVELS) if ((dim.gates[String(l) as "2"] ?? []).includes(gateKey)) return l;
  return null;
}

/** Human-readable gate name: "process.system_integration" → "system integration" */
export function gateLabel(gateKey: string): string {
  const [, key = gateKey] = gateKey.split(".");
  return key.replace(/_/g, " ");
}

export function levelDescriptor(dim: RubricDimension, level: number): string {
  const l = String(Math.min(5, Math.max(1, Math.floor(level)))) as "1";
  return dim.levels[l];
}

export function scaleLabel(rubric: Rubric, level: number): string {
  const l = String(Math.min(5, Math.max(1, Math.floor(level)))) as "1";
  return rubric.scale[l];
}

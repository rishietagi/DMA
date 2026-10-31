/**
 * Use-case generation (§6.5) and dependency-aware roadmap phasing (§6.6). Pure.
 */
import type { FunctionId, UseCaseRule } from "@/lib/schema";
import { PHASING } from "./config";
import { effectiveDimension } from "./prioritise";
import type {
  CapabilityOpportunity,
  CapabilityResult,
  Phase,
  UseCase,
  UseCaseTrigger,
} from "./types";

const PHASE_ORDER: Record<Phase, number> = { Now: 0, Next: 1, Later: 2 };
const PHASES: Phase[] = ["Now", "Next", "Later"];

export function ruleMatches(
  rule: UseCaseRule,
  c: CapabilityResult,
): { score: number } | null {
  if (!c.inScope || !rule.when.capabilityIds.includes(c.capability.id)) return null;
  const score = effectiveDimension(c, rule.when.dimension);
  if (score > rule.when.maxScore) return null;
  if (rule.when.minScore !== undefined && score < rule.when.minScore) return null;
  if (rule.when.flag && !c.flags.some((f) => f.kind === rule.when.flag)) return null;
  return { score };
}

/** Evaluate all rules; de-duplicate by use-case id; attach triggering gaps (gap > 0 only). */
export function generateUseCases(
  rules: readonly UseCaseRule[],
  caps: readonly CapabilityResult[],
  opportunities: Readonly<Record<string, CapabilityOpportunity>>,
): Omit<UseCase, "phase" | "order" | "pulledForward">[] {
  const out = new Map<string, Omit<UseCase, "phase" | "order" | "pulledForward">>();
  for (const rule of rules) {
    const triggers: UseCaseTrigger[] = [];
    for (const c of caps) {
      const m = ruleMatches(rule, c);
      const opp = opportunities[c.capability.id];
      if (!m || !opp || opp.gap <= 0) continue;
      triggers.push({
        capabilityId: c.capability.id,
        dimension: rule.when.dimension,
        score: m.score,
        gap: opp.gap,
        priority: opp.priority,
      });
    }
    if (triggers.length === 0) continue;
    triggers.sort((a, b) => b.priority - a.priority || a.capabilityId.localeCompare(b.capabilityId));
    const lead = opportunities[triggers[0]!.capabilityId]!;
    const existing = out.get(rule.id);
    if (existing) {
      existing.triggers.push(...triggers);
      continue;
    }
    const fnIds = new Set<FunctionId>();
    for (const t of triggers) caps.find((c) => c.capability.id === t.capabilityId)?.capability.functionIds.forEach((f) => fnIds.add(f));
    const initiatives = new Map(
      triggers.flatMap((t) => opportunities[t.capabilityId]!.initiatives).map((i) => [i.id, i]),
    );
    out.set(rule.id, {
      id: rule.id,
      ...rule.useCase,
      triggers,
      primaryCapabilityId: lead.capabilityId,
      functionIds: [...fnIds],
      gap: lead.gap,
      value: lead.value,
      feasibility: lead.feasibility,
      risk: lead.risk,
      priority: lead.priority,
      quadrant: lead.quadrant,
      dataReadiness: lead.dataReadiness,
      initiatives: [...initiatives.values()],
      alignment: lead.alignment,
    });
  }
  return [...out.values()];
}

/** Kahn topological sort on dependsOn (deps outside the set are ignored). Ties by priority. */
export function topoSort<T extends { id: string; dependsOn: string[]; priority: number }>(items: readonly T[]): T[] {
  const ids = new Set(items.map((i) => i.id));
  const indeg = new Map(items.map((i) => [i.id, i.dependsOn.filter((d) => ids.has(d)).length]));
  const byId = new Map(items.map((i) => [i.id, i]));
  const sorted: T[] = [];
  const ready = () =>
    items
      .filter((i) => indeg.get(i.id) === 0 && !sorted.includes(i))
      .sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));
  let queue = ready();
  while (queue.length) {
    const next = queue[0]!;
    sorted.push(next);
    indeg.set(next.id, -1);
    for (const i of items) if (i.dependsOn.includes(next.id)) indeg.set(i.id, (indeg.get(i.id) ?? 0) - 1);
    queue = ready();
  }
  // cycles: append the remainder deterministically
  for (const i of items) if (!sorted.includes(i)) sorted.push(byId.get(i.id)!);
  return sorted;
}

/** Base phase from the item's own merits (§6.6 step 2). */
export function basePhase(
  uc: Pick<UseCase, "priority" | "feasibility" | "primaryCapabilityId">,
  opportunities: Readonly<Record<string, CapabilityOpportunity>>,
): Phase {
  const unmetCap = (opportunities[uc.primaryCapabilityId]?.unmetDependencies.length ?? 0) > 0;
  if (uc.priority >= PHASING.nowPriority && uc.feasibility >= PHASING.nowFeasibility && !unmetCap) return "Now";
  if (uc.priority >= PHASING.nextPriority) return "Next";
  return "Later";
}

/**
 * §6.6 phasing.
 * 1. Base phase per item: Now (priority ≥ threshold, feasibility ≥ 3, no unmet capability
 *    dependency) · Next (priority ≥ threshold) · Later.
 * 2. Pull-forward: a prerequisite is brought forward to the phase of its earliest dependent
 *    (a planner would not leave the foundation for a priority item in "Later").
 * 3. Floor: an item never lands earlier than any of its dependencies; a Later item whose
 *    dependencies are all Now moves to Next ("deps satisfied by a Now item").
 */
export function phaseUseCases(
  items: readonly Omit<UseCase, "phase" | "order" | "pulledForward">[],
  opportunities: Readonly<Record<string, CapabilityOpportunity>>,
): UseCase[] {
  const sorted = topoSort(items);
  const inSet = new Set(items.map((i) => i.id));
  const depsOf = (uc: { dependsOn: string[] }) => uc.dependsOn.filter((d) => inSet.has(d));
  const phase = new Map<string, number>(sorted.map((uc) => [uc.id, PHASE_ORDER[basePhase(uc, opportunities)]]));
  const pulled = new Set<string>();

  for (const uc of [...sorted].reverse()) {
    const p = phase.get(uc.id)!;
    for (const d of depsOf(uc)) {
      if (phase.get(d)! > p) {
        phase.set(d, p);
        pulled.add(d);
      }
    }
  }
  for (const uc of sorted) {
    const deps = depsOf(uc);
    const depMax = Math.max(-1, ...deps.map((d) => phase.get(d)!));
    let p = Math.max(phase.get(uc.id)!, depMax);
    if (p === PHASE_ORDER.Later && deps.length > 0 && depMax === PHASE_ORDER.Now) p = PHASE_ORDER.Next;
    phase.set(uc.id, p);
  }
  return sorted.map((uc, order) => ({
    ...uc,
    phase: PHASES[phase.get(uc.id)!]!,
    order,
    pulledForward: pulled.has(uc.id),
  }));
}

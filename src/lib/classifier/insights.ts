/**
 * Interview intelligence and process analysis on top of classified evidence
 * (SCORING_ENGINE.md §7, last three paragraphs). Pure.
 */
import type { EvidenceItem } from "@/lib/engine/types";
import type { FunctionId } from "@/lib/schema";
import { OBJECTIVE_SOURCE_TYPES } from "@/lib/schema";
import { SYSTEM_NAMES, THEMES } from "./lexicons";
import { matchCues } from "./classify";

export interface RecurringTheme {
  capabilityId: string;
  polarity: "pain" | "strength";
  stakeholders: string[];
  items: EvidenceItem[];
}

/** Recurring theme: same (capability, polarity) mentioned by ≥ 2 stakeholders. */
export function recurringThemes(items: readonly EvidenceItem[]): RecurringTheme[] {
  const groups = new Map<string, EvidenceItem[]>();
  for (const e of items) {
    if (!e.capabilityId || e.polarity === "neutral" || !e.stakeholder) continue;
    const k = `${e.capabilityId}|${e.polarity}`;
    groups.set(k, [...(groups.get(k) ?? []), e]);
  }
  return [...groups.entries()]
    .map(([k, list]) => {
      const [capabilityId, pol] = k.split("|") as [string, "pain" | "strength"];
      return { capabilityId, polarity: pol, stakeholders: [...new Set(list.map((e) => e.stakeholder!))], items: list };
    })
    .filter((t) => t.stakeholders.length >= 2)
    .sort((a, b) => b.stakeholders.length - a.stakeholders.length || a.capabilityId.localeCompare(b.capabilityId));
}

export interface Contradiction {
  id: string;
  capabilityId: string;
  a: EvidenceItem;
  b: EvidenceItem;
  diff: number;
  kind: "stakeholder-vs-stakeholder" | "stakeholder-vs-artefact";
}

/**
 * Contradiction: same capability (and dimension), level signals differ by ≥ 2 across
 * stakeholders, or between a stakeholder and an objective artefact.
 */
export function findContradictions(items: readonly EvidenceItem[]): Contradiction[] {
  const leveled = items.filter((e) => e.capabilityId && e.level !== null && e.dimension);
  const out: Contradiction[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < leveled.length; i++) {
    for (let j = i + 1; j < leveled.length; j++) {
      const a = leveled[i]!;
      const b = leveled[j]!;
      if (a.capabilityId !== b.capabilityId || a.dimension !== b.dimension) continue;
      const diff = Math.abs(a.level! - b.level!);
      if (diff < 2) continue;
      const aInt = a.sourceType === "interview";
      const bInt = b.sourceType === "interview";
      const aObj = OBJECTIVE_SOURCE_TYPES.includes(a.sourceType);
      const bObj = OBJECTIVE_SOURCE_TYPES.includes(b.sourceType);
      let kind: Contradiction["kind"] | null = null;
      if (aInt && bInt && a.stakeholder !== b.stakeholder) kind = "stakeholder-vs-stakeholder";
      else if ((aInt && bObj) || (bInt && aObj)) kind = "stakeholder-vs-artefact";
      if (!kind) continue;
      const key = `${a.capabilityId}|${a.dimension}|${[a.docId, b.docId].sort().join("|")}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const [hi, lo] = a.level! >= b.level! ? [a, b] : [b, a];
      out.push({ id: key, capabilityId: a.capabilityId!, a: hi, b: lo, diff, kind });
    }
  }
  return out.sort((x, y) => y.diff - x.diff || x.id.localeCompare(y.id));
}

/** Cross-functional theme counts: theme × function from pain items. */
export function themeMatrix(items: readonly EvidenceItem[]): { themeId: string; label: string; byFunction: Partial<Record<FunctionId, EvidenceItem[]>>; total: number }[] {
  return THEMES.map((t) => {
    const byFunction: Partial<Record<FunctionId, EvidenceItem[]>> = {};
    let total = 0;
    for (const e of items) {
      if (e.polarity !== "pain" || !e.themes?.includes(t.id) || !e.functionId) continue;
      (byFunction[e.functionId] ??= []).push(e);
      total++;
    }
    return { themeId: t.id, label: t.label, byFunction, total };
  }).sort((a, b) => b.total - a.total);
}

export interface ProcessStepAnalysis {
  step: string;
  level: number | null;
  systems: string[];
  workarounds: EvidenceItem[];
  handoffs: number;
  evidence: EvidenceItem[];
}

/** Systems named in a text (canonical casing). */
export function systemsIn(text: string): string[] {
  return matchCues(text, SYSTEM_NAMES).map((m) => SYSTEM_NAMES.find((s) => s.toLowerCase() === m.cue.toLowerCase())!).filter(
    (v, i, a) => a.indexOf(v) === i,
  );
}

/**
 * Manual workaround: an L1 cue co-occurs with a system name in the same segment
 * ("downloaded from SAP and reworked in Excel"). Hand-off: ≥ 2 systems in one segment.
 */
export function isManualWorkaround(e: EvidenceItem): boolean {
  return e.level === 1 && systemsIn(e.quote).filter((s) => s !== "Excel").length > 0;
}

export function handoffsIn(e: EvidenceItem): number {
  return Math.max(0, systemsIn(e.quote).length - 1);
}

/** Fragmentation index = (#systems touched + #manual hand-offs) / #steps */
export function fragmentationIndex(steps: readonly ProcessStepAnalysis[]): number {
  if (steps.length === 0) return 0;
  const systems = new Set(steps.flatMap((s) => s.systems));
  const handoffs = steps.reduce((a, s) => a + s.workarounds.length + s.handoffs, 0);
  return (systems.size + handoffs) / steps.length;
}

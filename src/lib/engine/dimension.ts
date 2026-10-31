/**
 * Scoring a (capability, dimension): raw → gated → final, confidence and
 * dimension-level flags. docs/SCORING_ENGINE.md §3. Pure.
 */
import {
  OBJECTIVE_SOURCE_TYPES,
  type ConfidenceBand,
  type Dimension,
  type Flag,
  type Indicator,
  type RubricDimension,
} from "@/lib/schema";
import { CONFIDENCE, FLAGS, GATE_HALF_STEP_SHARE, SOURCE_RELIABILITY } from "./config";
import { mean, roundHalf, stdev } from "./math";
import { gateLabel, gateLevel, gatesByLevel, hasGates, type GateLevel } from "./rubric";

export interface ConfidenceBreakdown {
  coverage: number;
  agreement: number;
  quality: number;
  value: number;
  band: ConfidenceBand;
}

export interface GateResult {
  /** highest defensible level (may end in .5) */
  cap: number;
  /** first gate that is not satisfied, if any */
  missingGate: string | null;
}

export interface DimensionScore {
  capabilityId: string;
  dimension: Dimension;
  raw: number;
  gated: number;
  /** rounded to 0.5 */
  final: number;
  gate: GateResult | null;
  confidence: number;
  confidenceBand: ConfidenceBand;
  confidenceBreakdown: ConfidenceBreakdown;
  flags: Flag[];
  /** indicators with a level (null = N/A ones are in `ignored`) */
  contributing: Indicator[];
  ignored: Indicator[];
  /** true when at least one non-self indicator contributed */
  hasEvidence: boolean;
}

const isObjective = (i: Indicator) => OBJECTIVE_SOURCE_TYPES.includes(i.sourceType);
const isSelf = (i: Indicator) => i.sourceType === "self_assessment";
const reliability = (i: Indicator) => SOURCE_RELIABILITY[i.sourceType];

/** §3.2 raw = Σ(w·r·level) / Σ(w·r) over indicators with a level. */
export function rawScore(indicators: readonly Indicator[]): number | null {
  let num = 0;
  let den = 0;
  for (const i of indicators) {
    if (i.level === null) continue;
    const wr = i.weight * reliability(i);
    num += wr * i.level;
    den += wr;
  }
  return den > 0 ? num / den : null;
}

/**
 * Is `gateKey` (required for `level`) satisfied? An indicator with that gate key at ≥ level
 * satisfies it. A higher gate of the same dimension met at its own level also implies the
 * foundation (evidence of rule automation at L4 implies integration at L3).
 */
export function isGateSatisfied(
  dim: RubricDimension,
  gateKey: string,
  level: number,
  indicators: readonly Indicator[],
): boolean {
  return indicators.some((i) => {
    if (i.level === null || !i.gateKey) return false;
    if (i.gateKey === gateKey) return i.level >= level;
    const l = gateLevel(dim, i.gateKey);
    return l !== null && l > level && i.level >= l;
  });
}

/**
 * §3.3 stage gating (acatech / CMMI). Only evidence indicators (non-self) are considered.
 * Returns null when gating does not apply (no gates for the dimension, or no evidence).
 */
export function gateCap(dim: RubricDimension, indicators: readonly Indicator[]): GateResult | null {
  const evidence = indicators.filter((i) => !isSelf(i) && i.level !== null);
  if (!hasGates(dim) || evidence.length === 0) return null;

  const gates = gatesByLevel(dim);
  let cap = 1;
  let missingGate: string | null = null;
  for (const l of [2, 3, 4, 5] as GateLevel[]) {
    const missing = gates[l].find((g) => !isGateSatisfied(dim, g, l, evidence));
    if (missing) {
      missingGate = missing;
      break;
    }
    cap = l;
  }
  if (cap < 5) {
    const atNext = evidence.filter((i) => (i.level ?? 0) >= cap + 1).length;
    if (atNext / evidence.length >= GATE_HALF_STEP_SHARE) cap += 0.5;
  }
  return { cap, missingGate };
}

export function confidenceBand(value: number): ConfidenceBand {
  if (value >= CONFIDENCE.high) return "high";
  if (value >= CONFIDENCE.medium) return "medium";
  return "low";
}

/** §3.5 confidence = 0.40·coverage + 0.30·agreement + 0.30·quality */
export function confidence(
  contributing: readonly Indicator[],
  expectedObjectiveTypes: number = CONFIDENCE.expectedObjectiveTypes,
): ConfidenceBreakdown {
  if (contributing.length === 0) {
    return { coverage: 0, agreement: 0, quality: 0, value: 0, band: "low" };
  }
  const objectiveTypes = new Set(contributing.filter(isObjective).map((i) => i.sourceType));
  const coverage = Math.min(1, objectiveTypes.size / Math.max(1, expectedObjectiveTypes));
  const agreement =
    1 - Math.min(1, stdev(contributing.map((i) => i.level as number)) / CONFIDENCE.stdevDivisor);
  const quality = mean(contributing.map(reliability));
  const value =
    CONFIDENCE.wCoverage * coverage +
    CONFIDENCE.wAgreement * agreement +
    CONFIDENCE.wQuality * quality;
  return { coverage, agreement, quality, value, band: confidenceBand(value) };
}

/** §3.6 INCONSISTENT — the most divergent evidence pair with at least one objective source. */
export function findInconsistency(contributing: readonly Indicator[]): Flag | null {
  const ev = contributing.filter((i) => !isSelf(i));
  let best: { a: Indicator; b: Indicator; diff: number } | null = null;
  for (let x = 0; x < ev.length; x++) {
    for (let y = x + 1; y < ev.length; y++) {
      const a = ev[x]!;
      const b = ev[y]!;
      if (!isObjective(a) && !isObjective(b)) continue;
      const diff = Math.abs((a.level as number) - (b.level as number));
      if (diff >= FLAGS.inconsistentLevelDiff && (!best || diff > best.diff)) best = { a, b, diff };
    }
  }
  if (!best) return null;
  const [hi, lo] = (best.a.level as number) >= (best.b.level as number) ? [best.a, best.b] : [best.b, best.a];
  return {
    kind: "INCONSISTENT",
    reason: `${describeSource(hi)} signals L${hi.level} but ${describeSource(lo)} signals L${lo.level}`,
    indicatorIds: [hi.id, lo.id],
  };
}

function describeSource(i: Indicator): string {
  if (i.sourceRef?.stakeholder) return i.sourceRef.stakeholder;
  if (i.sourceRef?.docTitle) return i.sourceRef.docTitle;
  return i.sourceType.replace("_", " ");
}

/**
 * Score one (capability, dimension). `indicators` must already be filtered to that pair and
 * include the implicit self-assessment indicator.
 */
export function scoreDimension(
  capabilityId: string,
  dim: RubricDimension,
  indicators: readonly Indicator[],
  opts: { expectedObjectiveTypes?: number } = {},
): DimensionScore | null {
  const contributing = indicators.filter((i) => i.level !== null);
  const ignored = indicators.filter((i) => i.level === null);
  const raw = rawScore(contributing);
  if (raw === null) return null;

  const hasEvidence = contributing.some((i) => !isSelf(i));
  const gate = hasEvidence ? gateCap(dim, contributing) : null;
  const gated = gate ? Math.min(raw, gate.cap) : raw;
  const final = roundHalf(gated);
  const conf = confidence(contributing, opts.expectedObjectiveTypes);

  const flags: Flag[] = [];
  if (!hasEvidence) {
    flags.push({ kind: "LACKS_EVIDENCE", reason: "Only the 2025 self-assessment — no supporting evidence" });
  } else if (!contributing.some(isObjective)) {
    flags.push({ kind: "LACKS_EVIDENCE", reason: "No artefact, KPI or system evidence — affirmations only" });
  } else if (conf.band === "low") {
    flags.push({ kind: "LACKS_EVIDENCE", reason: `Low confidence (${conf.value.toFixed(2)})` });
  }
  const inconsistent = findInconsistency(contributing);
  if (inconsistent) flags.push(inconsistent);
  if (gate && gated < raw && gate.missingGate) {
    flags.push({ kind: "GATED", cappedAt: gate.cap, missingGate: gateLabel(gate.missingGate) });
  }

  return {
    capabilityId,
    dimension: dim.id,
    raw,
    gated,
    final,
    gate,
    confidence: conf.value,
    confidenceBand: conf.band,
    confidenceBreakdown: conf,
    flags,
    contributing,
    ignored,
    hasEvidence,
  };
}

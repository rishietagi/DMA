/**
 * Deterministic evidence classifier (SCORING_ENGINE.md §7). Pure: text in → evidence items out.
 * Pipeline: segment → tag function → tag capability → dimension + level signal (with negation)
 * → polarity → themes → evidence item.
 */
import type { EvidenceItem, Polarity } from "@/lib/engine/types";
import { CATEGORY_SOURCE_TYPE } from "@/lib/engine/config";
import type { Dimension, FunctionId } from "@/lib/schema";
import { FUNCTION_IDS } from "@/lib/schema";
import { seed } from "@/lib/seed";
import type { ParsedDocument } from "@/lib/ai/types";
import {
  AI_LEVEL_CUES,
  CAPABILITY_LEXICON,
  DIMENSION_CUES,
  FUNCTION_LEXICON,
  LEVEL_CUES,
  NEGATION_WINDOW,
  NEGATIONS,
  PAIN_CUES,
  PEOPLE_LEVEL_CUES,
  STRENGTH_CUES,
  SYSTEMS,
  THEMES,
  type LevelCue,
} from "./lexicons";

export interface CueMatch {
  cue: string;
  index: number;
  end: number;
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const regexCache = new Map<string, RegExp>();
function cueRegex(cue: string): RegExp {
  let r = regexCache.get(cue);
  if (!r) {
    // word boundaries that also work for cues starting/ending with symbols (s&op, t&e, e-com)
    r = new RegExp(`(?<![a-z0-9])${escape(cue)}(?![a-z0-9])`, "gi");
    regexCache.set(cue, r);
  }
  r.lastIndex = 0;
  return r;
}

/** Longest-first, non-overlapping cue matches (so "supply chain" never also counts as "chain"). */
export function matchCues(text: string, cues: readonly string[]): CueMatch[] {
  const all: CueMatch[] = [];
  for (const cue of cues) {
    const re = cueRegex(cue);
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) all.push({ cue, index: m.index, end: m.index + m[0].length });
  }
  all.sort((a, b) => b.end - b.index - (a.end - a.index) || a.index - b.index);
  const taken: CueMatch[] = [];
  for (const m of all) if (!taken.some((t) => m.index < t.end && t.index < m.end)) taken.push(m);
  return taken.sort((a, b) => a.index - b.index);
}

/** Sentence segmentation; keeps short bullet lines as their own segments. */
export function splitSentences(text: string): string[] {
  return text
    .split(/\n+/)
    .flatMap((line) => line.replace(/^\s*[-*•\d.)]+\s+/, "").split(/(?<=[.!?])\s+(?=[A-Z0-9"“(])/))
    .map((s) => s.trim())
    .filter((s) => s.length >= 12);
}

/** Function hits in a text, ranked. */
export function functionHits(text: string): Map<FunctionId, number> {
  const all = matchCues(text, FUNCTION_IDS.flatMap((f) => FUNCTION_LEXICON[f]));
  const hits = new Map<FunctionId, number>();
  for (const m of all)
    for (const f of FUNCTION_IDS)
      if (FUNCTION_LEXICON[f].includes(m.cue.toLowerCase())) hits.set(f, (hits.get(f) ?? 0) + 1);
  return hits;
}

export function topFunction(hits: Map<FunctionId, number>): FunctionId | null {
  let best: FunctionId | null = null;
  let bestN = 0;
  for (const f of FUNCTION_IDS) {
    const k = hits.get(f) ?? 0;
    if (k > bestN) {
      best = f;
      bestN = k;
    }
  }
  return best;
}

/** Dominant function of a whole document (fallback context for sentences without cues). */
export function dominantFunction(texts: readonly string[]): FunctionId | null {
  const total = new Map<FunctionId, number>();
  for (const t of texts) for (const [f, k] of functionHits(t)) total.set(f, (total.get(f) ?? 0) + k);
  return topFunction(total);
}

const capById = new Map(seed.baseline.capabilities.map((c) => [c.id, c]));

/**
 * Capability for a segment: system names resolve directly; otherwise lexicon hits restricted
 * to capabilities of the segment's function (longer phrases score higher).
 */
export function tagCapability(text: string, fn: FunctionId | null): { capabilityId: string | null; cues: string[] } {
  const score = new Map<string, number>();
  const cues: string[] = [];
  for (const m of matchCues(text, Object.keys(SYSTEMS))) {
    cues.push(m.cue);
    for (const id of SYSTEMS[m.cue.toLowerCase()] ?? []) score.set(id, (score.get(id) ?? 0) + 3);
  }
  const allTerms = [...new Set(Object.values(CAPABILITY_LEXICON).flat())];
  const matched = matchCues(text, allTerms);
  for (const m of matched) {
    cues.push(m.cue);
    const words = m.cue.split(/\s+/).length;
    for (const [id, terms] of Object.entries(CAPABILITY_LEXICON))
      if (terms.includes(m.cue.toLowerCase())) score.set(id, (score.get(id) ?? 0) + words);
  }
  const ranked = [...score.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const inFn = fn ? ranked.filter(([id]) => capById.get(id)?.functionIds.includes(fn)) : [];
  const pick = inFn[0] ?? (ranked[0] && ranked[0][1] >= 3 ? ranked[0] : undefined);
  return { capabilityId: pick?.[0] ?? null, cues: [...new Set(cues)] };
}

function isNegated(text: string, index: number): boolean {
  const before = text.slice(0, index).toLowerCase().split(/[^a-z'’-]+/).filter(Boolean).slice(-NEGATION_WINDOW);
  const window = before.join(" ");
  return NEGATIONS.some((n) => (n.includes(" ") ? window.includes(n) : before.includes(n)));
}

export interface LevelSignal {
  dimension: Dimension;
  level: 1 | 2 | 3 | 4 | 5 | null;
  cues: string[];
  negatedCues: string[];
}

/** §7.5 dimension + level signal with §7.7 negation. Takes the weakest non-negated level. */
export function levelSignal(text: string): LevelSignal {
  const has = (list: readonly string[]) => matchCues(text, list).length > 0;
  const dimension: Dimension = has(DIMENSION_CUES.ai)
    ? "ai"
    : has(DIMENSION_CUES.people)
      ? "people"
      : has(DIMENSION_CUES.data)
        ? "data"
        : "process";
  const sets: LevelCue[] =
    dimension === "ai" ? [...AI_LEVEL_CUES, ...LEVEL_CUES] : dimension === "people" ? PEOPLE_LEVEL_CUES : LEVEL_CUES;
  const levelOf = new Map(sets.map((c) => [c.cue, c.level]));
  const cues: string[] = [];
  const negatedCues: string[] = [];
  let level: LevelSignal["level"] = null;
  for (const m of matchCues(text, [...levelOf.keys()])) {
    const l = levelOf.get(m.cue.toLowerCase())!;
    if (isNegated(text, m.index)) {
      negatedCues.push(m.cue);
      continue;
    }
    cues.push(m.cue);
    level = level === null ? l : (Math.min(level, l) as LevelSignal["level"]);
  }
  return { dimension, level, cues, negatedCues };
}

/** §7.6 polarity. A negated strength or a negated high-level cue reads as a pain point. */
export function polarity(text: string, signal: LevelSignal): Polarity {
  const pain = matchCues(text, PAIN_CUES).length + (signal.negatedCues.length > 0 ? 1 : 0);
  const strength = matchCues(text, STRENGTH_CUES).filter((m) => !isNegated(text, m.index)).length;
  if (signal.level !== null && signal.level <= 1 && strength === 0) return "pain";
  if (pain > strength) return "pain";
  if (strength > pain || (signal.level !== null && signal.level >= 3)) return "strength";
  return "neutral";
}

export function themesFor(text: string, level: number | null): string[] {
  return THEMES.filter(
    (t) => matchCues(text, t.cues).length > 0 && (t.requiresLevelAtMost === undefined || (level !== null && level <= t.requiresLevelAtMost)),
  ).map((t) => t.id);
}

export function gateKeyFor(dimension: Dimension, level: number | null): string | undefined {
  if (level === null) return undefined;
  if (dimension === "process") return level <= 3 ? "process.system_integration" : level === 4 ? "process.rule_automation" : "process.ai_in_loop";
  if (dimension === "data") return level <= 3 ? "data.single_source_of_truth" : "data.predictive_model";
  if (dimension === "ai" && level >= 4) return "ai.governance";
  return undefined;
}

/** Classify one sentence in a document context. Null when it carries no usable signal. */
export function classifySegment(
  text: string,
  ctx: { docFunction: FunctionId | null },
): Omit<EvidenceItem, "id" | "docId" | "docTitle" | "category" | "sourceType" | "location" | "weight"> | null {
  const fnHits = functionHits(text);
  const functionId = topFunction(fnHits) ?? ctx.docFunction;
  const cap = tagCapability(text, functionId);
  if (!cap.capabilityId) return null;
  const sig = levelSignal(text);
  const pol = polarity(text, sig);
  if (sig.level === null && pol === "neutral") return null;
  const capFn = capById.get(cap.capabilityId)!;
  const fn = functionId && capFn.functionIds.includes(functionId) ? functionId : capFn.primaryFunctionId;
  return {
    quote: text,
    functionId: fn,
    capabilityId: cap.capabilityId,
    dimension: sig.dimension,
    level: sig.level,
    polarity: pol,
    gateKey: gateKeyFor(sig.dimension, sig.level),
    cues: [...new Set([...sig.cues, ...cap.cues])],
    themes: themesFor(text, sig.level),
  };
}

/** Classify a parsed document into evidence items (§7 steps 1–8). */
export function classifyDocument(doc: ParsedDocument): EvidenceItem[] {
  const sentences = doc.segments.flatMap((seg) =>
    splitSentences(seg.text).map((text, i, arr) => ({ text, location: arr.length > 1 ? `${seg.location}, s${i + 1}` : seg.location })),
  );
  const docFunction = dominantFunction(sentences.map((s) => s.text));
  const sourceType = CATEGORY_SOURCE_TYPE[doc.category];
  const items: EvidenceItem[] = [];
  sentences.forEach((s, i) => {
    const c = classifySegment(s.text, { docFunction });
    if (!c) return;
    items.push({
      ...c,
      id: `${doc.id}:${i}`,
      docId: doc.id,
      docTitle: doc.title,
      category: doc.category,
      sourceType,
      location: s.location,
      weight: 2,
      stakeholder: doc.stakeholder,
    });
  });
  return items;
}

/** Count of negated phrases dropped across a document — for the agent narrative. */
export function countNegated(doc: ParsedDocument): number {
  return doc.segments.flatMap((s) => splitSentences(s.text)).filter((t) => levelSignal(t).negatedCues.length > 0).length;
}

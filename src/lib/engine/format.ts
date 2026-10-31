/**
 * Presentation-layer rounding. The engine keeps full precision; only these helpers round.
 * Pure (Intl is deterministic for a fixed locale).
 */
import { roundHalf } from "./math";

/** A score on the 1–5 scale in half-points: 3.25 → "3.5", 3 → "3.0". */
export function formatScore(score: number | null | undefined): string {
  if (score === null || score === undefined || Number.isNaN(score)) return "—";
  return roundHalf(score).toFixed(1);
}

/** An average of scores, one decimal: 2.2619 → "2.3". */
export function formatMean(score: number | null | undefined): string {
  if (score === null || score === undefined || Number.isNaN(score)) return "—";
  return (Math.round(score * 10 + 1e-9) / 10).toFixed(1);
}

/** A share 0..1 as a whole percentage: 0.4286 → "43%". */
export function formatPct(share: number | null | undefined): string {
  if (share === null || share === undefined || Number.isNaN(share)) return "—";
  return `${Math.round(share * 100 + 1e-9)}%`;
}

/** Signed variance in half-points: −1.5 → "−1.5", 0.5 → "+0.5", 0 → "0.0". */
export function formatDelta(delta: number): string {
  const r = Math.round(delta * 2 + (delta >= 0 ? 1e-9 : -1e-9)) / 2;
  if (r === 0) return "0.0";
  return `${r > 0 ? "+" : "−"}${Math.abs(r).toFixed(1)}`;
}

/** 0–100 index, integer. */
export function formatIndex(index: number): string {
  return String(Math.round(index));
}

export function formatConfidence(c: number): string {
  return `${Math.round(c * 100)}%`;
}

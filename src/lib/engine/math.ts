/** Small numeric helpers shared by the engine. Pure. */

const EPS = 1e-9;

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** Round to the nearest half-point (2.25 → 2.5, 2.24 → 2), clamped to [1, 5]. */
export function roundHalf(n: number): number {
  return clamp(Math.round(n * 2 + EPS) / 2, 1, 5);
}

export function mean(xs: readonly number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

/** Population standard deviation */
export function stdev(xs: readonly number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
}

export function weightedMean(pairs: readonly { value: number; weight: number }[]): number | null {
  const wSum = pairs.reduce((a, p) => a + p.weight, 0);
  if (wSum <= 0) return null;
  return pairs.reduce((a, p) => a + p.value * p.weight, 0) / wSum;
}

/** (score − 1) / 4 × 100 — the JRC-DMAT-style 0–100 index */
export function toIndex(score: number): number {
  return ((clamp(score, 1, 5) - 1) / 4) * 100;
}

import type { ConfidenceBand } from "@/lib/schema";
import { cn } from "@/lib/utils";

const BAND_VAR: Record<ConfidenceBand, string> = {
  high: "var(--confidence-high)",
  medium: "var(--confidence-med)",
  low: "var(--confidence-low)",
};
export const BAND_LABEL: Record<ConfidenceBand, string> = { high: "High", medium: "Medium", low: "Low" };

/** Confidence as a ring (0–1) with the band colour; shows the % in the centre at larger sizes. */
export function ConfidenceRing({
  value,
  band,
  size = 22,
  showValue = false,
  className,
}: {
  value: number;
  band: ConfidenceBand;
  size?: number;
  showValue?: boolean;
  className?: string;
}) {
  const stroke = size >= 48 ? 5 : 3;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.round(value * 100);
  return (
    <span
      role="img"
      aria-label={`Confidence ${pct}% (${BAND_LABEL[band]})`}
      className={cn("relative inline-grid shrink-0 place-items-center", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--muted)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={BAND_VAR[band]}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.min(1, Math.max(0, value)))}
          style={{ transition: "stroke-dashoffset 600ms cubic-bezier(.22,1,.36,1)" }}
        />
      </svg>
      {showValue && (
        <span className="absolute inset-0 grid place-items-center text-sm font-semibold tabular">{pct}%</span>
      )}
    </span>
  );
}

export function ConfidenceBandLabel({ band, className }: { band: ConfidenceBand; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs", className)}>
      <span className="size-1.5 rounded-full" style={{ background: BAND_VAR[band] }} />
      {BAND_LABEL[band]}
    </span>
  );
}

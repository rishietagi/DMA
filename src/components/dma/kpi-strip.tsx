"use client";
import { formatMean, formatPct, type Kpis } from "@/lib/engine";
import { cn } from "@/lib/utils";
import { CountUp } from "./maturity";

interface Stat {
  label: string;
  value: number;
  format: (n: number) => string;
  note?: React.ReactNode;
  tone?: "default" | "ai";
}

/** One hairline-divided strip of headline numbers (not a wall of tiles). */
export function KpiStrip({ stats, className }: { stats: Stat[]; className?: string }) {
  return (
    <dl className={cn("grid divide-x rounded-xl border bg-card", className)} style={{ gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))` }}>
      {stats.map((s) => (
        <div key={s.label} className="flex min-w-0 flex-col gap-1 px-5 py-4">
          <dt className="truncate text-xs text-muted-foreground">{s.label}</dt>
          <dd className={cn("text-[28px] leading-none font-semibold tracking-tight", s.tone === "ai" && "text-ai-foreground")}>
            <CountUp value={s.value} format={s.format} />
          </dd>
          {s.note && <dd className="truncate text-xs text-muted-foreground">{s.note}</dd>}
        </div>
      ))}
    </dl>
  );
}

export function headlineStats(k: Kpis, self?: Kpis): Stat[] {
  const delta = self ? k.mean - self.mean : 0;
  return [
    {
      label: "Average maturity",
      value: k.mean,
      format: formatMean,
      note: self ? (Math.abs(delta) < 0.05 ? `Self-assessed ${formatMean(self.mean)}` : `Self-assessed ${formatMean(self.mean)} (${delta > 0 ? "+" : "−"}${Math.abs(delta).toFixed(1)})`) : undefined,
    },
    { label: "At level 2 or below", value: k.pctAtOrBelow2, format: formatPct, note: `${Math.round(k.pctAtOrBelow2 * k.capabilities)} of ${k.capabilities} capabilities` },
    { label: "At level 4 or above", value: k.countAtOrAbove4, format: (n) => String(Math.round(n)), note: `${k.countAt5} at level 5` },
    { label: "Evidence coverage", value: k.evidenceCoverage, format: formatPct, note: `${k.highConfidence} high-confidence scores` },
    { label: "Awaiting validation", value: k.awaitingValidation, format: (n) => String(Math.round(n)), note: `${k.validated} validated`, tone: "ai" },
  ];
}

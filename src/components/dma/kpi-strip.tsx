"use client";
import { cn } from "@/lib/utils";
import { CountUp } from "./maturity";

export interface Stat {
  label: string;
  value: number;
  format: (n: number) => string;
  note?: React.ReactNode;
  tone?: "default" | "ai" | "warn";
}

/** One hairline-divided strip of headline numbers (not a wall of tiles). */
export function KpiStrip({ stats, className }: { stats: Stat[]; className?: string }) {
  return (
    <dl className={cn("grid grid-cols-2 overflow-hidden rounded-xl border bg-card sm:grid-cols-3", stats.length > 3 && "lg:grid-cols-[repeat(var(--n),minmax(0,1fr))]", className)} style={{ "--n": stats.length } as React.CSSProperties}>
      {stats.map((s) => (
        <div key={s.label} className="-mt-px -ml-px flex min-w-0 flex-col gap-1 border-t border-l px-4 py-3.5">
          <dt className="truncate text-xs text-muted-foreground">{s.label}</dt>
          <dd
            className={cn(
              "text-[26px] leading-none font-semibold tracking-tight",
              s.tone === "ai" && "text-ai-foreground",
              s.tone === "warn" && "text-conf-low",
            )}
          >
            <CountUp value={s.value} format={s.format} />
          </dd>
          {s.note && <dd className="text-[11px] leading-snug text-muted-foreground">{s.note}</dd>}
        </div>
      ))}
    </dl>
  );
}

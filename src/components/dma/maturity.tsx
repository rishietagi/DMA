"use client";
import * as React from "react";
import { animate, useReducedMotion } from "framer-motion";
import { formatScore } from "@/lib/engine/format";
import { cn } from "@/lib/utils";

/**
 * Continuous maturity colour: half-points blend the two neighbouring ramp stops, so 2.5 sits
 * visibly between L2 and L3. Text colour follows the nearer stop for contrast.
 */
export function maturityStyle(score: number | null | undefined, rag = false): React.CSSProperties {
  if (score === null || score === undefined || Number.isNaN(score)) {
    return { background: "var(--muted)", color: "var(--muted-foreground)" };
  }
  const s = Math.min(5, Math.max(1, score));
  const lo = Math.floor(s);
  const hi = Math.min(5, lo + 1);
  const t = Math.round((s - lo) * 100);
  const ramp = rag ? "rag" : "maturity";
  const background =
    t === 0 || lo === hi
      ? `var(--${ramp}-${lo})`
      : `color-mix(in oklch, var(--${ramp}-${lo}) ${100 - t}%, var(--${ramp}-${hi}))`;
  const near = Math.min(5, Math.max(1, Math.round(s)));
  return { background, color: rag ? "var(--rag-fg)" : `var(--maturity-${near}-fg)` };
}

type Provenance = "ai" | "validated" | "self" | "plain";

/** A score chip — always shows the number next to the colour. */
export function MaturityChip({
  score,
  size = "md",
  provenance = "plain",
  rag = false,
  className,
  label,
}: {
  score: number | null | undefined;
  size?: "sm" | "md" | "lg";
  provenance?: Provenance;
  rag?: boolean;
  className?: string;
  label?: string;
}) {
  return (
    <span
      role="img"
      aria-label={label ?? `Maturity ${formatScore(score)} of 5`}
      className={cn(
        "relative inline-flex items-center justify-center rounded-md font-semibold tabular leading-none",
        size === "sm" && "h-5 min-w-8 px-1 text-[11px]",
        size === "md" && "h-6 min-w-10 px-1.5 text-xs",
        size === "lg" && "h-9 min-w-14 px-2 text-base",
        provenance === "ai" && "ring-1 ring-ai/60 ring-offset-1 ring-offset-card",
        provenance === "validated" && "ring-1 ring-validated ring-offset-1 ring-offset-card",
        provenance === "self" && "outline outline-1 -outline-offset-1 outline-dashed outline-foreground/25",
        className,
      )}
      style={maturityStyle(score, rag)}
    >
      {formatScore(score)}
    </span>
  );
}

/** Animated number for KPIs; jumps straight to the value under reduced motion. */
export function CountUp({
  value,
  format,
  className,
}: {
  value: number;
  format: (n: number) => string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const [display, setDisplay] = React.useState(value);
  const prev = React.useRef(value);
  React.useEffect(() => {
    if (reduce) {
      setDisplay(value);
      prev.current = value;
      return;
    }
    const controls = animate(prev.current, value, {
      duration: 0.7,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: setDisplay,
    });
    prev.current = value;
    return () => controls.stop();
  }, [value, reduce]);
  return <span className={cn("tabular", className)}>{format(display)}</span>;
}

/** Legend for the ramp. */
export function MaturityLegend({ rag = false, className, alwaysShowLabels = false }: { rag?: boolean; className?: string; alwaysShowLabels?: boolean }) {
  const labels = ["Excel & email", "Digitised", "Integrated", "Automated", "Autonomous (AI)"];
  return (
    <div className={cn("flex items-center gap-2 text-[11px] text-muted-foreground", className)} aria-label="Maturity scale 1 to 5">
      {labels.map((l, i) => (
        <span key={l} className="inline-flex items-center gap-1">
          <span className="inline-flex size-4 items-center justify-center rounded-[4px] text-[10px] font-semibold tabular" style={maturityStyle(i + 1, rag)}>
            {i + 1}
          </span>
          <span className={alwaysShowLabels ? "" : "hidden xl:inline"}>{l}</span>
        </span>
      ))}
    </div>
  );
}

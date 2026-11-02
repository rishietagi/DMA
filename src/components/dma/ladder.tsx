"use client";
import { ShieldCheck, Sparkles, UserPen } from "lucide-react";
import { LADDER, LADDER_LEVELS, ladderLevel, type LadderLevel, type ProcessResult } from "@/lib/engine";
import { cn } from "@/lib/utils";
import { maturityStyle } from "./maturity";

/** Ladder colour: the 0–5 ladder spread over the single-hue maturity ramp. */
export function ladderStyle(score: number | null | undefined): React.CSSProperties {
  if (score === null || score === undefined) return maturityStyle(null);
  return maturityStyle(1 + Math.min(5, Math.max(0, score)) * 0.8);
}

type Provenance = "ai" | "validated" | "plain";

/** "L2" chip — always the number next to the colour. */
export function LevelChip({
  score,
  provenance = "plain",
  size = "md",
  withName = false,
  className,
}: {
  score: number | null | undefined;
  provenance?: Provenance;
  size?: "sm" | "md" | "lg";
  withName?: boolean;
  className?: string;
}) {
  const level = score === null || score === undefined ? null : ladderLevel(score);
  return (
    <span
      role="img"
      aria-label={level === null ? "Not rated" : `Level ${level} of 5, ${LADDER[level].short}`}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-md font-semibold tabular leading-none whitespace-nowrap",
        size === "sm" && "h-5 min-w-7 px-1.5 text-[11px]",
        size === "md" && "h-6 min-w-8 px-2 text-xs",
        size === "lg" && "h-10 min-w-12 px-3 text-lg",
        provenance === "ai" && "ring-1 ring-ai/60 ring-offset-1 ring-offset-card",
        provenance === "validated" && "ring-1 ring-validated ring-offset-1 ring-offset-card",
        className,
      )}
      style={ladderStyle(level)}
    >
      {level === null ? "—" : `L${level}`}
      {withName && level !== null && <span className="font-medium">· {LADDER[level].short}</span>}
    </span>
  );
}

function StatusIcon({ status }: { status: ProcessResult["status"] }) {
  if (status === "suggested") return <Sparkles className="size-3 shrink-0 text-ai-foreground" aria-label="AI suggested" />;
  if (status === "overridden") return <UserPen className="size-3 shrink-0 text-validated" aria-label="Changed by consultant" />;
  return <ShieldCheck className="size-3 shrink-0 text-validated" aria-label="Validated" />;
}

/**
 * The slide's staircase: six ascending steps, L0 → L5. With processes, each sits on its level and
 * the target step is marked; without, each step shows what the level means.
 */
export function LadderChart({
  processes,
  target,
  className,
}: {
  processes?: readonly ProcessResult[];
  target?: LadderLevel;
  className?: string;
}) {
  const withProcesses = processes !== undefined;
  return (
    <ol
      aria-label="Maturity ladder, Level 0 to Level 5"
      className={cn("grid grid-cols-2 items-end gap-2 sm:grid-cols-3 lg:grid-cols-6 print:grid-cols-6", className)}
    >
      {LADDER_LEVELS.map((l) => {
        const here = processes?.filter((p) => p.level === l) ?? [];
        const isTarget = target === l;
        return (
          <li key={l} className="flex h-full flex-col justify-end">
            <div
              data-ladder-step
              className={cn(
                "flex flex-col gap-2 rounded-lg p-3",
                isTarget && "ring-2 ring-foreground/70 ring-offset-2 ring-offset-background",
              )}
              style={{ ...ladderStyle(l), minHeight: withProcesses ? 96 + l * 26 : 72 + l * 14 }}
            >
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-[11px] font-semibold tabular opacity-80">Level {l}</p>
                {isTarget && (
                  <span className="rounded bg-background/90 px-1.5 py-0.5 text-[10px] font-semibold text-foreground">Target</span>
                )}
              </div>
              <p className="text-[13px] leading-tight font-semibold">{LADDER[l].name}</p>
              {!withProcesses && <p className="text-[11px] leading-snug opacity-85">{LADDER[l].meaning}</p>}
              {here.length > 0 && (
                <ul className="mt-auto flex flex-col gap-1" aria-label={`Processes at level ${l}`}>
                  {here.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center gap-1.5 rounded-md bg-card px-2 py-1 text-[12px] leading-tight text-card-foreground shadow-xs"
                    >
                      <StatusIcon status={p.status} />
                      <span className="min-w-0">{p.name}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

"use client";
import { ShieldCheck, Sparkles, UserPen } from "lucide-react";
import { LADDER, LADDER_LEVELS, ladderLevel, stageLabel, type LadderLevel, type ProcessResult } from "@/lib/engine";
import { cn } from "@/lib/utils";
import { maturityStyle } from "./maturity";

/** Level colour: the soft tint of the level a score sits on, with its ink for text. */
export function ladderStyle(score: number | null | undefined): React.CSSProperties {
  if (score === null || score === undefined || Number.isNaN(score)) return maturityStyle(null);
  const l = ladderLevel(score);
  return { background: `var(--level-${l}-soft)`, color: `var(--level-${l}-ink)` };
}

/** The strong hue of a level (bars, markers, the ladder's number circles). */
export const levelColor = (score: number | null | undefined) =>
  score === null || score === undefined ? "var(--muted-foreground)" : `var(--level-${ladderLevel(score)})`;

type Provenance = "ai" | "validated" | "plain";

/** "Stage 2" chip — always the number next to the colour. */
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
      aria-label={level === null ? "Not rated" : `Stage ${level} of 5, ${LADDER[level].short}`}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-md font-semibold tabular leading-none whitespace-nowrap",
        size === "sm" && "h-5 min-w-7 px-1.5 text-[11px]",
        size === "md" && "h-6 min-w-8 px-2 text-xs",
        size === "lg" && "h-10 min-w-12 px-3 text-lg",
        "ring-inset",
        provenance === "ai" && "ring-1 ring-ai/60 ring-offset-1 ring-offset-card",
        provenance === "validated" && "ring-1 ring-validated ring-offset-1 ring-offset-card",
        className,
      )}
      style={ladderStyle(level)}
    >
      {level === null ? "—" : stageLabel(level)}
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
 * The client's five maturity levels as cards: numbered circle, name, what it means, how it shows.
 * With processes, each sits on its level; the target level is marked.
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
      aria-label="Digital maturity levels, Stage 1 Initiated to Stage 5 Intelligent"
      className={cn("grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5 print:grid-cols-5", className)}
    >
      {LADDER_LEVELS.map((l) => {
        const here = processes?.filter((p) => p.level === l) ?? [];
        const isTarget = target === l;
        return (
          <li
            key={l}
            data-ladder-step
            className={cn(
              "relative flex flex-col items-center gap-2 rounded-xl border-[1.5px] bg-card px-3 pt-4 pb-3 text-center",
              isTarget && "ring-2 ring-foreground/70 ring-offset-2 ring-offset-background",
            )}
            style={{ borderColor: `var(--level-${l})`, background: l === 5 ? "var(--level-5-soft)" : undefined }}
          >
            {isTarget && (
              <span className="absolute top-2 right-2 rounded bg-foreground px-1.5 py-0.5 text-[10px] font-semibold text-background">Target</span>
            )}
            <span
              className="grid size-11 place-items-center rounded-full text-lg font-bold text-white tabular shadow-sm"
              style={{ background: `var(--level-${l})` }}
              aria-hidden
            >
              {l}
            </span>
            <p className="text-[15px] font-semibold">
              <span className="sr-only">{stageLabel(l)}: </span>
              {LADDER[l].name}
            </p>
            <p className="text-[12px] leading-snug text-muted-foreground">{LADDER[l].headline}</p>
            <span className="h-0.5 w-3/5 rounded" style={{ background: `var(--level-${l})` }} aria-hidden />
            <p className="text-[11px] leading-snug text-muted-foreground">{LADDER[l].meaning}</p>
            {withProcesses && (
              <ul className="mt-1 flex w-full flex-col gap-1 text-left" aria-label={`Processes at stage ${l}`}>
                {here.map((p) => (
                  <li key={p.id} className="flex items-center gap-1.5 rounded-md border bg-background px-2 py-1 text-[12px] leading-tight">
                    <StatusIcon status={p.status} />
                    <span className="min-w-0">{p.name}</span>
                  </li>
                ))}
                {!here.length && <li className="text-center text-[11px] text-muted-foreground">—</li>}
              </ul>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** Current → target on one 1–5 track: the gap at a glance. */
export function MaturitySlider({ current, target, className }: { current: number | null; target: number; className?: string }) {
  const pct = (v: number) => `${((Math.min(5, Math.max(1, v)) - 1) / 4) * 100}%`;
  const now = current ?? 1;
  return (
    <div
      role="img"
      aria-label={`Current maturity ${current === null ? "not rated" : now.toFixed(1)}, target ${target.toFixed(1)}, on the 1 to 5 scale`}
      className={cn("flex items-center gap-4", className)}
    >
      <p className="shrink-0 text-sm">
        <span className="text-muted-foreground">Current </span>
        <span className="font-semibold tabular">{current === null ? "—" : now.toFixed(1)}</span>
      </p>
      <div className="relative h-10 min-w-0 flex-1">
        <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-muted" />
        <div
          className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-gradient-to-r from-ai/30 to-ai"
          style={{ left: pct(Math.min(now, target)), width: `calc(${pct(1 + Math.abs(target - now))})` }}
        />
        {LADDER_LEVELS.map((l) => (
          <span key={l} className="absolute bottom-0 -translate-x-1/2 text-[10px] text-muted-foreground tabular" style={{ left: pct(l) }}>
            {l}
          </span>
        ))}
        <span
          className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ai bg-card shadow-sm"
          style={{ left: pct(now) }}
          aria-hidden
        />
        <span
          className="absolute top-1/2 h-5 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded bg-foreground"
          style={{ left: pct(target) }}
          aria-hidden
        />
      </div>
      <p className="shrink-0 text-sm">
        <span className="text-muted-foreground">Target </span>
        <span className="font-semibold tabular">{target.toFixed(1)}</span>
      </p>
    </div>
  );
}

import { AlertTriangle, ArrowDownUp, FileQuestion, Lock, ScanSearch } from "lucide-react";
import type { Flag, FlagKind } from "@/lib/schema";
import { formatScore } from "@/lib/engine/format";
import { EVIDENCE_CATEGORY_LABELS } from "@/lib/engine/config";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export const FLAG_META: Record<FlagKind, { label: string; icon: typeof AlertTriangle; tone: string }> = {
  LACKS_EVIDENCE: { label: "Not enough proof", icon: FileQuestion, tone: "text-conf-low" },
  INCONSISTENT: { label: "Sources disagree", icon: AlertTriangle, tone: "text-conf-med" },
  SELF_VARIANCE: { label: "Differs from the 2025 score", icon: ArrowDownUp, tone: "text-ai-foreground" },
  GATED: { label: "Held back by a missing basic", icon: Lock, tone: "text-muted-foreground" },
  LOW_COVERAGE: { label: "Some document types missing", icon: ScanSearch, tone: "text-muted-foreground" },
};

export function describeFlag(f: Flag): string {
  switch (f.kind) {
    case "LACKS_EVIDENCE":
      return f.reason;
    case "INCONSISTENT":
      return f.reason;
    case "SELF_VARIANCE":
      return `Himalaya rated this ${formatScore(f.self)} in 2025; the evidence points to ${formatScore(f.evidence)}`;
    case "GATED":
      return `Can't score above ${formatScore(f.cappedAt)} until there's proof of ${f.missingGate} — a level can't be claimed without the one below it`;
    case "LOW_COVERAGE":
      return `No ${f.missing.map((m) => EVIDENCE_CATEGORY_LABELS[m].toLowerCase()).join(", ")} for this function yet`;
  }
}

/** Dedupe flags by kind for compact display. */
export function uniqueFlags(flags: readonly Flag[]): Flag[] {
  const seen = new Set<FlagKind>();
  return flags.filter((f) => (seen.has(f.kind) ? false : (seen.add(f.kind), true)));
}

export function FlagIcons({ flags, className, max = 4 }: { flags: readonly Flag[]; className?: string; max?: number }) {
  const list = uniqueFlags(flags).slice(0, max);
  if (list.length === 0) return <span className="text-xs text-muted-foreground/60">—</span>;
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)}>
      {list.map((f) => {
        const m = FLAG_META[f.kind];
        return (
          <Tooltip key={f.kind}>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={(e) => e.stopPropagation()}
                aria-label={`${m.label}: ${describeFlag(f)}`}
                className={cn("inline-flex size-6 items-center justify-center rounded outline-none focus-visible:ring-2 focus-visible:ring-ring", m.tone)}
              >
                <m.icon className="size-3.5" aria-hidden />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <span className="font-medium">{m.label}.</span> {describeFlag(f)}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </span>
  );
}

export function FlagRow({ flag }: { flag: Flag }) {
  const m = FLAG_META[flag.kind];
  return (
    <div className="flex items-start gap-2.5 rounded-lg border bg-card px-3 py-2">
      <m.icon className={cn("mt-0.5 size-4 shrink-0", m.tone)} aria-hidden />
      <div className="min-w-0">
        <p className="text-[13px] font-medium">{m.label}</p>
        <p className="text-xs text-muted-foreground">{describeFlag(flag)}</p>
      </div>
    </div>
  );
}

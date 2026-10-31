"use client";
/** Plain-language helpers: page intros, "?" tips and the simple / detailed switch. */
import * as React from "react";
import { ChevronDown, HelpCircle, Lightbulb } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useSession } from "@/lib/store/session";
import { cn } from "@/lib/utils";

export const useDetailed = () => useSession((s) => s.view === "detailed");

/**
 * The first thing on every screen: what it shows, how it was worked out, what to do here.
 * "How this works" is folded away so the page stays calm.
 */
export function PageIntro({
  what,
  how,
  todo,
  className,
}: {
  what: React.ReactNode;
  how: React.ReactNode[];
  todo?: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <section aria-label="About this screen" className={cn("rounded-xl border bg-card px-5 py-4", className)}>
      <div className="flex gap-3">
        <Lightbulb className="mt-0.5 size-5 shrink-0 text-conf-med" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] leading-relaxed">{what}</p>
          {todo && <p className="mt-1.5 text-sm text-muted-foreground">{todo}</p>}
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="mt-2 inline-flex items-center gap-1 rounded text-[13px] font-medium text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
          >
            How this works
            <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} aria-hidden />
          </button>
          {open && (
            <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5 text-sm leading-relaxed text-muted-foreground">
              {how.map((h, i) => (
                <li key={i}>{h}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

/** A small "?" that explains a term. */
export function InfoTip({ children, label = "What does this mean?", className }: { children: React.ReactNode; label?: string; className?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          onClick={(e) => e.stopPropagation()}
          className={cn("inline-flex size-5 items-center justify-center rounded-full align-middle text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring", className)}
        >
          <HelpCircle className="size-3.5" aria-hidden />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-72 text-[12px] leading-relaxed">{children}</TooltipContent>
    </Tooltip>
  );
}

/** Wraps content that only appears in the detailed view. */
export function DetailOnly({ children }: { children: React.ReactNode }) {
  return useDetailed() ? <>{children}</> : null;
}

/** "Show more" footer used in simple view when content is trimmed. */
export function MoreInDetailed({ what }: { what: string }) {
  const setView = useSession((s) => s.setView);
  return (
    <p className="text-center text-[13px] text-muted-foreground">
      {what}{" "}
      <button type="button" onClick={() => setView("detailed")} className="font-medium text-primary hover:underline">
        Switch to detailed view
      </button>
    </p>
  );
}

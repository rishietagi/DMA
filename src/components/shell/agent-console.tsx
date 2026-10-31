"use client";
import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpen,
  CheckCircle2,
  CircleDashed,
  FileSearch,
  GitCompareArrows,
  ListChecks,
  Network,
  PenLine,
  Sigma,
  Sparkles,
  X,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/store/session";
import type { AgentRun, AgentStepKind } from "@/lib/store/types";
import { cn } from "@/lib/utils";

const KIND_ICON: Record<AgentStepKind, LucideIcon> = {
  plan: ListChecks,
  read: BookOpen,
  extract: FileSearch,
  map: Network,
  detect: GitCompareArrows,
  score: Sigma,
  draft: PenLine,
  check: CheckCircle2,
  narrate: Sparkles,
};

/** Streaming agent steps, rendered line by line. */
export function AgentTrace({ run, defaultOpen = true }: { run: AgentRun; defaultOpen?: boolean }) {
  const [open, setOpen] = React.useState(defaultOpen);
  const time = new Date(run.startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  return (
    <div className={cn("rounded-lg border bg-card", run.status === "running" && "ai-surface")}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-3 py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
      >
        {run.status === "running" ? (
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-ai opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-ai" />
          </span>
        ) : (
          <CheckCircle2 className={cn("size-3.5", run.status === "error" ? "text-destructive" : "text-validated")} aria-hidden />
        )}
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{run.title}</span>
        <span className="text-[11px] tabular text-muted-foreground">{time}</span>
      </button>
      {open && (
        <ol className="flex flex-col gap-1 border-t px-3 py-2" aria-live="polite">
          <AnimatePresence initial={false}>
            {run.steps.map((st) => {
              const Icon = KIND_ICON[st.kind];
              return (
                <motion.li
                  key={st.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex gap-2 py-0.5"
                >
                  {st.status === "running" ? (
                    <CircleDashed className="mt-0.5 size-3.5 shrink-0 animate-spin text-ai [animation-duration:2s]" aria-hidden />
                  ) : (
                    <Icon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                  )}
                  <div className="min-w-0 text-xs leading-relaxed">
                    <p className={cn(st.status === "running" ? "text-foreground" : "text-foreground/85")}>
                      {st.label}
                      {st.status === "running" && <span className="text-muted-foreground">…</span>}
                    </p>
                    {st.detail && st.status === "done" && <p className="text-muted-foreground">{st.detail}</p>}
                  </div>
                </motion.li>
              );
            })}
          </AnimatePresence>
          {run.summary && run.status !== "running" && (
            <motion.li initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-1 rounded-md bg-ai-soft px-2 py-1.5 text-xs text-ai-foreground">
              {run.summary}
            </motion.li>
          )}
        </ol>
      )}
    </div>
  );
}

export function AgentConsole() {
  const runs = useSession((s) => s.runs);
  const setOpen = useSession((s) => s.setAgentOpen);
  return (
    <motion.aside
      aria-label="Agent console"
      initial={{ x: 24, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 24, opacity: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="no-print fixed top-14 right-0 bottom-0 z-30 flex w-[360px] flex-col border-l bg-background shadow-2xl 2xl:static 2xl:z-auto 2xl:shadow-none"
    >
      <div className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
        <Sparkles className="size-4 text-ai" aria-hidden />
        <h2 className="text-sm font-semibold">Agent console</h2>
        <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">Simulated</span>
        <Button variant="ghost" size="icon-sm" className="ml-auto" onClick={() => setOpen(false)} aria-label="Close agent console">
          <X />
        </Button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3 scrollbar-thin">
        {runs.length === 0 ? (
          <div className="m-auto max-w-[240px] text-center">
            <Sparkles className="mx-auto mb-2 size-5 text-ai" aria-hidden />
            <p className="text-sm font-medium">No agent activity yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Steps stream here when you analyse evidence, run AI scoring or draft outputs.
            </p>
          </div>
        ) : (
          runs.map((r, i) => <AgentTrace key={r.id} run={r} defaultOpen={i < 2} />)
        )}
      </div>
      <p className="border-t px-4 py-2 text-[11px] text-muted-foreground">
        Deterministic engine behind an AI provider interface. No external model is called.
      </p>
    </motion.aside>
  );
}

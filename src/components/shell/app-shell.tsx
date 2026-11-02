"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/misc";
import { TourOverlay, useTour } from "@/components/tour/tour-provider";
import { useSession } from "@/lib/store/session";
import { AgentConsole } from "./agent-console";
import { STEPS } from "./nav";
import { TopBar } from "./top-bar";

const SHORTCUTS: { keys: string; label: string }[] = [
  { keys: "1–4", label: "Go to step 1–4" },
  { keys: ".", label: "Show or hide the agent console" },
  { keys: "T", label: "Toggle light / dark theme" },
  { keys: "?", label: "Show this list" },
  { keys: "Esc", label: "Close sheets and dialogs; pause the guided tour" },
];

function isTyping(e: KeyboardEvent) {
  const t = e.target as HTMLElement | null;
  return !!t && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName) || t.getAttribute("role") === "slider");
}

function PageSkeleton() {
  return (
    <div className="mx-auto max-w-[1200px] space-y-6 px-4 py-6 sm:px-6" aria-busy="true" aria-label="Loading session">
      <Skeleton className="h-8 w-72" />
      <Skeleton className="h-24" />
      <Skeleton className="h-64" />
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const hydrated = useSession((s) => s.hydrated);
  const agentOpen = useSession((s) => s.agentOpen);
  const [shortcutsOpen, setShortcutsOpen] = React.useState(false);
  const tour = useTour();

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e)) return;
      if (document.querySelector("[role=dialog]")) return;
      const step = /^[1-4]$/.test(e.key) ? STEPS[Number(e.key) - 1] : undefined;
      if (step) {
        e.preventDefault();
        router.push(step.href);
      } else if (e.key === ".") useSession.getState().setAgentOpen(!useSession.getState().agentOpen);
      else if (e.key === "t") setTheme(resolvedTheme === "dark" ? "light" : "dark");
      else if (e.key === "?") setShortcutsOpen(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, resolvedTheme, setTheme]);

  return (
    <div className="flex h-dvh flex-col overflow-hidden print:block print:h-auto print:overflow-visible">
      <a href="#main" className="sr-only z-50 rounded bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-2 focus:left-2">
        Skip to content
      </a>
      <TopBar onOpenShortcuts={() => setShortcutsOpen(true)} onStartTour={tour.start} />
      <div className="flex min-h-0 flex-1 print:block">
        <main id="main" tabIndex={-1} className="min-w-0 flex-1 overflow-y-auto outline-none scrollbar-thin print:overflow-visible">
          {hydrated ? children : <PageSkeleton />}
        </main>
        <AnimatePresence>{agentOpen && <AgentConsole key="agent" />}</AnimatePresence>
      </div>
      <TourOverlay />
      <Dialog open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Keyboard shortcuts</DialogTitle>
            <DialogDescription>Move through the four steps without the mouse.</DialogDescription>
          </DialogHeader>
          <dl className="divide-y text-sm">
            {SHORTCUTS.map((s) => (
              <div key={s.keys} className="flex items-center justify-between py-2">
                <dt className="text-muted-foreground">{s.label}</dt>
                <dd>
                  <kbd className="rounded border bg-muted px-1.5 py-0.5 text-xs font-medium">{s.keys}</kbd>
                </dd>
              </div>
            ))}
          </dl>
        </DialogContent>
      </Dialog>
    </div>
  );
}

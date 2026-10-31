"use client";
/**
 * "Run guided assessment": walks stages 2 → 9, narrating into the Agent Console, running the
 * real actions, and spotlighting the element under discussion. Pause / back / next / exit;
 * Esc pauses. `?tourSpeed=0.1` (or window.__TOUR_SPEED__) speeds it up for tests.
 */
import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Pause, Play, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setAgentSpeed } from "@/lib/ai/client";
import { useSession } from "@/lib/store/session";
import { cn } from "@/lib/utils";
import { TOUR_STEPS } from "./steps";

/** narration pace: ~9 s for a typical line → the full tour runs about three minutes */
const LINE_MS = 9000;
const MS_PER_CHAR = 45;
const RUN_ID = "tour";

interface TourState {
  active: boolean;
  index: number;
  paused: boolean;
  line: string;
  done: boolean;
}
interface TourCtx extends TourState {
  start: () => void;
  stop: () => void;
  togglePause: () => void;
  next: () => void;
  back: () => void;
}
const Ctx = React.createContext<TourCtx | null>(null);

function speedFromUrl(): number {
  if (typeof window === "undefined") return 1;
  const w = window as unknown as { __TOUR_SPEED__?: number };
  const q = new URLSearchParams(window.location.search).get("tourSpeed");
  return w.__TOUR_SPEED__ ?? (q ? Math.max(0.01, Number(q)) : 1);
}

export function TourProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = React.useState<TourState>({ active: false, index: 0, paused: false, line: "", done: false });
  const token = React.useRef(0);
  const paused = React.useRef(false);
  const speed = React.useRef(1);

  const wait = React.useCallback(async (ms: number, t: number) => {
    let left = ms * speed.current;
    while (left > 0) {
      if (token.current !== t) throw new Error("cancelled");
      await new Promise((r) => setTimeout(r, 100));
      if (!paused.current) left -= 100;
    }
    if (token.current !== t) throw new Error("cancelled");
  }, []);

  const say = React.useCallback(
    async (text: string, t: number) => {
      if (token.current !== t) throw new Error("cancelled");
      const s = useSession.getState();
      const id = `n${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
      // keep the narration run at the top of the console
      const run = s.runs.find((r) => r.id === RUN_ID);
      if (run) useSession.setState({ runs: [run, ...s.runs.filter((r) => r.id !== RUN_ID)] });
      s.pushStep(RUN_ID, { id, kind: "narrate", label: text, status: "running" });
      setState((st) => ({ ...st, line: text }));
      await wait(Math.min(LINE_MS, 1800 + text.length * MS_PER_CHAR), t);
      useSession.getState().completeStep(RUN_ID, id);
    },
    [wait],
  );

  const runFrom = React.useCallback(
    async (from: number) => {
      const t = ++token.current;
      try {
        for (let i = from; i < TOUR_STEPS.length; i++) {
          const step = TOUR_STEPS[i]!;
          setState((s) => ({ ...s, index: i, line: "" }));
          router.push(step.route);
          await wait(900, t);
          for (const l of step.intro()) await say(l, t);
          if (step.action) {
            await step.action();
            if (token.current !== t) return;
          }
          for (const l of step.outro?.() ?? []) await say(l, t);
          await wait(1200, t);
        }
        useSession.getState().finishRun(RUN_ID, "Guided assessment complete.");
        useSession.getState().setTourCompleted(true);
        setState((s) => ({ ...s, done: true, line: "Guided assessment complete. Explore any stage, or run it again from the top bar." }));
        setAgentSpeed(1);
      } catch {
        /* cancelled by next / back / exit */
      }
    },
    [router, say, wait],
  );

  const start = React.useCallback(() => {
    speed.current = speedFromUrl();
    setAgentSpeed(speed.current);
    paused.current = false;
    const s = useSession.getState();
    s.setAgentOpen(true);
    useSession.setState({ runs: s.runs.filter((r) => r.id !== RUN_ID) });
    s.startRun({ id: RUN_ID, task: "tour", title: "Guided assessment", startedAt: new Date().toISOString(), status: "running", steps: [] });
    setState({ active: true, index: 0, paused: false, line: "", done: false });
    void runFrom(0);
  }, [runFrom]);

  const stop = React.useCallback(() => {
    token.current++;
    paused.current = false;
    setAgentSpeed(1);
    const run = useSession.getState().runs.find((r) => r.id === RUN_ID);
    if (run?.status === "running") useSession.getState().finishRun(RUN_ID, "Guided assessment stopped.");
    setState((s) => ({ ...s, active: false, paused: false }));
  }, []);

  const togglePause = React.useCallback(() => {
    paused.current = !paused.current;
    setState((s) => ({ ...s, paused: paused.current }));
  }, []);

  const jump = React.useCallback(
    (to: number) => {
      paused.current = false;
      setState((s) => ({ ...s, paused: false, done: false }));
      void runFrom(Math.max(0, Math.min(TOUR_STEPS.length - 1, to)));
    },
    [runFrom],
  );

  React.useEffect(() => {
    if (!state.active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.querySelector("[role=dialog]")) {
        paused.current = true;
        setState((s) => ({ ...s, paused: true }));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state.active]);

  const value: TourCtx = {
    ...state,
    start,
    stop,
    togglePause,
    next: () => jump(state.index + 1),
    back: () => jump(state.index - 1),
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTour(): TourCtx {
  const c = React.useContext(Ctx);
  if (!c) throw new Error("useTour outside TourProvider");
  return c;
}

/** Ring around the element the narration is about. */
function Spotlight({ target }: { target?: string }) {
  const [rect, setRect] = React.useState<DOMRect | null>(null);
  const pathname = usePathname();
  React.useEffect(() => {
    if (!target) {
      setRect(null);
      return;
    }
    let raf = 0;
    let scrolled = false;
    const tick = () => {
      const el = document.querySelector<HTMLElement>(`[data-tour="${target}"]`);
      if (el) {
        if (!scrolled) {
          el.scrollIntoView({ block: "center", behavior: "smooth" });
          scrolled = true;
        }
        const card = el.closest<HTMLElement>("[data-slot=card], section, [data-slot=sheet-content] > div") ?? el;
        setRect(card.getBoundingClientRect());
      } else setRect(null);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, pathname]);
  if (!rect) return null;
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed z-[60] rounded-xl ring-2 ring-ai ring-offset-4 ring-offset-background transition-all duration-300 motion-safe:animate-pulse"
      style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
    />
  );
}

export function TourOverlay() {
  const t = useTour();
  const step = TOUR_STEPS[t.index];
  return (
    <AnimatePresence>
      {t.active && step && (
        <>
          {!t.done && <Spotlight target={step.target} />}
          <motion.div
            role="region"
            aria-label="Guided assessment"
            aria-live="polite"
            data-testid="tour-overlay"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="no-print pointer-events-auto fixed bottom-5 left-1/2 z-[70] w-[min(640px,calc(100vw-2rem))] -translate-x-1/2 rounded-2xl border bg-popover/95 p-4 shadow-2xl backdrop-blur"
          >
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-ai-soft px-1.5 py-0.5 text-[11px] font-medium text-ai-foreground tabular">
                {t.done ? "Complete" : `Stage ${step.stage} · ${t.index + 1} of ${TOUR_STEPS.length}`}
              </span>
              <p className="text-sm font-semibold" data-testid="tour-title">
                {t.done ? "Guided assessment complete" : step.title}
              </p>
              <div className="ml-auto flex items-center gap-1">
                <Button variant="ghost" size="icon-sm" onClick={t.back} disabled={t.index === 0} aria-label="Previous step">
                  <ChevronLeft />
                </Button>
                {!t.done && (
                  <Button variant="ghost" size="icon-sm" onClick={t.togglePause} aria-label={t.paused ? "Resume" : "Pause"}>
                    {t.paused ? <Play /> : <Pause />}
                  </Button>
                )}
                <Button variant="ghost" size="icon-sm" onClick={t.next} disabled={t.index >= TOUR_STEPS.length - 1} aria-label="Next step">
                  <ChevronRight />
                </Button>
                <Button variant="ghost" size="icon-sm" onClick={t.stop} aria-label="Exit guided assessment">
                  <X />
                </Button>
              </div>
            </div>
            <p className="mt-2 min-h-10 text-[13px] leading-relaxed text-foreground/90">{t.line || "…"}</p>
            <div className="mt-3 flex gap-1" aria-hidden>
              {TOUR_STEPS.map((s, i) => (
                <span key={i} className={cn("h-1 flex-1 rounded-full", i < t.index || t.done ? "bg-ai" : i === t.index ? "bg-ai/50" : "bg-muted")} />
              ))}
            </div>
            {t.paused && <p className="mt-2 text-[11px] text-muted-foreground">Paused — press play to continue.</p>}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check, Keyboard, Moon, PlayCircle, RotateCcw, Sparkles, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { resetDemo } from "@/lib/actions";
import { useSession } from "@/lib/store/session";
import { cn } from "@/lib/utils";
import { STEPS, stepFor } from "./nav";

function Stepper() {
  const pathname = usePathname();
  const current = stepFor(pathname).step;
  return (
    <nav aria-label="Assessment steps" className="min-w-0">
      <ol className="flex items-center gap-1">
        {STEPS.map((s, i) => {
          const active = s.step === current;
          const done = s.step < current;
          return (
            <li key={s.href} className="flex items-center gap-1">
              {i > 0 && <span aria-hidden className={cn("h-px w-2 sm:w-4", done || active ? "bg-primary/60" : "bg-border")} />}
              <Link
                href={s.href}
                aria-current={active ? "step" : undefined}
                title={s.label}
                className={cn(
                  "flex h-8 items-center gap-1.5 rounded-full px-1.5 text-[13px] whitespace-nowrap text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring sm:px-2.5",
                  active && "bg-card font-medium text-foreground shadow-xs ring-1 ring-border",
                )}
              >
                <span
                  className={cn(
                    "grid size-5 shrink-0 place-items-center rounded-full border text-[11px] font-semibold tabular",
                    active && "border-primary bg-primary text-primary-foreground",
                    done && "border-primary/60 text-primary",
                  )}
                >
                  <span className="sr-only">Step </span>
                  {done ? <Check className="size-3" aria-label={String(s.step)} /> : s.step}
                </span>
                <span className={cn("sr-only min-[1400px]:not-sr-only", active && "sm:not-sr-only")}>
                  <span className="whitespace-nowrap">{s.label}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function TopBar({ onOpenShortcuts, onStartTour }: { onOpenShortcuts: () => void; onStartTour: () => void }) {
  const { resolvedTheme, setTheme } = useTheme();
  const agentOpen = useSession((s) => s.agentOpen);
  const setAgentOpen = useSession((s) => s.setAgentOpen);
  const running = useSession((s) => s.runs.some((r) => r.status === "running"));

  return (
    <header className="no-print flex min-h-14 shrink-0 flex-wrap items-center gap-2 border-b bg-background/80 px-3 py-2 backdrop-blur sm:flex-nowrap sm:gap-3 sm:px-4 sm:py-0">
      <Link href="/" className="flex shrink-0 items-center gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <span className="grid size-7 place-items-center rounded-md bg-primary text-[11px] font-bold tracking-tight text-primary-foreground">
          DMA
        </span>
        <span className="hidden leading-tight xl:block">
          <span className="block text-[13px] font-semibold">Himalaya · Digital maturity</span>
          <span className="block text-[11px] text-muted-foreground">KPMG Digital Solutions</span>
        </span>
        <span className="sr-only xl:hidden">Himalaya · Digital maturity</span>
      </Link>

      <div className="order-last flex w-full justify-center sm:order-none sm:w-auto sm:min-w-0 sm:flex-1">
        <Stepper />
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-1 sm:ml-0">
        <span
          className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-ai/50 px-2.5 py-1 text-[11px] font-medium whitespace-nowrap text-ai-foreground"
          title="All AI behaviour is simulated by a deterministic engine. Demo data is illustrative."
        >
          <span className="size-1.5 rounded-full bg-ai" />
          <span className="hidden lg:inline">Demo mode · simulated AI</span>
          <span className="lg:hidden">Simulated AI</span>
        </span>

        <Button variant="ai" size="sm" onClick={onStartTour} data-testid="start-tour">
          <PlayCircle />
          <span className="sr-only sm:not-sr-only">Guided demo</span>
        </Button>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={agentOpen ? "secondary" : "ghost"}
              size="icon-sm"
              onClick={() => setAgentOpen(!agentOpen)}
              aria-label={agentOpen ? "Hide agent console" : "Show agent console"}
              aria-pressed={agentOpen}
              className="relative"
            >
              <Sparkles className={cn(running && "text-ai")} />
              {running && <span className="absolute top-1.5 right-1.5 size-1.5 animate-pulse rounded-full bg-ai" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Agent console (.)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" onClick={resetDemo} aria-label="Reset demo">
              <RotateCcw />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Reset demo</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" onClick={onOpenShortcuts} aria-label="Keyboard shortcuts" className="hidden sm:inline-flex">
              <Keyboard />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Keyboard shortcuts (?)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")} aria-label="Toggle theme">
              <Sun className="dark:hidden" />
              <Moon className="hidden dark:block" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Theme (T)</TooltipContent>
        </Tooltip>
      </div>
    </header>
  );
}

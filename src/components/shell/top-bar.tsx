"use client";
import { Check, ChevronDown, Command as CommandIcon, Keyboard, Moon, PlayCircle, Sparkles, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/overlays";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { seed } from "@/lib/seed";
import { useSession } from "@/lib/store/session";
import { cn } from "@/lib/utils";

export function TopBar({
  onOpenPalette,
  onOpenShortcuts,
  onStartTour,
}: {
  onOpenPalette: () => void;
  onOpenShortcuts: () => void;
  onStartTour: () => void;
}) {
  const { resolvedTheme, setTheme } = useTheme();
  const agentOpen = useSession((s) => s.agentOpen);
  const setAgentOpen = useSession((s) => s.setAgentOpen);
  const running = useSession((s) => s.runs.some((r) => r.status === "running"));

  return (
    <header className="no-print flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="-ml-2 gap-1.5 px-2 font-normal">
            <span className="font-semibold">Himalaya</span>
            <span className="text-muted-foreground/60">/</span>
            <span>CPD + Enterprise</span>
            <ChevronDown className="size-3.5 text-muted-foreground" />
            <span className="text-muted-foreground/60">/</span>
            <span className="text-muted-foreground">FY26 DMA</span>
            <span className="sr-only">— switch division</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-72">
          <DropdownMenuLabel>Divisions</DropdownMenuLabel>
          {seed.baseline.divisions.map((d) => (
            <DropdownMenuItem key={d.id} disabled={d.status !== "assessed"} className="justify-between">
              <span>{d.name}</span>
              {d.status === "assessed" ? (
                <Check className="size-4 text-primary" />
              ) : (
                <span className="text-[11px] text-muted-foreground">Not started</span>
              )}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <p className="px-2 py-1.5 text-[11px] text-muted-foreground">
            CPD plus 5 enterprise functions in scope. GP and AHP follow the same method.
          </p>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="ml-auto flex items-center gap-1.5">
        <span
          className="hidden items-center gap-1.5 rounded-full border border-dashed border-ai/50 px-2.5 py-1 text-[11px] font-medium text-ai-foreground md:inline-flex"
          title="All AI behaviour is simulated by a deterministic engine. Demo data is illustrative."
        >
          <span className="size-1.5 rounded-full bg-ai" />
          Demo mode · simulated AI
        </span>

        <Button variant="outline" size="sm" onClick={onOpenPalette} className="w-44 justify-start text-muted-foreground">
          <CommandIcon className="size-3.5" />
          <span className="flex-1 text-left">Search</span>
          <kbd className="rounded border bg-muted px-1 text-[10px] font-medium">Ctrl K</kbd>
        </Button>

        <Button variant="ai" size="sm" onClick={onStartTour} data-testid="start-tour">
          <PlayCircle />
          <span className="hidden lg:inline">Run guided assessment</span>
          <span className="lg:hidden">Guided</span>
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
            <Button variant="ghost" size="icon-sm" onClick={onOpenShortcuts} aria-label="Keyboard shortcuts">
              <Keyboard />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Keyboard shortcuts (?)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              aria-label="Toggle theme"
            >
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

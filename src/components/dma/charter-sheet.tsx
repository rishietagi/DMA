"use client";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useProcesses } from "@/components/providers/process-provider";
import type { ProcessIdea } from "@/lib/engine";
import { capabilityLabel } from "@/lib/labels";
import { charterFor } from "@/lib/portfolio";
import { capabilitiesForStep } from "@/lib/process-input";

function Box({ title, color, children, wide }: { title: string; color: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <section className={wide ? "sm:col-span-2" : undefined}>
      <div className="flex h-full gap-3 rounded-lg border-[1.5px] bg-card p-3" style={{ borderColor: color }}>
        <h3 className="w-28 shrink-0 text-[12px] font-semibold" style={{ color }}>
          {title}
        </h3>
        <div className="min-w-0 text-[12.5px] leading-relaxed">{children}</div>
      </div>
    </section>
  );
}

/** Output 6: a one-page initiative charter for sponsorship, funding and mobilization. */
export function CharterSheet({ idea, onOpenChange }: { idea: ProcessIdea | null; onOpenChange: (open: boolean) => void }) {
  const { result } = useProcesses();
  const process = idea ? result.processes.find((p) => p.id === idea.processId) : undefined;
  const fn = idea?.processId.split(":")[0];
  const c = idea
    ? charterFor(idea, process, {
        capabilities: fn ? capabilitiesForStep(fn as never, idea.processName).map(capabilityLabel) : [],
        dependsOnTitles: idea.dependsOn.map((d) => result.ideas.find((i) => i.id === d)?.title ?? d),
      })
    : null;

  return (
    <Sheet open={idea !== null} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-3xl" data-testid="charter-sheet">
        {c && idea && (
          <>
            <SheetHeader className="pr-12">
              <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Initiative charter · Illustrative</p>
              <div className="mt-1 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-foreground px-4 py-3 text-background">
                <SheetTitle className="text-lg text-background">{c.title}</SheetTitle>
                <span className="rounded-md px-2.5 py-1 text-[11px] font-bold tracking-wide uppercase" style={{ background: "var(--ai-accent)", color: "white" }}>
                  Horizon: {c.horizon}
                </span>
              </div>
              <SheetDescription>
                {idea.processName} · {idea.quadrant} · priority {Math.round(idea.priority)} · value {idea.value} · alignment {idea.alignment} · feasibility {idea.feasibility} · risk{" "}
                {idea.risk} · dependencies {idea.dependencies}
              </SheetDescription>
            </SheetHeader>
            <div className="grid gap-3 px-6 pb-6 sm:grid-cols-2">
              <Box title="Business problem" color="var(--level-3)">
                {c.problem}
              </Box>
              <Box title="Target outcome" color="var(--level-4)">
                {c.outcome}
              </Box>
              <Box title="Scope" color="var(--level-3)">
                {c.scope.join(" • ")}
              </Box>
              <Box title="Value hypothesis" color="var(--level-2)">
                {c.valueHypothesis}
              </Box>
              <Box title="Dependencies" color="var(--level-5)">
                {c.dependencies.length ? c.dependencies.join(" • ") : "None identified"}
              </Box>
              <Box title="Success measures" color="var(--level-1)">
                {c.successMeasures.join(" • ")}
              </Box>
              <Box title="First 90 days" color="var(--level-3)" wide>
                {c.first90.join(" | ")}
              </Box>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

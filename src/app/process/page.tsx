"use client";
import * as React from "react";
import Link from "next/link";
import { ArrowRight, Keyboard, Shuffle, Sparkles, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/overlays";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { HighlightedQuote } from "@/components/dma/capability-sheet";
import { MaturityChip } from "@/components/dma/maturity";
import { Page, PageHeader } from "@/components/dma/page-header";
import { runAgent } from "@/lib/ai/client";
import { capabilityLabel, FUNCTION_SHORT, functionName } from "@/lib/labels";
import { analyseFunctionProcess } from "@/lib/process-lens";
import { FUNCTION_IDS, type FunctionId } from "@/lib/schema";
import { useSession } from "@/lib/store/session";
import { cn } from "@/lib/utils";

export default function ProcessPage() {
  const evidence = useSession((s) => s.evidence);
  const responses = useSession((s) => s.responses);
  const [fn, setFn] = React.useState<FunctionId>("sales-ecom");

  const all = React.useMemo(() => FUNCTION_IDS.map((f) => analyseFunctionProcess(f, evidence, responses)), [evidence, responses]);
  const current = all.find((a) => a.functionId === fn)!;
  const maxIndex = Math.max(...all.map((a) => a.index), 1);
  const workarounds = current.steps.flatMap((s) => s.workarounds.map((w) => ({ step: s.step, w })));

  const analyse = () =>
    runAgent("process", {
      functionName: functionName(fn),
      workarounds: workarounds.length,
      handoffs: current.steps.reduce((a, s) => a + s.handoffs, 0),
      index: current.index.toFixed(2),
    });

  return (
    <Page>
      <PageHeader
        stage={4}
        title="Process lens"
        description="Each function’s L1 chain with the digitisation level, the systems touched at each step, and where people bridge systems by hand. Fragmentation = (systems touched + manual hand-offs) ÷ steps."
        actions={
          <>
            <Select value={fn} onValueChange={(v) => setFn(v as FunctionId)}>
              <SelectTrigger size="sm" className="w-60" aria-label="Function">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FUNCTION_IDS.map((f) => (
                  <SelectItem key={f} value={f}>
                    {functionName(f)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => void analyse()}>
              <Sparkles />
              Analyse process
            </Button>
          </>
        }
      />

      <Card>
        <CardHeader>
          <div className="flex items-baseline justify-between gap-3">
            <CardTitle>{functionName(fn)} — L1 process chain</CardTitle>
            <p className="text-xs text-muted-foreground">
              Fragmentation index <span className="text-base font-semibold text-foreground tabular">{current.index.toFixed(2)}</span>
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <ol className="flex items-stretch gap-0 overflow-x-auto pb-2" aria-label={`${functionName(fn)} process steps`}>
            {current.steps.map((s, i) => (
              <li key={s.step} className="flex min-w-[150px] flex-1 items-stretch">
                <div
                  className={cn(
                    "flex w-full flex-col gap-2.5 rounded-xl border bg-card p-3",
                    s.workarounds.length > 0 && "border-conf-low/50",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[10px] text-muted-foreground tabular">Step {i + 1}</p>
                      <p className="text-[13px] leading-tight font-semibold">{s.step}</p>
                    </div>
                    {s.level !== null ? (
                      <MaturityChip score={s.level} size="sm" label={`Digitisation ${s.level.toFixed(1)}`} />
                    ) : (
                      <span className="text-[11px] text-muted-foreground">n/a</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {s.systems.length ? (
                      s.systems.map((sys) => (
                        <span key={sys} className={cn("rounded border px-1.5 py-0.5 text-[11px]", sys === "Excel" && "border-conf-low/40 text-conf-low")}>
                          {sys}
                        </span>
                      ))
                    ) : (
                      <span className="text-[11px] text-muted-foreground">No system named</span>
                    )}
                  </div>
                  <div className="mt-auto flex flex-wrap gap-1.5 text-[11px]">
                    {s.workarounds.length > 0 && (
                      <span className="inline-flex items-center gap-1 rounded bg-conf-low/12 px-1.5 py-0.5 font-medium text-conf-low">
                        <Wrench className="size-3" aria-hidden />
                        {s.workarounds.length} manual workaround{s.workarounds.length > 1 ? "s" : ""}
                      </span>
                    )}
                    {s.handoffs > 0 && (
                      <span className="inline-flex items-center gap-1 rounded bg-conf-med/15 px-1.5 py-0.5">
                        <Shuffle className="size-3" aria-hidden />
                        {s.handoffs} hand-off{s.handoffs > 1 ? "s" : ""}
                      </span>
                    )}
                    {s.reentry > 0 && (
                      <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5">
                        <Keyboard className="size-3" aria-hidden />
                        re-entry
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1 border-t pt-2">
                    {s.capabilityIds
                      .filter((c) => c !== "*")
                      .map((c) => (
                        <Link key={c} href={`/scoring?cap=${c}&dim=process`} className="text-[11px] text-muted-foreground hover:text-foreground hover:underline">
                          {capabilityLabel(c)}
                        </Link>
                      ))}
                  </div>
                </div>
                {i < current.steps.length - 1 && (
                  <span className="flex w-5 shrink-0 items-center justify-center text-muted-foreground/50" aria-hidden>
                    <ArrowRight className="size-4" />
                  </span>
                )}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle data-tour="workarounds">Manual workarounds</CardTitle>
            <CardDescription>Statements where a manual step sits next to a named system — the places automation pays back first.</CardDescription>
          </CardHeader>
          <CardContent className="pt-3">
            {workarounds.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                None found for {FUNCTION_SHORT[fn]} yet. Load evidence or pick another function.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {workarounds.map(({ step, w }) => (
                  <li key={w.id} className="rounded-lg border p-3">
                    <p className="text-[13px] leading-relaxed">
                      “<HighlightedQuote text={w.quote} cues={w.cues} />”
                    </p>
                    <p className="mt-1.5 text-[11px] text-muted-foreground">
                      {step} · {w.stakeholder ?? w.docTitle}, {w.location}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Fragmentation across functions</CardTitle>
            <CardDescription>Higher means more systems and hand-offs per process step.</CardDescription>
          </CardHeader>
          <CardContent className="pt-3">
            <ul className="flex flex-col gap-1.5">
              {[...all]
                .sort((a, b) => b.index - a.index)
                .map((a) => (
                  <li key={a.functionId}>
                    <button
                      type="button"
                      onClick={() => setFn(a.functionId)}
                      className={cn(
                        "grid w-full grid-cols-[96px_1fr_40px] items-center gap-3 rounded-md px-1 py-1 text-left outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring",
                        a.functionId === fn && "bg-accent",
                      )}
                      aria-pressed={a.functionId === fn}
                    >
                      <span className="truncate text-[13px]">{FUNCTION_SHORT[a.functionId]}</span>
                      <span className="h-2 rounded-full bg-muted">
                        <span className="block h-2 rounded-full bg-[var(--maturity-4)]" style={{ width: `${(a.index / maxIndex) * 100}%` }} />
                      </span>
                      <span className="text-right text-xs tabular">{a.index.toFixed(2)}</span>
                    </button>
                  </li>
                ))}
            </ul>
            <Tooltip>
              <TooltipTrigger asChild>
                <p tabIndex={0} className="mt-3 w-fit text-[11px] text-muted-foreground underline decoration-dotted">
                  How is this calculated?
                </p>
              </TooltipTrigger>
              <TooltipContent className="max-w-72">
                Systems named in evidence for each step, plus manual workarounds (a manual cue next to a system name) and hand-offs (two systems in one
                statement), divided by the number of L1 steps.
              </TooltipContent>
            </Tooltip>
          </CardContent>
        </Card>
      </div>
    </Page>
  );
}

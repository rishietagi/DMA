"use client";
import * as React from "react";
import Link from "next/link";
import { ArrowRight, Keyboard, Shuffle, Sparkles, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/overlays";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { HighlightedQuote } from "@/components/dma/capability-sheet";
import { MaturityChip } from "@/components/dma/maturity";
import { Page, PageHeader } from "@/components/dma/page-header";
import { DetailOnly, InfoTip, PageIntro, useDetailed } from "@/components/dma/explain";
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
  const detailed = useDetailed();

  const all = React.useMemo(
    () => FUNCTION_IDS.map((f) => analyseFunctionProcess(f, evidence, responses)),
    [evidence, responses],
  );
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

      <PageIntro
        what="Each team’s process, step by step, showing how digital each step is and where people fix gaps by hand."
        todo="Pick a team at the top right. Red boxes are steps with manual workarounds — usually the best places to automate first."
        how={[
          "The steps come from each team’s questionnaire. The number on a step is the average level of the answers and documents for that step.",
          "System names (SAP, Excel, seller portal…) mentioned in the evidence for a step are listed on it.",
          "A “manual workaround” is a sentence where a manual cue sits next to a system — e.g. “downloaded from the seller portal and keyed into SAP”.",
          "A “hand-off” is a sentence that moves work between two systems.",
        ]}
      />

      <Card>
        <CardHeader>
          <div className="flex items-baseline justify-between gap-3">
            <CardTitle>{functionName(fn)} — L1 process chain</CardTitle>
            <p className="text-muted-foreground text-xs">
              Hand-off score{" "}
              <InfoTip>
                Systems touched plus manual hand-offs, divided by the number of steps. Higher means
                more jumping between systems and more work done by hand to bridge them.
              </InfoTip>{" "}
              <span className="text-foreground tabular text-base font-semibold">
                {current.index.toFixed(2)}
              </span>
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <ol
            className="flex items-stretch gap-0 overflow-x-auto pb-2"
            aria-label={`${functionName(fn)} process steps`}
          >
            {current.steps.map((s, i) => (
              <li key={s.step} className="flex min-w-[150px] flex-1 items-stretch">
                <div
                  className={cn(
                    "bg-card flex w-full flex-col gap-2.5 rounded-xl border p-3",
                    s.workarounds.length > 0 && "border-conf-low/50",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-muted-foreground tabular text-[10px]">Step {i + 1}</p>
                      <p className="text-[13px] leading-tight font-semibold">{s.step}</p>
                    </div>
                    {s.level !== null ? (
                      <MaturityChip
                        score={s.level}
                        size="sm"
                        label={`Digitisation ${s.level.toFixed(1)}`}
                      />
                    ) : (
                      <span className="text-muted-foreground text-[11px]">n/a</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {s.systems.length ? (
                      s.systems.map((sys) => (
                        <span
                          key={sys}
                          className={cn(
                            "rounded border px-1.5 py-0.5 text-[11px]",
                            sys === "Excel" && "border-conf-low/40 text-conf-low",
                          )}
                        >
                          {sys}
                        </span>
                      ))
                    ) : (
                      <span className="text-muted-foreground text-[11px]">No system named</span>
                    )}
                  </div>
                  <div className="mt-auto flex flex-wrap gap-1.5 text-[11px]">
                    {s.workarounds.length > 0 && (
                      <span className="bg-conf-low/12 text-conf-low inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-medium">
                        <Wrench className="size-3" aria-hidden />
                        {s.workarounds.length} manual workaround
                        {s.workarounds.length > 1 ? "s" : ""}
                      </span>
                    )}
                    {s.handoffs > 0 && (
                      <span className="bg-conf-med/15 inline-flex items-center gap-1 rounded px-1.5 py-0.5">
                        <Shuffle className="size-3" aria-hidden />
                        {s.handoffs} hand-off{s.handoffs > 1 ? "s" : ""}
                      </span>
                    )}
                    {s.reentry > 0 && (
                      <span className="bg-muted inline-flex items-center gap-1 rounded px-1.5 py-0.5">
                        <Keyboard className="size-3" aria-hidden />
                        re-entry
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1 border-t pt-2">
                    {s.capabilityIds
                      .filter((c) => c !== "*")
                      .map((c) => (
                        <Link
                          key={c}
                          href={`/scoring?cap=${c}&dim=process`}
                          className="text-muted-foreground hover:text-foreground text-[11px] hover:underline"
                        >
                          {capabilityLabel(c)}
                        </Link>
                      ))}
                  </div>
                </div>
                {i < current.steps.length - 1 && (
                  <span
                    className="text-muted-foreground/50 flex w-5 shrink-0 items-center justify-center"
                    aria-hidden
                  >
                    <ArrowRight className="size-4" />
                  </span>
                )}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <div className={cn("grid gap-6", detailed && "lg:grid-cols-[1.3fr_1fr]")}>
        <Card>
          <CardHeader>
            <CardTitle data-tour="workarounds">Manual workarounds</CardTitle>
            <CardDescription>
              Statements where a manual step sits next to a named system — the places automation
              pays back first.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-3">
            {workarounds.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                None found for {FUNCTION_SHORT[fn]} yet. Load evidence or pick another function.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {workarounds.map(({ step, w }) => (
                  <li key={w.id} className="rounded-lg border p-3">
                    <p className="text-[13px] leading-relaxed">
                      “<HighlightedQuote text={w.quote} cues={w.cues} />”
                    </p>
                    <p className="text-muted-foreground mt-1.5 text-[11px]">
                      {step} · {w.stakeholder ?? w.docTitle}, {w.location}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <DetailOnly>
          <Card>
            <CardHeader>
              <CardTitle>Hand-off score by team</CardTitle>
              <CardDescription>
                Higher means more systems and hand-offs per process step.
              </CardDescription>
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
                          "hover:bg-accent focus-visible:ring-ring grid w-full grid-cols-[96px_1fr_40px] items-center gap-3 rounded-md px-1 py-1 text-left outline-none focus-visible:ring-2",
                          a.functionId === fn && "bg-accent",
                        )}
                        aria-pressed={a.functionId === fn}
                      >
                        <span className="truncate text-[13px]">{FUNCTION_SHORT[a.functionId]}</span>
                        <span className="bg-muted h-2 rounded-full">
                          <span
                            className="block h-2 rounded-full bg-[var(--maturity-4)]"
                            style={{ width: `${(a.index / maxIndex) * 100}%` }}
                          />
                        </span>
                        <span className="tabular text-right text-xs">{a.index.toFixed(2)}</span>
                      </button>
                    </li>
                  ))}
              </ul>
              <Tooltip>
                <TooltipTrigger asChild>
                  <p
                    tabIndex={0}
                    className="text-muted-foreground mt-3 w-fit text-[11px] underline decoration-dotted"
                  >
                    How is this calculated?
                  </p>
                </TooltipTrigger>
                <TooltipContent className="max-w-72">
                  Systems named in evidence for each step, plus manual workarounds (a manual cue
                  next to a system name) and hand-offs (two systems in one statement), divided by
                  the number of L1 steps.
                </TooltipContent>
              </Tooltip>
            </CardContent>
          </Card>
        </DetailOnly>
      </div>
    </Page>
  );
}

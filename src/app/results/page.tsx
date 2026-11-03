"use client";
import * as React from "react";
import { AlertTriangle, Printer, ShieldCheck, Sparkles, Target, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DiagnosticTable } from "@/components/dma/area-heatmap";
import { FunctionCompare, SelfVsToday } from "@/components/dma/charts";
import { IdeaMatrix } from "@/components/dma/idea-matrix";
import { MaturitySlider } from "@/components/dma/ladder";
import { Page, PageHeader } from "@/components/dma/page-header";
import { ProcessRoadmap } from "@/components/dma/process-roadmap";
import { useProcesses } from "@/components/providers/process-provider";
import { StepNav } from "@/components/shell/step-nav";
import { type ProcessIdea } from "@/lib/engine";
import { functionName } from "@/lib/labels";
import { processInsights } from "@/lib/narrative";
import { processAreas } from "@/lib/process-areas";
import { cn } from "@/lib/utils";

const EFFORT: Record<ProcessIdea["effort"], string> = { S: "Small", M: "Medium", L: "Large" };

const INSIGHT_ICON = { strength: ThumbsUp, gap: AlertTriangle, priority: Target } as const;
const INSIGHT_TONE = { strength: "text-validated", gap: "text-conf-low", priority: "text-ai" } as const;

function Headline() {
  const { result } = useProcesses();
  const ai = result.processes.length - result.validated;
  const scored = result.processes.filter((p) => p.gap !== null);
  const avgGap = scored.length ? scored.reduce((a, p) => a + p.gap!, 0) / scored.length : 0;
  const insights = processInsights(result);
  const fn = functionName(result.functionId);
  const strip = [
    { label: "Current maturity", value: result.overall === null ? "—" : result.overall.toFixed(1) },
    { label: "Target", value: String(result.target) },
    { label: "Avg. gap", value: avgGap.toFixed(1) },
    { label: "Below target", value: `${scored.filter((p) => p.gap! > 0).length}/${scored.length}` },
  ];
  return (
    <Card data-tour="headline" data-testid="headline" className="print-avoid">
      <CardContent className="flex flex-col gap-5 py-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xl font-semibold tracking-tight">
              {fn} <span className="text-muted-foreground" aria-hidden>|</span> Current maturity{" "}
              <span className="tabular">{result.overall === null ? "—" : result.overall.toFixed(1)}</span> → Target{" "}
              <span className="tabular">{result.target.toFixed(1)}</span>
            </p>
            <p className="mt-0.5 text-[13px] text-muted-foreground">Evidence-backed assessment across process, people and data</p>
          </div>
          <p className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
            {ai === 0 ? <ShieldCheck className="size-4 text-validated" aria-hidden /> : <Sparkles className="size-4 text-ai" aria-hidden />}
            {ai === 0 ? "All levels reviewed" : `${result.validated} reviewed · ${ai} still AI suggested`}
          </p>
        </div>

        <dl className="flex flex-wrap items-baseline gap-x-2 gap-y-1 border-y py-2.5 text-[13px]">
          {strip.map((s, i) => (
            <div key={s.label} className="flex items-baseline gap-1.5">
              {i > 0 && <span className="mr-1 text-muted-foreground" aria-hidden>|</span>}
              <dd className="text-lg font-semibold tabular">{s.value}</dd>
              <dt className="text-muted-foreground">{s.label}</dt>
            </div>
          ))}
        </dl>

        <MaturitySlider current={result.overall} target={result.target} />

        {insights.length > 0 && (
          <div className="ai-surface rounded-xl p-4">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-ai-foreground">
              <Sparkles className="size-3.5" aria-hidden />
              AI generated insights
            </p>
            <ul className="flex flex-col gap-1.5 text-[13px]" aria-label="AI generated insights">
              {insights.map((x) => {
                const Icon = INSIGHT_ICON[x.kind];
                return (
                  <li key={x.kind} className="flex items-start gap-2">
                    <Icon className={cn("mt-0.5 size-4 shrink-0", INSIGHT_TONE[x.kind])} aria-hidden />
                    <span>
                      <span className="font-semibold">{x.label}:</span> {x.text}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function IdeaDetail({ idea }: { idea: ProcessIdea | undefined }) {
  if (!idea) return <p className="text-sm text-muted-foreground">Pick a bubble to see the idea.</p>;
  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-[15px] font-semibold">{idea.title}</p>
        <p className="text-[12px] text-muted-foreground">
          {idea.processName} · {idea.phase} · {idea.quadrant}
        </p>
      </div>
      <p className="text-[13px] leading-relaxed">{idea.description}</p>
      <dl className="grid grid-cols-4 gap-2 text-center">
        {(
          [
            ["Priority", Math.round(idea.priority)],
            ["Value", idea.value],
            ["Ease", idea.feasibility],
            ["Risk", idea.risk],
          ] as const
        ).map(([k, v]) => (
          <div key={k} className="rounded-md bg-muted/50 py-2">
            <dt className="text-[10px] text-muted-foreground">{k}</dt>
            <dd className="text-lg font-semibold tabular">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="text-[12px]">
        <span className="text-muted-foreground">How AI helps: </span>
        {idea.aiPattern}
      </p>
      <p className="text-[12px]">
        <span className="text-muted-foreground">Moves: </span>
        {idea.kpis.join(" · ")}
      </p>
      <p className="text-[12px]">
        <span className="text-muted-foreground">Effort: </span>
        {EFFORT[idea.effort]} · closes a {idea.gap}-stage gap
      </p>
    </div>
  );
}

export default function ResultsPage() {
  const { result, input, caps, all } = useProcesses();
  const [selected, setSelected] = React.useState<string | null>(null);
  const idea = result.ideas.find((i) => i.id === (selected ?? result.ideas[0]?.id));
  const areas = React.useMemo(() => processAreas(input.processes, caps), [input.processes, caps]);
  const fn = functionName(result.functionId);

  return (
    <Page className="print:max-w-none print:gap-4 print:p-0">
      <PageHeader
        stage={4}
        title="Prioritize & Roadmap"
        actions={
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer />
            Print or save as PDF
          </Button>
        }
      />
      <Headline />

      <Card className="print-avoid">
        <CardHeader>
          <CardTitle>Diagnostic table</CardTitle>
        </CardHeader>
        <CardContent className="pt-1">
          <DiagnosticTable processes={result.processes} areas={areas} />
        </CardContent>
      </Card>

      <Card className="print-avoid">
        <CardHeader>
          <CardTitle>2025 self assessment compared with our findings</CardTitle>
        </CardHeader>
        <CardContent>
          <SelfVsToday processes={result.processes} />
        </CardContent>
      </Card>

      <Card data-tour="ideas" className="print-break">
        <CardHeader>
          <CardTitle>Ideas to close the gaps</CardTitle>
          <p className="text-[13px] text-muted-foreground">Each idea is matched to a process gap and placed by value and ease. Bubble size = gap; number = priority.</p>
        </CardHeader>
        <CardContent>
          {result.ideas.length ? (
            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] [&>*]:min-w-0">
              <IdeaMatrix ideas={result.ideas} selected={idea?.id} onSelect={setSelected} />
              <IdeaDetail idea={idea} />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No gaps to close at this target.</p>
          )}
        </CardContent>
      </Card>

      <Card data-tour="roadmap">
        <CardHeader>
          <CardTitle>Roadmap</CardTitle>
          <p className="text-[13px] text-muted-foreground">
            What the 2026-27 plan already covers, gaps with nothing planned, and the ideas phased Now / Next / Later. Arrows show what has to come first.
          </p>
        </CardHeader>
        <CardContent>
          <ProcessRoadmap processes={result.processes} ideas={result.ideas} selected={selected} onSelect={setSelected} />
        </CardContent>
      </Card>

      <Card className="print-avoid">
        <CardHeader>
          <CardTitle>How {fn} compares</CardTitle>
          <p className="text-[13px] text-muted-foreground">Every function scored the same way from the same documents. Functions with fewer documents lean on their 2025 self-assessment.</p>
        </CardHeader>
        <CardContent>
          <FunctionCompare all={all} current={result.functionId} target={result.target} />
        </CardContent>
      </Card>

      <p className="text-[11px] text-muted-foreground">
        Illustrative data · simulated AI · levels on the 0–5 digital maturity ladder. Every level traces to its sources in step 3.
      </p>
      <StepNav step={4} />
    </Page>
  );
}

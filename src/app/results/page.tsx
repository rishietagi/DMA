"use client";
import * as React from "react";
import { Printer, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaHeatmap } from "@/components/dma/area-heatmap";
import { FunctionCompare, ProcessRadar, SelfVsToday } from "@/components/dma/charts";
import { IdeaMatrix } from "@/components/dma/idea-matrix";
import { KpiStrip } from "@/components/dma/kpi-strip";
import { LadderChart, LevelChip } from "@/components/dma/ladder";
import { Page, PageHeader } from "@/components/dma/page-header";
import { ProcessRoadmap } from "@/components/dma/process-roadmap";
import { useProcesses } from "@/components/providers/process-provider";
import { StepNav } from "@/components/shell/step-nav";
import { LADDER, type ProcessIdea } from "@/lib/engine";
import { ALIGNMENT_LABEL, functionName } from "@/lib/labels";
import { processNarrative } from "@/lib/narrative";
import { processAreas } from "@/lib/process-areas";
import { cn } from "@/lib/utils";

const EFFORT: Record<ProcessIdea["effort"], string> = { S: "Small", M: "Medium", L: "Large" };

function Headline() {
  const { result } = useProcesses();
  const ai = result.processes.length - result.validated;
  const lines = processNarrative(result, functionName(result.functionId));
  return (
    <Card data-tour="headline" data-testid="headline" className="print-avoid">
      <CardContent className="flex flex-col gap-4 py-5 md:flex-row">
        <LevelChip score={result.overall} size="lg" className="self-start" />
        <div className="min-w-0 flex-1">
          <p className="text-xl font-semibold tracking-tight">
            {result.overallLevel === null
              ? `${functionName(result.functionId)} can't be rated yet`
              : `${functionName(result.functionId)} is at Level ${result.overallLevel} · ${LADDER[result.overallLevel].name}`}
          </p>
          <ul className="mt-2 flex flex-col gap-1 text-[13px] leading-relaxed text-muted-foreground" aria-label="Executive summary">
            {lines.slice(1).map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </div>
        <p className="flex shrink-0 items-center gap-1.5 self-start text-xs text-muted-foreground">
          {ai === 0 ? <ShieldCheck className="size-4 text-validated" aria-hidden /> : <Sparkles className="size-4 text-ai" aria-hidden />}
          {ai === 0 ? "All levels reviewed" : `${result.validated} reviewed · ${ai} still AI suggested`}
        </p>
      </CardContent>
    </Card>
  );
}

function GapTable() {
  const { result } = useProcesses();
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-[13px]">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th scope="col" className="py-2 font-medium">Process</th>
            <th scope="col" className="py-2 font-medium">2025</th>
            <th scope="col" className="py-2 font-medium">Today</th>
            <th scope="col" className="py-2 font-medium">Target</th>
            <th scope="col" className="py-2 font-medium">Roadmap</th>
            <th scope="col" className="py-2 text-right font-medium">Gap</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {result.processes.map((p) => (
            <tr key={p.id}>
              <th scope="row" className="py-2 pr-2 text-left font-medium">{p.name}</th>
              <td className="py-2">
                <LevelChip score={p.self} size="sm" />
              </td>
              <td className="py-2">
                <LevelChip score={p.effective} size="sm" provenance={p.status === "suggested" ? "ai" : "validated"} />
              </td>
              <td className="py-2">
                <LevelChip score={result.target} size="sm" />
              </td>
              <td className={cn("py-2 text-[12px]", p.alignment === "WHITESPACE" && "font-medium text-whitespace")}>
                {p.alignment === null ? "—" : p.alignment === "WHITESPACE" ? "Nothing planned" : ALIGNMENT_LABEL[p.alignment]}
              </td>
              <td className={cn("py-2 text-right font-semibold tabular", (p.gap ?? 0) >= 2 && "text-conf-low")}>
                {p.gap === null ? "—" : p.gap === 0 ? "On target" : `${p.gap} ${p.gap === 1 ? "level" : "levels"}`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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
        {EFFORT[idea.effort]} · closes a {idea.gap}-level gap
      </p>
    </div>
  );
}

export default function ResultsPage() {
  const { result, input, caps, all } = useProcesses();
  const [selected, setSelected] = React.useState<string | null>(null);
  const idea = result.ideas.find((i) => i.id === (selected ?? result.ideas[0]?.id));
  const areas = React.useMemo(() => processAreas(input.processes, caps), [input.processes, caps]);
  const scored = result.processes.filter((p) => p.gap !== null);
  const avgGap = scored.length ? scored.reduce((a, p) => a + p.gap!, 0) / scored.length : 0;
  const fn = functionName(result.functionId);

  return (
    <Page className="print:max-w-none print:gap-4 print:p-0">
      <PageHeader
        stage={4}
        title="Results"
        description={<span className="print:hidden">The final picture: where each process sits, how far it is from target, and what to do about it.</span>}
        actions={
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer />
            Print or save as PDF
          </Button>
        }
      />
      <Headline />

      <KpiStrip
        className="print-avoid"
        stats={[
          { label: "Overall level", value: result.overall ?? 0, format: (n) => `L${n.toFixed(1)}`, note: result.overallLevel === null ? "—" : LADDER[result.overallLevel].short, tone: "ai" },
          { label: "Target", value: result.target, format: (n) => `L${Math.round(n)}`, note: LADDER[result.target].short },
          { label: "Average gap", value: avgGap, format: (n) => `${n.toFixed(1)} lvl`, tone: avgGap >= 1.5 ? "warn" : "default" },
          { label: "Below target", value: scored.filter((p) => p.gap! > 0).length, format: (n) => `${Math.round(n)} / ${scored.length}` },
          {
            label: "Change vs 2025",
            value: result.self === null || result.overall === null ? 0 : result.overall - result.self,
            format: (n) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n).toFixed(1)}`,
            note: result.self === null ? "No 2025 score" : `2025 was L${result.self.toFixed(1)}`,
          },
          { label: "Ideas", value: result.ideas.length, format: (n) => String(Math.round(n)), note: `${result.ideas.filter((i) => i.phase === "Now").length} to start now` },
          { label: "Reviewed", value: result.processes.length ? result.validated / result.processes.length : 0, format: (n) => `${Math.round(n * 100)}%` },
        ]}
      />

      <Card className="print-avoid">
        <CardHeader>
          <CardTitle>{fn} on the maturity ladder</CardTitle>
          <p className="text-[13px] text-muted-foreground">Each process on its level. The outlined step is the target.</p>
        </CardHeader>
        <CardContent>
          <LadderChart processes={result.processes} target={result.target} />
        </CardContent>
      </Card>

      <div className="grid items-start gap-6 lg:grid-cols-2 [&>*]:min-w-0">
        <Card className="print-avoid">
          <CardHeader>
            <CardTitle>Today vs target vs 2025</CardTitle>
            <p className="text-[13px] text-muted-foreground">The bigger the gap between the blue shape and the dashed ring, the more work there is.</p>
          </CardHeader>
          <CardContent>
            <ProcessRadar processes={result.processes} target={result.target} />
          </CardContent>
        </Card>
        <Card className="print-avoid">
          <CardHeader>
            <CardTitle>What the 2025 self-assessment said vs what we found</CardTitle>
            <p className="text-[13px] text-muted-foreground">Processes with no 2025 bar had no matching capability in the self-assessment.</p>
          </CardHeader>
          <CardContent>
            <SelfVsToday processes={result.processes} />
          </CardContent>
        </Card>
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-2 [&>*]:min-w-0">
        <Card className="print-avoid">
          <CardHeader>
            <CardTitle>Process by process</CardTitle>
          </CardHeader>
          <CardContent className="pt-1">
            <GapTable />
          </CardContent>
        </Card>
        <Card className="print-avoid">
          <CardHeader>
            <CardTitle>Strengths and gaps by area</CardTitle>
            <p className="text-[13px] text-muted-foreground">Process, data, AI and people scored separately, on the same ladder.</p>
          </CardHeader>
          <CardContent className="pt-1">
            <AreaHeatmap processes={result.processes} areas={areas} />
          </CardContent>
        </Card>
      </div>

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

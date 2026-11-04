"use client";
import * as React from "react";
import { Download, FileText, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DiagnosticTable } from "@/components/dma/area-heatmap";
import { CharterSheet } from "@/components/dma/charter-sheet";
import { FunctionCompare, SelfVsToday } from "@/components/dma/charts";
import { IdeaMatrix, ScoringCriteria, SCORING_CRITERIA } from "@/components/dma/idea-matrix";
import { MaturitySlider } from "@/components/dma/ladder";
import { Page, PageHeader } from "@/components/dma/page-header";
import {
  GovernanceDashboard,
  LayerRoadmap,
  MaturityByProcess,
  OpportunityPortfolio,
  PortfolioMatrix,
  ScopeToggle,
  storyStats,
} from "@/components/dma/portfolio";
import { ProcessRoadmap } from "@/components/dma/process-roadmap";
import { useProcesses } from "@/components/providers/process-provider";
import { StepNav } from "@/components/shell/step-nav";
import { type ProcessIdea } from "@/lib/engine";
import { FUNCTION_SHORT, functionName } from "@/lib/labels";
import { governance, leadershipNarrative, PHASE_LABEL, PHASE_MONTHS, portfolioIdeas, priorityThemes } from "@/lib/portfolio";
import { processAreas } from "@/lib/process-areas";
import { exportReportPdf } from "@/lib/report/export-pdf";
import { seed } from "@/lib/seed";
import { useSession } from "@/lib/store/session";

const EFFORT: Record<ProcessIdea["effort"], string> = { S: "Small", M: "Medium", L: "Large" };
const NARRATIVE_COLOR = ["var(--level-3)", "var(--level-4)", "var(--ai-accent)", "var(--level-2)"];

/** Output 1: executive maturity story — headline, four numbers, current → target. */
function Headline() {
  const { result } = useProcesses();
  const ai = result.processes.length - result.validated;
  const fn = functionName(result.functionId);
  const stats = storyStats(result, priorityThemes(result.ideas).length);
  return (
    <Card data-tour="headline" data-testid="headline" className="print-avoid">
      <CardContent className="flex flex-col gap-5 py-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xl font-semibold tracking-tight">
              {fn} <span className="text-muted-foreground" aria-hidden>|</span> Current maturity{" "}
              <span className="tabular">{result.overall === null ? "—" : result.overall.toFixed(1)}</span> → Target{" "}
              <span className="tabular">{result.targetMean.toFixed(1)}</span>
            </p>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              Leadership summary of current maturity, target ambition and the most material gaps, across process, data, tech &amp; AI and people.
            </p>
          </div>
          <p className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
            {ai === 0 ? <ShieldCheck className="size-4 text-validated" aria-hidden /> : <Sparkles className="size-4 text-ai" aria-hidden />}
            {ai === 0 ? "All levels reviewed" : `${result.validated} reviewed · ${ai} still AI suggested`}
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="flex items-center gap-3 rounded-xl border-[1.5px] bg-card px-4 py-3" style={{ borderColor: s.color }}>
              <dd className="text-[28px] leading-none font-semibold tabular" style={{ color: s.color === "var(--foreground)" ? undefined : s.color }}>
                {s.value}
              </dd>
              <dt className="text-[12px] leading-tight font-semibold">{s.label}</dt>
            </div>
          ))}
        </dl>
        <MaturitySlider current={result.overall} target={result.targetMean} />
      </CardContent>
    </Card>
  );
}

function Narrative() {
  const { result } = useProcesses();
  const lines = leadershipNarrative(result);
  return (
    <ol className="flex flex-col gap-3" aria-label="Leadership narrative">
      {lines.map((l, i) => (
        <li key={l} className="flex items-start gap-3 text-[13px] leading-snug">
          <span className="grid size-7 shrink-0 place-items-center rounded-md text-xs font-bold text-white" style={{ background: NARRATIVE_COLOR[i] }}>
            {i + 1}
          </span>
          <span className="pt-1">{l}</span>
        </li>
      ))}
      {!lines.length && <li className="text-sm text-muted-foreground">Not enough input to rate the function yet.</li>}
    </ol>
  );
}

function IdeaDetail({ idea, onCharter }: { idea: ProcessIdea | undefined; onCharter: (id: string) => void }) {
  if (!idea) return <p className="text-sm text-muted-foreground">Pick a bubble to see the initiative.</p>;
  return (
    <div className="flex flex-col gap-3" data-testid="idea-detail">
      <div>
        <p className="text-[15px] font-semibold">{idea.title}</p>
        <p className="text-[12px] text-muted-foreground">
          {idea.processName} · {idea.quadrant} · {PHASE_LABEL[idea.phase]} ({PHASE_MONTHS[idea.phase]})
        </p>
      </div>
      <p className="text-[13px] leading-relaxed">{idea.description}</p>
      <dl className="grid grid-cols-3 gap-2 text-center sm:grid-cols-6">
        <div className="rounded-md bg-foreground py-2 text-background">
          <dt className="text-[10px] opacity-80">Priority</dt>
          <dd className="text-lg font-semibold tabular">{Math.round(idea.priority)}</dd>
        </div>
        {SCORING_CRITERIA.map((c) => (
          <div key={c.key} className="rounded-md bg-muted/50 py-2">
            <dt className="text-[10px] leading-tight text-muted-foreground">{c.label}</dt>
            <dd className="text-lg font-semibold tabular">{idea[c.key]}</dd>
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
        {idea.portfolio && (
          <>
            {" "}
            · {idea.portfolio.theme} · {idea.portfolio.valuePool}
          </>
        )}
      </p>
      <Button variant="outline" size="sm" className="self-start" onClick={() => onCharter(idea.id)} data-testid="open-charter">
        <FileText />
        Open initiative charter
      </Button>
    </div>
  );
}

export default function ResultsPage() {
  const { result, input, caps, all } = useProcesses();
  const [selected, setSelected] = React.useState<string | null>(null);
  const [charterId, setCharterId] = React.useState<string | null>(null);
  const [scope, setScope] = React.useState<"function" | "all">("all");
  const idea = result.ideas.find((i) => i.id === (selected ?? result.ideas[0]?.id));
  const areas = React.useMemo(() => processAreas(input.processes, caps), [input.processes, caps]);
  const fn = functionName(result.functionId);
  const documents = useSession((s) => s.documents);
  const [exporting, setExporting] = React.useState(false);

  const scoped = React.useMemo(() => portfolioIdeas(result, all, scope), [result, all, scope]);
  const gov = React.useMemo(() => {
    const others = scope === "all" ? all.filter((f) => f.functionId !== result.functionId).flatMap((f) => f.processes) : [];
    const inits = seed.roadmap.initiatives.filter((i) => scope === "all" || i.functionId === result.functionId);
    return governance(scoped, [...result.processes, ...others], inits);
  }, [scoped, scope, all, result]);
  const charterIdea = scoped.find((i) => i.id === charterId) ?? result.ideas.find((i) => i.id === charterId) ?? null;

  const exportPdf = async () => {
    setExporting(true);
    try {
      const name = await exportReportPdf({ result, areas, functionName: fn, documents });
      toast.success("PDF ready", { description: name });
    } catch (e) {
      toast.error("Couldn't build the PDF", { description: String(e) });
    } finally {
      setExporting(false);
    }
  };

  const scopeToggle = <ScopeToggle value={scope} onChange={setScope} fn={FUNCTION_SHORT[result.functionId]} />;

  return (
    <Page className="print:max-w-none print:gap-4 print:p-0">
      <PageHeader
        stage={4}
        title="Prioritize & Roadmap"
        actions={
          <Button size="sm" onClick={() => void exportPdf()} disabled={exporting} data-testid="export-pdf">
            {exporting ? <Loader2 className="animate-spin" /> : <Download />}
            {exporting ? "Building PDF…" : "Export PDF"}
          </Button>
        }
      />

      <Tabs defaultValue="story" className="gap-5">
        <TabsList aria-label="Outputs" className="h-auto max-w-full flex-wrap">
          <TabsTrigger value="story" data-testid="tab-story">
            Executive story
          </TabsTrigger>
          <TabsTrigger value="opportunities" data-testid="tab-opportunities">
            Opportunities
          </TabsTrigger>
          <TabsTrigger value="roadmap" data-testid="tab-roadmap">
            Roadmap
          </TabsTrigger>
          <TabsTrigger value="activation" data-testid="tab-activation">
            Activation
          </TabsTrigger>
        </TabsList>

        <TabsContent value="story" className="flex flex-col gap-6">
          <Headline />
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] [&>*]:min-w-0">
            <Card>
              <CardHeader>
                <CardTitle>Maturity by process</CardTitle>
              </CardHeader>
              <CardContent>
                <MaturityByProcess processes={result.processes} />
              </CardContent>
            </Card>
            <Card className="border-[1.5px] border-[var(--level-3)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-1.5">
                  <Sparkles className="size-4 text-ai" aria-hidden />
                  Leadership narrative
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Narrative />
              </CardContent>
            </Card>
          </div>
          <Card className="print-avoid">
            <CardHeader>
              <CardTitle>Portfolio heatmap: criticality × maturity</CardTitle>
              <p className="text-[13px] text-muted-foreground">Business criticality versus current digital maturity, translated into four portfolio responses.</p>
            </CardHeader>
            <CardContent>
              <PortfolioMatrix processes={result.processes} />
            </CardContent>
          </Card>
          <Card className="print-avoid">
            <CardHeader>
              <CardTitle>Detailed maturity heatmap</CardTitle>
              <p className="text-[13px] text-muted-foreground">Evidence-backed scoring by process and dimension.</p>
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
          <Card className="print-avoid">
            <CardHeader>
              <CardTitle>How {fn} compares</CardTitle>
              <p className="text-[13px] text-muted-foreground">Every function scored the same way from the same documents. Functions with fewer documents lean on their 2025 self-assessment.</p>
            </CardHeader>
            <CardContent>
              <FunctionCompare all={all} current={result.functionId} target={result.target} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="opportunities" className="flex flex-col gap-6">
          <Card data-tour="ideas">
            <CardHeader>
              <CardTitle>Prioritization matrix</CardTitle>
              <p className="text-[13px] text-muted-foreground">
                A common prioritization logic: business value against strategic alignment; feasibility, risk and dependencies complete the priority score. Bubble size = gap; number = priority.
              </p>
            </CardHeader>
            <CardContent>
              {result.ideas.length ? (
                <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] [&>*]:min-w-0">
                  <IdeaMatrix ideas={result.ideas} selected={idea?.id} onSelect={setSelected} />
                  <div className="flex flex-col gap-2">
                    <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Scoring criteria</p>
                    <ScoringCriteria />
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No gaps to close at these targets.</p>
              )}
            </CardContent>
          </Card>
          {result.ideas.length > 0 && (
            <Card>
              <CardContent className="pt-5">
                <IdeaDetail idea={idea} onCharter={setCharterId} />
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>Digital opportunity portfolio</CardTitle>
                <p className="mt-1 text-[13px] text-muted-foreground">Initiatives connected to maturity gaps, value pools, foundations and delivery horizons. Pick one to open its charter.</p>
              </div>
              {scopeToggle}
            </CardHeader>
            <CardContent>
              <OpportunityPortfolio ideas={scoped} current={result.functionId} showFunction={scope === "all"} onOpen={setCharterId} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roadmap" className="flex flex-col gap-6">
          <Card data-tour="roadmap">
            <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>Prioritized transformation roadmap</CardTitle>
                <p className="mt-1 text-[13px] text-muted-foreground">Sequencing of business outcomes, enabling platforms and organizational capacity. Nothing starts before what it depends on.</p>
              </div>
              {scopeToggle}
            </CardHeader>
            <CardContent>
              <LayerRoadmap ideas={scoped} current={result.functionId} showFunction={scope === "all"} onOpen={setCharterId} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>By process: what is planned and what is not</CardTitle>
              <p className="text-[13px] text-muted-foreground">
                The 2026-27 plan, gaps with nothing planned, and {fn.toLowerCase()} initiatives by horizon. Arrows show what has to come first.
              </p>
            </CardHeader>
            <CardContent>
              <ProcessRoadmap processes={result.processes} ideas={result.ideas} selected={selected} onSelect={setSelected} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activation" className="flex flex-col gap-6">
          <Card>
            <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>Activation and value governance</CardTitle>
                <p className="mt-1 text-[13px] text-muted-foreground">Portfolio health, outcome realization and decisions requiring leadership action.</p>
              </div>
              {scopeToggle}
            </CardHeader>
            <CardContent>
              <GovernanceDashboard g={gov} showFunction={scope === "all"} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <CharterSheet idea={charterIdea} onOpenChange={(o) => !o && setCharterId(null)} />
      <p className="text-[11px] text-muted-foreground">
        Illustrative data · simulated AI · stages on the 1–5 digital maturity scale (Initiated → Intelligent). Every level traces to its sources in step 3.
      </p>
      <StepNav step={4} />
    </Page>
  );
}

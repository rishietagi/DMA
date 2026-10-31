"use client";
import * as React from "react";
import Link from "next/link";
import { ArrowDownUp, Gauge, PlayCircle } from "lucide-react";
import { useAssessment } from "@/components/providers/assessment-provider";
import { AgentTrace } from "@/components/shell/agent-console";
import { JOURNEY } from "@/components/shell/nav";
import { useStageStatus } from "@/components/shell/use-stage-status";
import { useTour } from "@/components/tour/tour-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { headlineStats, KpiStrip } from "@/components/dma/kpi-strip";
import { MaturityField, type FieldView } from "@/components/dma/maturity-field";
import { MaturityChip, MaturityLegend } from "@/components/dma/maturity";
import { Page, PageHeader } from "@/components/dma/page-header";
import { formatDelta } from "@/lib/engine";
import { capabilityLabel, FUNCTION_SHORT } from "@/lib/labels";
import { seed } from "@/lib/seed";
import { useSession } from "@/lib/store/session";
import { cn } from "@/lib/utils";

type Group = "all" | "cpd" | "enterprise";

export default function CockpitPage() {
  const { result, baseline } = useAssessment();
  const runs = useSession((s) => s.runs);
  const rag = useSession((s) => s.ragView);
  const setRag = useSession((s) => s.setRagView);
  const mode = useSession((s) => s.mode);
  const status = useStageStatus();
  const tour = useTour();
  const [view, setView] = React.useState<FieldView>("evidence");
  const [group, setGroup] = React.useState<Group>("enterprise");

  const k = result.kpis[group];
  const variances = result.capabilities
    .filter((c) => c.inScope && c.hasEvidence)
    .map((c) => ({ c, d: c.evidenceScore - c.self }))
    .filter((x) => Math.abs(x.d) >= 0.5)
    .sort((a, b) => Math.abs(b.d) - Math.abs(a.d))
    .slice(0, 5);
  const done = JOURNEY.filter((j) => status[j.href] === "done").length;

  return (
    <Page>
      <PageHeader
        title="FY26 digital maturity assessment"
        description="Consumer Products Division and five enterprise functions, scored on process, data, AI and people. The 2025 self-assessment is the baseline; evidence and workshop answers move the scores."
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link href="/scoring">
                <Gauge />
                Open scoring workbench
              </Link>
            </Button>
            <Button variant="ai" size="sm" onClick={tour.start}>
              <PlayCircle />
              Run guided assessment
            </Button>
          </>
        }
      />

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b px-5 py-3">
          <div className="mr-auto">
            <h2 className="text-sm font-semibold">Maturity field</h2>
            <p className="text-xs text-muted-foreground">41 capabilities by function. Select one to see why it scored as it did.</p>
          </div>
          <ToggleGroup type="single" value={view} onValueChange={(v) => v && setView(v as FieldView)} aria-label="Score lens">
            <ToggleGroupItem value="self">2025 self-assessment</ToggleGroupItem>
            <ToggleGroupItem value="evidence" disabled={mode === "baseline"}>
              AI evidence
            </ToggleGroupItem>
            <ToggleGroupItem value="effective">After validation</ToggleGroupItem>
          </ToggleGroup>
          <ToggleGroup type="single" value={rag ? "rag" : "ramp"} onValueChange={(v) => v && setRag(v === "rag")} aria-label="Colour scale">
            <ToggleGroupItem value="ramp">Ramp</ToggleGroupItem>
            <ToggleGroupItem value="rag">RAG</ToggleGroupItem>
          </ToggleGroup>
        </div>
        <CardContent className="pt-4">
          <MaturityField result={result} view={mode === "baseline" && view === "evidence" ? "self" : view} rag={rag} />
          <MaturityLegend rag={rag} className="mt-4" />
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Headline numbers</h2>
          <ToggleGroup type="single" value={group} onValueChange={(v) => v && setGroup(v as Group)} aria-label="KPI scope">
            <ToggleGroupItem value="enterprise">Enterprise functions</ToggleGroupItem>
            <ToggleGroupItem value="cpd">CPD</ToggleGroupItem>
            <ToggleGroupItem value="all">All</ToggleGroupItem>
          </ToggleGroup>
        </div>
        <KpiStrip stats={headlineStats(k, baseline.kpis[group])} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Where evidence disagrees with the self-assessment</CardTitle>
            <CardDescription>Largest differences between the 2025 self-score and the AI-suggested score.</CardDescription>
          </CardHeader>
          <CardContent className="pt-3">
            {variances.length === 0 ? (
              <p className="text-sm text-muted-foreground">No differences of half a level or more yet. Load evidence to test the self-assessment.</p>
            ) : (
              <ul className="divide-y">
                {variances.map(({ c, d }) => (
                  <li key={c.capability.id}>
                    <Link href={`/scoring?cap=${c.capability.id}`} className="flex items-center gap-3 py-2.5 outline-none hover:bg-accent/50 focus-visible:bg-accent -mx-2 px-2 rounded-md">
                      <ArrowDownUp className="size-4 text-ai-foreground" aria-hidden />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium">{capabilityLabel(c.capability.id)}</p>
                        <p className="text-xs text-muted-foreground">{FUNCTION_SHORT[c.capability.primaryFunctionId]}</p>
                      </div>
                      <MaturityChip score={c.self} size="sm" provenance="self" label={`Self ${c.self}`} />
                      <span className="text-xs text-muted-foreground" aria-hidden>to</span>
                      <MaturityChip score={c.evidenceScore} size="sm" provenance="ai" />
                      <span className={cn("w-10 text-right text-xs font-medium tabular", d < 0 ? "text-conf-low" : "text-validated")}>{formatDelta(d)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Journey</CardTitle>
              <CardDescription>{done} of 8 stages complete</CardDescription>
            </CardHeader>
            <CardContent className="pt-3">
              <ol className="grid grid-cols-8 gap-1" aria-label="Journey progress">
                {JOURNEY.map((j) => (
                  <li key={j.href}>
                    <Link href={j.href} className="group flex flex-col gap-1.5 outline-none" aria-label={`${j.label}: ${status[j.href]}`}>
                      <span
                        className={cn(
                          "h-1.5 rounded-full transition-colors group-focus-visible:ring-2 group-focus-visible:ring-ring",
                          status[j.href] === "done" ? "bg-validated" : status[j.href] === "active" ? "bg-conf-med" : "bg-muted",
                        )}
                      />
                      <span className="truncate text-[10px] text-muted-foreground group-hover:text-foreground">{j.short}</span>
                    </Link>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Divisions</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 pt-3">
              {seed.baseline.divisions.map((d) => (
                <div key={d.id} className="flex items-center justify-between gap-3 text-[13px]">
                  <span className={cn(d.status !== "assessed" && "text-muted-foreground")}>{d.name}</span>
                  {d.status === "assessed" ? (
                    <span className="inline-flex items-center gap-1.5 text-xs text-validated">
                      <span className="size-1.5 rounded-full bg-validated" />
                      In assessment
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Not started</span>
                  )}
                </div>
              ))}
              <p className="pt-1 text-xs text-muted-foreground">CPD leads on digital maturity; many problems are shared with GP and AHP.</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Recent agent activity</h2>
        {runs.length === 0 ? (
          <p className="rounded-xl border border-dashed px-5 py-6 text-sm text-muted-foreground">
            Nothing yet. Analyse evidence or run an AI scoring pass and the steps will appear here and in the agent console.
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {runs.slice(0, 4).map((r) => (
              <AgentTrace key={r.id} run={r} defaultOpen={false} />
            ))}
          </div>
        )}
      </section>
    </Page>
  );
}

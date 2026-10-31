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
import { DetailOnly, PageIntro, useDetailed } from "@/components/dma/explain";
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
  const detailed = useDetailed();
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
        title="Himalaya digital maturity — overview"
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link href="/scoring">
                <Gauge />
                See all scores
              </Link>
            </Button>
            <Button variant="ai" size="sm" onClick={tour.start}>
              <PlayCircle />
              Run guided assessment
            </Button>
          </>
        }
      />

      <PageIntro
        what={
          <>
            How digital is Himalaya? We score <strong>41 business capabilities</strong> — things like order management, payroll or demand
            forecasting — from <strong>1 (run on Excel and email)</strong> to <strong>5 (automated and AI-driven)</strong>.
          </>
        }
        todo="Click any tile to see why it got its score. New here? Press “Run guided assessment” for a 3-minute walkthrough."
        how={[
          "Starting point: in 2025 Himalaya rated each capability itself. That rating is the baseline.",
          "Evidence: documents, KPI reports, workshop answers and interview notes are read, and each statement is matched to a capability and a level on the 1–5 scale.",
          "Each capability is judged on four areas — process, data, AI and people — and the four are combined into one score.",
          "The AI only suggests. A KPMG consultant accepts or changes every score, and must write down why when they change one.",
        ]}
      />

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">The headline</h2>
          <ToggleGroup type="single" value={group} onValueChange={(v) => v && setGroup(v as Group)} aria-label="Which part of the business">
            <ToggleGroupItem value="enterprise">Enterprise functions</ToggleGroupItem>
            <ToggleGroupItem value="cpd">Consumer division (CPD)</ToggleGroupItem>
            <ToggleGroupItem value="all">All</ToggleGroupItem>
          </ToggleGroup>
        </div>
        <KpiStrip stats={headlineStats(k, baseline.kpis[group], !detailed)} />
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b px-5 py-3">
          <div className="mr-auto">
            <h2 className="text-sm font-semibold">All 41 capabilities at a glance</h2>
            <p className="text-xs text-muted-foreground">One column per business function. Darker = more digital. Arrows show where the evidence moved the 2025 rating.</p>
          </div>
          <ToggleGroup type="single" value={view} onValueChange={(v) => v && setView(v as FieldView)} aria-label="Which score to show">
            <ToggleGroupItem value="self">Himalaya’s 2025 rating</ToggleGroupItem>
            <ToggleGroupItem value="evidence" disabled={mode === "baseline"}>
              What the evidence says
            </ToggleGroupItem>
            <ToggleGroupItem value="effective">After consultant review</ToggleGroupItem>
          </ToggleGroup>
          <DetailOnly>
            <ToggleGroup type="single" value={rag ? "rag" : "ramp"} onValueChange={(v) => v && setRag(v === "rag")} aria-label="Colour scale">
              <ToggleGroupItem value="ramp">Blue scale</ToggleGroupItem>
              <ToggleGroupItem value="rag">Red–amber–green</ToggleGroupItem>
            </ToggleGroup>
          </DetailOnly>
        </div>
        <CardContent className="pt-4">
          <MaturityField result={result} view={mode === "baseline" && view === "evidence" ? "self" : view} rag={rag} />
          <MaturityLegend rag={rag} className="mt-4" alwaysShowLabels />
        </CardContent>
      </Card>

      <div className={cn("grid gap-6", detailed && "lg:grid-cols-[1.3fr_1fr]")}>
        <Card>
          <CardHeader>
            <CardTitle>Where the evidence disagrees with Himalaya’s 2025 rating</CardTitle>
            <CardDescription>The biggest differences — worth a conversation with the function owner.</CardDescription>
          </CardHeader>
          <CardContent className="pt-3">
            {variances.length === 0 ? (
              <p className="text-sm text-muted-foreground">No differences of half a level or more yet. Load evidence to test the 2025 ratings.</p>
            ) : (
              <ul className="divide-y">
                {variances.map(({ c, d }) => (
                  <li key={c.capability.id}>
                    <Link href={`/scoring?cap=${c.capability.id}`} className="-mx-2 flex items-center gap-3 rounded-md px-2 py-2.5 outline-none hover:bg-accent/50 focus-visible:bg-accent">
                      <ArrowDownUp className="size-4 text-ai-foreground" aria-hidden />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium">{capabilityLabel(c.capability.id)}</p>
                        <p className="text-xs text-muted-foreground">{FUNCTION_SHORT[c.capability.primaryFunctionId]}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">2025</span>
                      <MaturityChip score={c.self} size="sm" provenance="self" label={`2025 rating ${c.self}`} />
                      <span className="text-xs text-muted-foreground">evidence</span>
                      <MaturityChip score={c.evidenceScore} size="sm" provenance="ai" />
                      <span className={cn("w-10 text-right text-xs font-medium tabular", d < 0 ? "text-conf-low" : "text-validated")}>{formatDelta(d)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <DetailOnly>
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
              </CardContent>
            </Card>
          </div>
        </DetailOnly>
      </div>

      <DetailOnly>
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">Recent AI activity</h2>
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
      </DetailOnly>
    </Page>
  );
}

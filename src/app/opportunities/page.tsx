"use client";
import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Database, GitBranch, ShieldAlert, Sparkles } from "lucide-react";
import { useAssessment } from "@/components/providers/assessment-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/overlays";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { MaturityChip, MaturityLegend } from "@/components/dma/maturity";
import { Page, PageHeader } from "@/components/dma/page-header";
import { PriorityMatrix } from "@/components/dma/priority-matrix";
import { AiTag } from "@/components/dma/provenance";
import { runAgent } from "@/lib/ai/client";
import { DIMENSION_LABELS, type Quadrant, type UseCase } from "@/lib/engine";
import { ALIGNMENT_LABEL, capabilityLabel, FUNCTION_SHORT, STATUS_LABEL } from "@/lib/labels";
import { FUNCTION_IDS, type FunctionId } from "@/lib/schema";
import { seed } from "@/lib/seed";
import { cn } from "@/lib/utils";

const QUADRANTS: Quadrant[] = ["Quick win", "Strategic bet", "Fill-in", "Deprioritise"];

function UseCaseDetail({ u, all }: { u: UseCase; all: UseCase[] }) {
  const { result } = useAssessment();
  const deps = u.dependsOn.map((d) => all.find((x) => x.id === d) ?? seed.useCaseRules.rules.find((r) => r.id === d));
  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <AiTag>Generated from gap rule</AiTag>
          <span className="rounded bg-muted px-1.5 py-0.5 text-[11px]">{u.quadrant}</span>
          <span className="rounded bg-muted px-1.5 py-0.5 text-[11px]">{u.phase}</span>
          <span className="rounded bg-muted px-1.5 py-0.5 text-[11px]">Effort {u.effort}</span>
        </div>
        <h3 className="mt-2 text-base font-semibold">{u.title}</h3>
        <p className="mt-1 text-[13px] text-muted-foreground">{u.description}</p>
        <p className="mt-1 text-xs">
          <span className="text-muted-foreground">AI pattern:</span> {u.aiPattern}
        </p>
      </div>

      <dl className="grid grid-cols-4 gap-2 text-center">
        {[
          ["Priority", Math.round(u.priority)],
          ["Value", u.value],
          ["Feasibility", u.feasibility],
          ["Risk", u.risk],
        ].map(([l, v]) => (
          <div key={l} className="rounded-lg bg-muted/60 py-2">
            <dt className="text-[10px] text-muted-foreground">{l}</dt>
            <dd className="text-lg font-semibold tabular">{v}</dd>
          </div>
        ))}
      </dl>

      <section>
        <h4 className="mb-1.5 text-xs font-semibold">Gap addressed</h4>
        <ul className="flex flex-col gap-1.5">
          {u.triggers.map((t) => {
            const o = result.opportunities[t.capabilityId]!;
            return (
              <li key={t.capabilityId} className="flex items-center gap-2 text-[13px]">
                <Link href={`/scoring?cap=${t.capabilityId}&dim=${t.dimension}`} className="min-w-0 flex-1 truncate hover:underline">
                  {capabilityLabel(t.capabilityId)}
                </Link>
                <span className="text-[11px] text-muted-foreground">{DIMENSION_LABELS[t.dimension]}</span>
                <MaturityChip score={t.score} size="sm" />
                <ArrowRight className="size-3 text-muted-foreground" aria-label="to target" />
                <MaturityChip score={o.target} size="sm" label={`Target ${o.target}`} />
              </li>
            );
          })}
        </ul>
      </section>

      <section className="grid gap-3 text-[13px] sm:grid-cols-2">
        <div>
          <h4 className="mb-1 flex items-center gap-1.5 text-xs font-semibold">
            <Database className="size-3.5" aria-hidden /> Data readiness
          </h4>
          <p className="flex items-center gap-2">
            <MaturityChip score={u.dataReadiness} size="sm" /> <span className="text-muted-foreground">Data dimension of the lead capability</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Needs: {u.dataPrerequisites.join(", ")}</p>
        </div>
        <div>
          <h4 className="mb-1 flex items-center gap-1.5 text-xs font-semibold">
            <GitBranch className="size-3.5" aria-hidden /> Depends on
          </h4>
          {deps.length === 0 ? (
            <p className="text-xs text-muted-foreground">No prerequisites</p>
          ) : (
            <ul className="text-xs">
              {deps.map((d, i) => (
                <li key={i}>{d && "title" in d ? `${d.title} (${d.phase})` : d && "useCase" in d ? `${d.useCase.title} (capability already at target)` : "—"}</li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h4 className="mb-1 flex items-center gap-1.5 text-xs font-semibold">
            <ShieldAlert className="size-3.5" aria-hidden /> Risk {u.risk}/4
          </h4>
          <p className="text-xs text-muted-foreground">People skills, evidence confidence and cross-functional reach.</p>
        </div>
        <div>
          <h4 className="mb-1 text-xs font-semibold">Roadmap link</h4>
          {u.initiatives.length ? (
            <ul className="text-xs">
              {u.initiatives.map((i) => (
                <li key={i.id}>
                  {i.title} <span className="text-muted-foreground">— {STATUS_LABEL[i.status].toLowerCase()}</span>
                </li>
              ))}
              <li className="mt-1 font-medium">{ALIGNMENT_LABEL[u.alignment]}</li>
            </ul>
          ) : (
            <p className="text-xs font-medium text-whitespace">No initiative on the 2026-27 roadmap</p>
          )}
        </div>
      </section>
      <p className="text-xs">
        <span className="text-muted-foreground">KPIs moved:</span> {u.kpis.join(", ")}
      </p>
    </div>
  );
}

function OpportunitiesInner() {
  const { result } = useAssessment();
  const params = useSearchParams();
  const [fn, setFn] = React.useState<FunctionId | "all">("all");
  const [quad, setQuad] = React.useState<Quadrant | "all">("all");
  const [selected, setSelected] = React.useState<string | null>(params.get("uc"));
  React.useEffect(() => {
    const uc = params.get("uc");
    if (uc) setSelected(uc);
  }, [params]);
  const all = result.useCases;
  const items = all.filter((u) => (fn === "all" || u.functionIds.includes(fn)) && (quad === "all" || u.quadrant === quad));
  const sorted = [...items].sort((a, b) => b.priority - a.priority);
  const sel = all.find((u) => u.id === selected) ?? sorted[0];
  const quickWins = all.filter((u) => u.quadrant === "Quick win").length;

  return (
    <Page>
      <PageHeader
        stage={7}
        title="Opportunity studio"
        description="Maturity gaps turned into function-specific digital and AI use cases by a rule library, then scored on value, feasibility (with data readiness and dependencies) and risk."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              void runAgent("opportunities", { rules: seed.useCaseRules.rules.length, useCases: all.length, quickWins })
            }
          >
            <Sparkles />
            Regenerate use cases
          </Button>
        }
      />

      <dl className="grid grid-cols-4 divide-x rounded-xl border bg-card">
        {[
          ["Use cases generated", all.length, `from ${seed.useCaseRules.rules.length} gap rules`],
          ["Quick wins", quickWins, "value ≥ 3.5, feasibility ≥ 3"],
          ["Ready in the next 6 months", all.filter((u) => u.phase === "Now").length, "phase Now"],
          ["On no roadmap today", all.filter((u) => u.initiatives.length === 0).length, "whitespace opportunities"],
        ].map(([l, v, n]) => (
          <div key={l as string} className="px-5 py-3">
            <dt className="text-xs text-muted-foreground">{l}</dt>
            <dd className="text-2xl font-semibold tabular">{v}</dd>
            <dd className="text-[11px] text-muted-foreground">{n}</dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={fn} onValueChange={(v) => setFn(v as FunctionId | "all")}>
          <SelectTrigger size="sm" className="w-44" aria-label="Filter by function">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All functions</SelectItem>
            {FUNCTION_IDS.map((f) => (
              <SelectItem key={f} value={f}>
                {FUNCTION_SHORT[f]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <ToggleGroup type="single" value={quad} onValueChange={(v) => v && setQuad(v as Quadrant | "all")} aria-label="Filter by quadrant">
          <ToggleGroupItem value="all">All</ToggleGroupItem>
          {QUADRANTS.map((q) => (
            <ToggleGroupItem key={q} value={q}>
              {q}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <span className="ml-auto flex items-center gap-3 text-[11px] text-muted-foreground">
          Bubble size = gap · colour = data readiness <MaturityLegend />
        </span>
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[1.15fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Value × feasibility</CardTitle>
            <CardDescription>Numbers in bubbles are priority scores (0–100).</CardDescription>
          </CardHeader>
          <CardContent>
            <PriorityMatrix items={items} selected={sel?.id} onSelect={setSelected} />
          </CardContent>
        </Card>
        <Card className="ai-surface" data-tour="uc-detail">
          <CardContent className="py-5">{sel ? <UseCaseDetail u={sel} all={all} /> : <p className="text-sm text-muted-foreground">No use cases match these filters.</p>}</CardContent>
        </Card>
      </div>

      <section aria-label="Use case list">
        <h2 className="mb-3 text-sm font-semibold">All use cases by priority</h2>
        <div className="overflow-hidden rounded-xl border bg-card">
          <table className="w-full text-left text-[13px]">
            <thead className="border-b bg-muted/40 text-[11px] text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Use case</th>
                <th className="px-3 py-2 font-medium">Functions</th>
                <th className="px-3 py-2 font-medium">Lead gap</th>
                <th className="px-3 py-2 text-right font-medium">Priority</th>
                <th className="px-3 py-2 font-medium">Quadrant</th>
                <th className="px-3 py-2 font-medium">Phase</th>
                <th className="px-3 py-2 font-medium">Roadmap</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sorted.map((u) => (
                <tr
                  key={u.id}
                  tabIndex={0}
                  onClick={() => setSelected(u.id)}
                  onKeyDown={(e) => e.key === "Enter" && setSelected(u.id)}
                  className={cn("cursor-pointer outline-none hover:bg-accent/50 focus-visible:bg-accent", sel?.id === u.id && "bg-accent/60")}
                  aria-selected={sel?.id === u.id}
                >
                  <td className="px-3 py-2 font-medium">{u.title}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{u.functionIds.map((f) => FUNCTION_SHORT[f]).join(", ")}</td>
                  <td className="px-3 py-2 text-xs">
                    {capabilityLabel(u.primaryCapabilityId)} <span className="text-muted-foreground tabular">gap {u.gap.toFixed(1)}</span>
                  </td>
                  <td className="px-3 py-2 text-right tabular">{Math.round(u.priority)}</td>
                  <td className="px-3 py-2 text-xs">{u.quadrant}</td>
                  <td className="px-3 py-2 text-xs">
                    {u.phase}
                    {u.pulledForward && <span className="ml-1 text-muted-foreground">(prerequisite)</span>}
                  </td>
                  <td className={cn("px-3 py-2 text-xs", u.alignment === "WHITESPACE" && "text-whitespace font-medium")}>{ALIGNMENT_LABEL[u.alignment]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </Page>
  );
}

export default function OpportunitiesPage() {
  return (
    <React.Suspense>
      <OpportunitiesInner />
    </React.Suspense>
  );
}

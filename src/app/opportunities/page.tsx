"use client";
import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Database, GitBranch, ShieldAlert, Sparkles } from "lucide-react";
import { useAssessment } from "@/components/providers/assessment-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/overlays";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { MaturityChip, MaturityLegend } from "@/components/dma/maturity";
import { Page, PageHeader } from "@/components/dma/page-header";
import { DetailOnly, InfoTip, PageIntro, useDetailed } from "@/components/dma/explain";
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
  const deps = u.dependsOn.map(
    (d) => all.find((x) => x.id === d) ?? seed.useCaseRules.rules.find((r) => r.id === d),
  );
  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <AiTag>Generated from gap rule</AiTag>
          <span className="bg-muted rounded px-1.5 py-0.5 text-[11px]">{u.quadrant}</span>
          <span className="bg-muted rounded px-1.5 py-0.5 text-[11px]">{u.phase}</span>
          <span className="bg-muted rounded px-1.5 py-0.5 text-[11px]">
            Effort: {u.effort === "S" ? "small" : u.effort === "M" ? "medium" : "large"}
          </span>
        </div>
        <h3 className="mt-2 text-base font-semibold">{u.title}</h3>
        <p className="text-muted-foreground mt-1 text-[13px]">{u.description}</p>
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
          <div key={l} className="bg-muted/60 rounded-lg py-2">
            <dt className="text-muted-foreground text-[10px]">{l}</dt>
            <dd className="tabular text-lg font-semibold">{v}</dd>
          </div>
        ))}
      </dl>

      <p className="text-muted-foreground -mt-2 text-[12px]">
        Priority = size of the gap × how valuable, easy and low-risk the fix is.{" "}
        <InfoTip>
          Value: 2026 priority, revenue-facing, pain points raised. Feasibility: how ready the data
          is, whether a prerequisite is missing, whether a project is already under way. Risk: weak
          digital skills, low-confidence evidence, many teams involved.
        </InfoTip>
      </p>

      <section>
        <h4 className="mb-1.5 text-xs font-semibold">What it fixes (now → target)</h4>
        <ul className="flex flex-col gap-1.5">
          {u.triggers.map((t) => {
            const o = result.opportunities[t.capabilityId]!;
            return (
              <li key={t.capabilityId} className="flex items-center gap-2 text-[13px]">
                <Link
                  href={`/scoring?cap=${t.capabilityId}&dim=${t.dimension}`}
                  className="min-w-0 flex-1 truncate hover:underline"
                >
                  {capabilityLabel(t.capabilityId)}
                </Link>
                <span className="text-muted-foreground text-[11px]">
                  {DIMENSION_LABELS[t.dimension]}
                </span>
                <MaturityChip score={t.score} size="sm" />
                <ArrowRight className="text-muted-foreground size-3" aria-label="to target" />
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
            <MaturityChip score={u.dataReadiness} size="sm" />{" "}
            <span className="text-muted-foreground">Data dimension of the lead capability</span>
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            Needs: {u.dataPrerequisites.join(", ")}
          </p>
        </div>
        <div>
          <h4 className="mb-1 flex items-center gap-1.5 text-xs font-semibold">
            <GitBranch className="size-3.5" aria-hidden /> Depends on
          </h4>
          {deps.length === 0 ? (
            <p className="text-muted-foreground text-xs">No prerequisites</p>
          ) : (
            <ul className="text-xs">
              {deps.map((d, i) => (
                <li key={i}>
                  {d && "title" in d
                    ? `${d.title} (${d.phase})`
                    : d && "useCase" in d
                      ? `${d.useCase.title} (capability already at target)`
                      : "—"}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h4 className="mb-1 flex items-center gap-1.5 text-xs font-semibold">
            <ShieldAlert className="size-3.5" aria-hidden /> Risk {u.risk}/4
          </h4>
          <p className="text-muted-foreground text-xs">
            People skills, evidence confidence and cross-functional reach.
          </p>
        </div>
        <div>
          <h4 className="mb-1 text-xs font-semibold">Roadmap link</h4>
          {u.initiatives.length ? (
            <ul className="text-xs">
              {u.initiatives.map((i) => (
                <li key={i.id}>
                  {i.title}{" "}
                  <span className="text-muted-foreground">
                    — {STATUS_LABEL[i.status].toLowerCase()}
                  </span>
                </li>
              ))}
              <li className="mt-1 font-medium">{ALIGNMENT_LABEL[u.alignment]}</li>
            </ul>
          ) : (
            <p className="text-whitespace text-xs font-medium">
              No initiative on the 2026-27 roadmap
            </p>
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
  const items = all.filter(
    (u) => (fn === "all" || u.functionIds.includes(fn)) && (quad === "all" || u.quadrant === quad),
  );
  const sorted = [...items].sort((a, b) => b.priority - a.priority);
  const sel = all.find((u) => u.id === selected) ?? sorted[0];
  const quickWins = all.filter((u) => u.quadrant === "Quick win").length;
  const detailed = useDetailed();
  const PHASE_PLAIN = {
    Now: "Start now (0–6 months)",
    Next: "Next (6–12 months)",
    Later: "Later (12–24 months)",
  } as const;

  return (
    <Page>
      <PageHeader
        stage={7}
        title="Opportunity studio"
        actions={
          <DetailOnly>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                void runAgent("opportunities", {
                  rules: seed.useCaseRules.rules.length,
                  useCases: all.length,
                  quickWins,
                })
              }
            >
              <Sparkles />
              Regenerate use cases
            </Button>
          </DetailOnly>
        }
      />

      <PageIntro
        what="Where a capability falls short of its target, the system proposes a concrete digital or AI improvement — and ranks the ideas."
        todo="Read the list from the top: the higher the priority, the stronger the case. Click an idea to see what it fixes and what it depends on."
        how={[
          "A library of 28 rules says, for example: “if e-commerce reconciliation scores 2 or less on process, propose an AI agent that matches settlements to invoices”.",
          "Each idea is scored on value (is it one of Himalaya’s 2026 priorities? does it touch revenue? do people complain about it?), ease (is the data ready? is something it depends on still missing? is a project already under way?) and risk.",
          "Priority (0–100) = how big the gap is × how valuable, easy and low-risk the fix is.",
          "“Quick win” = valuable and easy. “Strategic bet” = valuable but harder.",
        ]}
      />

      <dl className="bg-card grid grid-cols-4 divide-x rounded-xl border">
        {[
          ["Ideas proposed", all.length, `from ${seed.useCaseRules.rules.length} rules`],
          ["Quick wins", quickWins, "valuable and easy to do"],
          [
            "Ready to start now",
            all.filter((u) => u.phase === "Now").length,
            "in the next 6 months",
          ],
          [
            "Not on any plan today",
            all.filter((u) => u.initiatives.length === 0).length,
            "nothing on the 2026-27 roadmap covers them",
          ],
        ].map(([l, v, n]) => (
          <div key={l as string} className="px-5 py-3">
            <dt className="text-muted-foreground text-xs">{l}</dt>
            <dd className="tabular text-2xl font-semibold">{v}</dd>
            <dd className="text-muted-foreground text-[11px]">{n}</dd>
          </div>
        ))}
      </dl>

      {!detailed ? (
        <div className="grid items-start gap-6 xl:grid-cols-[1fr_1fr]">
          <section aria-label="Ideas ranked by priority">
            <h2 className="mb-3 text-sm font-semibold">Ideas, highest priority first</h2>
            <ol className="flex flex-col gap-2">
              {[...all]
                .sort((a, b) => b.priority - a.priority)
                .slice(0, 10)
                .map((u, i) => (
                  <li key={u.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(u.id)}
                      aria-pressed={sel?.id === u.id}
                      className={cn(
                        "bg-card hover:bg-accent/40 focus-visible:ring-ring flex w-full items-start gap-3 rounded-xl border p-3 text-left outline-none focus-visible:ring-2",
                        sel?.id === u.id && "border-primary ring-primary ring-1",
                      )}
                    >
                      <span className="text-muted-foreground tabular mt-0.5 w-5 text-right text-sm font-semibold">
                        {i + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[14px] font-medium">{u.title}</span>
                        <span className="text-muted-foreground mt-0.5 block text-[12px]">
                          Fixes{" "}
                          {capabilityLabel(u.primaryCapabilityId).includes("(")
                            ? capabilityLabel(u.primaryCapabilityId)
                            : `${capabilityLabel(u.primaryCapabilityId)} (${FUNCTION_SHORT[u.functionIds[0]!]})`}{" "}
                          · {PHASE_PLAIN[u.phase]}
                        </span>
                        <span className="mt-1.5 flex flex-wrap gap-1.5 text-[11px]">
                          <span className="bg-muted rounded px-1.5 py-0.5">{u.quadrant}</span>
                          {u.initiatives.length === 0 ? (
                            <span className="bg-whitespace/15 rounded px-1.5 py-0.5">
                              Not on any plan
                            </span>
                          ) : (
                            <span className="bg-muted rounded px-1.5 py-0.5">
                              Linked to {u.initiatives[0]!.title}
                            </span>
                          )}
                        </span>
                      </span>
                      <span className="text-right">
                        <span className="tabular block text-lg leading-none font-semibold">
                          {Math.round(u.priority)}
                        </span>
                        <span className="text-muted-foreground text-[10px]">priority</span>
                      </span>
                    </button>
                  </li>
                ))}
            </ol>
            {all.length > 10 && (
              <p className="text-muted-foreground mt-3 text-[13px]">
                {all.length - 10} more in the detailed view.
              </p>
            )}
          </section>
          <Card className="ai-surface xl:sticky xl:top-6" data-tour="uc-detail">
            <CardContent className="py-5">
              {sel ? (
                <UseCaseDetail u={sel} all={all} />
              ) : (
                <p className="text-muted-foreground text-sm">Select an idea.</p>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <>
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
            <ToggleGroup
              type="single"
              value={quad}
              onValueChange={(v) => v && setQuad(v as Quadrant | "all")}
              aria-label="Filter by quadrant"
            >
              <ToggleGroupItem value="all">All</ToggleGroupItem>
              {QUADRANTS.map((q) => (
                <ToggleGroupItem key={q} value={q}>
                  {q}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <span className="text-muted-foreground ml-auto flex items-center gap-3 text-[11px]">
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
            <Card className="ai-surface" data-tour="uc-detail-detailed">
              <CardContent className="py-5">
                {sel ? (
                  <UseCaseDetail u={sel} all={all} />
                ) : (
                  <p className="text-muted-foreground text-sm">No use cases match these filters.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <section aria-label="Use case list">
            <h2 className="mb-3 text-sm font-semibold">All use cases by priority</h2>
            <div className="bg-card overflow-hidden rounded-xl border">
              <table className="w-full text-left text-[13px]">
                <thead className="bg-muted/40 text-muted-foreground border-b text-[11px]">
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
                      className={cn(
                        "hover:bg-accent/50 focus-visible:bg-accent cursor-pointer outline-none",
                        sel?.id === u.id && "bg-accent/60",
                      )}
                      aria-selected={sel?.id === u.id}
                    >
                      <td className="px-3 py-2 font-medium">{u.title}</td>
                      <td className="text-muted-foreground px-3 py-2 text-xs">
                        {u.functionIds.map((f) => FUNCTION_SHORT[f]).join(", ")}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {capabilityLabel(u.primaryCapabilityId)}{" "}
                        <span className="text-muted-foreground tabular">
                          gap {u.gap.toFixed(1)}
                        </span>
                      </td>
                      <td className="tabular px-3 py-2 text-right">{Math.round(u.priority)}</td>
                      <td className="px-3 py-2 text-xs">{u.quadrant}</td>
                      <td className="px-3 py-2 text-xs">
                        {u.phase}
                        {u.pulledForward && (
                          <span className="text-muted-foreground ml-1">(prerequisite)</span>
                        )}
                      </td>
                      <td
                        className={cn(
                          "px-3 py-2 text-xs",
                          u.alignment === "WHITESPACE" && "text-whitespace font-medium",
                        )}
                      >
                        {ALIGNMENT_LABEL[u.alignment]}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
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

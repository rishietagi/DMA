"use client";
import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Sparkles } from "lucide-react";
import { useAssessment } from "@/components/providers/assessment-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Page, PageHeader } from "@/components/dma/page-header";
import { DetailOnly, PageIntro, useDetailed } from "@/components/dma/explain";
import { cn } from "@/lib/utils";
import type { Phase } from "@/lib/engine";
import { RoadmapSwimlane } from "@/components/dma/roadmap-swimlane";
import { runAgent } from "@/lib/ai/client";
import type { UseCase } from "@/lib/engine";
import { capabilityLabel, FUNCTION_SHORT, STATUS_LABEL } from "@/lib/labels";
import { seed } from "@/lib/seed";

/** Longest dependency chains, e.g. MDM → forecasting → fill rate. */
function chains(useCases: UseCase[]): UseCase[][] {
  const byId = new Map(useCases.map((u) => [u.id, u]));
  const dependents = (id: string) => useCases.filter((u) => u.dependsOn.includes(id));
  const out: UseCase[][] = [];
  const walk = (path: UseCase[]) => {
    const next = dependents(path[path.length - 1]!.id);
    if (!next.length) {
      if (path.length > 1) out.push(path);
      return;
    }
    next.forEach((n) => walk([...path, n]));
  };
  useCases.filter((u) => !u.dependsOn.some((d) => byId.has(d))).forEach((root) => walk([root]));
  return out.sort((a, b) => b.length - a.length).slice(0, 5);
}

function RoadmapInner() {
  const { result } = useAssessment();
  const params = useSearchParams();
  const [selected, setSelected] = React.useState<string | null>(params.get("uc"));
  React.useEffect(() => {
    const uc = params.get("uc");
    if (uc) setSelected(uc);
  }, [params]);
  const opps = Object.values(result.opportunities);
  const ws = opps.filter((o) => o.alignment === "WHITESPACE");
  const acc = opps.filter((o) => o.alignment === "ACCELERATE");
  const rev = opps.filter((o) => o.alignment === "REVISIT");
  const counts = (["Now", "Next", "Later"] as const)
    .map((p) => `${p} ${result.useCases.filter((u) => u.phase === p).length}`)
    .join(", ");
  const detailed = useDetailed();
  const statusCount = (s: "completed" | "in_progress" | "planned") =>
    seed.roadmap.initiatives.filter((i) => i.status === s).length;

  return (
    <Page className="max-w-[1600px]">
      <PageHeader
        stage={8}
        title="Roadmap & whitespaces"
        actions={
          <DetailOnly>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                void runAgent("roadmap", {
                  initiatives: seed.roadmap.initiatives.length,
                  phases: counts,
                  whitespaces: ws.length,
                  accelerate: acc.length,
                  whitespaceNames: ws.map((o) => capabilityLabel(o.capabilityId)).join(", "),
                })
              }
            >
              <Sparkles />
              Re-sequence
            </Button>
          </DetailOnly>
        }
      />

      <PageIntro
        what="When to do what. The ideas are put in order — start now, next, later — and compared with what Himalaya already has planned for 2026-27."
        todo="Look first at the gaps with nothing planned: they are the clearest new recommendations."
        how={[
          "Higher-priority ideas go earlier. An idea never starts before something it depends on (for example, clean master data comes before better forecasting).",
          "If a high-priority idea needs a lower-priority one first, that prerequisite is brought forward.",
          "“Gap with nothing planned” (a whitespace) = a capability at least one level short of its target, with no project on the current roadmap.",
          "“Speed up” (accelerate) = a project exists, but the gap is still two levels or more.",
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-4">
        <Card className="lg:col-span-2" data-tour="whitespaces">
          <CardHeader>
            <CardTitle>Gaps with nothing planned</CardTitle>
            <CardDescription>
              At least one level short of target, and no project on the 2026-27 roadmap.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2 pt-3" data-testid="whitespace-list">
            {ws.length === 0 && (
              <p className="text-muted-foreground text-sm">
                None — every material gap has an initiative.
              </p>
            )}
            {ws.map((o) => (
              <Link
                key={o.capabilityId}
                href={`/scoring?cap=${o.capabilityId}`}
                className="hatch border-whitespace/60 rounded-md border px-2.5 py-1.5 text-[13px] font-medium hover:underline"
              >
                {capabilityLabel(o.capabilityId)}
                <span className="text-muted-foreground ml-1.5 text-xs font-normal">
                  {
                    FUNCTION_SHORT[
                      seed.baseline.capabilities.find((c) => c.id === o.capabilityId)!
                        .primaryFunctionId
                    ]
                  }{" "}
                  · gap {o.gap.toFixed(1)}
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Projects to speed up</CardTitle>
            <CardDescription>
              A project exists, but the gap is still two levels or more.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-3 text-[13px]">
            <ul className="flex flex-col gap-1">
              {acc.slice(0, 6).map((o) => (
                <li key={o.capabilityId} className="leading-snug">
                  {capabilityLabel(o.capabilityId)}{" "}
                  <span className="text-muted-foreground text-xs">gap {o.gap.toFixed(1)}</span>
                </li>
              ))}
              {acc.length > 6 && (
                <li className="text-muted-foreground text-xs">+{acc.length - 6} more</li>
              )}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Existing roadmap</CardTitle>
            <CardDescription>
              {seed.roadmap.initiatives.length} initiatives as read from the 2026-27 deck.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1.5 pt-3 text-[13px]">
            {(["completed", "in_progress", "planned"] as const).map((s) => (
              <p key={s} className="flex items-center gap-2">
                <span
                  className={
                    s === "completed"
                      ? "bg-status-completed size-2 rounded-full"
                      : s === "in_progress"
                        ? "bg-status-progress size-2 rounded-full"
                        : "border-status-planned size-2 rounded-full border"
                  }
                />
                {STATUS_LABEL[s]}{" "}
                <span className="tabular text-muted-foreground ml-auto">{statusCount(s)}</span>
              </p>
            ))}
            <p className="text-muted-foreground pt-1 text-[11px]">
              {rev.length} completed {rev.length === 1 ? "initiative has" : "initiatives have"} an
              adoption gap (revisit). Statuses and mapping to be confirmed with the deck owner.
            </p>
          </CardContent>
        </Card>
      </div>

      {!detailed && (
        <section aria-label="Sequenced ideas" className="grid gap-4 md:grid-cols-3">
          {(["Now", "Next", "Later"] as Phase[]).map((p) => {
            const list = result.useCases
              .filter((u) => u.phase === p)
              .sort((a, b) => b.priority - a.priority);
            return (
              <div key={p} className="bg-card rounded-xl border p-4">
                <h2 className="text-sm font-semibold">
                  {p === "Now" ? "Start now" : p === "Next" ? "Next" : "Later"}
                </h2>
                <p className="text-muted-foreground text-xs">
                  {p === "Now" ? "0–6 months" : p === "Next" ? "6–12 months" : "12–24 months"} ·{" "}
                  {list.length} ideas
                </p>
                <ul className="mt-3 flex flex-col gap-2">
                  {list.map((u) => (
                    <li
                      key={u.id}
                      className={cn(
                        "rounded-lg border px-3 py-2",
                        u.alignment === "WHITESPACE" && "hatch border-whitespace/60",
                      )}
                    >
                      <p className="text-[13px] leading-snug font-medium">{u.title}</p>
                      <p className="text-muted-foreground mt-0.5 text-[11px]">
                        {u.functionIds.map((f) => FUNCTION_SHORT[f]).join(", ")}
                        {u.pulledForward ? " · needed first by another idea" : ""}
                        {u.dependsOn.length ? " · has a prerequisite" : ""}
                      </p>
                    </li>
                  ))}
                  {list.length === 0 && (
                    <li className="text-muted-foreground text-xs">Nothing here.</li>
                  )}
                </ul>
              </div>
            );
          })}
        </section>
      )}
      {!detailed && (
        <p className="text-muted-foreground -mt-3 flex items-center gap-2 text-xs">
          <span className="hatch border-whitespace/60 inline-block h-3 w-6 rounded border" aria-hidden /> Striped = fixes a gap that has
          nothing planned today.
        </p>
      )}

      <DetailOnly>
        <Card>
          <CardContent className="overflow-x-auto py-5">
            <div className="min-w-[940px]">
              <RoadmapSwimlane
                useCases={result.useCases}
                opportunities={result.opportunities}
                selected={selected}
                onSelect={setSelected}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dependency chains</CardTitle>
            <CardDescription>
              No use case is scheduled before the work it depends on; prerequisites are pulled
              forward when a priority item needs them.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-3">
            <ol className="flex flex-col gap-2">
              {chains(result.useCases).map((c) => (
                <li
                  key={c.map((u) => u.id).join(">")}
                  className="flex flex-wrap items-center gap-1.5 text-[13px]"
                >
                  {c.map((u, i) => (
                    <React.Fragment key={u.id}>
                      {i > 0 && (
                        <span className="text-muted-foreground" aria-hidden>
                          →
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => setSelected(u.id)}
                        className="bg-card hover:bg-accent focus-visible:ring-ring rounded-md border px-2 py-0.5 outline-none focus-visible:ring-2"
                      >
                        {u.title}{" "}
                        <span className="text-muted-foreground text-[11px]">{u.phase}</span>
                      </button>
                    </React.Fragment>
                  ))}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </DetailOnly>
    </Page>
  );
}

export default function RoadmapPage() {
  return (
    <React.Suspense>
      <RoadmapInner />
    </React.Suspense>
  );
}

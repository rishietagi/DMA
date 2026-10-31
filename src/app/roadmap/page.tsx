"use client";
import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Sparkles } from "lucide-react";
import { useAssessment } from "@/components/providers/assessment-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Page, PageHeader } from "@/components/dma/page-header";
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
  const counts = (["Now", "Next", "Later"] as const).map((p) => `${p} ${result.useCases.filter((u) => u.phase === p).length}`).join(", ");
  const statusCount = (s: "completed" | "in_progress" | "planned") => seed.roadmap.initiatives.filter((i) => i.status === s).length;

  return (
    <Page className="max-w-[1600px]">
      <PageHeader
        stage={8}
        title="Roadmap & whitespaces"
        description="Generated use cases sequenced by priority and dependency, next to what is already on Himalaya’s 2026-27 roadmap. Whitespaces are gaps of a level or more with no initiative; accelerate flags planned or in-flight work that is behind the gap."
        actions={
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
        }
      />

      <div className="grid gap-4 lg:grid-cols-4">
        <Card className="lg:col-span-2" data-tour="whitespaces">
          <CardHeader>
            <CardTitle>Whitespaces</CardTitle>
            <CardDescription>Gap ≥ 1 against target and nothing on the roadmap.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2 pt-3" data-testid="whitespace-list">
            {ws.length === 0 && <p className="text-sm text-muted-foreground">None — every material gap has an initiative.</p>}
            {ws.map((o) => (
              <Link key={o.capabilityId} href={`/scoring?cap=${o.capabilityId}`} className="hatch rounded-md border border-whitespace/60 px-2.5 py-1.5 text-[13px] font-medium hover:underline">
                {capabilityLabel(o.capabilityId)}
                <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                  {FUNCTION_SHORT[seed.baseline.capabilities.find((c) => c.id === o.capabilityId)!.primaryFunctionId]} · gap {o.gap.toFixed(1)}
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Accelerate</CardTitle>
            <CardDescription>Gap ≥ 2 with work only planned or in flight.</CardDescription>
          </CardHeader>
          <CardContent className="pt-3 text-[13px]">
            <ul className="flex flex-col gap-1">
              {acc.slice(0, 6).map((o) => (
                <li key={o.capabilityId} className="leading-snug">
                  {capabilityLabel(o.capabilityId)} <span className="text-xs text-muted-foreground">gap {o.gap.toFixed(1)}</span>
                </li>
              ))}
              {acc.length > 6 && <li className="text-xs text-muted-foreground">+{acc.length - 6} more</li>}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Existing roadmap</CardTitle>
            <CardDescription>{seed.roadmap.initiatives.length} initiatives as read from the 2026-27 deck.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1.5 pt-3 text-[13px]">
            {(["completed", "in_progress", "planned"] as const).map((s) => (
              <p key={s} className="flex items-center gap-2">
                <span className={s === "completed" ? "size-2 rounded-full bg-status-completed" : s === "in_progress" ? "size-2 rounded-full bg-status-progress" : "size-2 rounded-full border border-status-planned"} />
                {STATUS_LABEL[s]} <span className="ml-auto tabular text-muted-foreground">{statusCount(s)}</span>
              </p>
            ))}
            <p className="pt-1 text-[11px] text-muted-foreground">
              {rev.length} completed {rev.length === 1 ? "initiative has" : "initiatives have"} an adoption gap (revisit). Statuses and mapping to be confirmed with the deck owner.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="overflow-x-auto py-5">
          <div className="min-w-[940px]">
            <RoadmapSwimlane useCases={result.useCases} opportunities={result.opportunities} selected={selected} onSelect={setSelected} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dependency chains</CardTitle>
          <CardDescription>No use case is scheduled before the work it depends on; prerequisites are pulled forward when a priority item needs them.</CardDescription>
        </CardHeader>
        <CardContent className="pt-3">
          <ol className="flex flex-col gap-2">
            {chains(result.useCases).map((c) => (
              <li key={c.map((u) => u.id).join(">")} className="flex flex-wrap items-center gap-1.5 text-[13px]">
                {c.map((u, i) => (
                  <React.Fragment key={u.id}>
                    {i > 0 && <span className="text-muted-foreground" aria-hidden>→</span>}
                    <button type="button" onClick={() => setSelected(u.id)} className="rounded-md border bg-card px-2 py-0.5 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring outline-none">
                      {u.title} <span className="text-[11px] text-muted-foreground">{u.phase}</span>
                    </button>
                  </React.Fragment>
                ))}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
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

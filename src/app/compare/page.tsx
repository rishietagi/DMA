"use client";
import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Sparkles } from "lucide-react";
import {
  CartesianGrid,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { useAssessment } from "@/components/providers/assessment-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { HeatmapGrid } from "@/components/dma/heatmap-grid";
import { MaturityLegend } from "@/components/dma/maturity";
import { Page, PageHeader } from "@/components/dma/page-header";
import { runAgent } from "@/lib/ai/client";
import { themeMatrix } from "@/lib/classifier";
import { DIMENSION_LABELS, formatMean, formatScore } from "@/lib/engine";
import { capabilityLabel, FUNCTION_SHORT, functionName } from "@/lib/labels";
import { DIMENSIONS, FUNCTION_IDS, type FunctionId } from "@/lib/schema";
import { useSession } from "@/lib/store/session";
import { cn } from "@/lib/utils";

function CompareInner() {
  const { result } = useAssessment();
  const evidence = useSession((s) => s.evidence);
  const rag = useSession((s) => s.ragView);
  const setRag = useSession((s) => s.setRagView);
  const params = useSearchParams();
  const router = useRouter();
  const fn = (params.get("fn") as FunctionId | null) ?? "sales-ecom";
  const setFn = (f: FunctionId) => router.replace(`/compare?fn=${f}`, { scroll: false });

  const f = result.functions.find((x) => x.fn.id === fn)!;
  const enterpriseDims = Object.fromEntries(
    DIMENSIONS.map((d) => {
      const vals = result.functions.map((x) => x.dimensions[d]).filter((v): v is number => v !== undefined);
      return [d, vals.reduce((a, b) => a + b, 0) / vals.length];
    }),
  );
  const radarData = DIMENSIONS.map((d) => ({ dim: DIMENSION_LABELS[d].replace(" & Analytics", ""), fn: f.dimensions[d] ?? 0, all: enterpriseDims[d] }));

  const themes = themeMatrix(evidence);
  const maxCell = Math.max(1, ...themes.flatMap((t) => Object.values(t.byFunction).map((l) => l?.length ?? 0)));
  const topTheme = themes[0];

  const scatter = result.capabilities
    .filter((c) => c.inScope)
    .map((c) => ({
      x: c.self,
      y: Math.round(c.effectiveScore * 100) / 100,
      z: 1,
      name: capabilityLabel(c.capability.id),
      group: c.capability.group,
      id: c.capability.id,
    }));

  return (
    <Page>
      <PageHeader
        stage={6}
        title="Compare & themes"
        description="The same rubric across every function, so Marketing, Sales, Supply Chain, Finance, R&D and HR can be compared like for like — and recurring problems show up as shared themes."
        actions={
          <>
            <ToggleGroup type="single" value={rag ? "rag" : "ramp"} onValueChange={(v) => v && setRag(v === "rag")} aria-label="Colour scale">
              <ToggleGroupItem value="ramp">Ramp</ToggleGroupItem>
              <ToggleGroupItem value="rag">RAG</ToggleGroupItem>
            </ToggleGroup>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void runAgent("compare", { topTheme: topTheme && topTheme.total ? `${topTheme.label} (${Object.keys(topTheme.byFunction).map((k) => FUNCTION_SHORT[k as FunctionId]).join(", ")})` : "none yet" })}
            >
              <Sparkles />
              Normalise themes
            </Button>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.25fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Heatmap</CardTitle>
            <CardDescription>Select a function to compare its profile with the enterprise.</CardDescription>
          </CardHeader>
          <CardContent>
            <HeatmapGrid functions={result.functions} rag={rag} onSelect={(id) => setFn(id)} />
            <MaturityLegend rag={rag} className="mt-3" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{functionName(fn)} vs all functions</CardTitle>
            <CardDescription>
              Overall {formatMean(f.score)} (self-assessed {formatMean(f.selfScore)}).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[330px]" role="img" aria-label={`Radar of ${functionName(fn)} by dimension: ${radarData.map((r) => `${r.dim} ${formatScore(r.fn)}`).join(", ")}`}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} outerRadius="80%">
                  <PolarGrid stroke="var(--border)" />
                  <PolarAngleAxis dataKey="dim" tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
                  <PolarRadiusAxis domain={[0, 5]} tickCount={6} tick={false} axisLine={false} />
                  <Radar name="All functions" dataKey="all" stroke="var(--muted-foreground)" fill="var(--muted-foreground)" fillOpacity={0.08} strokeDasharray="4 3" isAnimationActive={false} />
                  <Radar name={FUNCTION_SHORT[fn]} dataKey="fn" stroke="var(--maturity-4)" fill="var(--maturity-4)" fillOpacity={0.3} isAnimationActive={false} />
                  <RTooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => v.toFixed(2)} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex gap-4 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-0.5 w-4 bg-[var(--maturity-4)]" /> {FUNCTION_SHORT[fn]}</span>
              <span className="tabular">Rings at levels 1–5
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-0 w-4 border-t border-dashed border-muted-foreground" /> Average of all functions
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cross-functional themes</CardTitle>
          <CardDescription>
            Pain points from documents and interviews, normalised to a fixed taxonomy and counted by function. Themes that span functions are
            candidates for shared solutions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {themes.every((t) => t.total === 0) ? (
            <p className="text-sm text-muted-foreground">No pain points classified yet. Load evidence in the evidence hub.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] table-fixed border-separate border-spacing-1 text-center" aria-label="Themes by function">
                <thead>
                  <tr>
                    <th scope="col" className="w-60 text-left text-[11px] font-medium text-muted-foreground">
                      Theme
                    </th>
                    {FUNCTION_IDS.map((id) => (
                      <th key={id} scope="col" className="text-[11px] font-medium text-muted-foreground">
                        {FUNCTION_SHORT[id]}
                      </th>
                    ))}
                    <th scope="col" className="w-14 text-[11px] font-medium text-muted-foreground">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {themes.map((t) => {
                    const spread = Object.keys(t.byFunction).length;
                    return (
                      <tr key={t.themeId}>
                        <th scope="row" className="text-left text-[13px] font-normal">
                          {t.label}
                          {spread >= 3 && <span className="ml-1.5 rounded bg-ai-soft px-1 text-[10px] whitespace-nowrap text-ai-foreground">{spread} functions</span>}
                        </th>
                        {FUNCTION_IDS.map((id) => {
                          const n = t.byFunction[id]?.length ?? 0;
                          return (
                            <td
                              key={id}
                              className={cn("h-8 rounded-md text-xs tabular", n === 0 && "text-muted-foreground/40")}
                              style={n ? { background: `color-mix(in oklch, var(--confidence-low) ${15 + (n / maxCell) * 45}%, transparent)` } : undefined}
                              title={t.byFunction[id]?.map((e) => `“${e.quote}”`).join("\n")}
                            >
                              {n || "·"}
                            </td>
                          );
                        })}
                        <td className="text-xs font-semibold tabular">{t.total}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Self-assessment vs current score</CardTitle>
          <CardDescription>Points below the line were rated higher in 2025 than the evidence now supports.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[340px]" role="img" aria-label="Scatter of 2025 self-assessment against current score per capability">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 24, bottom: 28, left: 4 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis type="number" dataKey="x" domain={[0.5, 5.5]} ticks={[1, 2, 3, 4, 5]} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} label={{ value: "2025 self-assessment", position: "insideBottom", offset: -16, fill: "var(--muted-foreground)", fontSize: 11 }} />
                <YAxis type="number" dataKey="y" domain={[0.5, 5.5]} ticks={[1, 2, 3, 4, 5]} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} label={{ value: "Current", angle: -90, position: "insideLeft", fill: "var(--muted-foreground)", fontSize: 11 }} />
                <ZAxis type="number" dataKey="z" range={[60, 60]} />
                <ReferenceLine segment={[{ x: 0.5, y: 0.5 }, { x: 5.5, y: 5.5 }]} stroke="var(--muted-foreground)" strokeDasharray="4 4" />
                <RTooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  content={({ payload }) => {
                    const p = payload?.[0]?.payload as (typeof scatter)[number] | undefined;
                    return p ? (
                      <div className="rounded-md border bg-popover px-2.5 py-1.5 text-xs shadow">
                        <p className="font-medium">{p.name}</p>
                        <p className="text-muted-foreground">
                          Self {formatScore(p.x)} · now {formatScore(p.y)}
                        </p>
                      </div>
                    ) : null;
                  }}
                />
                <Scatter name="CPD" data={scatter.filter((s) => s.group === "cpd")} fill="var(--ai-accent)" fillOpacity={0.7} isAnimationActive={false} onClick={(p) => router.push(`/scoring?cap=${(p as unknown as { id: string }).id}`)} />
                <Scatter name="Enterprise" data={scatter.filter((s) => s.group === "enterprise")} fill="var(--maturity-4)" fillOpacity={0.75} isAnimationActive={false} onClick={(p) => router.push(`/scoring?cap=${(p as unknown as { id: string }).id}`)} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-4 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-ai" /> CPD
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-[var(--maturity-4)]" /> Enterprise
            </span>
          </div>
        </CardContent>
      </Card>
    </Page>
  );
}

export default function ComparePage() {
  return (
    <React.Suspense>
      <CompareInner />
    </React.Suspense>
  );
}

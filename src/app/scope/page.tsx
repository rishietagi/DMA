"use client";
import * as React from "react";
import { Lock, RotateCcw } from "lucide-react";
import { useAssessment } from "@/components/providers/assessment-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/overlays";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MaturityChip, maturityStyle } from "@/components/dma/maturity";
import { Page, PageHeader } from "@/components/dma/page-header";
import { InfoTip, PageIntro, useDetailed } from "@/components/dma/explain";
import { runAgent } from "@/lib/ai/client";
import { recalcContext } from "@/lib/ai/contexts";
import { assess, DEFAULT_WEIGHTS, DIMENSION_LABELS, formatDelta, formatMean, gateLabel, gatesByLevel, targetFor } from "@/lib/engine";
import { capabilityLabel } from "@/lib/labels";
import { DIMENSIONS, type Dimension } from "@/lib/schema";
import { seed } from "@/lib/seed";
import { buildInput } from "@/lib/store/build-input";
import { useSession } from "@/lib/store/session";
import { cn } from "@/lib/utils";

const TARGETS = [2.5, 3, 3.5, 4, 4.5, 5];

function WeightsCard() {
  const { result, input } = useAssessment();
  const weights = useSession((s) => s.weights);
  const setWeight = useSession((s) => s.setWeight);
  const resetWeights = useSession((s) => s.resetWeights);
  const sum = DIMENSIONS.reduce((a, d) => a + weights[d], 0) || 1;
  const reference = React.useMemo(() => assess({ ...input, weights: DEFAULT_WEIGHTS }), [input]);
  const movers = result.capabilities
    .filter((c) => c.inScope)
    .map((c) => ({ c, d: c.evidenceScore - reference.byId[c.capability.id]!.evidenceScore }))
    .filter((x) => Math.abs(x.d) >= 0.01)
    .sort((a, b) => Math.abs(b.d) - Math.abs(a.d))
    .slice(0, 4);
  const detailed = useDetailed();
  const changed = DIMENSIONS.some((d) => Math.abs(weights[d] - DEFAULT_WEIGHTS[d]) > 1e-9);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const narrate = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void runAgent("recalculate", recalcContext(assess(buildInput(useSession.getState()))), { open: false });
    }, 400);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle>How much each area counts</CardTitle>
            <CardDescription>Every capability score blends these four areas. Drag a slider and every score in the app updates immediately.</CardDescription>
          </div>
          <Button variant="ghost" size="xs" onClick={resetWeights} disabled={!changed}>
            <RotateCcw />
            Reset
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {DIMENSIONS.map((d) => (
          <div key={d} className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between text-[13px]">
              <span className="font-medium">{DIMENSION_LABELS[d]}</span>
              <span className="tabular text-muted-foreground">
                <span className="font-semibold text-foreground">{Math.round((weights[d] / sum) * 100)}%</span>
                {Math.abs(weights[d] - DEFAULT_WEIGHTS[d]) > 1e-9 && <span> (default {Math.round(DEFAULT_WEIGHTS[d] * 100)}%)</span>}
              </span>
            </div>
            <Slider
              aria-label={`${DIMENSION_LABELS[d]} weight`}
              value={[Math.round(weights[d] * 100)]}
              min={0}
              max={60}
              step={1}
              onValueChange={([v]) => setWeight(d, (v ?? 0) / 100)}
              onValueCommit={narrate}
            />
          </div>
        ))}
        <div className="grid grid-cols-2 gap-3 rounded-lg bg-muted/50 p-3">
          <div>
            <p className="text-[11px] text-muted-foreground">Enterprise mean</p>
            <p className="text-lg font-semibold tabular">
              {formatMean(result.kpis.enterprise.mean)}
              <span className="ml-1.5 text-xs font-normal text-muted-foreground">at default {formatMean(reference.kpis.enterprise.mean)}</span>
            </p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">CPD mean</p>
            <p className="text-lg font-semibold tabular">
              {formatMean(result.kpis.cpd.mean)}
              <span className="ml-1.5 text-xs font-normal text-muted-foreground">at default {formatMean(reference.kpis.cpd.mean)}</span>
            </p>
          </div>
        </div>
        {detailed && movers.length > 0 && (
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">Most affected by your weights</p>
            <ul className="divide-y text-[13px]">
              {movers.map(({ c, d }) => (
                <li key={c.capability.id} className="flex items-center justify-between py-1.5">
                  <span className="truncate">{capabilityLabel(c.capability.id)}</span>
                  <span className="text-xs tabular text-muted-foreground">
                    {c.evidenceScore.toFixed(2)} ({d > 0 ? "+" : "−"}
                    {Math.abs(d).toFixed(2)})
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RubricExplorer() {
  const [dim, setDim] = React.useState<Dimension>("process");
  const detailed = useDetailed();
  return (
    <Card>
      <CardHeader>
        <CardTitle>What each level means</CardTitle>
        <CardDescription>The same 1–5 scale Himalaya used in 2025, described for each of the four areas.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={dim} onValueChange={(v) => setDim(v as Dimension)}>
          <TabsList>
            {seed.rubric.dimensions.map((d) => (
              <TabsTrigger key={d.id} value={d.id}>
                {d.name}
              </TabsTrigger>
            ))}
          </TabsList>
          {seed.rubric.dimensions.map((d) => {
            const gates = gatesByLevel(d);
            return (
              <TabsContent key={d.id} value={d.id} className="flex flex-col gap-3">
                <p className="text-[13px] text-muted-foreground">{d.journey}.</p>
                <ol className="grid grid-cols-5 gap-2">
                  {([1, 2, 3, 4, 5] as const).map((l) => (
                    <li key={l} className="flex flex-col rounded-lg border bg-card">
                      <div className="flex items-center gap-2 rounded-t-lg px-3 py-2" style={maturityStyle(l)}>
                        <span className="text-sm font-semibold tabular">{l}</span>
                        <span className="truncate text-xs font-medium">{seed.rubric.scale[String(l) as "1"]}</span>
                      </div>
                      <div className="flex flex-1 flex-col gap-2 p-3">
                        <p className="text-xs leading-relaxed">{d.levels[String(l) as "1"]}</p>
                        {l > 1 && gates[l as 2].length > 0 && (
                          <p className="mt-auto flex items-start gap-1 text-[11px] text-muted-foreground">
                            <Lock className="mt-px size-3 shrink-0" aria-hidden />
                            Needs proof of {gates[l as 2].map(gateLabel).join(", ")}
                          </p>
                        )}
                        {detailed && <p className="text-[10px] text-muted-foreground/80">
                          {[seed.rubric.frameworkCrosswalk.acatech?.[String(l)], seed.rubric.frameworkCrosswalk.mitreAI?.[String(l)], d.id === "ai" ? seed.rubric.frameworkCrosswalk.gartnerAI?.[String(l)] : undefined]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>}
                      </div>
                    </li>
                  ))}
                </ol>
              </TabsContent>
            );
          })}
        </Tabs>
      </CardContent>
    </Card>
  );
}

function ScopeTree() {
  const { result } = useAssessment();
  const excluded = useSession((s) => s.excluded);
  const toggle = useSession((s) => s.toggleScope);
  const overrides = useSession((s) => s.targetOverrides);
  const setTarget = useSession((s) => s.setTarget);
  const inScope = result.capabilities.filter((c) => c.inScope).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Capabilities in scope</CardTitle>
        <CardDescription>
          Switch off anything that should not be assessed. Each capability has a target level{" "}
          <InfoTip>
            Targets set the ambition: 4 for capabilities linked to Himalaya’s five 2026 priorities, 3.5 for sales and marketing, 3 for the
            rest. The gap between the current score and the target drives the recommendations.
          </InfoTip>{" "}
          — the number on the right is how far each one is from it. {inScope} of {result.capabilities.length} in scope.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {seed.baseline.functions.map((fn) => {
          const caps = result.capabilities.filter((c) => c.capability.primaryFunctionId === fn.id);
          return (
            <section key={fn.id}>
              <h3 className="mb-1 flex items-baseline gap-2 text-[13px] font-semibold">
                {fn.name}
                <span className="text-[11px] font-normal text-muted-foreground">{fn.group === "cpd" ? "CPD" : "Enterprise"}</span>
              </h3>
              <ul className="divide-y rounded-lg border">
                {caps.map((c) => {
                  const id = c.capability.id;
                  const isIn = !excluded.includes(id);
                  const defaultTarget = targetFor(c.capability, seed.baseline);
                  const t = overrides[id] ?? defaultTarget;
                  return (
                    <li key={id} className={cn("flex items-center gap-3 px-3 py-2", !isIn && "opacity-55")}>
                      <Switch checked={isIn} onCheckedChange={() => toggle(id)} aria-label={`${capabilityLabel(id)} in scope`} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px]">{c.capability.name}</p>
                        {c.capability.system && <p className="truncate text-[11px] text-muted-foreground">{c.capability.system}</p>}
                      </div>
                      <MaturityChip score={c.self} size="sm" provenance="self" label={`Self-assessed ${c.self}`} />
                      <Select value={String(t)} onValueChange={(v) => setTarget(id, Number(v) === defaultTarget ? null : Number(v))} disabled={!isIn}>
                        <SelectTrigger size="sm" className="h-7 w-[88px] text-xs" aria-label={`Target for ${capabilityLabel(id)}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TARGETS.map((x) => (
                            <SelectItem key={x} value={String(x)}>
                              Target {x.toFixed(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="w-10 text-right text-[11px] tabular text-muted-foreground" title="Gap to target">
                        {formatDelta(Math.max(0, t - c.effectiveScore))}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </CardContent>
    </Card>
  );
}

export default function ScopePage() {
  return (
    <Page>
      <PageHeader
        stage={1}
        title="Scope & framework"
      />
      <PageIntro
        what="Decide what gets assessed and how it is scored, before any evidence comes in."
        todo="Usually agreed once at kick-off. Try dragging a slider to see every score in the app change."
        how={[
          "Himalaya’s 2025 method is kept: four areas (process, data, AI, people) and a 1–5 scale.",
          "Each capability gets a score per area; the four are blended using the weights on the right (process counts most by default).",
          "Each level has a plain description (below). A level can only be claimed if the basics of the level beneath it are proven — e.g. “integrated” needs proof the systems are connected.",
          "Targets express ambition per capability. The gap to target is what turns into recommendations later.",
        ]}
      />
      <div className="grid items-start gap-6 xl:grid-cols-[1.15fr_1fr]">
        <ScopeTree />
        <div className="flex flex-col gap-6 xl:sticky xl:top-6">
          <WeightsCard />
        </div>
      </div>
      <RubricExplorer />
    </Page>
  );
}

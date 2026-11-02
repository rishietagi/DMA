"use client";
import * as React from "react";
import { FileText, MessageSquare, Sparkles, ThumbsDown, ThumbsUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/overlays";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useProcesses } from "@/components/providers/process-provider";
import { findContradictions } from "@/lib/classifier/insights";
import { EVIDENCE_CATEGORY_LABELS, toLadder, type EvidenceItem } from "@/lib/engine";
import { functionName } from "@/lib/labels";
import { processLens } from "@/lib/process-lens";
import { useSession } from "@/lib/store/session";
import { cn } from "@/lib/utils";
import { HighlightedQuote } from "./evidence-card";
import { KpiStrip } from "./kpi-strip";
import { LevelChip } from "./ladder";
import { ProcessChain, ProcessCoverage } from "./process-chain";

export function useLens() {
  const functionId = useSession((s) => s.functionId);
  const evidence = useSession((s) => s.evidence);
  return React.useMemo(() => processLens(functionId, evidence), [functionId, evidence]);
}

export function QuoteCard({ e, step }: { e: EvidenceItem; step?: string }) {
  const Icon = e.sourceType === "interview" ? MessageSquare : FileText;
  return (
    <article className="ai-surface flex flex-col gap-2 rounded-xl p-3" aria-label={`Quote from ${e.stakeholder ?? e.docTitle}`}>
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-ai-foreground">
          <Sparkles className="size-3" aria-hidden />
          AI extracted
        </span>
        {e.polarity !== "neutral" && (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium",
              e.polarity === "pain" ? "bg-conf-low/12 text-conf-low" : "bg-validated/12 text-validated",
            )}
          >
            {e.polarity === "pain" ? <ThumbsDown className="size-3" aria-hidden /> : <ThumbsUp className="size-3" aria-hidden />}
            {e.polarity === "pain" ? "Pain point" : "Strength"}
          </span>
        )}
        <LevelChip score={e.level === null ? null : toLadder(e.level)} size="sm" className="ml-auto" />
      </div>
      <blockquote className="text-[13px] leading-relaxed">
        “<HighlightedQuote text={e.quote} cues={e.cues} />”
      </blockquote>
      <p className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
        <span className="inline-flex min-w-0 items-center gap-1">
          <Icon className="size-3 shrink-0" aria-hidden />
          <span className="truncate">{e.stakeholder ?? e.docTitle}</span>
        </span>
        <span>{e.location}</span>
        <span className="rounded bg-muted px-1">{EVIDENCE_CATEGORY_LABELS[e.category]}</span>
        {step && <span className="rounded border px-1">{step}</span>}
      </p>
    </article>
  );
}

/** "What the AI found": headline counts, the process chain and a filterable quote feed. */
export function Findings() {
  const { result } = useProcesses();
  const functionId = useSession((s) => s.functionId);
  const lens = useLens();
  const [step, setStep] = React.useState("all");
  const [pol, setPol] = React.useState<"all" | "pain" | "strength">("all");

  const items = lens.steps.flatMap((s) => s.evidence.map((e) => ({ e, step: s.step })));
  const shown = items.filter((x) => (step === "all" || x.step === step) && (pol === "all" || x.e.polarity === pol));
  const contradictions = findContradictions(items.map((x) => x.e)).length;

  return (
    <div className="flex flex-col gap-6">
      <KpiStrip
        stats={[
          { label: "Sentences mapped", value: items.length, format: (n) => String(Math.round(n)), note: `to ${functionName(functionId)} processes`, tone: "ai" },
          { label: "Documents behind them", value: new Set(items.map((x) => x.e.docId)).size, format: (n) => String(Math.round(n)) },
          { label: "Strengths", value: items.filter((x) => x.e.polarity === "strength").length, format: (n) => String(Math.round(n)) },
          { label: "Pain points", value: items.filter((x) => x.e.polarity === "pain").length, format: (n) => String(Math.round(n)), tone: "warn" },
          { label: "Sources disagree", value: contradictions, format: (n) => String(Math.round(n)), note: "interview vs document" },
          { label: "Hand-off score", value: lens.index, format: (n) => n.toFixed(1), note: "systems + manual hand-offs per step" },
        ]}
      />

      <Card data-tour="chain">
        <CardHeader>
          <CardTitle>The process, step by step</CardTitle>
          <p className="text-[13px] text-muted-foreground">Each L1 step with its suggested level, the systems named, and where work drops into manual steps.</p>
        </CardHeader>
        <CardContent>
          <ProcessChain steps={lens.steps.filter((s) => result.processes.some((p) => p.id === s.id))} results={result.processes} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row flex-wrap items-end justify-between gap-3">
          <div>
            <CardTitle>Every quote, with its source</CardTitle>
            <p className="text-[13px] text-muted-foreground tabular">
              {shown.length} of {items.length} shown. Highlighted words are what the AI keyed on.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={step} onValueChange={setStep}>
              <SelectTrigger size="sm" className="w-56" aria-label="Filter by process">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All processes</SelectItem>
                {lens.steps.map((s) => (
                  <SelectItem key={s.id} value={s.step}>
                    {s.step} ({s.evidence.length})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ToggleGroup type="single" value={pol} onValueChange={(v) => v && setPol(v as typeof pol)} aria-label="Filter by kind">
              <ToggleGroupItem value="all">All</ToggleGroupItem>
              <ToggleGroupItem value="strength">Strengths</ToggleGroupItem>
              <ToggleGroupItem value="pain">Pain points</ToggleGroupItem>
            </ToggleGroup>
          </div>
        </CardHeader>
        <CardContent>
          {shown.length ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {shown.map((x) => (
                <QuoteCard key={x.e.id} e={x.e} step={step === "all" ? x.step : undefined} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nothing yet. Load the demo pack or drop a document on the first tab.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/** Coverage card for the first tab. */
export function CoverageCard() {
  const { result } = useProcesses();
  const lens = useLens();
  return (
    <Card>
      <CardHeader>
        <CardTitle>What we have per process</CardTitle>
        <p className="text-[13px] text-muted-foreground">Sentences found, by document type. Empty cells are what to ask for next.</p>
      </CardHeader>
      <CardContent>
        <ProcessCoverage steps={lens.steps.filter((s) => result.processes.some((p) => p.id === s.id))} />
      </CardContent>
    </Card>
  );
}

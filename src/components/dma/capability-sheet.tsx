"use client";
import * as React from "react";
import { FileText, History, MessageSquareQuote, RotateCcw, ShieldCheck, Sparkles, UserPen } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/form-controls";
import { Label } from "@/components/ui/misc";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/overlays";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DIMENSION_LABELS,
  EVIDENCE_CATEGORY_LABELS,
  formatConfidence,
  formatDelta,
  formatScore,
  getRubricDimension,
  levelDescriptor,
  SOURCE_RELIABILITY,
  type CapabilityResult,
  type DimensionScore,
} from "@/lib/engine";
import { capabilityLabel, functionName } from "@/lib/labels";
import { DIMENSIONS, type Dimension, type Indicator } from "@/lib/schema";
import { seed } from "@/lib/seed";
import { useSession } from "@/lib/store/session";
import { cn } from "@/lib/utils";
import { BAND_LABEL, ConfidenceRing } from "./confidence-ring";
import { FlagRow } from "./flags";
import { MaturityChip } from "./maturity";
import { ProvenanceLabel } from "./provenance";

const SOURCE_LABEL: Record<Indicator["sourceType"], string> = {
  artifact: "Artefact",
  kpi: "KPI extract",
  system: "System",
  questionnaire: "Questionnaire",
  interview: "Interview",
  self_assessment: "Self-assessment",
};

/** Highlight cue words in a quote. */
export function HighlightedQuote({ text, cues = [] }: { text: string; cues?: string[] }) {
  if (!cues.length) return <>{text}</>;
  const re = new RegExp(`(${cues.map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
  return (
    <>
      {text.split(re).map((part, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="rounded-[3px] bg-ai-soft px-0.5 text-ai-foreground">
            {part}
          </mark>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        ),
      )}
    </>
  );
}

function IndicatorRow({ i, cues }: { i: Indicator; cues?: string[] }) {
  const quote = i.sourceRef?.quote;
  return (
    <li className="flex gap-3 py-2.5">
      <MaturityChip score={i.level} size="sm" provenance={i.sourceType === "self_assessment" ? "self" : "plain"} />
      <div className="min-w-0 flex-1">
        {i.sourceType === "questionnaire" ? (
          <>
            <p className="text-[13px]">{i.label}</p>
            {quote && <p className="mt-0.5 text-xs text-muted-foreground">Answer: “{quote}”</p>}
          </>
        ) : quote ? (
          <blockquote className="border-l-2 border-ai/40 pl-2.5 text-[13px] leading-relaxed">
            <HighlightedQuote text={quote} cues={cues} />
          </blockquote>
        ) : (
          <p className="text-[13px]">{i.label}</p>
        )}
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
          <span className="font-medium text-foreground/80">{SOURCE_LABEL[i.sourceType]}</span>
          {i.sourceRef?.docTitle && i.sourceType !== "questionnaire" && <span>{i.sourceRef.docTitle}</span>}
          {i.sourceRef?.location && <span>{i.sourceRef.location}</span>}
          {i.sourceRef?.stakeholder && <span>{i.sourceRef.stakeholder}</span>}
          <span>
            weight {i.weight} × reliability {SOURCE_RELIABILITY[i.sourceType].toFixed(2)}
          </span>
          {i.gateKey && <span className="rounded bg-muted px-1">gate: {i.gateKey.split(".")[1]?.replace(/_/g, " ")}</span>}
        </p>
      </div>
    </li>
  );
}

function DimensionBreakdown({ d, weight }: { d: DimensionScore; weight: number }) {
  const dim = getRubricDimension(seed.rubric, d.dimension);
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-center gap-2">
        <p className="text-[13px] font-semibold">{DIMENSION_LABELS[d.dimension]}</p>
        <span className="text-[11px] text-muted-foreground tabular">weight {Math.round(weight * 100)}%</span>
        <span className="ml-auto">
          <MaturityChip score={d.final} size="sm" />
        </span>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2 text-center">
        {[
          ["Raw", d.raw.toFixed(2)],
          ["Gated", d.gated.toFixed(2)],
          ["Final", formatScore(d.final)],
        ].map(([l, v]) => (
          <div key={l} className="rounded-md bg-muted/60 px-2 py-1.5">
            <p className="text-[10px] text-muted-foreground">{l}</p>
            <p className="text-[13px] font-semibold tabular">{v}</p>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        L{Math.floor(d.final)}: {levelDescriptor(dim, d.final)}
      </p>
      <p className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
        <ConfidenceRing value={d.confidence} band={d.confidenceBand} size={14} />
        {BAND_LABEL[d.confidenceBand]} confidence ({formatConfidence(d.confidence)}) — coverage {formatConfidence(d.confidenceBreakdown.coverage)},
        agreement {formatConfidence(d.confidenceBreakdown.agreement)}, quality {formatConfidence(d.confidenceBreakdown.quality)}
      </p>
    </div>
  );
}

const HALF_POINTS = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];

function ValidationPanel({ c }: { c: CapabilityResult }) {
  const accept = useSession((s) => s.accept);
  const override = useSession((s) => s.override);
  const revert = useSession((s) => s.revert);
  const [mode, setMode] = React.useState<"idle" | "override">("idle");
  const [score, setScore] = React.useState(String(Math.round(c.evidenceScore * 2) / 2));
  const [rationale, setRationale] = React.useState("");
  const [touched, setTouched] = React.useState(false);
  const tooShort = rationale.trim().length < 15;

  React.useEffect(() => {
    setMode("idle");
    setRationale("");
    setTouched(false);
    setScore(String(Math.round(c.evidenceScore * 2) / 2));
  }, [c.capability.id, c.evidenceScore]);

  if (c.status !== "suggested" && mode === "idle") {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <ShieldCheck className="size-5 text-validated" aria-hidden />
        <div className="min-w-0 flex-1 text-[13px]">
          <p className="font-medium">
            {c.status === "overridden" ? "Overridden" : "Accepted"} at {formatScore(c.effectiveScore)} by {c.validation?.by}
          </p>
          <p className="truncate text-xs text-muted-foreground">“{c.validation?.rationale}”</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setMode("override")}>
          <UserPen />
          Change
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            revert(c.capability.id);
            toast("Returned to AI-suggested score");
          }}
        >
          <RotateCcw />
          Revert
        </Button>
      </div>
    );
  }

  if (mode === "override") {
    return (
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          setTouched(true);
          if (tooShort) return;
          override(c.capability.id, c.evidenceScore, Number(score), rationale.trim());
          toast.success(`${capabilityLabel(c.capability.id)} set to ${formatScore(Number(score))}`, { description: "Override recorded with rationale." });
          setMode("idle");
        }}
      >
        <div className="flex items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="override-score">Validated score</Label>
            <Select value={score} onValueChange={setScore}>
              <SelectTrigger id="override-score" className="w-28" size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HALF_POINTS.map((p) => (
                  <SelectItem key={p} value={String(p)}>
                    {p.toFixed(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="pb-1.5 text-xs text-muted-foreground">
            AI suggested {formatScore(c.evidenceScore)} · self {formatScore(c.self)}
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="override-rationale">Rationale (required)</Label>
          <Textarea
            id="override-rationale"
            value={rationale}
            onChange={(e) => setRationale(e.target.value)}
            onBlur={() => setTouched(true)}
            placeholder="What did you see that the evidence does not show? e.g. Field visits confirm partial adoption; no closed-loop learning."
            aria-invalid={touched && tooShort}
            aria-describedby="rationale-help"
            className="min-h-20"
          />
          <p id="rationale-help" className={cn("text-xs", touched && tooShort ? "text-destructive" : "text-muted-foreground")}>
            {touched && tooShort ? "Add a rationale of at least 15 characters — overrides are audited." : "Stored with the before and after score in the audit trail."}
          </p>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => setMode("idle")}>
            Cancel
          </Button>
          <Button type="submit" size="sm" data-testid="save-override">
            Save override
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <p className="mr-auto flex items-center gap-1.5 text-[13px]">
        <Sparkles className="size-4 text-ai" aria-hidden />
        AI suggests <span className="font-semibold tabular">{formatScore(c.evidenceScore)}</span>
      </p>
      <Button variant="outline" size="sm" onClick={() => setMode("override")} data-testid="override">
        <UserPen />
        Override
      </Button>
      <Button
        size="sm"
        data-testid="accept"
        onClick={() => {
          accept(c.capability.id, c.evidenceScore);
          toast.success(`Accepted ${formatScore(c.evidenceScore)} for ${capabilityLabel(c.capability.id)}`);
        }}
      >
        <ShieldCheck />
        Accept
      </Button>
    </div>
  );
}

export function CapabilitySheet({
  c,
  focusDimension,
  open,
  onOpenChange,
}: {
  c: CapabilityResult | null;
  focusDimension?: Dimension;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const audit = useSession((s) => s.audit);
  const evidence = useSession((s) => s.evidence);
  const [tab, setTab] = React.useState("breakdown");
  React.useEffect(() => {
    if (open) setTab(focusDimension ? "evidence" : "breakdown");
  }, [open, focusDimension, c?.capability.id]);
  if (!c) return null;

  const cueMap = new Map(evidence.map((e) => [`ev:${e.id}`, e.cues]));
  const history = audit.filter((a) => a.capabilityId === c.capability.id);
  const dims = (focusDimension ? [focusDimension, ...DIMENSIONS.filter((d) => d !== focusDimension)] : DIMENSIONS).filter(
    (d) => c.dimensions[d],
  );
  const evidenceCount = DIMENSIONS.reduce((a, d) => a + (c.dimensions[d]?.contributing.filter((i) => i.sourceType !== "self_assessment").length ?? 0), 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[640px]" aria-describedby={undefined}>
        <SheetHeader className="pr-12">
          <SheetTitle>{capabilityLabel(c.capability.id)}</SheetTitle>
          <SheetDescription>
            {c.capability.functionIds.map(functionName).join(", ")}
            {c.capability.system ? ` · ${c.capability.system}` : ""}
          </SheetDescription>
        </SheetHeader>

        <div className={cn("mx-6 mt-4 grid grid-cols-[1fr_auto] gap-4 rounded-xl p-4", c.status === "suggested" ? "ai-surface" : "border border-validated/60")}>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <div>
              <p className="text-[11px] text-muted-foreground">2025 self</p>
              <MaturityChip score={c.self} size="lg" provenance="self" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">AI suggested</p>
              <MaturityChip score={c.evidenceScore} size="lg" provenance="ai" />
            </div>
            {c.status !== "suggested" && (
              <div>
                <p className="text-[11px] text-muted-foreground">Validated</p>
                <MaturityChip score={c.effectiveScore} size="lg" provenance="validated" />
              </div>
            )}
            <div className="text-xs text-muted-foreground">
              <p>
                Δ vs self <span className="font-semibold text-foreground tabular">{formatDelta(c.evidenceScore - c.self)}</span>
              </p>
              <p>
                Engine value <span className="tabular">{c.evidenceScore.toFixed(2)}</span> · index {Math.round(c.index)}
              </p>
              <ProvenanceLabel status={c.status} validation={c.validation} className="mt-1" />
            </div>
          </div>
          <div className="flex flex-col items-center gap-1">
            <ConfidenceRing value={c.confidence} band={c.confidenceBand} size={56} showValue />
            <span className="text-[11px] text-muted-foreground">{BAND_LABEL[c.confidenceBand]} confidence</span>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="mt-4 min-h-0 flex-1 px-6">
          <TabsList>
            <TabsTrigger value="breakdown">Score breakdown</TabsTrigger>
            <TabsTrigger value="evidence">
              <MessageSquareQuote />
              Evidence ({evidenceCount})
            </TabsTrigger>
            <TabsTrigger value="flags">Flags ({c.flags.length})</TabsTrigger>
            <TabsTrigger value="history">
              <History />
              History
            </TabsTrigger>
          </TabsList>
          <div className="min-h-0 flex-1 overflow-y-auto pb-4 scrollbar-thin">
            <TabsContent value="breakdown" className="flex flex-col gap-3">
              <p className="text-xs text-muted-foreground">
                Capability score = Σ weight × dimension final. Raw is the reliability-weighted mean of indicators; gated applies stage gates
                (no level n without level n−1 foundations); final rounds to the half-point.
              </p>
              {dims.map((d) => (
                <DimensionBreakdown key={d} d={c.dimensions[d]!} weight={c.weightsUsed[d] ?? 0} />
              ))}
            </TabsContent>
            <TabsContent value="evidence" className="flex flex-col gap-4">
              {dims.map((d) => {
                const ds = c.dimensions[d]!;
                const list = [...ds.contributing].sort((a, b) => Number(a.sourceType === "self_assessment") - Number(b.sourceType === "self_assessment"));
                return (
                  <section key={d}>
                    <h3 className="flex items-center gap-2 text-[13px] font-semibold">
                      {DIMENSION_LABELS[d]}
                      <MaturityChip score={ds.final} size="sm" />
                    </h3>
                    <ul className="divide-y">
                      {list.map((i) => (
                        <IndicatorRow key={i.id} i={i} cues={cueMap.get(i.id)} />
                      ))}
                      {ds.ignored.map((i) => (
                        <li key={i.id} className="py-2 text-xs text-muted-foreground">
                          “Don’t know / N/A” — {i.label} (ignored, counts against coverage)
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}
              {evidenceCount === 0 && (
                <p className="flex items-center gap-2 rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
                  <FileText className="size-4" />
                  Only the 2025 self-assessment supports this score. Load documents in the evidence hub to test it.
                </p>
              )}
            </TabsContent>
            <TabsContent value="flags" className="flex flex-col gap-2">
              {c.flags.length === 0 ? (
                <p className="text-sm text-muted-foreground">No flags. Evidence is consistent and sufficient for this capability.</p>
              ) : (
                c.flags.map((f, i) => <FlagRow key={i} flag={f} />)
              )}
              {DIMENSIONS.flatMap((d) => (c.dimensions[d]?.flags ?? []).filter((f) => f.kind === "LACKS_EVIDENCE").map((f) => ({ d, f }))).length > 0 && (
                <div className="mt-2">
                  <p className="mb-1.5 text-xs font-medium text-muted-foreground">Dimension-level evidence gaps</p>
                  <ul className="flex flex-col gap-1 text-xs text-muted-foreground">
                    {DIMENSIONS.flatMap((d) =>
                      (c.dimensions[d]?.flags ?? []).filter((f) => f.kind === "LACKS_EVIDENCE").map((f, i) => (
                        <li key={`${d}${i}`}>
                          <span className="font-medium text-foreground/80">{DIMENSION_LABELS[d]}:</span> {f.kind === "LACKS_EVIDENCE" && f.reason}
                        </li>
                      )),
                    )}
                  </ul>
                </div>
              )}
            </TabsContent>
            <TabsContent value="history">
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground">No decisions yet. Accepting or overriding records the before and after score here.</p>
              ) : (
                <ol className="flex flex-col gap-2">
                  {history.map((h) => (
                    <li key={h.id} className="rounded-lg border bg-card px-3 py-2 text-[13px]">
                      <p className="font-medium">
                        {h.action === "overridden" ? "Overridden" : h.action === "reverted" ? "Reverted" : h.action === "bulk-accepted" ? "Bulk-accepted" : "Accepted"}{" "}
                        <span className="tabular">
                          {formatScore(h.before)} → {formatScore(h.after)}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {h.by} · {new Date(h.at).toLocaleString()}
                      </p>
                      <p className="mt-1 text-xs">“{h.rationale}”</p>
                    </li>
                  ))}
                </ol>
              )}
            </TabsContent>
          </div>
        </Tabs>

        <div className="border-t bg-card px-6 py-4">
          <ValidationPanel c={c} />
          <p className="mt-2 text-[11px] text-muted-foreground">
            Evidence categories: {[...new Set(DIMENSIONS.flatMap((d) => c.dimensions[d]?.contributing.map((i) => i.category).filter(Boolean) ?? []))].map((x) => EVIDENCE_CATEGORY_LABELS[x!]).join(", ") || "none"}
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

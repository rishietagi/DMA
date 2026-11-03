"use client";
import * as React from "react";
import { AlertTriangle, Check, CheckCheck, ChevronDown, PanelRightOpen, PenLine, ShieldCheck, Undo2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/form-controls";
import { Label } from "@/components/ui/misc";
import { ProcessSheet } from "@/components/dma/process-sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/overlays";
import { ConfidenceRing } from "@/components/dma/confidence-ring";
import { QuoteRow } from "@/components/dma/evidence-card";
import { LevelChip } from "@/components/dma/ladder";
import { Page, PageHeader } from "@/components/dma/page-header";
import { ScopeLine } from "@/components/dma/scope-line";
import { AiSurface, ProvenanceLabel } from "@/components/dma/provenance";
import { useProcesses } from "@/components/providers/process-provider";
import { StepNav } from "@/components/shell/step-nav";
import { runResults } from "@/lib/actions";
import { LADDER, LADDER_LEVELS, ladderLevel, stageLabel, type ProcessResult } from "@/lib/engine";
import { sourceBreakdown, whyLine } from "@/lib/process-why";
import { useSession } from "@/lib/store/session";
import { cn } from "@/lib/utils";

function ChangeForm({ p, onDone }: { p: ProcessResult; onDone: () => void }) {
  const change = useSession((s) => s.change);
  const [level, setLevel] = React.useState<string>(p.level === null ? "" : String(p.level));
  const [reason, setReason] = React.useState("");
  const ok = level !== "" && reason.trim().length >= 10;
  return (
    <form
      className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        if (!ok) return;
        change(p.id, p.suggested ?? Number(level), Number(level), reason.trim());
        onDone();
      }}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`lvl-${p.id}`}>New stage</Label>
        <Select value={level} onValueChange={setLevel}>
          <SelectTrigger id={`lvl-${p.id}`} className="w-full sm:w-44" data-testid="change-level">
            <SelectValue placeholder="Pick a stage" />
          </SelectTrigger>
          <SelectContent>
            {LADDER_LEVELS.map((l) => (
              <SelectItem key={l} value={String(l)}>
                Stage {l} · {LADDER[l].short}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <Label htmlFor={`why-${p.id}`}>Reason (required)</Label>
        <Textarea
          id={`why-${p.id}`}
          rows={1}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="What did you see that the documents miss?"
          className="min-h-9"
          data-testid="change-reason"
        />
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={!ok} data-testid="change-save">
          Save
        </Button>
      </div>
    </form>
  );
}

type Tag = { label: string; tone: "warn" | "ok" | "ai" | "muted" };

/** One status tag per process: an open exception first, else how it was reviewed. */
function statusTag(p: ProcessResult): Tag {
  if (p.status === "overridden") return { label: "Adjusted", tone: "ok" };
  if (p.status === "accepted") return { label: "Confirmed", tone: "ok" };
  if (p.flags.includes("INCONSISTENT")) return { label: "Evidence conflict", tone: "warn" };
  if (p.flags.includes("LACKS_EVIDENCE")) return { label: "Not enough evidence", tone: "muted" };
  return { label: "AI suggested", tone: "ai" };
}

const TAG_CLASS: Record<Tag["tone"], string> = {
  warn: "bg-conf-med/15 text-foreground",
  ok: "bg-validated/15 text-validated",
  ai: "bg-ai/10 text-ai-foreground",
  muted: "bg-muted text-muted-foreground",
};

const time = (at: string) => new Date(at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

function ProcessRow({ p, onDetails }: { p: ProcessResult; onDetails: () => void }) {
  const accept = useSession((s) => s.accept);
  const revert = useSession((s) => s.revert);
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const validated = p.status !== "suggested";
  const signals = p.indicators.filter((i) => i.kind === "evidence").length;
  const tag = statusTag(p);
  const sources = sourceBreakdown(p);

  return (
    <AiSurface validated={validated} data-testid={`process-${p.name}`} data-tour={`process-${p.name}`}>
      <div className="flex flex-col gap-3 p-4 md:flex-row md:items-center">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <LevelChip score={p.effective} provenance={validated ? "validated" : "ai"} size="lg" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h2 className="text-[15px] font-semibold">{p.name}</h2>
              <span className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase", TAG_CLASS[tag.tone])}>
                {tag.tone === "warn" && <AlertTriangle className="size-3 text-conf-med" aria-hidden />}
                {tag.label}
              </span>
            </div>
            {p.level !== null && (
              <p className="mt-0.5 text-[13px] font-medium">
                {stageLabel(p.level)} · {LADDER[p.level].name}
              </p>
            )}
            {sources.length ? (
              <p className="mt-1 flex flex-wrap gap-x-1.5 text-[12px] text-muted-foreground tabular" title={whyLine(p)}>
                {sources.map((s, i) => (
                  <span key={s.source}>
                    {i > 0 && <span aria-hidden className="mr-1.5">|</span>}
                    {s.source} <span className="font-medium text-foreground">{s.stages}</span>
                  </span>
                ))}
              </p>
            ) : (
              <p className="mt-1 text-[12px] text-muted-foreground">{whyLine(p)}</p>
            )}
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
              {validated && p.validation ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-validated/12 px-2 py-0.5 text-xs font-semibold text-validated" data-testid="validated-badge">
                  <ShieldCheck className="size-3.5" aria-hidden />
                  {p.status === "overridden" ? "Changed" : "Validated"} by {p.validation.by.split(" (")[0]} · {time(p.validation.at)}
                </span>
              ) : (
                <ProvenanceLabel status={p.status} validation={p.validation} />
              )}
              {p.indicators.length > 0 && (
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <ConfidenceRing value={p.confidence} band={p.band} size={16} />
                  {p.band === "high" ? "High" : p.band === "medium" ? "Medium" : "Low"} confidence
                </span>
              )}
            </div>
            {p.validation?.kind === "overridden" && (
              <p className="mt-1.5 text-xs text-muted-foreground">
                Was {stageLabel(ladderLevel(p.validation.before))} · “{p.validation.rationale}”
              </p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {signals > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
              Sources
              <ChevronDown className={open ? "rotate-180 transition-transform" : "transition-transform"} />
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onDetails} data-testid="details">
            <PanelRightOpen />
            Review evidence
          </Button>
          {validated ? (
            <Button variant="ghost" size="sm" onClick={() => revert(p.id)}>
              <Undo2 />
              Undo
            </Button>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={() => setEditing(true)} disabled={editing} data-testid="change">
                <PenLine />
                Change
              </Button>
              <Button size="sm" onClick={() => p.suggested !== null && accept(p.id, p.suggested)} disabled={p.suggested === null} data-testid="confirm">
                <Check />
                Confirm level
              </Button>
            </>
          )}
        </div>
      </div>
      {editing && <ChangeForm p={p} onDone={() => setEditing(false)} />}
      {open && (
        <div className="border-t px-4 py-2">
          <ul className="divide-y" aria-label={`Quotes for ${p.name}`}>
            {p.quotes.map((e) => (
              <QuoteRow key={e.id} e={e} />
            ))}
          </ul>
          <p className="pb-1 text-[11px] text-muted-foreground tabular">
            Exact score {p.effective?.toFixed(2)} on the 0–5 scale · {signals} quotes from {p.documents}{" "}
            {p.documents === 1 ? "document" : "documents"}, strongest shown
          </p>
        </div>
      )}
    </AiSurface>
  );
}

function ValidationSummary() {
  const { result } = useProcesses();
  const acceptAll = useSession((s) => s.acceptAll);
  const ps = result.processes;
  const pending = ps.filter((p) => p.status === "suggested" && p.suggested !== null);
  const conflicts = ps.filter((p) => p.flags.includes("INCONSISTENT"));
  const open = conflicts.filter((p) => p.status === "suggested").length;
  const counts = [
    { label: "Evidence conflicts", n: conflicts.length, warn: conflicts.length > 0 },
    { label: "Not enough evidence", n: ps.filter((p) => p.flags.includes("LACKS_EVIDENCE")).length },
    { label: "Reviewer adjustments", n: ps.filter((p) => p.status === "overridden").length },
    { label: "Confirmed", n: ps.filter((p) => p.status === "accepted").length },
  ];
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold">Validation summary</p>
          <dl className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[13px]">
            {counts.map((c, i) => (
              <div key={c.label} className="flex items-baseline gap-1.5">
                {i > 0 && <span className="mr-0.5 text-muted-foreground" aria-hidden>|</span>}
                <dd className={cn("text-lg font-semibold tabular", c.warn && "text-conf-med")}>{c.n}</dd>
                <dt className="text-muted-foreground">{c.label}</dt>
              </div>
            ))}
          </dl>
          {open > 0 ? (
            <p className="flex items-center gap-1.5 text-[13px] font-medium" role="status">
              <AlertTriangle className="size-4 text-conf-med" aria-hidden />
              {open === 1 ? "One finding requires" : `${open} findings require`} reconciliation before sign-off.
            </p>
          ) : (
            <p className="flex items-center gap-1.5 text-[13px] text-muted-foreground" role="status">
              <ShieldCheck className="size-4 text-validated" aria-hidden />
              No open conflicts.
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1.5 lg:items-end">
          <Button
            disabled={!pending.length}
            onClick={() => acceptAll(pending.map((p) => ({ processId: p.id, score: p.suggested! })))}
            data-testid="accept-all"
          >
            <CheckCheck />
            Confirm all remaining ({pending.length})
          </Button>
          <p className="max-w-72 text-[11px] text-muted-foreground lg:text-right">
            Confirms every AI-suggested level not yet reviewed. Each one is logged in the audit trail.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function AuditTrail() {
  const audit = useSession((s) => s.audit);
  const { result } = useProcesses();
  const name = (id: string) => result.processes.find((p) => p.id === id)?.name ?? id.split(":")[1] ?? id;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Audit trail</CardTitle>
      </CardHeader>
      <CardContent>
        {audit.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-[12px]">
              <thead>
                <tr className="border-b text-left text-[11px] text-muted-foreground">
                  <th scope="col" className="py-1.5 font-medium">When</th>
                  <th scope="col" className="py-1.5 font-medium">Process</th>
                  <th scope="col" className="py-1.5 font-medium">Action</th>
                  <th scope="col" className="py-1.5 font-medium">Level</th>
                  <th scope="col" className="py-1.5 font-medium">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {audit.slice(0, 12).map((a) => (
                  <tr key={a.id}>
                    <td className="py-1.5 pr-2 whitespace-nowrap tabular text-muted-foreground">
                      {new Date(a.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="py-1.5 pr-2 font-medium">{name(a.processId)}</td>
                    <td className="py-1.5 pr-2 capitalize">{a.action.replace("-", " ")}</td>
                    <td className="py-1.5 pr-2 tabular">
                      Stage {ladderLevel(a.before)} → {ladderLevel(a.after)}
                    </td>
                    <td className="py-1.5 text-muted-foreground">{a.rationale}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Nothing reviewed yet.</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function ReviewPage() {
  const { result } = useProcesses();
  const [details, setDetails] = React.useState<string | null>(null);

  return (
    <Page>
      <PageHeader
        stage={3}
        title="Validate maturity findings"
        description="Review AI-suggested maturity levels against the underlying evidence and resolve exceptions before benchmarking."
      />
      <ScopeLine
        verb="assessed"
        aside={
          <>
            {result.validated}/{result.processes.length} reviewed
          </>
        }
      />
      <ValidationSummary />
      <div className="flex flex-col gap-3" data-tour="review">
        {result.processes.map((p) => (
          <ProcessRow key={p.id} p={p} onDetails={() => setDetails(p.id)} />
        ))}
        {result.processes.length === 0 && <p className="text-sm text-muted-foreground">No processes selected. Go back to Define &amp; Focus and pick at least one.</p>}
      </div>
      <AuditTrail />
      <ProcessSheet process={result.processes.find((p) => p.id === details) ?? null} onOpenChange={(o) => !o && setDetails(null)} />
      <StepNav step={3} nextLabel="Next: Prioritize & Roadmap" onNext={() => void runResults()} />
    </Page>
  );
}

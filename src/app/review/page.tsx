"use client";
import * as React from "react";
import { AlertTriangle, Check, ChevronDown, PanelRightOpen, PenLine, Undo2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/form-controls";
import { Label, Progress } from "@/components/ui/misc";
import { LevelDistribution } from "@/components/dma/charts";
import { ProcessSheet } from "@/components/dma/process-sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/overlays";
import { ConfidenceRing } from "@/components/dma/confidence-ring";
import { QuoteRow } from "@/components/dma/evidence-card";
import { LevelChip } from "@/components/dma/ladder";
import { Page, PageHeader } from "@/components/dma/page-header";
import { AiSurface, ProvenanceLabel } from "@/components/dma/provenance";
import { useProcesses } from "@/components/providers/process-provider";
import { StepNav } from "@/components/shell/step-nav";
import { runResults } from "@/lib/actions";
import { LADDER, LADDER_LEVELS, ladderLevel, type ProcessFlag, type ProcessResult } from "@/lib/engine";
import { whyLine } from "@/lib/process-why";
import { useSession } from "@/lib/store/session";

const FLAG_LABEL: Record<ProcessFlag, string> = {
  INCONSISTENT: "Sources disagree",
  LACKS_EVIDENCE: "No documents yet",
};

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
        <Label htmlFor={`lvl-${p.id}`}>New level</Label>
        <Select value={level} onValueChange={setLevel}>
          <SelectTrigger id={`lvl-${p.id}`} className="w-full sm:w-44" data-testid="change-level">
            <SelectValue placeholder="Pick a level" />
          </SelectTrigger>
          <SelectContent>
            {LADDER_LEVELS.map((l) => (
              <SelectItem key={l} value={String(l)}>
                L{l} · {LADDER[l].short}
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

function ProcessRow({ p, onDetails }: { p: ProcessResult; onDetails: () => void }) {
  const accept = useSession((s) => s.accept);
  const revert = useSession((s) => s.revert);
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const validated = p.status !== "suggested";
  const signals = p.indicators.filter((i) => i.kind === "evidence").length;

  return (
    <AiSurface validated={validated} data-testid={`process-${p.name}`} data-tour={`process-${p.name}`}>
      <div className="flex flex-col gap-3 p-4 md:flex-row md:items-center">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <LevelChip score={p.effective} provenance={validated ? "validated" : "ai"} size="lg" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h2 className="text-[15px] font-semibold">{p.name}</h2>
              {p.level !== null && <span className="text-sm text-muted-foreground">{LADDER[p.level].name}</span>}
            </div>
            <p className="mt-0.5 text-[13px] text-muted-foreground">{whyLine(p)}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
              <ProvenanceLabel status={p.status} validation={p.validation} />
              {p.indicators.length > 0 && (
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <ConfidenceRing value={p.confidence} band={p.band} size={16} />
                  {p.band === "high" ? "High" : p.band === "medium" ? "Medium" : "Low"} confidence
                </span>
              )}
              {p.flags.map((f) => (
                <span key={f} className="inline-flex items-center gap-1 rounded bg-conf-med/15 px-1.5 py-0.5 text-[11px] font-medium text-foreground">
                  <AlertTriangle className="size-3 text-conf-med" aria-hidden />
                  {FLAG_LABEL[f]}
                </span>
              ))}
            </div>
            {p.validation?.kind === "overridden" && (
              <p className="mt-1.5 text-xs text-muted-foreground">
                Changed from L{Math.round(p.validation.before)} · “{p.validation.rationale}”
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
          <Button variant="ghost" size="sm" onClick={onDetails} data-testid="details">
            <PanelRightOpen />
            Details
          </Button>
          {validated ? (
            <Button variant="outline" size="sm" onClick={() => revert(p.id)}>
              <Undo2 />
              Undo
            </Button>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={() => setEditing(true)} disabled={editing} data-testid="change">
                <PenLine />
                Change
              </Button>
              <Button size="sm" onClick={() => p.suggested !== null && accept(p.id, p.suggested)} disabled={p.suggested === null}>
                <Check />
                Accept
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

function Summary() {
  const { result } = useProcesses();
  const ps = result.processes;
  const bands = (["high", "medium", "low"] as const).map((b) => ({ b, n: ps.filter((p) => p.indicators.length && p.band === b).length }));
  const flagged = ps.filter((p) => p.flags.length);
  const pct = ps.length ? result.validated / ps.length : 0;
  return (
    <Card>
      <CardContent className="grid gap-6 py-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">Reviewed</p>
          <p className="text-[26px] leading-none font-semibold tabular">
            {result.validated}
            <span className="text-base font-normal text-muted-foreground"> / {ps.length}</span>
          </p>
          <Progress value={pct * 100} aria-label={`${Math.round(pct * 100)}% reviewed`} />
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-xs text-muted-foreground">Where the processes sit</p>
          <LevelDistribution distribution={result.distribution} />
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">AI confidence</p>
          <ul className="flex flex-col gap-1.5 text-[12px]">
            {bands.map(({ b, n }) => (
              <li key={b} className="flex items-center gap-2">
                <ConfidenceRing value={b === "high" ? 0.9 : b === "medium" ? 0.6 : 0.3} band={b} size={14} />
                <span className="capitalize">{b}</span>
                <span className="ml-auto font-semibold tabular">{n}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">Needs a closer look</p>
          {flagged.length ? (
            <ul className="flex flex-col gap-1 text-[12px]">
              {flagged.map((p) => (
                <li key={p.id} className="flex items-start gap-1.5">
                  <AlertTriangle className="mt-0.5 size-3 shrink-0 text-conf-med" aria-hidden />
                  <span>
                    <span className="font-medium">{p.name}</span>
                    <span className="text-muted-foreground"> · {p.flags.map((f) => FLAG_LABEL[f].toLowerCase()).join(", ")}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[12px] text-muted-foreground">Nothing flagged.</p>
          )}
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
        <p className="text-[13px] text-muted-foreground">Every accept and change, with who, when, before and after, and why.</p>
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
                      L{ladderLevel(a.before)} → L{ladderLevel(a.after)}
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
  const acceptAll = useSession((s) => s.acceptAll);
  const pending = result.processes.filter((p) => p.status === "suggested" && p.suggested !== null);
  const [details, setDetails] = React.useState<string | null>(null);

  return (
    <Page>
      <PageHeader
        stage={3}
        title="Review levels"
        description="The AI suggests a level for each process. Accept it, or change it and say why."
        actions={
          <>
            <span className="text-sm text-muted-foreground tabular">
              {result.validated} of {result.processes.length} reviewed
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={!pending.length}
              onClick={() => acceptAll(pending.map((p) => ({ processId: p.id, score: p.suggested! })))}
              data-testid="accept-all"
            >
              <Check />
              Accept all
            </Button>
          </>
        }
      />
      <Summary />
      <div className="flex flex-col gap-3" data-tour="review">
        {result.processes.map((p) => (
          <ProcessRow key={p.id} p={p} onDetails={() => setDetails(p.id)} />
        ))}
        {result.processes.length === 0 && <p className="text-sm text-muted-foreground">No processes selected. Go back to Scope and pick at least one.</p>}
      </div>
      <AuditTrail />
      <ProcessSheet process={result.processes.find((p) => p.id === details) ?? null} onOpenChange={(o) => !o && setDetails(null)} />
      <StepNav step={3} nextLabel="Next: See results" onNext={() => void runResults()} />
    </Page>
  );
}

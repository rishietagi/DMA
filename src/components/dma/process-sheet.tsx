"use client";
import { History } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useProcesses } from "@/components/providers/process-provider";
import { DIMENSION_LABELS, indicatorShares, LADDER, ladderLevel, toLadder, type ProcessIndicator, type ProcessResult } from "@/lib/engine";
import { capabilityLabel } from "@/lib/labels";
import { whyLine } from "@/lib/process-why";
import { DIMENSIONS, type FlagKind } from "@/lib/schema";
import { useSession } from "@/lib/store/session";
import { ConfidenceRing } from "./confidence-ring";
import { QuoteRow } from "./evidence-card";
import { LevelChip } from "./ladder";
import { ProvenanceLabel } from "./provenance";
import { SignalPlot } from "./signal-plot";

const SOURCE: Record<ProcessIndicator["kind"], string> = {
  "quick-check": "Overall interview answer",
  question: "Question",
  evidence: "Document",
  self: "2025 self-assessment",
};
const CAP_FLAG: Record<FlagKind, string> = {
  LACKS_EVIDENCE: "Not enough proof",
  INCONSISTENT: "Sources disagree",
  SELF_VARIANCE: "Differs from 2025",
  GATED: "Held back by a missing basic",
  LOW_COVERAGE: "Some document types missing",
};

function Section({ title, children, note }: { title: string; children: React.ReactNode; note?: string }) {
  return (
    <section className="flex flex-col gap-2 border-b px-6 py-4">
      <h3 className="text-[13px] font-semibold">{title}</h3>
      {note && <p className="-mt-1 text-[12px] text-muted-foreground">{note}</p>}
      {children}
    </section>
  );
}

/** Everything behind one process level: signals, calculation, capabilities, quotes, history. */
export function ProcessSheet({ process: p, onOpenChange }: { process: ProcessResult | null; onOpenChange: (open: boolean) => void }) {
  const { caps, input } = useProcesses();
  const audit = useSession((s) => s.audit);
  const def = p ? input.processes.find((d) => d.id === p.id) : undefined;
  const history = p ? audit.filter((a) => a.processId === p.id) : [];

  return (
    <Sheet open={p !== null} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-2xl" data-testid="process-sheet">
        {p && (
          <>
            <SheetHeader className="pr-12">
              <div className="flex items-center gap-3">
                <LevelChip score={p.effective} size="lg" provenance={p.status === "suggested" ? "ai" : "validated"} />
                <div className="min-w-0">
                  <SheetTitle>{p.name}</SheetTitle>
                  <SheetDescription>{p.level === null ? "Not rated yet" : LADDER[p.level].name}</SheetDescription>
                </div>
                <span className="ml-auto flex flex-col items-center gap-0.5 text-[11px] text-muted-foreground">
                  <ConfidenceRing value={p.confidence} band={p.band} size={44} showValue />
                  confidence
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <ProvenanceLabel status={p.status} validation={p.validation} />
                <span className="text-[12px] text-muted-foreground">{whyLine(p)}</span>
              </div>
            </SheetHeader>

            <Section title="Every signal on the 1–5 scale" note="Bigger dots weigh more. The dashed line is the AI's suggestion; a solid green line is the consultant's level.">
              <SignalPlot indicators={p.indicators} suggested={p.suggested} effective={p.effective} />
            </Section>

            <Section title="How the score is calculated" note="Weighted average: each signal counts by its weight × how reliable its source is.">
              <div className="overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="border-b text-left text-[11px] text-muted-foreground">
                      <th scope="col" className="py-1.5 font-medium">Source</th>
                      <th scope="col" className="py-1.5 font-medium">Level</th>
                      <th scope="col" className="py-1.5 font-medium">Weight × reliability</th>
                      <th scope="col" className="py-1.5 text-right font-medium">Share</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {indicatorShares(p)
                      .sort((a, b) => b.share - a.share)
                      .map(({ indicator: i, share }, k) => (
                        <tr key={k}>
                          <td className="py-1.5 pr-2">
                            <span className="font-medium">{i.kind === "evidence" && i.evidence.sourceType === "interview" ? "Interview note" : SOURCE[i.kind]}</span>
                            {i.kind === "evidence" && <span className="block max-w-72 truncate text-[11px] text-muted-foreground">{i.evidence.docTitle}</span>}
                            {i.kind === "question" && (
                              <span className="block max-w-72 truncate text-[11px] text-muted-foreground" title={i.text}>
                                {i.custom ? "Added by you · " : ""}
                                {i.text}
                              </span>
                            )}
                          </td>
                          <td className="py-1.5 tabular">{i.value.toFixed(2)}</td>
                          <td className="py-1.5 tabular text-muted-foreground">
                            {i.weight} × {i.reliability.toFixed(2)}
                          </td>
                          <td className="py-1.5 text-right tabular">
                            <span className="inline-flex items-center gap-2">
                              <span className="h-1.5 w-12 overflow-hidden rounded-full bg-muted">
                                <span className="block h-full bg-ai" style={{ width: `${share * 100}%` }} />
                              </span>
                              {Math.round(share * 100)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t font-semibold">
                      <td className="py-1.5" colSpan={3}>
                        AI suggestion
                      </td>
                      <td className="py-1.5 text-right tabular">{p.suggested === null ? "—" : `${p.suggested.toFixed(2)} → Stage ${ladderLevel(p.suggested)}`}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Section>

            {def && def.capabilityIds.length > 0 && (
              <Section title="Capabilities in this process" note="The detailed engine's scores per area, converted to the ladder.">
                <ul className="flex flex-col gap-3">
                  {def.capabilityIds.map((id) => {
                    const c = caps.byId[id];
                    if (!c) return null;
                    return (
                      <li key={id} className="rounded-lg border p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[13px] font-medium">{capabilityLabel(id)}</p>
                          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                            2025 <LevelChip score={toLadder(c.self)} size="sm" /> → now <LevelChip score={toLadder(c.evidenceScore)} size="sm" provenance="ai" />
                          </span>
                        </div>
                        <dl className="mt-2 grid grid-cols-4 gap-1.5">
                          {DIMENSIONS.map((d) => {
                            const v = c.dimensions[d]?.final;
                            return (
                              <div key={d} className="flex flex-col items-center gap-1 rounded-md bg-muted/40 py-1.5">
                                <dt className="text-[10px] text-muted-foreground">{DIMENSION_LABELS[d]}</dt>
                                <dd>
                                  <LevelChip score={v === undefined ? null : toLadder(v)} size="sm" />
                                </dd>
                              </div>
                            );
                          })}
                        </dl>
                        {c.flags.length > 0 && (
                          <p className="mt-2 flex flex-wrap gap-1">
                            {[...new Set(c.flags.map((f) => f.kind))].map((k) => (
                              <span key={k} className="rounded bg-conf-med/15 px-1.5 py-0.5 text-[10px] font-medium">
                                {CAP_FLAG[k]}
                              </span>
                            ))}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </Section>
            )}

            <Section title={`Quotes (${p.indicators.filter((i) => i.kind === "evidence").length})`}>
              <ul className="divide-y">
                {p.indicators
                  .filter((i): i is Extract<ProcessIndicator, { kind: "evidence" }> => i.kind === "evidence")
                  .map((i) => (
                    <QuoteRow key={i.evidence.id} e={i.evidence} />
                  ))}
              </ul>
              {!p.indicators.some((i) => i.kind === "evidence") && <p className="text-[12px] text-muted-foreground">No document mentions this process yet.</p>}
            </Section>

            <Section title="History">
              {history.length ? (
                <ul className="flex flex-col gap-2 text-[12px]">
                  {history.map((h) => (
                    <li key={h.id} className="flex gap-2">
                      <History className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                      <span>
                        <span className="font-medium capitalize">{h.action.replace("-", " ")}</span> · Stage {ladderLevel(h.before)} → {ladderLevel(h.after)} · {h.by.split(" (")[0]}
                        <span className="block text-muted-foreground">“{h.rationale}”</span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[12px] text-muted-foreground">Not reviewed yet.</p>
              )}
            </Section>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

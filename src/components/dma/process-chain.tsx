"use client";
import { ArrowRight, Shuffle, ThumbsDown, ThumbsUp, Wrench } from "lucide-react";
import { EVIDENCE_CATEGORY_LABELS, type EvidenceItem, type ProcessResult } from "@/lib/engine";
import type { StepLens } from "@/lib/process-lens";
import type { EvidenceCategory } from "@/lib/schema";
import { cn } from "@/lib/utils";
import { LevelChip } from "./ladder";

/** The L1 chain as a flow: level, systems, manual workarounds, hand-offs per step. */
export function ProcessChain({ steps, results }: { steps: readonly StepLens[]; results: readonly ProcessResult[] }) {
  return (
    <div className="-mx-1 overflow-x-auto px-1 pb-2 scrollbar-thin">
      <ol className="flex min-w-max items-stretch gap-1" aria-label="Process chain">
        {steps.map((s, i) => {
          const r = results.find((p) => p.id === s.id);
          return (
            <li key={s.id} className="flex items-stretch gap-1">
              <div className={cn("flex w-48 flex-col gap-2 rounded-lg border bg-card p-3", !r && "opacity-50")}>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[13px] leading-tight font-semibold">{s.step}</p>
                  <LevelChip score={r?.effective} size="sm" provenance={r && r.status !== "suggested" ? "validated" : "ai"} />
                </div>
                <div className="flex flex-wrap gap-1">
                  {s.systems.length ? (
                    s.systems.slice(0, 4).map((sys) => (
                      <span key={sys} className="rounded border bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium">
                        {sys}
                      </span>
                    ))
                  ) : (
                    <span className="text-[10px] text-muted-foreground">No system named</span>
                  )}
                </div>
                <dl className="mt-auto grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
                  <div className="flex items-center gap-1" title="Manual work next to a system (re-keying, Excel)">
                    <Wrench className="size-3 text-conf-low" aria-hidden />
                    <dt className="sr-only">Manual workarounds</dt>
                    <dd className="tabular">{s.workarounds.length} manual</dd>
                  </div>
                  <div className="flex items-center gap-1" title="Two or more systems in one step">
                    <Shuffle className="size-3 text-conf-med" aria-hidden />
                    <dt className="sr-only">Hand-offs</dt>
                    <dd className="tabular">{s.handoffs} hand-offs</dd>
                  </div>
                  <div className="flex items-center gap-1">
                    <ThumbsUp className="size-3 text-validated" aria-hidden />
                    <dt className="sr-only">Strengths</dt>
                    <dd className="tabular">{s.strengths.length} strengths</dd>
                  </div>
                  <div className="flex items-center gap-1">
                    <ThumbsDown className="size-3 text-conf-low" aria-hidden />
                    <dt className="sr-only">Pain points</dt>
                    <dd className="tabular">{s.pains.length} pains</dd>
                  </div>
                </dl>
              </div>
              {i < steps.length - 1 && <ArrowRight className="size-4 shrink-0 self-center text-muted-foreground" aria-hidden />}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** The document types the coverage matrix tracks. */
const COVERAGE_CATEGORIES: EvidenceCategory[] = ["process_docs", "application_landscape", "data_architecture", "policies_sops", "kpi_extracts"];

const SHORT_CAT: Record<EvidenceCategory, string> = {
  self_assessment: "2025",
  it_strategy: "Strategy",
  process_docs: "Process",
  application_landscape: "Systems (application)",
  data_architecture: "Data",
  policies_sops: "Policies",
  transformation_portfolio: "Portfolio",
  interview_notes: "Interviews",
  kpi_extracts: "KPIs",
};

/** Processes × evidence types: how many sentences of each kind back each process. */
export function ProcessCoverage({ steps }: { steps: readonly StepLens[] }) {
  const cats = COVERAGE_CATEGORIES;
  const count = (ev: readonly EvidenceItem[], c: EvidenceCategory) => ev.filter((e) => e.category === c).length;
  const gaps = steps.flatMap((s) =>
    (["process_docs", "kpi_extracts"] as const).filter((c) => count(s.evidence, c) === 0).map((c) => ({ step: s.step, c })),
  );
  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full min-w-[480px] border-separate border-spacing-0.5 text-[12px]">
          <caption className="sr-only">Sentences per process and evidence type</caption>
          <thead>
            <tr>
              <th scope="col" className="pb-1 text-left text-[11px] font-medium text-muted-foreground">
                Process
              </th>
              {cats.map((c) => (
                <th key={c} scope="col" className="pb-1 text-center text-[11px] font-medium text-muted-foreground" title={EVIDENCE_CATEGORY_LABELS[c]}>
                  {SHORT_CAT[c]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {steps.map((s) => (
              <tr key={s.id}>
                <th scope="row" className="pr-2 text-left font-medium whitespace-nowrap">
                  {s.step}
                </th>
                {cats.map((c) => {
                  const n = count(s.evidence, c);
                  return (
                    <td
                      key={c}
                      className={cn("h-7 rounded text-center tabular", n ? "bg-primary/12 font-semibold" : "bg-muted/50 text-muted-foreground/60")}
                      aria-label={`${s.step}, ${EVIDENCE_CATEGORY_LABELS[c]}: ${n}`}
                    >
                      {n || "·"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {gaps.length > 0 && (
        <p className="text-[12px] text-muted-foreground">
          <span className="font-medium text-foreground">Still missing: </span>
          {gaps
            .slice(0, 5)
            .map((g) => `${EVIDENCE_CATEGORY_LABELS[g.c]} for ${g.step}`)
            .join(" · ")}
          {gaps.length > 5 && ` · and ${gaps.length - 5} more`}
        </p>
      )}
    </div>
  );
}

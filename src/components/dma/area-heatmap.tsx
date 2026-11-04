"use client";
import { type ProcessResult } from "@/lib/engine";
import type { AreaScores } from "@/lib/process-areas";
import type { Dimension } from "@/lib/schema";
import { cn } from "@/lib/utils";
import { ladderStyle } from "./ladder";

const AREAS: { id: Dimension; label: string }[] = [
  { id: "process", label: "Process" },
  { id: "data", label: "Data" },
  { id: "ai", label: "Tech & AI" },
  { id: "people", label: "People" },
];

const EMPTY = { background: "var(--muted)", color: "var(--muted-foreground)" };
const CRIT_CLASS = { High: "font-semibold", Medium: "", Low: "text-muted-foreground" } as const;

/**
 * The detailed maturity heatmap: per process its criticality, each area and the overall score on
 * the 1–5 scale (cells tinted by stage, number always shown), and the gap to its own target.
 */
export function DiagnosticTable({ processes, areas }: { processes: readonly ProcessResult[]; areas: Record<string, AreaScores> }) {
  return (
    <div className="overflow-x-auto scrollbar-thin">
      <table className="w-full min-w-[720px] table-fixed border-separate border-spacing-1 text-[13px]">
        <caption className="sr-only">Diagnostic table: criticality, level by area and overall on the 1 to 5 scale, and the gap to target</caption>
        <colgroup>
          <col className="w-[22%]" />
          <col className="w-[10%]" />
          <col span={5} />
          <col className="w-[14%]" />
        </colgroup>
        <thead>
          <tr className="text-[11px] text-muted-foreground">
            <th scope="col" className="text-left font-medium">
              Process
            </th>
            <th scope="col" className="text-center font-medium">
              Criticality
            </th>
            {AREAS.map((a) => (
              <th key={a.id} scope="col" className="text-center font-medium">
                {a.label}
              </th>
            ))}
            <th scope="col" className="text-center font-medium">
              Overall
            </th>
            <th scope="col" className="text-center font-medium">
              Gap to target
            </th>
          </tr>
        </thead>
        <tbody>
          {processes.map((p) => (
            <tr key={p.id}>
              <th scope="row" className="pr-2 text-left leading-tight font-medium">
                {p.name}
              </th>
              <td className={cn("h-10 rounded-md bg-muted/40 text-center text-[12px]", p.criticality && CRIT_CLASS[p.criticality])}>{p.criticality ?? "—"}</td>
              {AREAS.map(({ id }) => {
                const a = areas[p.id]?.[id];
                return (
                  <td
                    key={id}
                    className="h-10 rounded-md text-center tabular"
                    style={a ? ladderStyle(a.value) : EMPTY}
                    title={a ? `From ${a.source === "capabilities" ? "capability scores" : "document sentences"}` : "No signal yet"}
                  >
                    {a ? a.value.toFixed(1) : "—"}
                  </td>
                );
              })}
              <td className="h-10 rounded-md text-center font-semibold tabular" style={ladderStyle(p.effective)}>
                {p.effective === null ? "—" : p.effective.toFixed(1)}
              </td>
              <td
                className={cn(
                  "h-10 rounded-md px-2 text-center font-semibold tabular",
                  p.gap === null && "text-muted-foreground",
                  p.gap === 0 && "bg-validated/15 text-validated",
                  p.gap === 1 && "bg-conf-med/20",
                  (p.gap ?? 0) >= 2 && "bg-conf-low/20 text-conf-low",
                )}
                data-testid={p.alignment === "WHITESPACE" ? `gap-whitespace-${p.name}` : undefined}
                title={`Target stage ${p.target}`}
              >
                {p.gap === null ? "—" : p.gap === 0 ? "On target" : `${p.gap} ${p.gap === 1 ? "level" : "levels"}`}
                {p.alignment === "WHITESPACE" && <span className="block text-[10px] font-medium">nothing planned</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Stage colours: 1 Initiated · 2 Tested · 3 Scaled · 4 Optimized · 5 Intelligent. Gap is measured against each process&apos;s own target.
      </p>
    </div>
  );
}

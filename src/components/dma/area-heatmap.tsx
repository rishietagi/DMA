"use client";
import { type ProcessResult } from "@/lib/engine";
import type { AreaScores } from "@/lib/process-areas";
import type { Dimension } from "@/lib/schema";
import { cn } from "@/lib/utils";
import { ladderStyle } from "./ladder";

const AREAS: { id: Dimension; label: string }[] = [
  { id: "process", label: "Process" },
  { id: "people", label: "People" },
  { id: "data", label: "Data & Analytics" },
];

const EMPTY = { background: "var(--muted)", color: "var(--muted-foreground)" };

/** One diagnostic table: overall and per-area level per process, heatmap-coloured, plus the gap to target. */
export function DiagnosticTable({ processes, areas }: { processes: readonly ProcessResult[]; areas: Record<string, AreaScores> }) {
  return (
    <div className="overflow-x-auto scrollbar-thin">
      <table className="w-full min-w-[620px] table-fixed border-separate border-spacing-1 text-[13px]">
        <caption className="sr-only">Diagnostic table: level by process and area on the 0 to 5 scale, and the gap to target</caption>
        <colgroup>
          <col className="w-[28%]" />
          <col span={4} />
          <col className="w-[16%]" />
        </colgroup>
        <thead>
          <tr className="text-[11px] text-muted-foreground">
            <th scope="col" className="text-left font-medium">
              Process
            </th>
            <th scope="col" className="text-center font-medium">
              Overall
            </th>
            {AREAS.map((a) => (
              <th key={a.id} scope="col" className="text-center font-medium">
                {a.label}
              </th>
            ))}
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
              <td className="h-10 rounded-md text-center font-semibold tabular" style={ladderStyle(p.effective)}>
                {p.effective === null ? "—" : p.effective.toFixed(1)}
              </td>
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
              <td
                className={cn(
                  "h-10 rounded-md px-2 text-center font-semibold tabular",
                  p.gap === null && "text-muted-foreground",
                  p.gap === 0 && "bg-validated/15 text-validated",
                  p.gap === 1 && "bg-conf-med/20",
                  (p.gap ?? 0) >= 2 && "bg-conf-low/20 text-conf-low",
                )}
                data-testid={p.alignment === "WHITESPACE" ? `gap-whitespace-${p.name}` : undefined}
              >
                {p.gap === null ? "—" : p.gap === 0 ? "On target" : `${p.gap} ${p.gap === 1 ? "level" : "levels"}`}
                {p.alignment === "WHITESPACE" && <span className="block text-[10px] font-medium">nothing planned</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

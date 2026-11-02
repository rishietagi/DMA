"use client";
import { DIMENSION_LABELS, type ProcessResult } from "@/lib/engine";
import type { AreaScores } from "@/lib/process-areas";
import { DIMENSIONS } from "@/lib/schema";
import { ladderStyle } from "./ladder";

/** Process × area heatmap on the ladder; the number is always shown with the colour. */
export function AreaHeatmap({ processes, areas }: { processes: readonly ProcessResult[]; areas: Record<string, AreaScores> }) {
  return (
    <div className="overflow-x-auto scrollbar-thin">
      <table className="w-full min-w-[400px] border-separate border-spacing-1 text-[12px]">
        <caption className="sr-only">Level by process and area, on the 0 to 5 ladder</caption>
        <thead>
          <tr>
            <th scope="col" className="text-left text-[11px] font-medium text-muted-foreground">
              Process
            </th>
            <th scope="col" className="text-center text-[11px] font-medium text-muted-foreground">
              Overall
            </th>
            {DIMENSIONS.map((d) => (
              <th key={d} scope="col" className="text-center text-[11px] font-medium text-muted-foreground">
                {DIMENSION_LABELS[d]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {processes.map((p) => (
            <tr key={p.id}>
              <th scope="row" className="max-w-36 pr-2 text-left leading-tight font-medium">
                {p.name}
              </th>
              <td className="h-9 min-w-12 rounded-md text-center font-semibold tabular" style={ladderStyle(p.effective)}>
                {p.effective === null ? "—" : p.effective.toFixed(1)}
              </td>
              {DIMENSIONS.map((d) => {
                const a = areas[p.id]?.[d];
                return (
                  <td
                    key={d}
                    className="h-9 min-w-12 rounded-md text-center tabular"
                    style={a ? ladderStyle(a.value) : { background: "var(--muted)", color: "var(--muted-foreground)" }}
                    title={a ? `From ${a.source === "capabilities" ? "capability scores" : "document sentences"}` : "No signal yet"}
                  >
                    {a ? a.value.toFixed(1) : "—"}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

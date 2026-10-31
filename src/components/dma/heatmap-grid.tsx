"use client";
import * as React from "react";
import { DIMENSION_LABELS, formatScore, type FunctionResult } from "@/lib/engine";
import { FUNCTION_SHORT } from "@/lib/labels";
import { DIMENSIONS, type Dimension, type FunctionId } from "@/lib/schema";
import { cn } from "@/lib/utils";
import { maturityStyle } from "./maturity";

/**
 * Function × dimension heatmap. Keyboard navigable (arrow keys move between cells, Enter
 * activates). Every cell shows its number; colour is never the only signal.
 */
export function HeatmapGrid({
  functions,
  rag = false,
  onSelect,
  showOverall = true,
  compact = false,
  caption = "Maturity by function and dimension",
}: {
  functions: FunctionResult[];
  rag?: boolean;
  onSelect?: (fn: FunctionId, dim: Dimension | "overall") => void;
  showOverall?: boolean;
  compact?: boolean;
  caption?: string;
}) {
  const cols: (Dimension | "overall")[] = showOverall ? [...DIMENSIONS, "overall"] : [...DIMENSIONS];
  const rows = functions.filter((f) => f.capabilityIds.length > 0);
  const ref = React.useRef<HTMLDivElement>(null);
  const [focus, setFocus] = React.useState<[number, number]>([0, 0]);

  const move = (r: number, c: number) => {
    const nr = Math.max(0, Math.min(rows.length - 1, r));
    const nc = Math.max(0, Math.min(cols.length - 1, c));
    setFocus([nr, nc]);
    ref.current?.querySelector<HTMLElement>(`[data-cell="${nr}-${nc}"]`)?.focus();
  };

  const onKey = (e: React.KeyboardEvent, r: number, c: number) => {
    const map: Record<string, [number, number]> = {
      ArrowUp: [r - 1, c],
      ArrowDown: [r + 1, c],
      ArrowLeft: [r, c - 1],
      ArrowRight: [r, c + 1],
      Home: [r, 0],
      End: [r, cols.length - 1],
    };
    const t = map[e.key];
    if (t) {
      e.preventDefault();
      move(t[0], t[1]);
    }
  };

  return (
    <div ref={ref} role="grid" aria-label={caption} className="w-full">
      <div role="row" className="grid items-end gap-1 pb-1.5" style={{ gridTemplateColumns: `minmax(92px,1.3fr) repeat(${cols.length}, minmax(0,1fr))` }}>
        <span role="columnheader" className="text-[11px] text-muted-foreground">Team</span>
        {cols.map((c) => (
          <span key={c} role="columnheader" className={cn("text-center text-[11px] text-muted-foreground", c === "overall" && "font-medium text-foreground")}>
            {c === "overall" ? "Overall" : DIMENSION_LABELS[c].replace(" & Analytics", "")}
          </span>
        ))}
      </div>
      <div className="flex flex-col gap-1">
        {rows.map((f, r) => (
          <div role="row" key={f.fn.id} className="grid items-center gap-1" style={{ gridTemplateColumns: `minmax(92px,1.3fr) repeat(${cols.length}, minmax(0,1fr))` }}>
            <span role="rowheader" className="truncate pr-2 text-[13px]" title={f.fn.name}>
              {FUNCTION_SHORT[f.fn.id]}
            </span>
            {cols.map((c, ci) => {
              const v = c === "overall" ? f.score : f.dimensions[c];
              return (
                <button
                  key={c}
                  type="button"
                  role="gridcell"
                  data-cell={`${r}-${ci}`}
                  tabIndex={focus[0] === r && focus[1] === ci ? 0 : -1}
                  onKeyDown={(e) => onKey(e, r, ci)}
                  onFocus={() => setFocus([r, ci])}
                  onClick={() => onSelect?.(f.fn.id, c)}
                  aria-label={`${f.fn.name}, ${c === "overall" ? "overall" : DIMENSION_LABELS[c]}: ${formatScore(v)}`}
                  className={cn(
                    "grid place-items-center rounded-md font-semibold tabular transition-[background-color,transform] duration-500 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
                    compact ? "h-7 text-xs" : "h-9 text-[13px]",
                    onSelect && "hover:brightness-95 active:scale-[0.98]",
                    c === "overall" && "ring-1 ring-foreground/10",
                  )}
                  style={maturityStyle(v ?? null, rag)}
                >
                  {formatScore(v)}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";
import * as React from "react";
import { FastForward, RotateCcw } from "lucide-react";
import type { Phase, ProcessIdea, ProcessResult } from "@/lib/engine";
import { STATUS_LABEL } from "@/lib/labels";
import type { Initiative } from "@/lib/schema";
import { cn } from "@/lib/utils";
import { LevelChip } from "./ladder";

const PHASES: Phase[] = ["Now", "Next", "Later"];
const PHASE_SUB: Record<Phase, string> = { Now: "0–6 months", Next: "6–12 months", Later: "12–24 months" };
const STATUS_DOT: Record<Initiative["status"], string> = {
  completed: "bg-status-completed",
  in_progress: "bg-status-progress",
  planned: "border border-status-planned",
};

interface Edge {
  from: string;
  to: string;
  d: string;
}

/**
 * Process swimlanes: what the 2026-27 roadmap already plans (with accelerate / revisit flags and
 * gaps with nothing planned) next to the ideas phased Now / Next / Later. Dependency arrows are drawn
 * after layout; hovering an idea highlights its chain.
 */
export function ProcessRoadmap({
  processes,
  ideas,
  selected,
  onSelect,
}: {
  processes: readonly ProcessResult[];
  ideas: readonly ProcessIdea[];
  selected: string | null;
  onSelect: (id: string | null) => void;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [edges, setEdges] = React.useState<Edge[]>([]);
  const [size, setSize] = React.useState({ w: 0, h: 0 });
  const [hover, setHover] = React.useState<string | null>(null);
  const focusId = hover ?? selected;

  const layout = React.useCallback(() => {
    const root = ref.current;
    if (!root) return;
    const box = root.getBoundingClientRect();
    const pos = (id: string) => root.querySelector<HTMLElement>(`[data-idea="${id}"]`)?.getBoundingClientRect();
    const out: Edge[] = [];
    for (const u of ideas)
      for (const dep of u.dependsOn) {
        const a = pos(dep);
        const b = pos(u.id);
        if (!a || !b) continue;
        const sameCol = Math.abs(a.left - b.left) < 8;
        const y1 = a.top + a.height / 2 - box.top;
        const y2 = b.top + b.height / 2 - box.top;
        let d: string;
        if (sameCol) {
          const x1 = a.left - box.left + 6;
          d = `M ${x1} ${y1} C ${x1 - 26} ${y1}, ${x1 - 26} ${y2}, ${x1} ${y2}`;
        } else {
          const x1 = a.right - box.left;
          const x2 = b.left - box.left;
          const mx = (x1 + x2) / 2;
          d = `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
        }
        out.push({ from: dep, to: u.id, d });
      }
    setEdges(out);
    setSize({ w: box.width, h: box.height });
  }, [ideas]);

  React.useLayoutEffect(() => {
    layout();
    const ro = new ResizeObserver(layout);
    if (ref.current) ro.observe(ref.current);
    return () => ro.disconnect();
  }, [layout]);

  const related = React.useMemo(() => {
    if (!focusId) return new Set<string>();
    const s = new Set([focusId]);
    for (const dir of ["up", "down"] as const) {
      const stack = [focusId];
      while (stack.length) {
        const n = stack.pop()!;
        for (const e of edges) {
          const next = dir === "up" ? (e.to === n ? e.from : null) : e.from === n ? e.to : null;
          if (next && !s.has(next)) {
            s.add(next);
            stack.push(next);
          }
        }
      }
    }
    return s;
  }, [focusId, edges]);

  return (
    <div className="overflow-x-auto scrollbar-thin">
      <div ref={ref} className="relative min-w-[820px]">
        <svg className="pointer-events-none absolute inset-0 z-10" width={size.w} height={size.h} aria-hidden>
          <defs>
            <marker id="rm-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L8,4 L0,8 z" fill="var(--muted-foreground)" />
            </marker>
            <marker id="rm-arrow-hi" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L8,4 L0,8 z" fill="var(--ai-accent)" />
            </marker>
          </defs>
          {edges.map((e) => {
            const hi = focusId && related.has(e.from) && related.has(e.to);
            return (
              <path
                key={`${e.from}-${e.to}`}
                d={e.d}
                fill="none"
                stroke={hi ? "var(--ai-accent)" : "var(--muted-foreground)"}
                strokeOpacity={focusId && !hi ? 0.15 : hi ? 0.9 : 0.45}
                strokeWidth={hi ? 2 : 1.25}
                markerEnd={hi ? "url(#rm-arrow-hi)" : "url(#rm-arrow)"}
              />
            );
          })}
        </svg>

        <div className="grid grid-cols-[150px_1.2fr_1fr_1fr_1fr] gap-x-3">
          <div className="border-b pb-2 text-xs font-medium">Process</div>
          <div className="border-b pb-2 text-xs font-medium">
            Planned today
            <p className="text-[11px] font-normal text-muted-foreground">2026-27 roadmap</p>
          </div>
          {PHASES.map((p) => (
            <div key={p} className="border-b pb-2 text-xs font-medium">
              {p}
              <p className="text-[11px] font-normal text-muted-foreground">{PHASE_SUB[p]}</p>
            </div>
          ))}

          {processes.map((proc) => (
            <React.Fragment key={proc.id}>
              <div className="flex flex-col gap-1 border-b py-3">
                <span className="text-[13px] leading-tight font-medium">{proc.name}</span>
                <LevelChip score={proc.effective} size="sm" className="self-start" />
              </div>
              <div className="flex flex-col gap-1.5 border-b py-3">
                {proc.initiatives.filter((i, k, a) => a.findIndex((x) => x.title === i.title) === k).map((i) => (
                  <div key={i.id} className="flex items-start gap-2 text-xs">
                    <span role="img" className={cn("mt-1 size-2 shrink-0 rounded-full", STATUS_DOT[i.status])} aria-label={STATUS_LABEL[i.status]} />
                    <span className="min-w-0 flex-1 leading-snug">{i.title}</span>
                    {proc.alignment === "ACCELERATE" && (
                      <span className="inline-flex shrink-0 items-center gap-0.5 rounded bg-conf-med/20 px-1 text-[10px] font-medium" title="Gap of 2 or more levels against target">
                        <FastForward className="size-3" aria-hidden /> Speed up
                      </span>
                    )}
                    {proc.alignment === "REVISIT" && (
                      <span className="inline-flex shrink-0 items-center gap-0.5 rounded bg-ai-soft px-1 text-[10px] font-medium text-ai-foreground" title="Completed, but the gap remains">
                        <RotateCcw className="size-3" aria-hidden /> Revisit
                      </span>
                    )}
                  </div>
                ))}
                {proc.alignment === "WHITESPACE" && (
                  <div className="hatch rounded-md border border-whitespace/60 px-2 py-1 text-xs font-medium" data-testid={`whitespace-${proc.name}`}>
                    Gap with nothing planned
                    <span className="block text-[10px] font-normal text-muted-foreground">
                      {proc.gap} {proc.gap === 1 ? "level" : "levels"} short · no initiative
                    </span>
                  </div>
                )}
                {!proc.initiatives.length && proc.alignment !== "WHITESPACE" && <span className="text-[11px] text-muted-foreground">—</span>}
              </div>
              {PHASES.map((ph) => (
                <div key={ph} className="flex flex-col gap-2 border-b py-3">
                  {ideas
                    .filter((u) => u.phase === ph && u.processId === proc.id)
                    .map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        data-idea={u.id}
                        onMouseEnter={() => setHover(u.id)}
                        onMouseLeave={() => setHover(null)}
                        onFocus={() => setHover(u.id)}
                        onBlur={() => setHover(null)}
                        onClick={() => onSelect(selected === u.id ? null : u.id)}
                        aria-pressed={selected === u.id}
                        className={cn(
                          "ai-surface relative z-0 w-full rounded-lg px-2.5 py-2 text-left outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-ring",
                          focusId && !related.has(u.id) && "opacity-40",
                          selected === u.id && "ai-glow",
                        )}
                      >
                        <p className="text-xs leading-snug font-medium">{u.title}</p>
                        <p className="mt-0.5 text-[10px] text-muted-foreground tabular">
                          P{Math.round(u.priority)} · {u.quadrant}
                          {u.dependsOn.length > 0 && ideas.some((x) => u.dependsOn.includes(x.id)) ? " · needs a foundation" : ""}
                        </p>
                      </button>
                    ))}
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

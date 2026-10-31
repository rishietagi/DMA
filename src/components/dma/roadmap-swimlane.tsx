"use client";
import * as React from "react";
import Link from "next/link";
import { FastForward, RotateCcw } from "lucide-react";
import type { CapabilityOpportunity, Phase, UseCase } from "@/lib/engine";
import { capabilityLabel, FUNCTION_SHORT, STATUS_LABEL } from "@/lib/labels";
import type { FunctionId, Initiative } from "@/lib/schema";
import { seed } from "@/lib/seed";
import { cn } from "@/lib/utils";

const PHASES: Phase[] = ["Now", "Next", "Later"];
const PHASE_SUB: Record<Phase, string> = { Now: "0–6 months", Next: "6–12 months", Later: "12–24 months" };
const STATUS_DOT: Record<Initiative["status"], string> = {
  completed: "bg-status-completed",
  in_progress: "bg-status-progress",
  planned: "border border-status-planned",
};
const capPrimary = new Map(seed.baseline.capabilities.map((c) => [c.id, c.primaryFunctionId]));

interface Edge {
  from: string;
  to: string;
  d: string;
}

/**
 * Function swimlanes: existing 2026-27 initiatives (with accelerate / revisit flags and
 * whitespaces) next to generated use cases phased Now / Next / Later. Dependency lines are
 * drawn between use-case cards after layout.
 */
export function RoadmapSwimlane({
  useCases,
  opportunities,
  selected,
  onSelect,
}: {
  useCases: UseCase[];
  opportunities: Record<string, CapabilityOpportunity>;
  selected: string | null;
  onSelect: (id: string | null) => void;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [edges, setEdges] = React.useState<Edge[]>([]);
  const [size, setSize] = React.useState({ w: 0, h: 0 });
  const [hover, setHover] = React.useState<string | null>(null);
  const focusId = hover ?? selected;

  const opps = Object.values(opportunities);
  const fnOf = (u: UseCase) => capPrimary.get(u.primaryCapabilityId)!;
  const rows = seed.baseline.functions.map((f) => f.id);

  const flagFor = (i: Initiative) => {
    const a = i.mapsTo.map((id) => opportunities[id]?.alignment);
    if (a.includes("ACCELERATE")) return "ACCELERATE" as const;
    if (a.includes("REVISIT")) return "REVISIT" as const;
    return null;
  };

  const layout = React.useCallback(() => {
    const root = ref.current;
    if (!root) return;
    const box = root.getBoundingClientRect();
    const pos = (id: string) => root.querySelector<HTMLElement>(`[data-uc="${id}"]`)?.getBoundingClientRect();
    const out: Edge[] = [];
    for (const u of useCases)
      for (const d of u.dependsOn) {
        const a = pos(d);
        const b = pos(u.id);
        if (!a || !b) continue;
        const sameCol = Math.abs(a.left - b.left) < 8;
        let path: string;
        if (sameCol) {
          const x1 = a.left - box.left + 6;
          const y1 = a.top + a.height / 2 - box.top;
          const y2 = b.top + b.height / 2 - box.top;
          path = `M ${x1} ${y1} C ${x1 - 26} ${y1}, ${x1 - 26} ${y2}, ${x1} ${y2}`;
        } else {
          const x1 = a.right - box.left;
          const y1 = a.top + a.height / 2 - box.top;
          const x2 = b.left - box.left;
          const y2 = b.top + b.height / 2 - box.top;
          const mx = (x1 + x2) / 2;
          path = `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
        }
        out.push({ from: d, to: u.id, d: path });
      }
    setEdges(out);
    setSize({ w: box.width, h: box.height });
  }, [useCases]);

  React.useLayoutEffect(() => {
    layout();
    const ro = new ResizeObserver(layout);
    if (ref.current) ro.observe(ref.current);
    return () => ro.disconnect();
  }, [layout]);

  const related = React.useMemo(() => {
    if (!focusId) return new Set<string>();
    // the focused use case, everything it depends on, and everything that depends on it
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
    <div ref={ref} className="relative">
      <svg className="pointer-events-none absolute inset-0 z-10" width={size.w} height={size.h} aria-hidden>
        <defs>
          <marker id="arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L8,4 L0,8 z" fill="var(--muted-foreground)" />
          </marker>
          <marker id="arrow-hi" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
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
              strokeOpacity={focusId && !hi ? 0.15 : hi ? 0.9 : 0.4}
              strokeWidth={hi ? 2 : 1.25}
              markerEnd={hi ? "url(#arrow-hi)" : "url(#arrow)"}
            />
          );
        })}
      </svg>

      <div className="grid grid-cols-[110px_1.25fr_1fr_1fr_1fr] gap-x-4">
        <div />
        <div className="sticky top-0 z-20 border-b bg-background pb-2 text-xs font-medium">
          2026-27 roadmap today
          <p className="text-[11px] font-normal text-muted-foreground">Existing initiatives and whitespaces</p>
        </div>
        {PHASES.map((p) => (
          <div key={p} className="sticky top-0 z-20 border-b bg-background pb-2 text-xs font-medium">
            {p}
            <p className="text-[11px] font-normal text-muted-foreground">{PHASE_SUB[p]}</p>
          </div>
        ))}

        {rows.map((fn: FunctionId) => {
          const inits = seed.roadmap.initiatives.filter((i) => i.functionId === fn);
          const ws = opps.filter((o) => o.alignment === "WHITESPACE" && capPrimary.get(o.capabilityId) === fn);
          return (
            <React.Fragment key={fn}>
              <div className="border-b py-3 text-[13px] font-medium">{FUNCTION_SHORT[fn]}</div>
              <div className="flex flex-col gap-1.5 border-b py-3">
                {inits.map((i) => {
                  const flag = flagFor(i);
                  return (
                    <div key={i.id} className="flex items-start gap-2 rounded-md px-1 py-0.5 text-xs">
                      <span className={cn("mt-1 size-2 shrink-0 rounded-full", STATUS_DOT[i.status])} aria-label={STATUS_LABEL[i.status]} />
                      <span className="min-w-0 flex-1 leading-snug">{i.title}</span>
                      {flag === "ACCELERATE" && (
                        <span className="inline-flex shrink-0 items-center gap-0.5 rounded bg-conf-med/20 px-1 text-[10px] font-medium" title="Gap of 2 or more against target">
                          <FastForward className="size-3" aria-hidden /> Accelerate
                        </span>
                      )}
                      {flag === "REVISIT" && (
                        <span className="inline-flex shrink-0 items-center gap-0.5 rounded bg-ai-soft px-1 text-[10px] font-medium text-ai-foreground" title="Completed, but the gap remains — adoption">
                          <RotateCcw className="size-3" aria-hidden /> Revisit
                        </span>
                      )}
                    </div>
                  );
                })}
                {ws.map((o) => (
                  <Link
                    key={o.capabilityId}
                    href={`/scoring?cap=${o.capabilityId}`}
                    className="hatch rounded-md border border-whitespace/60 px-2 py-1 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    data-testid={`whitespace-${o.capabilityId}`}
                  >
                    Whitespace: {capabilityLabel(o.capabilityId)}
                    <span className="block text-[10px] font-normal text-muted-foreground">gap {o.gap.toFixed(1)} · no initiative</span>
                  </Link>
                ))}
                {!inits.length && !ws.length && <span className="text-[11px] text-muted-foreground">—</span>}
              </div>
              {PHASES.map((p) => (
                <div key={p} className="flex flex-col gap-2 border-b py-3">
                  {useCases
                    .filter((u) => u.phase === p && fnOf(u) === fn)
                    .sort((a, b) => a.order - b.order)
                    .map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        data-uc={u.id}
                        data-phase={u.phase}
                        data-deps={u.dependsOn.join(" ")}
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
                          {u.pulledForward ? " · prerequisite" : ""}
                          {u.alignment === "WHITESPACE" ? " · whitespace" : ""}
                        </p>
                      </button>
                    ))}
                </div>
              ))}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

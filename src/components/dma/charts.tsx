"use client";
/** Ladder charts (Recharts). Every chart has an aria-label that states its numbers. */
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { LADDER, type FunctionProcessResult, type LadderLevel, type ProcessResult } from "@/lib/engine";
import { FUNCTION_SHORT } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { ladderStyle } from "./ladder";

const TOOLTIP = {
  contentStyle: { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12, color: "var(--popover-foreground)" },
  labelStyle: { color: "var(--popover-foreground)", fontWeight: 600 },
  cursor: { fill: "var(--muted)", opacity: 0.5 },
};
const TICK = { fill: "var(--muted-foreground)", fontSize: 11 };
const fmt = (v: unknown) => (typeof v === "number" ? v.toFixed(1) : String(v));
const short = (s: string) => (s.length > 22 ? `${s.slice(0, 20)}…` : s);

function Legend({ items }: { items: { label: string; className?: string; dashed?: boolean; color?: string }[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5">
          <span
            className={cn("h-0.5 w-4", i.dashed && "h-0 border-t-2 border-dashed", i.className)}
            style={i.dashed ? { borderColor: i.color } : { background: i.color }}
          />
          {i.label}
        </span>
      ))}
    </div>
  );
}

/** Today vs target vs 2025 for each process. */
export function ProcessRadar({ processes, target }: { processes: readonly ProcessResult[]; target: LadderLevel }) {
  const data = processes.map((p) => ({ name: short(p.name), today: p.effective ?? 0, target, self: p.self ?? undefined }));
  return (
    <div className="flex flex-col gap-2">
      <div
        className="h-[300px]"
        role="img"
        aria-label={`Radar: today versus target level ${target} and 2025. ${processes
          .map((p) => `${p.name} today ${fmt(p.effective ?? 0)}${p.self !== null ? `, 2025 ${fmt(p.self)}` : ""}`)
          .join("; ")}`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} outerRadius="72%">
            <PolarGrid stroke="var(--border)" />
            <PolarAngleAxis dataKey="name" tick={TICK} />
            <PolarRadiusAxis domain={[0, 5]} tickCount={6} tick={false} axisLine={false} />
            <Radar name="Target" dataKey="target" stroke="var(--foreground)" strokeOpacity={0.6} fill="none" strokeDasharray="5 4" isAnimationActive={false} />
            <Radar name="2025 self-assessment" dataKey="self" stroke="var(--chart-4)" fill="var(--chart-4)" fillOpacity={0.08} isAnimationActive={false} />
            <Radar name="Today" dataKey="today" stroke="var(--maturity-4)" fill="var(--maturity-4)" fillOpacity={0.3} isAnimationActive={false} />
            <Tooltip {...TOOLTIP} formatter={fmt} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <Legend
        items={[
          { label: "Today", color: "var(--maturity-4)" },
          { label: "2025 self-assessment", color: "var(--chart-4)" },
          { label: `Target L${target}`, dashed: true, color: "var(--foreground)" },
        ]}
      />
    </div>
  );
}

/** 2025 self-assessment vs today, per process. */
export function SelfVsToday({ processes }: { processes: readonly ProcessResult[] }) {
  const data = processes.map((p) => ({ name: short(p.name), self: p.self, today: p.effective }));
  return (
    <div className="flex flex-col gap-2">
      <div
        className="h-[300px]"
        role="img"
        aria-label={`Bar chart, 2025 versus today: ${processes
          .map((p) => `${p.name} 2025 ${p.self === null ? "none" : fmt(p.self)}, today ${fmt(p.effective ?? 0)}`)
          .join("; ")}`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 28, top: 4, bottom: 4 }} barGap={2}>
            <CartesianGrid horizontal={false} stroke="var(--border)" />
            <XAxis type="number" domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} tick={TICK} tickFormatter={(v) => `L${v}`} />
            <YAxis type="category" dataKey="name" width={150} tick={TICK} />
            <Tooltip {...TOOLTIP} formatter={fmt} />
            <Bar dataKey="self" name="2025" fill="var(--chart-4)" radius={[0, 3, 3, 0]} barSize={9} isAnimationActive={false} />
            <Bar dataKey="today" name="Today" fill="var(--maturity-4)" radius={[0, 3, 3, 0]} barSize={9} isAnimationActive={false}>
              <LabelList dataKey="today" position="right" formatter={fmt} style={{ fill: "var(--muted-foreground)", fontSize: 10 }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <Legend
        items={[
          { label: "2025 self-assessment", color: "var(--chart-4)" },
          { label: "Today (evidence + review)", color: "var(--maturity-4)" },
        ]}
      />
    </div>
  );
}

/** Every function's overall level from the same evidence; the current one highlighted. */
export function FunctionCompare({ all, current, target }: { all: readonly FunctionProcessResult[]; current: string; target: LadderLevel }) {
  const data = all
    .filter((f) => f.overall !== null)
    .map((f) => ({ id: f.functionId, name: FUNCTION_SHORT[f.functionId], level: f.overall! }))
    .sort((a, b) => b.level - a.level);
  return (
    <div
      className="h-[260px]"
      role="img"
      aria-label={`Bar chart of functions on the ladder: ${data.map((d) => `${d.name} ${fmt(d.level)}`).join(", ")}`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: -16, right: 8, top: 16, bottom: 4 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="name" tick={TICK} interval={0} angle={-25} textAnchor="end" height={54} />
          <YAxis domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} tick={TICK} tickFormatter={(v) => `L${v}`} />
          <Tooltip {...TOOLTIP} formatter={fmt} />
          <ReferenceLine y={target} stroke="var(--foreground)" strokeOpacity={0.5} strokeDasharray="5 4" label={{ value: "Target", position: "right", fill: "var(--muted-foreground)", fontSize: 10 }} />
          <Bar dataKey="level" name="Overall level" radius={[3, 3, 0, 0]} isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.id} fill={d.id === current ? "var(--ai-accent)" : "var(--maturity-3)"} />
            ))}
            <LabelList dataKey="level" position="top" formatter={fmt} style={{ fill: "var(--muted-foreground)", fontSize: 10 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** 2025 self level per capability (crosswalked to the ladder). */
export function BaselineBars({ items }: { items: { id: string; name: string; level: number }[] }) {
  return (
    <ul className="flex flex-col gap-1.5" aria-label="2025 self-assessment by capability">
      {items.map((c) => (
        <li key={c.id} className="grid grid-cols-[minmax(0,11rem)_1fr_2.5rem] items-center gap-3 text-[12px]">
          <span className="truncate" title={c.name}>
            {c.name}
          </span>
          <span className="h-2.5 overflow-hidden rounded-full bg-muted">
            <span className="block h-full rounded-full" style={{ width: `${(c.level / 5) * 100}%`, background: ladderStyle(c.level).background }} />
          </span>
          <span className="text-right tabular text-muted-foreground">{c.level.toFixed(1)}</span>
        </li>
      ))}
    </ul>
  );
}

/** How many processes sit on each level — a compact column chart. */
export function LevelDistribution({ distribution, className }: { distribution: readonly number[]; className?: string }) {
  const max = Math.max(1, ...distribution);
  return (
    <div className={cn("flex items-end gap-1.5", className)} role="img" aria-label={`Processes per level: ${distribution.map((n, l) => `L${l} ${n}`).join(", ")}`}>
      {distribution.map((n, l) => (
        <div key={l} className="flex flex-1 flex-col items-center gap-1">
          <span className="text-[10px] tabular text-muted-foreground">{n || ""}</span>
          <span className="w-full rounded-sm" style={{ height: 4 + (n / max) * 40, background: n ? ladderStyle(l).background : "var(--muted)" }} />
          <span className="text-[10px] font-medium tabular text-muted-foreground" title={LADDER[l as LadderLevel].name}>
            L{l}
          </span>
        </div>
      ))}
    </div>
  );
}

"use client";
import * as React from "react";
import { PRIORITISATION, type UseCase } from "@/lib/engine";
import { cn } from "@/lib/utils";
import { maturityStyle } from "./maturity";

const W = 640;
const H = 420;
const PAD = { l: 44, r: 16, t: 8, b: 40 };
const x = (f: number) => PAD.l + ((f - 0.5) / 5) * (W - PAD.l - PAD.r);
const y = (v: number) => H - PAD.b - ((v - 0.5) / 5.5) * (H - PAD.t - PAD.b);
const radius = (gap: number) => 8 + Math.min(3, gap) * 4;

/**
 * Value × feasibility 2×2 (SIRI-style). Bubble size = gap, colour = data readiness on the
 * maturity ramp. Bubbles sharing a cell are fanned out deterministically. Keyboard: Tab to a
 * bubble, Enter to select.
 */
export function PriorityMatrix({
  items,
  selected,
  onSelect,
}: {
  items: UseCase[];
  selected?: string | null;
  onSelect: (id: string) => void;
}) {
  const groups = new Map<string, UseCase[]>();
  for (const u of items) {
    const k = `${u.feasibility}|${u.value}`;
    groups.set(k, [...(groups.get(k) ?? []), u]);
  }
  const placed = [...groups.values()].flatMap((list) =>
    list
      .sort((a, b) => b.priority - a.priority)
      .map((u, i) => {
        const n = list.length;
        const ring = n === 1 ? 0 : 19 + Math.floor(i / 6) * 16;
        const angle = (i % 6) * ((2 * Math.PI) / Math.min(6, n)) - Math.PI / 2;
        return { u, cx: x(u.feasibility) + ring * Math.cos(angle), cy: y(u.value) + ring * Math.sin(angle) };
      }),
  );
  // scores are whole numbers, so the boundaries sit half a step below each threshold
  const qx = x(PRIORITISATION.quickWinFeasibility - 0.5);
  const qy = y(PRIORITISATION.quickWinValue);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="group" aria-label="Value versus feasibility matrix">
      <rect x={qx} y={PAD.t} width={W - PAD.r - qx} height={qy - PAD.t} fill="var(--confidence-high)" opacity={0.07} />
      <line x1={qx} x2={qx} y1={PAD.t} y2={H - PAD.b} stroke="var(--border)" strokeDasharray="4 4" />
      <line x1={PAD.l} x2={W - PAD.r} y1={qy} y2={qy} stroke="var(--border)" strokeDasharray="4 4" />
      {[
        ["Quick wins", W - PAD.r - 8, PAD.t + 14, "end"],
        ["Strategic bets", PAD.l + 8, PAD.t + 14, "start"],
        ["Fill-ins", W - PAD.r - 8, H - PAD.b - 10, "end"],
        ["Deprioritise", PAD.l + 8, H - PAD.b - 10, "start"],
      ].map(([t, tx, ty, anchor]) => (
        <text key={t as string} x={tx as number} y={ty as number} textAnchor={anchor as "end"} className="fill-muted-foreground text-[11px] font-medium">
          {t}
        </text>
      ))}
      {[1, 2, 3, 4, 5].map((v) => (
        <g key={v}>
          <text x={x(v)} y={H - PAD.b + 16} textAnchor="middle" className="fill-muted-foreground text-[11px] tabular">
            {v}
          </text>
          <text x={PAD.l - 12} y={y(v) + 4} textAnchor="end" className="fill-muted-foreground text-[11px] tabular">
            {v}
          </text>
        </g>
      ))}
      <text x={(PAD.l + W - PAD.r) / 2} y={H - 6} textAnchor="middle" className="fill-muted-foreground text-[11px]">
        Feasibility (data readiness, dependencies, initiative underway)
      </text>
      <text x={12} y={(PAD.t + H - PAD.b) / 2} textAnchor="middle" transform={`rotate(-90 12 ${(PAD.t + H - PAD.b) / 2})`} className="fill-muted-foreground text-[11px]">
        Value
      </text>
      {placed.map(({ u, cx, cy }) => {
        const s = maturityStyle(u.dataReadiness);
        const isSel = selected === u.id;
        return (
          <g
            key={u.id}
            role="button"
            tabIndex={0}
            aria-pressed={isSel}
            aria-label={`${u.title}: value ${u.value}, feasibility ${u.feasibility}, gap ${u.gap.toFixed(1)}, priority ${Math.round(u.priority)}`}
            onClick={() => onSelect(u.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(u.id);
              }
            }}
            className="cursor-pointer outline-none [&:focus-visible>circle]:stroke-[var(--ring)] [&:focus-visible>circle]:stroke-[3px]"
          >
            <title>{`${u.title} — priority ${Math.round(u.priority)}`}</title>
            <circle
              cx={cx}
              cy={cy}
              r={radius(u.gap)}
              style={{ fill: s.background as string }}
              stroke={isSel ? "var(--foreground)" : "var(--card)"}
              strokeWidth={isSel ? 2.5 : 1.5}
              className={cn("transition-[r] duration-300")}
            />
            <text x={cx} y={cy + 3.5} textAnchor="middle" className="pointer-events-none text-[10px] font-semibold tabular" style={{ fill: s.color as string }}>
              {Math.round(u.priority)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

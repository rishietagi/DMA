"use client";
import { PRIORITISATION, type ProcessIdea } from "@/lib/engine";
import { ladderStyle } from "./ladder";

const W = 560;
const H = 360;
const PAD = { l: 40, r: 14, t: 8, b: 38 };
const x = (f: number) => PAD.l + ((f - 0.5) / 5) * (W - PAD.l - PAD.r);
const y = (v: number) => H - PAD.b - ((v - 0.5) / 5.5) * (H - PAD.t - PAD.b);
const radius = (gap: number) => 9 + Math.min(4, gap) * 3.5;

/**
 * Value × ease 2×2 for the ideas. Bubble size = the process gap, colour = the process's level,
 * number = priority. Bubbles sharing a cell fan out deterministically. Tab to a bubble, Enter selects.
 */
export function IdeaMatrix({ ideas, selected, onSelect }: { ideas: readonly ProcessIdea[]; selected?: string | null; onSelect: (id: string) => void }) {
  const groups = new Map<string, ProcessIdea[]>();
  for (const u of ideas) {
    const k = `${Math.round(u.feasibility)}|${Math.round(u.value)}`;
    groups.set(k, [...(groups.get(k) ?? []), u]);
  }
  const placed = [...groups.values()].flatMap((list) =>
    [...list]
      .sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id))
      .map((u, i) => {
        const n = list.length;
        const ring = n === 1 ? 0 : 22;
        const angle = i * ((2 * Math.PI) / n) - Math.PI / 2;
        return { u, cx: x(u.feasibility) + ring * Math.cos(angle), cy: y(u.value) + ring * Math.sin(angle) };
      }),
  );
  const qx = x(PRIORITISATION.quickWinFeasibility - 0.5);
  const qy = y(PRIORITISATION.quickWinValue - 0.5);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="group" aria-label="Value versus ease of the ideas">
      <rect x={qx} y={PAD.t} width={W - PAD.r - qx} height={qy - PAD.t} fill="var(--confidence-high)" opacity={0.08} />
      <line x1={qx} x2={qx} y1={PAD.t} y2={H - PAD.b} stroke="var(--border)" strokeDasharray="4 4" />
      <line x1={PAD.l} x2={W - PAD.r} y1={qy} y2={qy} stroke="var(--border)" strokeDasharray="4 4" />
      {(
        [
          ["Quick wins", W - PAD.r - 8, PAD.t + 14, "end"],
          ["Big bets", PAD.l + 8, PAD.t + 14, "start"],
          ["Fill-ins", W - PAD.r - 8, H - PAD.b - 10, "end"],
          ["Park", PAD.l + 8, H - PAD.b - 10, "start"],
        ] as const
      ).map(([t, tx, ty, anchor]) => (
        <text key={t} x={tx} y={ty} textAnchor={anchor} className="fill-muted-foreground text-[11px] font-medium">
          {t}
        </text>
      ))}
      {[1, 2, 3, 4, 5].map((v) => (
        <g key={v}>
          <text x={x(v)} y={H - PAD.b + 15} textAnchor="middle" className="fill-muted-foreground text-[10px] tabular">
            {v}
          </text>
          <text x={PAD.l - 10} y={y(v) + 4} textAnchor="end" className="fill-muted-foreground text-[10px] tabular">
            {v}
          </text>
        </g>
      ))}
      <text x={(PAD.l + W - PAD.r) / 2} y={H - 6} textAnchor="middle" className="fill-muted-foreground text-[11px]">
        Ease (data readiness, effort, work already underway)
      </text>
      <text x={11} y={(PAD.t + H - PAD.b) / 2} textAnchor="middle" transform={`rotate(-90 11 ${(PAD.t + H - PAD.b) / 2})`} className="fill-muted-foreground text-[11px]">
        Value
      </text>
      {placed.map(({ u, cx, cy }) => {
        const s = ladderStyle(u.processScore);
        const isSel = selected === u.id;
        return (
          <g
            key={u.id}
            role="button"
            tabIndex={0}
            aria-pressed={isSel}
            aria-label={`${u.title} (${u.processName}): value ${u.value}, ease ${u.feasibility}, priority ${Math.round(u.priority)}`}
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
            <circle cx={cx} cy={cy} r={radius(u.gap)} style={{ fill: s.background as string }} stroke={isSel ? "var(--foreground)" : "var(--card)"} strokeWidth={isSel ? 2.5 : 1.5} />
            <text x={cx} y={cy + 3.5} textAnchor="middle" className="pointer-events-none text-[10px] font-semibold tabular" style={{ fill: s.color as string }}>
              {Math.round(u.priority)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

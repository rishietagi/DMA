"use client";
import { IDEA_CRITERIA, type ProcessIdea } from "@/lib/engine";
import { ladderStyle } from "./ladder";

const W = 560;
const H = 360;
const PAD = { l: 40, r: 14, t: 8, b: 38 };
const x = (v: number) => PAD.l + ((v - 0.5) / 5) * (W - PAD.l - PAD.r);
const y = (a: number) => H - PAD.b - ((a - 0.5) / 5) * (H - PAD.t - PAD.b);
const radius = (gap: number) => 9 + Math.min(4, gap) * 3.5;

/** Quadrant tints and labels, as in the approach deck's prioritization matrix. */
const QUADRANTS = [
  { label: "Strategic bets", fill: "var(--ai-accent)", opacity: 0.08, at: "tl" },
  { label: "Scale now", fill: "var(--level-5)", opacity: 0.12, at: "tr" },
  { label: "Reframe / defer", fill: "var(--muted-foreground)", opacity: 0.07, at: "bl" },
  { label: "Quick wins", fill: "var(--level-2)", opacity: 0.12, at: "br" },
] as const;

/**
 * The prioritization matrix: business value (x) × strategic alignment (y). Bubble size = the process
 * gap, colour = the process's stage, number = priority (0–100, all five criteria). Bubbles sharing a
 * cell fan out deterministically. Tab to a bubble, Enter selects.
 */
export function IdeaMatrix({ ideas, selected, onSelect }: { ideas: readonly ProcessIdea[]; selected?: string | null; onSelect: (id: string) => void }) {
  const groups = new Map<string, ProcessIdea[]>();
  for (const u of ideas) {
    const k = `${Math.round(u.value)}|${Math.round(u.alignment)}`;
    groups.set(k, [...(groups.get(k) ?? []), u]);
  }
  const placed = [...groups.values()].flatMap((list) =>
    [...list]
      .sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id))
      .map((u, i) => {
        const n = list.length;
        const ring = n === 1 ? 0 : 22;
        const angle = i * ((2 * Math.PI) / n) - Math.PI / 2;
        return { u, cx: x(u.value) + ring * Math.cos(angle), cy: y(u.alignment) + ring * Math.sin(angle) };
      }),
  );
  // the line sits half a step below the threshold, so a score of exactly 3 lands in the upper half
  const mx = x(IDEA_CRITERIA.threshold - 0.5);
  const my = y(IDEA_CRITERIA.threshold - 0.5);
  const box = {
    tl: { x: PAD.l, y: PAD.t, w: mx - PAD.l, h: my - PAD.t },
    tr: { x: mx, y: PAD.t, w: W - PAD.r - mx, h: my - PAD.t },
    bl: { x: PAD.l, y: my, w: mx - PAD.l, h: H - PAD.b - my },
    br: { x: mx, y: my, w: W - PAD.r - mx, h: H - PAD.b - my },
  };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="group" aria-label="Prioritization matrix: business value versus strategic alignment">
      {QUADRANTS.map((q) => {
        const b = box[q.at];
        return (
          <g key={q.label}>
            <rect x={b.x} y={b.y} width={b.w} height={b.h} fill={q.fill} opacity={q.opacity} />
            <text x={b.x + 8} y={q.at[0] === "t" ? b.y + 15 : b.y + b.h - 8} className="fill-foreground text-[11px] font-semibold" opacity={0.75}>
              {q.label}
            </text>
          </g>
        );
      })}
      <line x1={mx} x2={mx} y1={PAD.t} y2={H - PAD.b} stroke="var(--border)" />
      <line x1={PAD.l} x2={W - PAD.r} y1={my} y2={my} stroke="var(--border)" />
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
        Business value →
      </text>
      <text x={11} y={(PAD.t + H - PAD.b) / 2} textAnchor="middle" transform={`rotate(-90 11 ${(PAD.t + H - PAD.b) / 2})`} className="fill-muted-foreground text-[11px]">
        Strategic alignment →
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
            aria-label={`${u.title} (${u.processName}): ${u.quadrant}; value ${u.value}, alignment ${u.alignment}, priority ${Math.round(u.priority)}`}
            onClick={() => onSelect(u.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(u.id);
              }
            }}
            className="cursor-pointer outline-none [&:focus-visible>circle]:stroke-[var(--ring)] [&:focus-visible>circle]:stroke-[3px]"
          >
            <title>{`${u.title} — ${u.quadrant}, priority ${Math.round(u.priority)}`}</title>
            <circle cx={cx} cy={cy} r={radius(u.gap)} style={{ fill: s.background as string }} stroke={isSel ? "var(--foreground)" : "var(--level-" + Math.round(u.processScore ?? 1) + ")"} strokeWidth={isSel ? 2.5 : 1.5} />
            <text x={cx} y={cy + 3.5} textAnchor="middle" className="pointer-events-none text-[10px] font-semibold tabular" style={{ fill: s.color as string }}>
              {Math.round(u.priority)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export const SCORING_CRITERIA = [
  { key: "value", label: "Business value", note: "Revenue, margin, service, productivity", weight: IDEA_CRITERIA.wValue },
  { key: "alignment", label: "Strategic alignment", note: "Growth priorities and target experiences", weight: IDEA_CRITERIA.wAlignment },
  { key: "feasibility", label: "Feasibility", note: "Data, technology, process and skills readiness", weight: IDEA_CRITERIA.wFeasibility },
  { key: "risk", label: "Risk & obligation", note: "Cyber, compliance, continuity and control", weight: IDEA_CRITERIA.wRisk },
  { key: "dependencies", label: "Dependencies", note: "Platforms, master data, ownership and change capacity", weight: IDEA_CRITERIA.wDependencies },
] as const;

/** The five scoring criteria, numbered, with their weights in the priority score. */
export function ScoringCriteria() {
  return (
    <ol className="flex flex-col gap-2" aria-label="Scoring criteria">
      {SCORING_CRITERIA.map((c, i) => (
        <li key={c.key} className="flex items-start gap-3 rounded-lg border bg-card px-3 py-2">
          <span
            className="grid size-7 shrink-0 place-items-center rounded-md text-xs font-bold text-white tabular"
            style={{ background: ["var(--level-3)", "var(--level-4)", "var(--ai-accent)", "var(--level-2)", "var(--level-5)"][i] }}
            aria-hidden
          >
            {i + 1}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-semibold">{c.label}</span>
            <span className="block text-[12px] text-muted-foreground">{c.note}</span>
          </span>
          <span className="shrink-0 text-[11px] text-muted-foreground tabular">{Math.round(c.weight * 100)}%</span>
        </li>
      ))}
    </ol>
  );
}

"use client";
import { ladderLevel, type ProcessIndicator } from "@/lib/engine";

const ROWS: { kind: ProcessIndicator["kind"]; label: string; color: string }[] = [
  { kind: "quick-check", label: "Interview", color: "var(--ai-accent)" },
  { kind: "question", label: "Questions", color: "var(--chart-3)" },
  { kind: "evidence", label: "Documents", color: "var(--maturity-4)" },
  { kind: "self", label: "2025 self", color: "var(--chart-4)" },
];
const W = 520;
const ROW_H = 34;
const PAD = { l: 82, r: 16, t: 10, b: 26 };
const x = (v: number) => PAD.l + (v / 5) * (W - PAD.l - PAD.r);

/**
 * Every signal behind a process level as a dot on the 0–5 ladder: one row per source, dot size by
 * weight × reliability, the suggested level as a line. Dots at the same level fan out.
 */
export function SignalPlot({ indicators, suggested, effective }: { indicators: readonly ProcessIndicator[]; suggested: number | null; effective: number | null }) {
  const H = PAD.t + ROWS.length * ROW_H + PAD.b;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      role="img"
      aria-label={`Signals on the 0 to 5 ladder: ${ROWS.map((r) => {
        const vs = indicators.filter((i) => i.kind === r.kind).map((i) => `L${ladderLevel(i.value)}`);
        return `${r.label} ${vs.length ? vs.join(", ") : "none"}`;
      }).join("; ")}. Suggested ${suggested === null ? "none" : suggested.toFixed(1)}.`}
    >
      {[0, 1, 2, 3, 4, 5].map((l) => (
        <g key={l}>
          <line x1={x(l)} x2={x(l)} y1={PAD.t} y2={H - PAD.b} stroke="var(--border)" />
          <text x={x(l)} y={H - 8} textAnchor="middle" className="fill-muted-foreground text-[11px] tabular">
            L{l}
          </text>
        </g>
      ))}
      {ROWS.map((r, ri) => {
        const cy = PAD.t + ri * ROW_H + ROW_H / 2;
        const seen = new Map<number, number>();
        return (
          <g key={r.kind}>
            <text x={PAD.l - 10} y={cy + 4} textAnchor="end" className="fill-muted-foreground text-[11px]">
              {r.label}
            </text>
            {indicators
              .filter((i) => i.kind === r.kind)
              .map((i, k) => {
                const key = Math.round(i.value * 4);
                const n = seen.get(key) ?? 0;
                seen.set(key, n + 1);
                const dy = n === 0 ? 0 : (n % 2 ? -1 : 1) * Math.ceil(n / 2) * 6;
                return (
                  <circle
                    key={k}
                    cx={x(i.value)}
                    cy={cy + dy}
                    r={3 + i.weight * i.reliability * 1.6}
                    fill={r.color}
                    fillOpacity={0.55}
                    stroke={r.color}
                  />
                );
              })}
          </g>
        );
      })}
      {suggested !== null && (
        <g>
          <line x1={x(suggested)} x2={x(suggested)} y1={PAD.t - 4} y2={H - PAD.b} stroke="var(--ai-accent)" strokeWidth={2} strokeDasharray="4 3" />
          <text x={x(suggested) + 4} y={PAD.t + 4} className="fill-ai-foreground text-[10px] font-semibold tabular">
            AI {suggested.toFixed(1)}
          </text>
        </g>
      )}
      {effective !== null && suggested !== null && Math.abs(effective - suggested) > 0.01 && (
        <line x1={x(effective)} x2={x(effective)} y1={PAD.t - 4} y2={H - PAD.b} stroke="var(--validated)" strokeWidth={2} />
      )}
    </svg>
  );
}

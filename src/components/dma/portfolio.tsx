"use client";
/** The deck's indicative outputs on the Prioritize & Roadmap step (§11.6). Everything renders engine output. */
import { AlertTriangle, CircleDot, Gavel, Layers } from "lucide-react";
import { type FunctionProcessResult, type Phase, type ProcessResult } from "@/lib/engine";
import { FUNCTION_SHORT } from "@/lib/labels";
import {
  byLayer,
  byTheme,
  CRITICALITY_SCORE,
  foundations,
  MATURITY_MIDLINE,
  PHASE_LABEL,
  PHASE_MONTHS,
  PHASES,
  portfolioPoints,
  RESPONSE_NOTE,
  type Governance,
  type PortfolioIdea,
  type PortfolioResponse,
  type Rag,
} from "@/lib/portfolio";
import { PORTFOLIO_THEMES, ROADMAP_LAYERS } from "@/lib/schema";
import { cn } from "@/lib/utils";
import { levelColor } from "./ladder";

const PHASE_COLOR: Record<Phase, string> = { Now: "var(--level-3)", Next: "var(--ai-accent)", Later: "var(--level-5)" };
const THEME_COLOR: Record<(typeof PORTFOLIO_THEMES)[number], string> = {
  "Grow & engage": "var(--level-3)",
  "Plan & fulfil": "var(--level-4)",
  "Innovate & assure": "var(--ai-accent)",
  "Run & enable": "var(--level-2)",
};
const LAYER_COLOR: Record<(typeof ROADMAP_LAYERS)[number], string> = {
  "Business experiences": "var(--level-3)",
  Operations: "var(--level-4)",
  "Data, AI & platforms": "var(--ai-accent)",
  "Operating model": "var(--level-2)",
};

/** "This function / All functions" for the enterprise views. */
export function ScopeToggle({ value, onChange, fn }: { value: "function" | "all"; onChange: (v: "function" | "all") => void; fn: string }) {
  return (
    <div role="radiogroup" aria-label="Portfolio scope" className="inline-flex rounded-lg border bg-muted/40 p-0.5 text-[12px]">
      {(
        [
          ["all", "All functions"],
          ["function", fn],
        ] as const
      ).map(([v, label]) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          onClick={() => onChange(v)}
          data-testid={`scope-${v}`}
          className={cn(
            "rounded-md px-2.5 py-1 outline-none focus-visible:ring-2 focus-visible:ring-ring",
            value === v ? "bg-card font-medium shadow-xs" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/** Output 1: current maturity per process as a bar, the target as a marker. */
export function MaturityByProcess({ processes }: { processes: readonly ProcessResult[] }) {
  const pct = (v: number) => `${(Math.min(5, Math.max(0, v)) / 5) * 100}%`;
  return (
    <ul className="flex flex-col gap-2.5" aria-label="Maturity by process: current versus target">
      {processes.map((p) => (
        <li key={p.id} className="grid grid-cols-[minmax(0,10rem)_1fr_4.5rem] items-center gap-3 text-[12px]">
          <span className="truncate" title={p.name}>
            {p.name}
          </span>
          <span className="relative h-3 rounded-full bg-muted" role="img" aria-label={`${p.name}: current ${p.effective?.toFixed(1) ?? "not rated"}, target ${p.target}`}>
            {p.effective !== null && <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: pct(p.effective), background: levelColor(p.effective) }} />}
            <span className="absolute -top-1 -bottom-1 w-0.5 -translate-x-1/2 rounded bg-foreground" style={{ left: pct(p.target) }} />
          </span>
          <span className="text-right tabular text-muted-foreground">
            <span className="font-semibold text-foreground">{p.effective?.toFixed(1) ?? "—"}</span> / {p.target}
          </span>
        </li>
      ))}
      <li className="flex gap-4 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-4 rounded-full bg-[var(--level-3)]" /> Current (colour = stage)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-0.5 rounded bg-foreground" /> Target
        </span>
      </li>
    </ul>
  );
}

const RESPONSES: { r: PortfolioResponse; color: string; at: "tl" | "tr" | "br" | "bl" }[] = [
  { r: "Transform now", color: "var(--level-2)", at: "tl" },
  { r: "Sustain & differentiate", color: "var(--level-5)", at: "tr" },
  { r: "Scale selectively", color: "var(--ai-accent)", at: "br" },
  { r: "Rationalize / monitor", color: "var(--muted-foreground)", at: "bl" },
];

/** Output 2: business criticality × digital maturity with the four portfolio responses. */
export function PortfolioMatrix({ processes }: { processes: readonly ProcessResult[] }) {
  const W = 560;
  const H = 340;
  const P = { l: 36, r: 12, t: 8, b: 34 };
  const x = (m: number) => P.l + ((m - 1) / 4) * (W - P.l - P.r);
  const y = (c: number) => H - P.b - ((c - 1) / 4) * (H - P.t - P.b);
  const mx = x(MATURITY_MIDLINE);
  const my = y(3);
  const pts = portfolioPoints(processes);
  const box = {
    tl: { x: P.l, y: P.t, w: mx - P.l, h: my - P.t },
    tr: { x: mx, y: P.t, w: W - P.r - mx, h: my - P.t },
    bl: { x: P.l, y: my, w: mx - P.l, h: H - P.b - my },
    br: { x: mx, y: my, w: W - P.r - mx, h: H - P.b - my },
  };
  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] [&>*]:min-w-0">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label={`Criticality versus maturity: ${pts.map((p) => `${p.name}, ${p.criticality} criticality, maturity ${p.maturity.toFixed(1)}, ${p.response}`).join("; ")}`}
      >
        {RESPONSES.map((q) => {
          const b = box[q.at];
          return (
            <g key={q.r}>
              <rect x={b.x} y={b.y} width={b.w} height={b.h} fill={q.color} opacity={0.09} />
              <text x={b.x + 8} y={b.y + 15} className="text-[10.5px] font-semibold uppercase" style={{ fill: q.color }}>
                {q.r}
              </text>
            </g>
          );
        })}
        <line x1={mx} x2={mx} y1={P.t} y2={H - P.b} stroke="var(--border)" />
        <line x1={P.l} x2={W - P.r} y1={my} y2={my} stroke="var(--border)" />
        {[1, 2, 3, 4, 5].map((v) => (
          <text key={v} x={x(v)} y={H - P.b + 14} textAnchor="middle" className="fill-muted-foreground text-[10px] tabular">
            {v}
          </text>
        ))}
        {(["High", "Medium", "Low"] as const).map((c) => (
          <text key={c} x={P.l - 6} y={y(CRITICALITY_SCORE[c]) + 3} textAnchor="end" className="fill-muted-foreground text-[9px]">
            {c[0]}
          </text>
        ))}
        <text x={(P.l + W - P.r) / 2} y={H - 4} textAnchor="middle" className="fill-muted-foreground text-[11px]">
          Digital maturity →
        </text>
        <text x={10} y={(P.t + H - P.b) / 2} textAnchor="middle" transform={`rotate(-90 10 ${(P.t + H - P.b) / 2})`} className="fill-muted-foreground text-[11px]">
          Business criticality →
        </text>
        {pts.map((p) => {
          const cx = x(p.maturity);
          const cy = y(p.y);
          const right = cx < W - 170;
          return (
            <g key={p.id}>
              <circle cx={cx} cy={cy} r={7} fill={levelColor(p.maturity)} stroke="var(--card)" strokeWidth={1.5} />
              <text x={right ? cx + 11 : cx - 11} y={cy + 3.5} textAnchor={right ? "start" : "end"} className="fill-foreground text-[11px]">
                {p.name}
              </text>
            </g>
          );
        })}
      </svg>
      <ul className="flex flex-col gap-3" aria-label="Four portfolio responses">
        {RESPONSES.map((q) => {
          const here = pts.filter((p) => p.response === q.r);
          return (
            <li key={q.r} className="flex gap-3">
              <span className="w-1 shrink-0 rounded" style={{ background: q.color }} aria-hidden />
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold" style={{ color: q.color === "var(--muted-foreground)" ? undefined : q.color }}>
                  {q.r}
                </span>
                <span className="block text-[11px] text-muted-foreground">{RESPONSE_NOTE[q.r]}</span>
                <span className="block text-[12px]">{here.length ? here.map((p) => p.name).join(" · ") : "—"}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function IdeaCard({ i, current, showFunction, onOpen }: { i: PortfolioIdea; current: string; showFunction: boolean; onOpen?: (id: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen?.(i.id)}
      className={cn(
        "flex w-full flex-col gap-1 rounded-lg border bg-card px-2.5 py-2 text-left outline-none transition-colors hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring",
        i.functionId === current && showFunction && "border-primary/50",
      )}
      data-testid={`portfolio-idea-${i.id}`}
    >
      <span className="text-[12px] leading-snug font-semibold">{i.title}</span>
      <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10.5px] text-muted-foreground">
        {i.portfolio && <span>{i.portfolio.valuePool}</span>}
        {showFunction && <span className="font-medium">{FUNCTION_SHORT[i.functionId]}</span>}
        <span className="tabular">P{Math.round(i.priority)}</span>
      </span>
    </button>
  );
}

function PhaseHeads() {
  return (
    <>
      <div />
      {PHASES.map((p) => (
        <div key={p} className="rounded-md px-2 py-1.5 text-center text-[12px] font-semibold text-white" style={{ background: PHASE_COLOR[p] }}>
          {PHASE_LABEL[p].toUpperCase()} <span className="font-normal opacity-90">| {PHASE_MONTHS[p]}</span>
        </div>
      ))}
    </>
  );
}

/** Output 4: initiatives by theme and horizon, tagged with their value pool, over the foundations. */
export function OpportunityPortfolio({ ideas, current, showFunction, onOpen }: { ideas: readonly PortfolioIdea[]; current: string; showFunction: boolean; onOpen?: (id: string) => void }) {
  const g = byTheme(ideas);
  const base = foundations(ideas);
  const themes = PORTFOLIO_THEMES.filter((t) => PHASES.some((p) => g[t][p].length));
  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto scrollbar-thin">
        <div className="grid min-w-[680px] grid-cols-[150px_repeat(3,minmax(0,1fr))] gap-2">
          <PhaseHeads />
          {themes.map((t) => (
            <div key={t} className="contents">
              <div className="grid place-items-center rounded-md px-2 py-3 text-center text-[12px] font-bold text-white uppercase" style={{ background: THEME_COLOR[t] }}>
                {t}
              </div>
              {PHASES.map((p) => (
                <div key={p} className="flex flex-col gap-1.5 rounded-md bg-muted/40 p-1.5">
                  {g[t][p].map((i) => (
                    <IdeaCard key={i.id} i={i} current={current} showFunction={showFunction} onOpen={onOpen} />
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      {!themes.length && <p className="text-sm text-muted-foreground">No initiatives at these targets.</p>}
      {base.length > 0 && (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md bg-foreground px-3 py-2 text-[12px] text-background">
          <Layers className="size-3.5" aria-hidden />
          <span className="font-semibold">Foundations:</span>
          {base.join(" • ")}
        </p>
      )}
    </div>
  );
}

/** Output 5: the roadmap by layer × horizon. */
export function LayerRoadmap({ ideas, current, showFunction, onOpen }: { ideas: readonly PortfolioIdea[]; current: string; showFunction: boolean; onOpen?: (id: string) => void }) {
  const g = byLayer(ideas);
  return (
    <div className="overflow-x-auto scrollbar-thin">
      <div className="grid min-w-[680px] grid-cols-[150px_repeat(3,minmax(0,1fr))] gap-2" data-testid="layer-roadmap">
        <PhaseHeads />
        {ROADMAP_LAYERS.map((l) => (
          <div key={l} className="contents">
            <div className="grid place-items-center rounded-md px-2 py-3 text-center text-[12px] font-semibold text-white" style={{ background: LAYER_COLOR[l] }}>
              {l}
            </div>
            {PHASES.map((p) => (
              <div key={p} className="flex min-h-12 flex-col gap-1.5 rounded-md border border-dashed p-1.5" style={{ borderColor: PHASE_COLOR[p] }}>
                {g[l][p].map((i) => (
                  <IdeaCard key={i.id} i={i} current={current} showFunction={showFunction} onOpen={onOpen} />
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

const RAG_COLOR: Record<Rag, string> = { green: "var(--level-5)", amber: "var(--level-2)", red: "var(--level-1)" };
const RAG_LABEL: Record<Rag, string> = { green: "On track", amber: "Watch", red: "At risk" };

/** Output 7: activation and value governance. */
export function GovernanceDashboard({ g, showFunction }: { g: Governance; showFunction: boolean }) {
  const stats = [
    { label: "Initiatives", value: String(g.initiatives), color: "var(--level-3)" },
    { label: "In delivery", value: String(g.inDelivery), color: "var(--level-5)" },
    { label: "At risk", value: String(g.atRisk), color: "var(--level-1)" },
    { label: "Value potential (Illustrative)", value: `₹${g.valueCr[0]}–${g.valueCr[1]} Cr`, color: "var(--level-4)" },
  ];
  return (
    <div className="flex flex-col gap-5" data-testid="governance">
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border-[1.5px] bg-card px-4 py-3" style={{ borderColor: s.color }}>
            <dd className="text-2xl font-semibold tabular" style={{ color: s.color }}>
              {s.value}
            </dd>
            <dt className="text-[12px] font-medium">{s.label}</dt>
          </div>
        ))}
      </dl>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] [&>*]:min-w-0">
        <div className="overflow-x-auto rounded-xl border bg-card p-4">
          <p className="mb-2 text-sm font-semibold">Portfolio health</p>
          <table className="w-full min-w-[520px] text-[12px]">
            <caption className="sr-only">Portfolio health by initiative</caption>
            <thead>
              <tr className="border-b text-left text-[11px] text-muted-foreground">
                <th scope="col" className="py-1.5 font-medium">Initiative</th>
                <th scope="col" className="py-1.5 pr-2 font-medium">Horizon</th>
                <th scope="col" className="py-1.5 pr-2 font-medium">Status</th>
                <th scope="col" className="py-1.5 font-medium">Lead KPI</th>
                <th scope="col" className="py-1.5 font-medium">Next decision</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {g.health.map((h) => (
                <tr key={h.id}>
                  <th scope="row" className="py-2 pr-2 text-left font-medium">
                    {h.title}
                    {showFunction && <span className="block text-[10.5px] font-normal text-muted-foreground">{FUNCTION_SHORT[h.functionId]}</span>}
                  </th>
                  <td className="py-2 pr-2">{PHASE_LABEL[h.phase]}</td>
                  <td className="py-2 pr-2 whitespace-nowrap" title={h.reason ?? undefined}>
                    <span className="inline-flex items-center gap-1.5">
                      <CircleDot className="size-3.5" style={{ color: RAG_COLOR[h.rag] }} aria-hidden />
                      {RAG_LABEL[h.rag]}
                    </span>
                  </td>
                  <td className="py-2 pr-2 text-muted-foreground">{h.kpi}</td>
                  <td className="py-2">{h.nextDecision}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="rounded-xl border-[1.5px] p-4" style={{ borderColor: "var(--level-2)", background: "var(--level-2-soft)" }}>
          <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold" style={{ color: "var(--level-2-ink)" }}>
            <Gavel className="size-4" aria-hidden />
            Decisions required
          </p>
          <ol className="flex flex-col gap-2.5">
            {g.decisions.map((d, i) => (
              <li key={d} className="flex items-start gap-2.5 text-[13px]">
                <span className="grid size-6 shrink-0 place-items-center rounded-md text-[11px] font-bold text-white" style={{ background: "var(--level-2)" }}>
                  {i + 1}
                </span>
                <span className="pt-0.5 font-medium" style={{ color: "var(--level-2-ink)" }}>
                  {d}
                </span>
              </li>
            ))}
            {!g.decisions.length && <li className="text-[13px] text-muted-foreground">Nothing waiting on leadership.</li>}
          </ol>
        </div>
      </div>
      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <AlertTriangle className="size-3.5" aria-hidden />
        Status is derived from the assessment (sources disagree, feasibility, dependencies, risk) until delivery data is connected. Value ranges are Illustrative.
      </p>
    </div>
  );
}

/** Output 1 headline numbers. */
export function storyStats(r: FunctionProcessResult, themes: number) {
  return [
    { label: "Current maturity", value: r.overall === null ? "—" : r.overall.toFixed(1), color: "var(--level-3)" },
    { label: "Target maturity", value: r.targetMean.toFixed(1), color: "var(--level-5)" },
    { label: "Ambition gap", value: r.overall === null ? "—" : Math.max(0, r.targetMean - r.overall).toFixed(1), color: "var(--level-2)" },
    { label: "Priority themes", value: String(themes), color: "var(--foreground)" },
  ];
}


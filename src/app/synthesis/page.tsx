"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileDown, PenLine, ShieldCheck, Sparkles } from "lucide-react";
import { useAssessment } from "@/components/providers/assessment-provider";
import { Button } from "@/components/ui/button";
import { HeatmapGrid } from "@/components/dma/heatmap-grid";
import { headlineStats, KpiStrip } from "@/components/dma/kpi-strip";
import { MaturityChip, MaturityLegend, maturityStyle } from "@/components/dma/maturity";
import { Page, PageHeader } from "@/components/dma/page-header";
import { runAgent } from "@/lib/ai/client";
import { synthesisContext } from "@/lib/ai/contexts";
import { formatMean, type Phase } from "@/lib/engine";
import { ALIGNMENT_LABEL, capabilityLabel, FUNCTION_SHORT, STATUS_LABEL } from "@/lib/labels";
import { buildNarrative } from "@/lib/narrative";
import { seed } from "@/lib/seed";
import { useSession } from "@/lib/store/session";
import { cn } from "@/lib/utils";

const PHASES: Phase[] = ["Now", "Next", "Later"];

function Section({ title, children, className, aside }: { title: string; children: React.ReactNode; className?: string; aside?: React.ReactNode }) {
  return (
    <section className={cn("print-avoid rounded-xl border bg-card p-5", className)}>
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        {aside && <div className="text-xs text-muted-foreground">{aside}</div>}
      </div>
      {children}
    </section>
  );
}

export default function SynthesisPage() {
  const { result, baseline } = useAssessment();
  const rag = useSession((s) => s.ragView);
  const router = useRouter();
  const narrative = buildNarrative(result);
  const k = result.kpis;
  const validatedShare = k.all.validated / Math.max(1, k.all.capabilities);

  const priorities = seed.baseline.priorities2026.map((p) => {
    const caps = p.capabilityIds.map((id) => result.byId[id]!).filter((c) => c.inScope);
    const opps = p.capabilityIds.map((id) => result.opportunities[id]).filter(Boolean);
    const avg = caps.reduce((a, c) => a + c.effectiveScore, 0) / Math.max(1, caps.length);
    const gap = opps.reduce((a, o) => a + (o?.gap ?? 0), 0) / Math.max(1, opps.length);
    const inits = [...new Map(opps.flatMap((o) => o!.initiatives).map((i) => [i.id, i])).values()];
    return { p, avg, gap, inits, alignment: opps.map((o) => o!.alignment) };
  });

  const portfolio = [...result.useCases].sort((a, b) => b.priority - a.priority).slice(0, 8);

  return (
    <Page className="max-w-[1280px]">
      <PageHeader
        title="Executive synthesis"
        description="One boardroom view generated from the engine. AI-suggested figures are marked until a consultant validates them."
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void runAgent("synthesis", synthesisContext(result, narrative.headline))}
            >
              <PenLine />
              Redraft narrative
            </Button>
            <Button size="sm" onClick={() => window.print()} data-testid="export-pdf">
              <FileDown />
              Export PDF
            </Button>
          </>
        }
      />

      <div className="print-only mb-2">
        <p className="text-xs">Himalaya · FY26 Digital Maturity Assessment · CPD and enterprise functions · KPMG · Illustrative demo — simulated AI</p>
      </div>

      <section className="print-avoid rounded-xl border bg-card px-6 py-6">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {validatedShare >= 1 ? (
            <span className="inline-flex items-center gap-1 text-validated">
              <ShieldCheck className="size-3.5" /> All scores validated
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-ai-foreground">
              <Sparkles className="size-3.5" /> {k.all.validated} of {k.all.capabilities} scores validated; the rest are AI suggested
            </span>
          )}
        </div>
        <h2 className="mt-3 max-w-4xl text-[28px] leading-tight font-semibold tracking-tight text-balance">{narrative.headline}</h2>
        <div className="mt-4 grid max-w-5xl gap-3 text-[15px] leading-relaxed text-foreground/85 md:grid-cols-3">
          {narrative.paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </section>

      <KpiStrip stats={headlineStats(k.enterprise, baseline.kpis.enterprise)} />

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Section title="Maturity heatmap">
          <HeatmapGrid functions={result.functions} rag={rag} onSelect={(fn) => router.push(`/compare?fn=${fn}`)} caption="Executive heatmap by function and dimension" />
          <MaturityLegend rag={rag} className="mt-3" />
        </Section>

        <Section title="Function scorecards" aside="Self-assessed vs current">
          <ul className="flex flex-col gap-2.5">
            {result.functions.map((f) => (
              <li key={f.fn.id} className="grid grid-cols-[96px_1fr_auto] items-center gap-3">
                <span className="truncate text-[13px]">{FUNCTION_SHORT[f.fn.id]}</span>
                <div className="relative h-5 rounded-md bg-muted" aria-hidden>
                  <div
                    className="absolute inset-y-0 left-0 rounded-md transition-[width] duration-700"
                    style={{ width: `${((f.score ?? 1) / 5) * 100}%`, ...maturityStyle(f.score, rag) }}
                  />
                  <div className="absolute inset-y-[-3px] w-0.5 rounded bg-foreground/70" style={{ left: `calc(${((f.selfScore ?? 1) / 5) * 100}% - 1px)` }} title="Self-assessed" />
                </div>
                <span className="w-24 text-right text-xs tabular text-muted-foreground">
                  <span className="font-semibold text-foreground">{formatMean(f.score)}</span> vs {formatMean(f.selfScore)}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] text-muted-foreground">Bar = current score; tick = 2025 self-assessment. Shared capabilities count in each function they span.</p>
        </Section>
      </div>

      <Section title="2026 priorities — where they stand">
        <ol className="grid gap-3 md:grid-cols-5">
          {priorities.map(({ p, avg, gap, inits, alignment }) => (
            <li key={p.id} className="flex flex-col gap-2 rounded-lg border p-3">
              <span className="text-xs tabular text-muted-foreground">Priority {p.rank}</span>
              <p className="text-[13px] leading-snug font-medium">{p.title}</p>
              <div className="flex items-center gap-2">
                <MaturityChip score={avg} size="sm" rag={rag} />
                <span className="text-xs text-muted-foreground tabular">gap {gap.toFixed(1)}</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {inits.length ? inits.map((i) => `${i.title} (${STATUS_LABEL[i.status].toLowerCase()})`).join("; ") : "No initiative mapped"}
              </p>
              {alignment.includes("ACCELERATE") && <span className="mt-auto w-fit rounded bg-conf-med/15 px-1.5 py-0.5 text-[11px] font-medium text-foreground">Accelerate</span>}
              {alignment.includes("WHITESPACE") && <span className="mt-auto w-fit rounded bg-whitespace/15 px-1.5 py-0.5 text-[11px] font-medium">Whitespace</span>}
            </li>
          ))}
        </ol>
      </Section>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Section title="Opportunity portfolio" aside={<Link href="/opportunities" className="no-print hover:underline">Open studio</Link>}>
          <table className="w-full text-left text-[13px]">
            <thead className="text-[11px] text-muted-foreground">
              <tr>
                <th className="pb-2 font-medium">Use case</th>
                <th className="pb-2 font-medium">Function</th>
                <th className="pb-2 font-medium">Quadrant</th>
                <th className="pb-2 text-right font-medium">Priority</th>
                <th className="pb-2 text-right font-medium">Phase</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {portfolio.map((u) => (
                <tr key={u.id}>
                  <td className="py-2 pr-2 font-medium">{u.title}</td>
                  <td className="py-2 pr-2 text-xs text-muted-foreground">{u.functionIds.map((f) => FUNCTION_SHORT[f]).join(", ")}</td>
                  <td className="py-2 pr-2 text-xs">{u.quadrant}</td>
                  <td className="py-2 text-right tabular">{Math.round(u.priority)}</td>
                  <td className="py-2 text-right text-xs">{u.phase}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        <Section title="Roadmap at a glance" aside={<Link href="/roadmap" className="no-print hover:underline">Open roadmap</Link>}>
          <div className="grid grid-cols-3 gap-2">
            {PHASES.map((ph) => {
              const list = result.useCases.filter((u) => u.phase === ph);
              return (
                <div key={ph} className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">{ph}</p>
                  <p className="text-2xl font-semibold tabular">{list.length}</p>
                  <p className="text-[11px] text-muted-foreground">use cases</p>
                </div>
              );
            })}
          </div>
          <div className="mt-4">
            <p className="mb-1.5 text-xs font-medium">Whitespaces — gap without a roadmap initiative</p>
            <ul className="flex flex-wrap gap-1.5">
              {Object.values(result.opportunities)
                .filter((o) => o.alignment === "WHITESPACE")
                .map((o) => (
                  <li key={o.capabilityId} className="hatch rounded-md border border-whitespace/50 px-2 py-1 text-xs">
                    {capabilityLabel(o.capabilityId)} <span className="tabular text-muted-foreground">gap {o.gap.toFixed(1)}</span>
                  </li>
                ))}
            </ul>
            <p className="mt-3 text-[11px] text-muted-foreground">
              {Object.values(result.opportunities).filter((o) => o.alignment === "ACCELERATE").length} capabilities flagged{" "}
              {ALIGNMENT_LABEL.ACCELERATE.toLowerCase()}; {Object.values(result.opportunities).filter((o) => o.alignment === "REVISIT").length}{" "}
              completed initiatives with an adoption gap.
            </p>
          </div>
        </Section>
      </div>

      <p className="text-[11px] text-muted-foreground">
        Scores on a 1–5 scale in half-points. Engine: Himalaya’s 4-parameter, 5-level model with acatech-style stage gating, SIRI-style
        prioritisation and CMMI evidence discipline. Demo data is illustrative; AI behaviour is simulated. Generated{" "}
        {new Date().toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}.
      </p>
    </Page>
  );
}

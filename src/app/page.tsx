"use client";
import { Check, Flag } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/misc";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/overlays";
import { BaselineBars } from "@/components/dma/charts";
import { KpiStrip } from "@/components/dma/kpi-strip";
import { LadderChart, ladderStyle } from "@/components/dma/ladder";
import { Page, PageHeader } from "@/components/dma/page-header";
import { StepNav } from "@/components/shell/step-nav";
import { LADDER, LADDER_LEVELS, mean, stageLabel, toLadder, type LadderLevel } from "@/lib/engine";
import { capabilityLabel, FUNCTION_SHORT, functionName } from "@/lib/labels";
import { capabilitiesForStep, capabilitiesOf, isHiddenCapability, l1Processes, processKey } from "@/lib/process-input";
import { FUNCTION_IDS, type FunctionId } from "@/lib/schema";
import { seed } from "@/lib/seed";
import { useSession } from "@/lib/store/session";
import { cn } from "@/lib/utils";

const capsOf = capabilitiesOf;
const selfLevel = (fn: FunctionId) => {
  const caps = capsOf(fn);
  return caps.length ? toLadder(mean(caps.map((c) => c.selfScore))) : null;
};

function FunctionCards({ value, onChange }: { value: FunctionId; onChange: (fn: FunctionId) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5" role="radiogroup" aria-label="Function (L0)">
      {FUNCTION_IDS.map((fn) => {
        const on = fn === value;
        const self = selfLevel(fn);
        return (
          <button
            key={fn}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(fn)}
            data-testid={`fn-${fn}`}
            className={cn(
              "flex flex-col gap-2 rounded-xl border bg-card p-3 text-left outline-none transition-colors hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring",
              on && "border-primary ring-2 ring-primary/30",
            )}
          >
            <span className="flex items-start justify-between gap-2">
              <span className="text-[13px] leading-tight font-semibold">{functionName(fn)}</span>
              {on && <Check className="size-4 shrink-0 text-primary" aria-hidden />}
            </span>
            <span className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
              <span className="block h-full rounded-full" style={{ width: `${((self ?? 0) / 5) * 100}%`, background: ladderStyle(self).background }} />
            </span>
            <span className="text-[11px] text-muted-foreground tabular">2025 baseline {self === null ? "—" : self.toFixed(1)}</span>
          </button>
        );
      })}
    </div>
  );
}

export default function ScopePage() {
  const functionId = useSession((s) => s.functionId);
  const processes = useSession((s) => s.processes);
  const target = useSession((s) => s.target);
  const setFunction = useSession((s) => s.setFunction);
  const toggleProcess = useSession((s) => s.toggleProcess);
  const setTarget = useSession((s) => s.setTarget);

  const chain = l1Processes(functionId);
  const selected = chain.filter((step) => processes.includes(processKey(functionId, step))).length;
  const caps = capsOf(functionId);
  const priorities = seed.baseline.priorities2026.filter((p) => p.capabilityIds.some((c) => caps.some((x) => x.id === c)));
  const initiatives = seed.roadmap.initiatives.filter((i) => i.functionId === functionId && !i.mapsTo.every(isHiddenCapability));

  return (
    <Page>
      <PageHeader stage={1} title="Define & Focus" />

      <div className="grid items-start gap-6 lg:grid-cols-2 [&>*]:min-w-0">
        <Card>
          <CardHeader>
            <CardTitle>Where are we today?</CardTitle>
            <p className="text-[13px] text-muted-foreground">
              Each capability is self-assessed and mapped to the maturity ladder, creating the baseline for our assessment.
            </p>
          </CardHeader>
          <CardContent>
            {caps.length ? (
              <BaselineBars items={caps.map((c) => ({ id: c.id, name: c.name, level: toLadder(c.selfScore) }))} />
            ) : (
              <p className="text-sm text-muted-foreground">No 2025 capabilities for this function.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>
              What matters in 2026 <span className="font-normal text-muted-foreground">(focus areas)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <ul className="flex flex-col gap-2">
              {priorities.map((p) => (
                <li key={p.id} className="flex gap-2.5 text-[13px]">
                  <Flag className="mt-0.5 size-3.5 shrink-0 text-ai" aria-hidden />
                  <span>
                    <span className="font-medium">#{p.rank} {p.title}</span>
                    <span className="block text-[12px] text-muted-foreground">{p.detail}</span>
                  </span>
                </li>
              ))}
              {!priorities.length && <li className="text-sm text-muted-foreground">No 2026 focus areas for this function.</li>}
            </ul>
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">On the 2026-27 roadmap</p>
              <ul className="flex flex-wrap gap-1.5">
                {initiatives.map((i) => (
                  <li key={i.id} className="rounded-md border px-2 py-1 text-[11px]">
                    {i.title} <span className="text-muted-foreground">· {i.status.replace("_", " ")}</span>
                  </li>
                ))}
                {!initiatives.length && <li className="text-[12px] text-muted-foreground">Nothing planned yet.</li>}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      <section className="flex flex-col gap-3" aria-labelledby="fn-h">
        <h2 id="fn-h" className="text-sm font-semibold">
          Select function <span className="font-normal text-muted-foreground">(baseline maturity shown for reference)</span>
        </h2>
        <FunctionCards value={functionId} onChange={setFunction} />
      </section>

      <Card data-tour="scope">
        <CardContent className="pt-5">
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 flex w-full items-baseline justify-between text-sm font-semibold">
              Select priority processes
              <span className="text-xs font-normal text-muted-foreground tabular">
                {selected} of {chain.length} selected
              </span>
            </legend>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {chain.map((step) => {
                const key = processKey(functionId, step);
                const on = processes.includes(key);
                const owned = capabilitiesForStep(functionId, step);
                return (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleProcess(key)}
                    className={cn(
                      "flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                      on ? "border-primary/50 bg-primary/8" : "text-muted-foreground hover:bg-accent",
                    )}
                  >
                    <span
                      className={cn("mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border", on && "border-primary bg-primary text-primary-foreground")}
                      aria-hidden
                    >
                      {on && <Check className="size-3" />}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13px] font-medium text-foreground">{step}</span>
                      <span className="block text-[11px] text-muted-foreground tabular">
                        {owned.length} {owned.length === 1 ? "capability" : "capabilities"}
                      </span>
                      {on && owned.length > 0 && (
                        <span className="mt-1 block text-[11px] leading-snug text-muted-foreground">{owned.map(capabilityLabel).join(" · ")}</span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-3 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Label htmlFor="target" className="text-sm font-semibold">
              Target maturity level
            </Label>
            <p className="mt-0.5 text-xs text-muted-foreground">Target horizon 2–3 years</p>
          </div>
          <Select value={String(target)} onValueChange={(v) => setTarget(Number(v) as LadderLevel)}>
            <SelectTrigger id="target" className="w-full sm:w-72">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LADDER_LEVELS.map((l) => (
                <SelectItem key={l} value={String(l)}>
                  {stageLabel(l)} · {LADDER[l].short}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <KpiStrip
        stats={[
          { label: "Processes in scope", value: selected, format: (n) => String(Math.round(n)), note: `of ${chain.length} in ${FUNCTION_SHORT[functionId]}` },
          { label: "Capabilities", value: caps.length, format: (n) => String(Math.round(n)), note: "from the 2025 self-assessment" },
          { label: "2026 focus areas", value: priorities.length, format: (n) => String(Math.round(n)), tone: priorities.length ? "ai" : "default" },
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle>Maturity ladder</CardTitle>
          <p className="text-[13px] text-muted-foreground">Each process is rated on these six levels.</p>
        </CardHeader>
        <CardContent>
          <LadderChart target={target} />
        </CardContent>
      </Card>

      <StepNav step={1} />
    </Page>
  );
}

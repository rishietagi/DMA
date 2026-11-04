"use client";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/overlays";
import { LADDER, LADDER_LEVELS, stageLabel, type Criticality, type LadderLevel } from "@/lib/engine";
import { criticalityOf, l1Processes, processKey, suggestedCriticality, suggestedTarget, targetOf } from "@/lib/process-input";
import { useSession } from "@/lib/store/session";
import { cn } from "@/lib/utils";

const CRITICALITY: Criticality[] = ["High", "Medium", "Low"];

/**
 * Per selected process: business criticality and target. Both start from a suggestion (criticality
 * from the 2026 focus areas; target = ambition ±1 by criticality) and can be changed.
 */
export function ProcessTargets() {
  const functionId = useSession((s) => s.functionId);
  const ambition = useSession((s) => s.target);
  const selected = useSession((s) => s.processes);
  const custom = useSession((s) => s.customProcesses);
  const settings = useSession((s) => s.processSettings);
  const setSetting = useSession((s) => s.setProcessSetting);
  const steps = l1Processes(functionId, custom).filter((st) => selected.includes(processKey(functionId, st)));

  if (!steps.length) return <p className="text-sm text-muted-foreground">Select at least one process.</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-[13px]">
        <caption className="sr-only">Criticality and target per process</caption>
        <thead>
          <tr className="border-b text-left text-[11px] text-muted-foreground">
            <th scope="col" className="py-1.5 font-medium">Process</th>
            <th scope="col" className="py-1.5 font-medium">Business criticality</th>
            <th scope="col" className="py-1.5 font-medium">Target</th>
            <th scope="col" className="py-1.5" />
          </tr>
        </thead>
        <tbody className="divide-y">
          {steps.map((st) => {
            const key = processKey(functionId, st);
            const crit = criticalityOf(functionId, st, settings);
            const target = targetOf(functionId, st, ambition, settings);
            const own = settings[key];
            const id = key.replace(/[^a-z0-9]+/gi, "-");
            return (
              <tr key={key} data-testid={`target-row-${st}`}>
                <th scope="row" className="py-2 pr-3 text-left font-medium">
                  {st}
                </th>
                <td className="py-2 pr-3">
                  <Select value={crit} onValueChange={(v) => setSetting(key, { criticality: v as Criticality })}>
                    <SelectTrigger className="h-8 w-44" aria-label={`Business criticality for ${st}`} id={`crit-${id}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CRITICALITY.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                          {c === suggestedCriticality(functionId, st) ? " (suggested)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="py-2 pr-3">
                  <Select value={String(target)} onValueChange={(v) => setSetting(key, { target: Number(v) as LadderLevel })}>
                    <SelectTrigger className="h-8 w-64" aria-label={`Target for ${st}`} data-testid={`target-${st}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LADDER_LEVELS.map((l) => (
                        <SelectItem key={l} value={String(l)}>
                          {stageLabel(l)} · {LADDER[l].short}
                          {l === suggestedTarget(ambition, crit) ? " (suggested)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className={cn("py-2 text-right", !own && "invisible")}>
                  <Button variant="ghost" size="xs" onClick={() => setSetting(key, { criticality: null, target: null })} aria-label={`Reset ${st} to the suggestion`}>
                    <RotateCcw />
                    Suggested
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

"use client";
import { useProcesses } from "@/components/providers/process-provider";
import { stageLabel } from "@/lib/engine";
import { functionName } from "@/lib/labels";

/** "Supply Chain | 4 processes in scope | Target Stage 3" — the context line under a step header. */
export function ScopeLine({ verb = "in scope", aside }: { verb?: string; aside?: React.ReactNode }) {
  const { result } = useProcesses();
  const n = result.processes.length;
  return (
    <p className="-mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] font-medium">
      <span>{functionName(result.functionId)}</span>
      <span className="text-muted-foreground" aria-hidden>|</span>
      <span className="tabular">
        {n} {n === 1 ? "process" : "processes"} {verb}
      </span>
      <span className="text-muted-foreground" aria-hidden>|</span>
      <span>Target {stageLabel(result.target)}</span>
      {aside && <span className="ml-auto text-muted-foreground tabular">{aside}</span>}
    </p>
  );
}

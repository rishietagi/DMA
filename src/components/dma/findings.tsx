"use client";
import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useProcesses } from "@/components/providers/process-provider";
import { processLens } from "@/lib/process-lens";
import { useSession } from "@/lib/store/session";
import { ProcessCoverage } from "./process-chain";

/** Per-step view of the session's evidence for the selected function. */
export function useLens() {
  const functionId = useSession((s) => s.functionId);
  const evidence = useSession((s) => s.evidence);
  return React.useMemo(() => processLens(functionId, evidence), [functionId, evidence]);
}

/** Coverage card for the first tab. */
export function CoverageCard() {
  const { result } = useProcesses();
  const lens = useLens();
  return (
    <Card>
      <CardHeader>
        <CardTitle>What we have per process</CardTitle>
        <p className="text-[13px] text-muted-foreground">Sentences found, by document type. Empty cells are what to ask for next.</p>
      </CardHeader>
      <CardContent>
        <ProcessCoverage steps={lens.steps.filter((s) => result.processes.some((p) => p.id === s.id))} />
      </CardContent>
    </Card>
  );
}

"use client";
import * as React from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp } from "lucide-react";
import { formatScore, type AssessmentResult } from "@/lib/engine";
import { FUNCTION_SHORT } from "@/lib/labels";
import { seed } from "@/lib/seed";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { maturityStyle } from "./maturity";

export type FieldView = "self" | "evidence" | "effective";

/**
 * The cockpit's signature view: all 41 capabilities as a field, one column per function
 * (each capability sits under its primary function). Switching the lens re-colours the field
 * in place, so the shift from self-assessment to evidence is visible at a glance.
 */
export function MaturityField({
  result,
  view,
  rag = false,
  group = "all",
}: {
  result: AssessmentResult;
  view: FieldView;
  rag?: boolean;
  group?: "all" | "cpd" | "enterprise";
}) {
  const fns = seed.baseline.functions.filter((f) => group === "all" || f.group === group);
  return (
    <div className="grid gap-x-2 gap-y-1" style={{ gridTemplateColumns: `repeat(${fns.length}, minmax(0, 1fr))` }}>
      {fns.map((fn) => {
        const caps = result.capabilities.filter((c) => c.capability.primaryFunctionId === fn.id);
        return (
          <div key={fn.id} className="flex min-w-0 flex-col gap-1">
            <div className="mb-1 flex items-baseline justify-between gap-1 border-b pb-1.5">
              <span className="truncate text-xs font-medium" title={fn.name}>
                {FUNCTION_SHORT[fn.id]}
              </span>
              <span className="hidden text-[10px] text-muted-foreground 2xl:inline">{fn.group === "cpd" ? "CPD" : "Ent."}</span>
            </div>
            {caps.map((c) => {
              const score = view === "self" ? c.self : view === "evidence" ? c.evidenceScore : c.effectiveScore;
              const delta = c.evidenceScore - c.self;
              const shift = view !== "self" && c.hasEvidence && Math.abs(delta) >= 0.5;
              return (
                <Tooltip key={c.capability.id}>
                  <TooltipTrigger asChild>
                    <Link
                      href={`/scoring?cap=${c.capability.id}`}
                      className={cn(
                        "group relative flex h-[58px] flex-col justify-between rounded-md px-2 py-1.5 transition-[background-color,color,opacity] duration-700 ease-out outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
                        !c.inScope && "opacity-30",
                      )}
                      style={maturityStyle(score, rag)}
                      aria-label={`${c.capability.name}: ${formatScore(score)}${c.inScope ? "" : " (out of scope)"}`}
                    >
                      <span className="line-clamp-2 text-[11px] leading-[1.2] font-medium opacity-90">{c.capability.name}</span>
                      <span className="flex items-center gap-1 text-[13px] leading-none font-semibold tabular">
                        {formatScore(score)}
                        {shift &&
                          (delta < 0 ? (
                            <ArrowDown className="size-3 opacity-80" aria-label="below self-assessment" />
                          ) : (
                            <ArrowUp className="size-3 opacity-80" aria-label="above self-assessment" />
                          ))}
                        {view === "effective" && c.status !== "suggested" && (
                          <span role="img" className="ml-auto size-1.5 rounded-full bg-current opacity-80" aria-label="validated" />
                        )}
                      </span>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-56">
                    <p className="font-medium">{c.capability.name}</p>
                    <p className="opacity-80">
                      Self {formatScore(c.self)} · Evidence {formatScore(c.evidenceScore)}
                      {c.status !== "suggested" && ` · Validated ${formatScore(c.effectiveScore)}`}
                    </p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

"use client";
import { EVIDENCE_CATEGORY_LABELS, expectedCategoriesForFunction, type EvidenceItem } from "@/lib/engine";
import { FUNCTION_SHORT } from "@/lib/labels";
import { EVIDENCE_CATEGORIES, FUNCTION_IDS, type EvidenceCategory, type FunctionId } from "@/lib/schema";
import { seed } from "@/lib/seed";
import type { EvidenceDoc } from "@/lib/store/types";
import { cn } from "@/lib/utils";

const SHORT: Record<EvidenceCategory, string> = {
  self_assessment: "Self-assess.",
  it_strategy: "Strategy",
  process_docs: "Process",
  application_landscape: "App landscape",
  data_architecture: "Data arch.",
  policies_sops: "Policies",
  transformation_portfolio: "Portfolio",
  interview_notes: "Interviews",
  kpi_extracts: "KPIs",
};

const capPrimary = new Map(seed.baseline.capabilities.map((c) => [c.id, c.primaryFunctionId]));

/** Function × evidence category. Empty cells the question bank expects are marked as gaps. */
export function CoverageMatrix({ evidence, documents }: { evidence: EvidenceItem[]; documents: EvidenceDoc[] }) {
  const counts = new Map<string, number>();
  const bump = (f: FunctionId | null | undefined, c: EvidenceCategory, n = 1) => {
    if (!f) return;
    counts.set(`${f}|${c}`, (counts.get(`${f}|${c}`) ?? 0) + n);
  };
  for (const e of evidence) bump(e.functionId ?? (e.capabilityId ? capPrimary.get(e.capabilityId) : null), e.category);
  for (const d of documents) if (d.status === "analysed" && !counts.has(`${d.dominantFunctionId}|${d.category}`)) bump(d.dominantFunctionId, d.category, 0);
  let gaps = 0;

  const rows = FUNCTION_IDS.map((f) => {
    const expected = new Set(expectedCategoriesForFunction(seed.questionBank, f));
    return {
      f,
      cells: EVIDENCE_CATEGORIES.map((c) => {
        if (c === "self_assessment") return { c, n: seed.baseline.capabilities.filter((x) => x.functionIds.includes(f)).length, expected: true, baseline: true };
        const n = counts.get(`${f}|${c}`) ?? 0;
        const isExpected = expected.has(c);
        if (isExpected && n === 0) gaps++;
        return { c, n, expected: isExpected, baseline: false };
      }),
    };
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] table-fixed border-separate border-spacing-1 text-center" aria-label="Evidence coverage by function and category">
        <thead>
          <tr>
            <th scope="col" className="w-28 text-left text-[11px] font-medium text-muted-foreground">
              Function
            </th>
            {EVIDENCE_CATEGORIES.map((c) => (
              <th key={c} scope="col" className="text-[11px] font-medium text-muted-foreground" title={EVIDENCE_CATEGORY_LABELS[c]}>
                {SHORT[c]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ f, cells }) => (
            <tr key={f}>
              <th scope="row" className="truncate pr-2 text-left text-[13px] font-normal">
                {FUNCTION_SHORT[f]}
              </th>
              {cells.map(({ c, n, expected, baseline }) => {
                const gap = expected && n === 0;
                return (
                  <td
                    key={c}
                    className={cn(
                      "h-8 rounded-md text-xs tabular",
                      baseline && "bg-muted text-muted-foreground",
                      !baseline && n > 0 && "bg-validated/15 font-semibold text-foreground",
                      gap && "hatch border border-whitespace/50 text-[11px] text-foreground",
                      !baseline && !gap && n === 0 && "text-muted-foreground/50",
                    )}
                    aria-label={`${FUNCTION_SHORT[f]} ${EVIDENCE_CATEGORY_LABELS[c]}: ${baseline ? `${n} baseline scores` : gap ? "expected, none yet" : `${n} items`}`}
                  >
                    {baseline ? n : gap ? "Gap" : n || "·"}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Numbers are evidence items. <span className="hatch rounded border border-whitespace/50 px-1">Gap</span> = the question bank expects
        this evidence for the function and none has been found ({gaps} gaps).
      </p>
    </div>
  );
}

"use client";
/** Builds the PDF report in the browser and downloads it. react-pdf is loaded on demand. */
import { createElement } from "react";
import type { FunctionProcessResult } from "@/lib/engine";
import type { AreaScores } from "@/lib/process-areas";
import type { EvidenceDoc } from "@/lib/store/types";
import { capabilityLabel } from "@/lib/labels";
import { capabilitiesForStep } from "@/lib/process-input";
import { seed } from "@/lib/seed";
import { buildReport, type ReportSource } from "./report-data";

export function reportSources(documents: readonly EvidenceDoc[]): ReportSource[] {
  const workshop = documents.filter((d) => d.source === "workshop");
  const rest = documents
    .filter((d) => d.source !== "workshop" && d.status === "analysed")
    .map((d): ReportSource => ({ title: d.title, kind: d.category === "interview_notes" ? "Interview" : "Document", sentences: d.itemCount }));
  return [...(workshop.length ? [{ title: `Kick-off workshop pack (${workshop.length} documents)`, kind: "Workshop pack" as const }] : []), ...rest];
}

export async function exportReportPdf(args: {
  result: FunctionProcessResult;
  areas: Record<string, AreaScores>;
  functionName: string;
  documents: readonly EvidenceDoc[];
  now?: Date;
}) {
  const now = args.now ?? new Date();
  const model = buildReport(args.result, args.areas, {
    functionName: args.functionName,
    date: now.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
    sources: reportSources(args.documents),
    initiatives: seed.roadmap.initiatives.filter((i) => i.functionId === args.result.functionId),
    capabilitiesFor: (step) => capabilitiesForStep(args.result.functionId, step).map(capabilityLabel),
  });
  const [{ pdf }, { ResultsReport }] = await Promise.all([import("@react-pdf/renderer"), import("@/components/report/results-report")]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- react-pdf types expect a <Document> element
  const blob = await pdf(createElement(ResultsReport, { m: model }) as any).toBlob();
  const name = `Himalaya_DMA_${args.functionName.replace(/[^A-Za-z0-9]+/g, "_")}_${now.toISOString().slice(0, 10)}.pdf`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return name;
}

"use client";
import Link from "next/link";
import { FileText, MessageSquare, Sparkles, ThumbsDown, ThumbsUp } from "lucide-react";
import { DIMENSION_LABELS, EVIDENCE_CATEGORY_LABELS, type EvidenceItem } from "@/lib/engine";
import { capabilityLabel, FUNCTION_SHORT } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { HighlightedQuote } from "./capability-sheet";
import { MaturityChip } from "./maturity";

export function PolarityTag({ polarity }: { polarity: EvidenceItem["polarity"] }) {
  if (polarity === "neutral") return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium",
        polarity === "pain" ? "bg-conf-low/12 text-conf-low" : "bg-validated/12 text-validated",
      )}
    >
      {polarity === "pain" ? <ThumbsDown className="size-3" aria-hidden /> : <ThumbsUp className="size-3" aria-hidden />}
      {polarity === "pain" ? "Pain point" : "Strength"}
    </span>
  );
}

export function EvidenceCard({ e, compact = false }: { e: EvidenceItem; compact?: boolean }) {
  const Icon = e.sourceType === "interview" ? MessageSquare : FileText;
  return (
    <article className="ai-surface flex flex-col gap-2.5 p-3.5" aria-label={`Evidence from ${e.docTitle}`}>
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-ai-foreground">
          <Sparkles className="size-3" aria-hidden />
          AI extracted
        </span>
        <PolarityTag polarity={e.polarity} />
        <span className="ml-auto">
          {e.level !== null ? (
            <MaturityChip score={e.level} size="sm" label={`Level signal ${e.level}`} />
          ) : (
            <span className="text-[11px] text-muted-foreground">no level</span>
          )}
        </span>
      </div>
      <blockquote className={cn("text-[13px] leading-relaxed", compact && "line-clamp-3")}>
        “<HighlightedQuote text={e.quote} cues={e.cues} />”
      </blockquote>
      <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
        <span className="inline-flex min-w-0 items-center gap-1">
          <Icon className="size-3 shrink-0" aria-hidden />
          <span className="truncate">{e.stakeholder ?? e.docTitle}</span>
        </span>
        <span>{e.location}</span>
        <span className="rounded bg-muted px-1">{EVIDENCE_CATEGORY_LABELS[e.category]}</span>
      </div>
      {e.capabilityId && (
        <div className="flex flex-wrap items-center gap-1.5 border-t pt-2 text-[11px]">
          <Link href={`/scoring?cap=${e.capabilityId}${e.dimension ? `&dim=${e.dimension}` : ""}`} className="font-medium text-foreground hover:underline">
            {capabilityLabel(e.capabilityId)}
          </Link>
          {e.functionId && <span className="text-muted-foreground">{FUNCTION_SHORT[e.functionId]}</span>}
          {e.dimension && <span className="rounded border px-1 text-muted-foreground">{DIMENSION_LABELS[e.dimension]}</span>}
        </div>
      )}
    </article>
  );
}

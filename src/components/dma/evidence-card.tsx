import * as React from "react";
import { FileText, MessageSquare } from "lucide-react";
import { toLadder, type EvidenceItem } from "@/lib/engine";
import { LevelChip } from "./ladder";

export function HighlightedQuote({ text, cues = [] }: { text: string; cues?: string[] }) {
  if (!cues.length) return <>{text}</>;
  const re = new RegExp(`(${cues.map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
  return (
    <>
      {text.split(re).map((part, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="rounded-[3px] bg-ai-soft px-0.5 text-ai-foreground">
            {part}
          </mark>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        ),
      )}
    </>
  );
}

/** One quote with its source and the ladder level it points to. */
export function QuoteRow({ e }: { e: EvidenceItem }) {
  const Icon = e.sourceType === "interview" ? MessageSquare : FileText;
  return (
    <li className="flex gap-3 py-2">
      <LevelChip score={e.level === null ? null : toLadder(e.level)} size="sm" className="mt-0.5" />
      <div className="min-w-0">
        <blockquote className="text-[13px] leading-relaxed">
          “<HighlightedQuote text={e.quote} cues={e.cues} />”
        </blockquote>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Icon className="size-3" aria-hidden />
            {e.stakeholder ?? e.docTitle}
          </span>
          <span>{e.location}</span>
        </p>
      </div>
    </li>
  );
}

"use client";
import * as React from "react";
import { GitCompareArrows, Loader2, MessageSquarePlus, ThumbsDown, ThumbsUp, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/form-controls";
import { Label } from "@/components/ui/misc";
import { ingest } from "@/lib/actions";
import { findContradictions, recurringThemes } from "@/lib/classifier/insights";
import { toLadder, type EvidenceItem } from "@/lib/engine";
import { capabilityLabel, functionName } from "@/lib/labels";
import { stepForEvidence } from "@/lib/process-input";
import { useSession } from "@/lib/store/session";
import { HighlightedQuote } from "./evidence-card";
import { useLens } from "./findings";
import { LevelChip } from "./ladder";

function Statement({ e, step }: { e: EvidenceItem; step: string | null }) {
  return (
    <li className="flex gap-2.5 rounded-lg border bg-card p-2.5">
      <LevelChip score={e.level === null ? null : toLadder(e.level)} size="sm" className="mt-0.5" />
      <div className="min-w-0">
        <p className="text-[13px] leading-snug">
          “<HighlightedQuote text={e.quote} cues={e.cues} />”
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          {e.stakeholder ?? e.docTitle}
          {step && ` · ${step}`}
        </p>
      </div>
    </li>
  );
}

function Column({ title, icon, items, empty, fn }: { title: string; icon: React.ReactNode; items: EvidenceItem[]; empty: string; fn: ReturnType<typeof useSession.getState>["functionId"] }) {
  return (
    <section className="flex flex-col gap-2" aria-label={title}>
      <h3 className="flex items-center gap-1.5 text-[13px] font-semibold">
        {icon}
        {title}
        <span className="font-normal text-muted-foreground tabular">({items.length})</span>
      </h3>
      <ul className="flex flex-col gap-2">
        {items.map((e) => (
          <Statement key={e.id} e={e} step={stepForEvidence(fn, e)} />
        ))}
        {!items.length && <li className="text-[12px] text-muted-foreground">{empty}</li>}
      </ul>
    </section>
  );
}

function PasteNotes() {
  const functionId = useSession((s) => s.functionId);
  const [who, setWho] = React.useState("");
  const [text, setText] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const ok = who.trim().length > 1 && text.trim().length > 20;
  const submit = async () => {
    setBusy(true);
    try {
      const name = who.trim();
      await ingest([
        {
          blob: new Blob([`# Interview notes — ${name}\n\n${text.trim()}\n`], { type: "text/markdown" }),
          docId: `notes-${name.toLowerCase().replace(/\W+/g, "-")}-${text.length}`,
          title: `Interview — ${name}`,
          fileName: `Interview_${name.replace(/\W+/g, "_")}.md`,
          category: "interview_notes",
          stakeholder: name,
          source: "upload",
        },
      ]);
      setText("");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5">
          <MessageSquarePlus className="size-4" aria-hidden />
          Add interview notes
        </CardTitle>
        <p className="text-[13px] text-muted-foreground">Paste notes from a {functionName(functionId)} conversation. Each sentence is classified and placed on a process.</p>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="who">Who did you speak to?</Label>
          <Input id="who" value={who} onChange={(e) => setWho(e.target.value)} placeholder="e.g. Warehouse Manager, Haridwar" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            rows={5}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. Cycle counts are done on paper and keyed into Excel at the end of the shift."
          />
        </div>
        <Button onClick={() => void submit()} disabled={!ok || busy} className="self-start">
          {busy ? <Loader2 className="animate-spin" /> : <MessageSquarePlus />}
          Analyse notes
        </Button>
      </CardContent>
    </Card>
  );
}

/** Interview intelligence for the function: strengths, pain points, where sources disagree. */
export function InterviewBoard() {
  const functionId = useSession((s) => s.functionId);
  const lens = useLens();
  const all = lens.steps.flatMap((s) => s.evidence);
  const spoken = all.filter((e) => e.sourceType === "interview");
  const stakeholders = [...new Set(spoken.map((e) => e.stakeholder ?? e.docTitle))];
  const contradictions = findContradictions(all);
  const themes = recurringThemes(all);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card data-tour="contradictions">
          <CardHeader>
            <CardTitle>What people told us</CardTitle>
            <p className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
              <Users className="size-3.5" aria-hidden />
              {stakeholders.length ? stakeholders.join(" · ") : "No interviews for this function yet"}
            </p>
          </CardHeader>
          <CardContent className="grid gap-5 md:grid-cols-2">
            <Column
              fn={functionId}
              title="Strengths"
              icon={<ThumbsUp className="size-3.5 text-validated" aria-hidden />}
              items={spoken.filter((e) => e.polarity === "strength")}
              empty="No strengths mentioned yet."
            />
            <Column
              fn={functionId}
              title="Pain points"
              icon={<ThumbsDown className="size-3.5 text-conf-low" aria-hidden />}
              items={spoken.filter((e) => e.polarity !== "strength")}
              empty="No pain points mentioned yet."
            />
          </CardContent>
        </Card>
        <PasteNotes />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5">
            <GitCompareArrows className="size-4 text-conf-med" aria-hidden />
            Where sources disagree
          </CardTitle>
          <p className="text-[13px] text-muted-foreground">Two sources two or more levels apart on the same thing. These go to the consultant, not straight into a score.</p>
        </CardHeader>
        <CardContent>
          {contradictions.length ? (
            <ul className="flex flex-col gap-3">
              {contradictions.map((c) => (
                <li key={c.id} className="grid gap-2 rounded-lg border p-3 md:grid-cols-[10rem_1fr_1fr]">
                  <div>
                    <p className="text-[13px] font-semibold">{capabilityLabel(c.capabilityId)}</p>
                    <p className="text-[11px] text-muted-foreground">{c.kind === "stakeholder-vs-stakeholder" ? "Person vs person" : "Person vs document"}</p>
                  </div>
                  <ul className="contents">
                    <Statement e={c.a} step={stepForEvidence(functionId, c.a)} />
                    <Statement e={c.b} step={stepForEvidence(functionId, c.b)} />
                  </ul>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No disagreements found yet.</p>
          )}
          {themes.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2 text-[12px]">
              <span className="text-muted-foreground">Raised by more than one person:</span>
              {themes.map((t) => (
                <span key={`${t.capabilityId}-${t.polarity}`} className="rounded-full border px-2 py-0.5">
                  {capabilityLabel(t.capabilityId)} · {t.polarity === "pain" ? "pain" : "strength"} · {t.stakeholders.length} people
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

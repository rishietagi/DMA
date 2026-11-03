"use client";
import * as React from "react";
import { FileUp, Loader2, MessageSquarePlus, ThumbsDown, ThumbsUp, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/form-controls";
import { Label } from "@/components/ui/misc";
import { ingest } from "@/lib/actions";
import { toLadder, type EvidenceItem } from "@/lib/engine";
import { functionName } from "@/lib/labels";
import { stepForEvidence } from "@/lib/process-input";
import type { FunctionId } from "@/lib/schema";
import { useSession } from "@/lib/store/session";
import { cn } from "@/lib/utils";
import { HighlightedQuote } from "./evidence-card";
import { useLens } from "./findings";
import { LevelChip } from "./ladder";

const ACCEPT = ".pdf,.docx,.txt,.md,.markdown";

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

function Column({ title, icon, items, empty, fn }: { title: string; icon: React.ReactNode; items: EvidenceItem[]; empty: string; fn: FunctionId }) {
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

const nameFromFile = (f: string) => f.replace(/\.[^.]+$/, "").replace(/^interview[_\s-]*(—|-)?\s*/i, "").replace(/[_-]+/g, " ").trim() || "Interview";

/** Upload a transcript or paste notes; each sentence is classified and placed on a process. */
function AddInterview() {
  const [who, setWho] = React.useState("");
  const [text, setText] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [over, setOver] = React.useState(false);
  const input = React.useRef<HTMLInputElement>(null);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  const upload = (files: FileList | null) => {
    if (!files?.length) return;
    const list = [...files];
    const bad = list.filter((f) => !/\.(pdf|docx|txt|md|markdown)$/i.test(f.name) || f.size > 4 * 1024 * 1024);
    if (bad.length) toast.error(`Can't read ${bad.map((b) => b.name).join(", ")}`, { description: "Use PDF, DOCX, TXT or MD transcripts under 4 MB." });
    const ok = list.filter((f) => !bad.includes(f));
    if (!ok.length) return;
    void run(() =>
      ingest(
        ok.map((f) => {
          const name = who.trim() || nameFromFile(f.name);
          return {
            blob: f,
            docId: `transcript-${f.name}-${f.size}`,
            title: `Interview — ${name}`,
            fileName: f.name,
            category: "interview_notes" as const,
            stakeholder: name,
            source: "upload" as const,
          };
        }),
      ),
    );
  };

  const paste = () =>
    run(async () => {
      const name = who.trim() || "Interviewee";
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
    });

  return (
    <Card data-tour="interviews">
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5">
          <FileUp className="size-4" aria-hidden />
          Add interview notes
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-5 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="who">Who did you speak to?</Label>
            <Input id="who" value={who} onChange={(e) => setWho(e.target.value)} placeholder="e.g. Warehouse Manager, Haridwar" />
          </div>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setOver(true);
            }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setOver(false);
              upload(e.dataTransfer.files);
            }}
            className={cn("flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-6 text-center", over && "border-primary bg-primary/5")}
            data-testid="transcript-drop"
          >
            <FileUp className="size-5 text-muted-foreground" aria-hidden />
            <p className="text-sm">Drop a transcript here</p>
            <p className="text-xs text-muted-foreground">PDF, DOCX, TXT or MD · up to 4 MB</p>
            <input
              ref={input}
              type="file"
              multiple
              accept={ACCEPT}
              className="sr-only"
              aria-label="Upload interview transcript"
              data-testid="transcript-input"
              onChange={(e) => {
                upload(e.target.files);
                e.target.value = "";
              }}
            />
            <Button variant="outline" size="xs" onClick={() => input.current?.click()} disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : null}
              Upload transcript
            </Button>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="notes">…or paste notes</Label>
          <Textarea
            id="notes"
            rows={6}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. Cycle counts are done on paper and keyed into Excel at the end of the shift."
            className="flex-1"
          />
          <Button onClick={() => void paste()} disabled={text.trim().length < 20 || busy} className="mt-1 self-start">
            {busy ? <Loader2 className="animate-spin" /> : <MessageSquarePlus />}
            Analyse notes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/** Interviews: add a transcript, then the strengths and pain points people raised. */
export function InterviewBoard() {
  const functionId = useSession((s) => s.functionId);
  const lens = useLens();
  const spoken = lens.steps.flatMap((s) => s.evidence).filter((e) => e.sourceType === "interview");
  const stakeholders = [...new Set(spoken.map((e) => e.stakeholder ?? e.docTitle))];

  return (
    <div className="flex flex-col gap-6">
      <AddInterview />
      <Card>
        <CardHeader>
          <CardTitle>What people told us</CardTitle>
          <p className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
            <Users className="size-3.5" aria-hidden />
            {stakeholders.length ? stakeholders.join(" · ") : `No interviews for ${functionName(functionId)} yet`}
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
    </div>
  );
}

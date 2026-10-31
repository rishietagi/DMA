"use client";
import * as React from "react";
import Link from "next/link";
import { AlertTriangle, FileStack, Lock, MessageSquarePlus, Sparkles, ThumbsDown, ThumbsUp } from "lucide-react";
import { useAssessment } from "@/components/providers/assessment-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/form-controls";
import { Label } from "@/components/ui/misc";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/overlays";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HighlightedQuote } from "@/components/dma/capability-sheet";
import { MaturityChip, maturityStyle } from "@/components/dma/maturity";
import { Page, PageHeader } from "@/components/dma/page-header";
import { ingest, loadDemoEvidence } from "@/lib/actions";
import { runAgent } from "@/lib/ai/client";
import { findContradictions, themeMatrix, THEMES } from "@/lib/classifier";
import { DIMENSION_LABELS, questionCapabilities, type EvidenceItem } from "@/lib/engine";
import { capabilityLabel, FUNCTION_SHORT, functionName } from "@/lib/labels";
import { FUNCTION_IDS, type FunctionId, type Level, type Question } from "@/lib/schema";
import { seed } from "@/lib/seed";
import { useSession } from "@/lib/store/session";
import { cn } from "@/lib/utils";

const bankFor = (fn: FunctionId) => seed.questionBank.functions.find((f) => f.functionId === fn)!;
const crossCutting = seed.questionBank.functions.find((f) => f.functionId === "*")!;

function QuestionCard({ q, fn }: { q: Question; fn: FunctionId }) {
  const { result } = useAssessment();
  const response = useSession((s) => s.responses.find((r) => r.questionId === q.id && r.functionId === fn));
  const setResponse = useSession((s) => s.setResponse);
  const [notes, setNotes] = React.useState(response?.notes ?? "");
  const caps = questionCapabilities(q, fn, seed.baseline.capabilities);
  const answered = response !== undefined;

  const save = (level: Level | null, extra: { notes?: string } = {}) =>
    setResponse({ questionId: q.id, functionId: fn, level, notes: extra.notes ?? notes, answeredBy: response?.answeredBy ?? "Workshop" });

  return (
    <article className="rounded-xl border bg-card p-4" aria-labelledby={`${q.id}-${fn}-t`}>
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
        <span className="font-medium tabular text-foreground/70">{q.id.toUpperCase()}</span>
        <span className="rounded border px-1">{DIMENSION_LABELS[q.dimension]}</span>
        <span>weight {q.weight}</span>
        {q.gateKey && (
          <span className="inline-flex items-center gap-1 rounded bg-muted px-1">
            <Lock className="size-3" aria-hidden />
            gate: {q.gateKey.split(".")[1]?.replace(/_/g, " ")}
          </span>
        )}
        {answered && response?.answeredBy && <span className="ml-auto">Answered by {response.answeredBy}</span>}
      </div>
      <h3 id={`${q.id}-${fn}-t`} className="mt-1.5 text-sm font-medium">
        {q.text}
      </h3>
      <div role="radiogroup" aria-label={q.text} className="mt-3 flex flex-wrap gap-1.5">
        {q.options.map((o) => {
          const selected = answered && response?.level === o.level;
          return (
            <button
              key={String(o.level)}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => save(o.level)}
              className={cn(
                "flex max-w-[260px] items-start gap-2 rounded-lg border px-2.5 py-1.5 text-left text-xs transition-colors outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring",
                selected && "border-transparent shadow-sm ring-2 ring-primary/70",
                o.level === null && "text-muted-foreground",
              )}
              style={selected && o.level !== null ? maturityStyle(o.level) : undefined}
            >
              {o.level !== null && (
                <span className={cn("mt-px inline-grid size-4 shrink-0 place-items-center rounded text-[10px] font-semibold tabular", !selected && "bg-muted")}>
                  {o.level}
                </span>
              )}
              <span className="leading-snug">{o.label}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]">
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => answered && notes !== (response?.notes ?? "") && save(response!.level, { notes })}
          placeholder="Notes and examples heard in the workshop"
          className="min-h-9 text-[13px]"
          aria-label="Notes"
        />
        <div className="flex flex-wrap items-center gap-1.5 md:max-w-[280px] md:justify-end">
          <span className="text-[11px] text-muted-foreground">Feeds</span>
          {caps.slice(0, 4).map((id) => (
            <Link key={id} href={`/scoring?cap=${id}&dim=${q.dimension}`} className="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] hover:bg-accent">
              {capabilityLabel(id)}
              <MaturityChip score={result.byId[id]?.dimensions[q.dimension]?.final} size="sm" className="h-4 min-w-6 text-[10px]" />
            </Link>
          ))}
          {caps.length > 4 && <span className="text-[11px] text-muted-foreground">+{caps.length - 4}</span>}
        </div>
      </div>
    </article>
  );
}

function Questionnaire() {
  const [fn, setFn] = React.useState<FunctionId>("sales-ecom");
  const [step, setStep] = React.useState<string | "all">("all");
  const responses = useSession((s) => s.responses);
  const bank = bankFor(fn);
  const all = [...bank.questions, ...crossCutting.questions];
  const answered = all.filter((q) => responses.some((r) => r.questionId === q.id && r.functionId === fn)).length;
  const sections = [...bank.l1Chain, ...bank.questions.map((q) => q.l2).filter((l) => !bank.l1Chain.includes(l))].filter((v, i, a) => a.indexOf(v) === i);
  const levelFor = (l2: string) => {
    const ls = bank.questions
      .filter((q) => q.l2 === l2 && q.dimension === "process")
      .map((q) => responses.find((r) => r.questionId === q.id && r.functionId === fn)?.level)
      .filter((v): v is Level => typeof v === "number");
    return ls.length ? ls.reduce((a, b) => a + b, 0) / ls.length : null;
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <Label htmlFor="fn-pick" className="text-muted-foreground">
          Function
        </Label>
        <Select
          value={fn}
          onValueChange={(v) => {
            setFn(v as FunctionId);
            setStep("all");
          }}
        >
          <SelectTrigger id="fn-pick" size="sm" className="w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FUNCTION_IDS.map((f) => (
              <SelectItem key={f} value={f}>
                {functionName(f)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground tabular">
          {answered} of {all.length} answered · changes rescore immediately
        </span>
      </div>

      <nav aria-label="L1 process chain" className="rounded-xl border bg-card p-3">
        <ol className="flex items-stretch gap-1 overflow-x-auto">
          <li>
            <button
              type="button"
              onClick={() => setStep("all")}
              className={cn("h-full rounded-lg px-3 py-2 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring", step === "all" ? "bg-secondary" : "text-muted-foreground hover:bg-accent")}
              aria-pressed={step === "all"}
            >
              All steps
            </button>
          </li>
          {bank.l1Chain.map((s, i) => {
            const lvl = levelFor(s);
            return (
              <li key={s} className="flex items-center gap-1">
                <span aria-hidden className="text-muted-foreground/50">›</span>
                <button
                  type="button"
                  onClick={() => setStep(s)}
                  aria-pressed={step === s}
                  className={cn(
                    "flex min-w-[120px] flex-col items-start gap-1 rounded-lg px-3 py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    step === s ? "bg-secondary" : "hover:bg-accent",
                  )}
                >
                  <span className="text-[10px] text-muted-foreground tabular">Step {i + 1}</span>
                  <span className="text-xs leading-tight font-medium">{s}</span>
                  {lvl !== null ? <MaturityChip score={lvl} size="sm" className="h-4 min-w-7 text-[10px]" /> : <span className="h-4 text-[10px] text-muted-foreground">—</span>}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {sections
        .filter((s) => step === "all" || s === step)
        .map((s) => {
          const qs = bank.questions.filter((q) => q.l2 === s);
          if (!qs.length) return null;
          return (
            <section key={s} className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold">{s}</h2>
              {qs.map((q) => (
                <QuestionCard key={q.id} q={q} fn={fn} />
              ))}
            </section>
          );
        })}

      {step === "all" && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">
            People and AI — asked of every function
            <span className="ml-2 text-xs font-normal text-muted-foreground">applies to all {FUNCTION_SHORT[fn]} capabilities</span>
          </h2>
          {crossCutting.questions.map((q) => (
            <QuestionCard key={q.id} q={q} fn={fn} />
          ))}
        </section>
      )}
    </div>
  );
}

function BoardItem({ e, tone }: { e: EvidenceItem; tone: "pain" | "strength" }) {
  return (
    <li className="rounded-lg border bg-card p-3">
      <p className="text-[13px] leading-relaxed">
        “<HighlightedQuote text={e.quote} cues={e.cues} />”
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
        <span className="font-medium text-foreground/80">{e.stakeholder}</span>
        {e.capabilityId && (
          <Link href={`/scoring?cap=${e.capabilityId}`} className="hover:underline">
            {capabilityLabel(e.capabilityId)}
          </Link>
        )}
        {e.themes?.map((t) => (
          <span key={t} className={cn("rounded px-1", tone === "pain" ? "bg-conf-low/10" : "bg-validated/10")}>
            {THEMES.find((x) => x.id === t)?.label}
          </span>
        ))}
      </div>
    </li>
  );
}

function NotesBoard() {
  const notes = useSession((s) => s.notes);
  const evidence = useSession((s) => s.evidence);
  const [busy, setBusy] = React.useState(false);
  const [stakeholder, setStakeholder] = React.useState("");
  const [fn, setFn] = React.useState<FunctionId>("finance");
  const [text, setText] = React.useState("");

  const interview = evidence.filter((e) => e.sourceType === "interview");
  const strengths = interview.filter((e) => e.polarity === "strength");
  const pains = interview.filter((e) => e.polarity === "pain");
  const contradictions = findContradictions(evidence);
  const themes = themeMatrix(evidence).filter((t) => t.total > 0);

  const analyse = () =>
    runAgent("interview-themes", {
      notes: notes.length,
      stakeholders: notes.map((n) => n.stakeholder).join(", "),
      strengths: strengths.length,
      pains: pains.length,
      contradictions: contradictions.length,
      themes: themes.length,
    });

  const addNote = async () => {
    if (text.trim().length < 20 || !stakeholder.trim()) return;
    setBusy(true);
    const id = `note-${Date.now().toString(36)}`;
    await ingest([
      {
        blob: new Blob([text], { type: "text/markdown" }),
        docId: id,
        title: `Interview — ${stakeholder}`,
        fileName: `${id}.md`,
        category: "interview_notes",
        stakeholder: stakeholder.trim(),
        functionId: fn,
        source: "upload",
      },
    ]);
    setText("");
    setStakeholder("");
    setBusy(false);
  };

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[320px_1fr]">
      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
            <CardDescription>{notes.length ? `${notes.length} stakeholders` : "No notes yet"}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 pt-3">
            {notes.length === 0 && (
              <Button variant="outline" size="sm" onClick={() => void loadDemoEvidence()}>
                <FileStack />
                Load demo evidence (3 interviews)
              </Button>
            )}
            {notes.map((n) => (
              <details key={n.id} className="group rounded-lg border px-3 py-2">
                <summary className="cursor-pointer list-none text-[13px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring rounded">
                  {n.stakeholder}
                  <span className="block text-[11px] font-normal text-muted-foreground">
                    {FUNCTION_SHORT[n.functionId]} · {n.date} · {n.source === "demo" ? "Illustrative" : "Added"}
                  </span>
                </summary>
                <p className="mt-2 text-xs leading-relaxed whitespace-pre-line text-muted-foreground">{n.text}</p>
              </details>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Add notes</CardTitle>
            <CardDescription>Paste notes from an interview or workshop. They are classified like any other evidence.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 pt-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="note-who">Stakeholder role</Label>
                <Input id="note-who" value={stakeholder} onChange={(e) => setStakeholder(e.target.value)} placeholder="e.g. MT KAM lead" className="h-8 text-[13px]" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="note-fn">Function</Label>
                <Select value={fn} onValueChange={(v) => setFn(v as FunctionId)}>
                  <SelectTrigger id="note-fn" size="sm" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FUNCTION_IDS.map((f) => (
                      <SelectItem key={f} value={f}>
                        {FUNCTION_SHORT[f]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="One point per line works best." className="min-h-28 text-[13px]" aria-label="Interview notes" />
            <Button size="sm" onClick={() => void addNote()} disabled={busy || text.trim().length < 20 || !stakeholder.trim()}>
              <MessageSquarePlus />
              Classify notes
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="mr-auto text-sm font-semibold">What stakeholders told us</h2>
          <Button variant="outline" size="sm" onClick={() => void analyse()} disabled={notes.length === 0}>
            <Sparkles />
            Analyse notes
          </Button>
        </div>
        {themes.length > 0 && (
          <div className="flex flex-wrap gap-1.5" aria-label="Recurring themes">
            {themes.map((t) => (
              <span key={t.themeId} className="rounded-full border bg-card px-2.5 py-1 text-xs">
                {t.label} <span className="tabular text-muted-foreground">{t.total}</span>
              </span>
            ))}
          </div>
        )}
        <div className="grid gap-4 lg:grid-cols-3">
          <section aria-label="Strengths" className="flex flex-col gap-2">
            <h3 className="flex items-center gap-1.5 text-[13px] font-semibold">
              <ThumbsUp className="size-4 text-validated" aria-hidden /> Strengths <span className="font-normal text-muted-foreground tabular">{strengths.length}</span>
            </h3>
            <ul className="flex flex-col gap-2">
              {strengths.map((e) => (
                <BoardItem key={e.id} e={e} tone="strength" />
              ))}
              {!strengths.length && <li className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">None yet.</li>}
            </ul>
          </section>
          <section aria-label="Pain points" className="flex flex-col gap-2">
            <h3 className="flex items-center gap-1.5 text-[13px] font-semibold">
              <ThumbsDown className="size-4 text-conf-low" aria-hidden /> Pain points <span className="font-normal text-muted-foreground tabular">{pains.length}</span>
            </h3>
            <ul className="flex flex-col gap-2">
              {pains.map((e) => (
                <BoardItem key={e.id} e={e} tone="pain" />
              ))}
              {!pains.length && <li className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">None yet.</li>}
            </ul>
          </section>
          <section aria-label="Contradictions" className="flex flex-col gap-2">
            <h3 className="flex items-center gap-1.5 text-[13px] font-semibold">
              <AlertTriangle className="size-4 text-conf-med" aria-hidden /> Contradictions <span className="font-normal text-muted-foreground tabular">{contradictions.length}</span>
            </h3>
            <ul className="flex flex-col gap-2">
              {contradictions.map((c) => (
                <li key={c.id} className="rounded-lg border border-conf-med/50 bg-card p-3" data-testid="contradiction">
                  <Link href={`/scoring?cap=${c.capabilityId}&dim=${c.a.dimension}`} className="text-[13px] font-medium hover:underline">
                    {capabilityLabel(c.capabilityId)}
                  </Link>
                  <p className="text-[11px] text-muted-foreground">
                    {c.kind === "stakeholder-vs-artefact" ? "Stakeholder vs document" : "Stakeholder vs stakeholder"} · {c.diff} levels apart
                  </p>
                  {[c.a, c.b].map((x) => (
                    <div key={x.id} className="mt-2 flex gap-2">
                      <MaturityChip score={x.level} size="sm" />
                      <p className="text-xs leading-relaxed">
                        “{x.quote}”<span className="block text-[11px] text-muted-foreground">{x.stakeholder ?? `${x.docTitle}, ${x.location}`}</span>
                      </p>
                    </div>
                  ))}
                </li>
              ))}
              {!contradictions.length && <li className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">No contradictions found.</li>}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

export default function InterviewsPage() {
  const notes = useSession((s) => s.notes);
  return (
    <Page>
      <PageHeader
        stage={3}
        title="Interview intelligence"
        description="Structured questionnaires follow each function’s L1 process chain; every option maps to a maturity level. Interview notes are classified into strengths, pain points and contradictions."
      />
      <Tabs defaultValue={notes.length ? "notes" : "questionnaire"}>
        <TabsList>
          <TabsTrigger value="questionnaire">Questionnaire</TabsTrigger>
          <TabsTrigger value="notes">Notes and themes</TabsTrigger>
        </TabsList>
        <TabsContent value="questionnaire">
          <Questionnaire />
        </TabsContent>
        <TabsContent value="notes">
          <NotesBoard />
        </TabsContent>
      </Tabs>
    </Page>
  );
}

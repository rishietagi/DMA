"use client";
import * as React from "react";
import { Plus, Trash2, UserPen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/form-controls";
import { Label } from "@/components/ui/misc";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/overlays";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useProcesses } from "@/components/providers/process-provider";
import { DIMENSION_LABELS, LADDER, LADDER_LEVELS, ladderLevel, toLadder, type LadderLevel, type ProcessResult } from "@/lib/engine";
import { questionsForStep, type CustomQuestion } from "@/lib/process-input";
import { whyLine } from "@/lib/process-why";
import { DIMENSIONS, type Dimension, type Question } from "@/lib/schema";
import { useSession } from "@/lib/store/session";
import { cn } from "@/lib/utils";
import { LevelChip } from "./ladder";

const IMPORTANCE: Record<1 | 2 | 3, string> = { 1: "Low", 2: "Medium", 3: "High" };

/** One answer option: the ladder level it stands for, then its words. */
function Option({ on, level, label, onClick }: { on: boolean; level: number | null; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      onClick={onClick}
      className={cn(
        "flex items-start gap-2 rounded-lg border px-2.5 py-2 text-left text-[12px] leading-snug outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
        on ? "border-primary bg-primary/10 font-medium" : "hover:bg-accent",
      )}
    >
      {level === null ? (
        <span className="mt-px inline-flex h-5 min-w-7 items-center justify-center rounded-md bg-muted px-1 text-[11px] text-muted-foreground">?</span>
      ) : (
        <LevelChip score={level} size="sm" className="mt-px" />
      )}
      <span>{label}</span>
    </button>
  );
}

function QuestionMeta({ dimension, weight, custom }: { dimension: Dimension; weight: number; custom?: boolean }) {
  return (
    <span className="flex flex-wrap items-center gap-1.5 text-[10px] font-medium">
      {custom && (
        <span className="inline-flex items-center gap-1 rounded bg-validated/15 px-1.5 py-0.5 text-validated">
          <UserPen className="size-3" aria-hidden />
          Added by you
        </span>
      )}
      <span className="rounded border px-1.5 py-0.5 text-muted-foreground">{DIMENSION_LABELS[dimension]}</span>
      <span className="rounded border px-1.5 py-0.5 text-muted-foreground">{IMPORTANCE[weight as 1 | 2 | 3]} importance</span>
    </span>
  );
}

function BankQuestion({ q, index }: { q: Question; index: number }) {
  const functionId = useSession((s) => s.functionId);
  const response = useSession((s) => s.responses.find((r) => r.questionId === q.id && r.functionId === functionId));
  const setResponse = useSession((s) => s.setResponse);
  return (
    <li className="flex flex-col gap-2.5 rounded-xl border bg-card p-4" data-testid={`question-${q.id}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-[14px] font-medium" id={`q-${q.id}`}>
          <span className="mr-1.5 text-muted-foreground tabular">Q{index}.</span>
          {q.text}
        </p>
        <QuestionMeta dimension={q.dimension} weight={q.weight} />
      </div>
      <div role="radiogroup" aria-labelledby={`q-${q.id}`} className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
        {q.options.map((o) => (
          <Option
            key={o.label}
            on={response ? response.level === o.level : false}
            level={o.level === null ? null : toLadder(o.level)}
            label={o.label}
            onClick={() => setResponse({ questionId: q.id, functionId, level: o.level })}
          />
        ))}
      </div>
    </li>
  );
}

function OwnQuestion({ q, index }: { q: CustomQuestion; index: number }) {
  const answerQuestion = useSession((s) => s.answerQuestion);
  const removeQuestion = useSession((s) => s.removeQuestion);
  return (
    <li className="flex flex-col gap-2.5 rounded-xl border border-validated/40 bg-card p-4" data-testid="custom-question">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-[14px] font-medium" id={`q-${q.id}`}>
          <span className="mr-1.5 text-muted-foreground tabular">Q{index}.</span>
          {q.text}
        </p>
        <span className="flex items-center gap-1">
          <QuestionMeta dimension={q.dimension} weight={q.weight} custom />
          <Button variant="ghost" size="icon-sm" onClick={() => removeQuestion(q.id)} aria-label={`Delete question: ${q.text}`}>
            <Trash2 />
          </Button>
        </span>
      </div>
      <div role="radiogroup" aria-labelledby={`q-${q.id}`} className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
        {LADDER_LEVELS.map((l) => (
          <Option key={l} on={q.answer === l} level={l} label={`${LADDER[l].short} — ${LADDER[l].meaning}`} onClick={() => answerQuestion(q.id, l)} />
        ))}
        <Option on={q.answer === null} level={null} label="Not answered yet" onClick={() => answerQuestion(q.id, null)} />
      </div>
    </li>
  );
}

function AddQuestion({ step }: { step: string }) {
  const functionId = useSession((s) => s.functionId);
  const addQuestion = useSession((s) => s.addQuestion);
  const [open, setOpen] = React.useState(false);
  const [text, setText] = React.useState("");
  const [dimension, setDimension] = React.useState<Dimension>("process");
  const [weight, setWeight] = React.useState<"1" | "2" | "3">("2");
  const [answer, setAnswer] = React.useState<string>("none");
  const ok = text.trim().length >= 8;

  if (!open)
    return (
      <Button variant="outline" onClick={() => setOpen(true)} className="self-start border-dashed" data-testid="add-question">
        <Plus />
        Add your own question to {step}
      </Button>
    );

  return (
    <form
      className="flex flex-col gap-3 rounded-xl border border-dashed border-primary/50 bg-primary/5 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!ok) return;
        addQuestion({
          functionId,
          step,
          text: text.trim().replace(/\??$/, "?"),
          dimension,
          weight: Number(weight) as 1 | 2 | 3,
          answer: answer === "none" ? null : (Number(answer) as LadderLevel),
        });
        setText("");
        setAnswer("none");
        setOpen(false);
      }}
    >
      <p className="text-[13px] font-semibold">New question for {step}</p>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cq-text">Question</Label>
        <Input
          id="cq-text"
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. Do drivers use a mobile app for proof of delivery?"
          data-testid="cq-text"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cq-area">Area</Label>
          <Select value={dimension} onValueChange={(v) => setDimension(v as Dimension)}>
            <SelectTrigger id="cq-area" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DIMENSIONS.map((d) => (
                <SelectItem key={d} value={d}>
                  {DIMENSION_LABELS[d]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cq-weight">Importance</Label>
          <Select value={weight} onValueChange={(v) => setWeight(v as typeof weight)}>
            <SelectTrigger id="cq-weight" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Low</SelectItem>
              <SelectItem value="2">Medium</SelectItem>
              <SelectItem value="3">High</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cq-answer">Answer</Label>
          <Select value={answer} onValueChange={setAnswer}>
            <SelectTrigger id="cq-answer" className="w-full" data-testid="cq-answer">
              <SelectValue>{answer === "none" ? "Not answered yet" : `Stage ${answer} · ${LADDER[Number(answer) as LadderLevel].short}`}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Not answered yet</SelectItem>
              {LADDER_LEVELS.map((l) => (
                <SelectItem key={l} value={String(l)}>
                  <span className="font-medium">
                    Stage {l} · {LADDER[l].short}
                  </span>
                  <span className="block text-[11px] text-muted-foreground">{LADDER[l].meaning}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={!ok} data-testid="cq-save">
          Add question
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function answeredCount(p: ProcessResult) {
  return p.indicators.filter((i) => i.kind === "question").length + (p.indicators.some((i) => i.kind === "quick-check") ? 1 : 0);
}

/** Step 2 questionnaire: the bank questions per process, the overall question, and your own questions. */
export function Questionnaire() {
  const { result } = useProcesses();
  const functionId = useSession((s) => s.functionId);
  const quickCheck = useSession((s) => s.quickCheck);
  const setQuickCheck = useSession((s) => s.setQuickCheck);
  const custom = useSession((s) => s.customQuestions);
  const [stepId, setStepId] = React.useState<string | null>(null);
  const p = result.processes.find((x) => x.id === stepId) ?? result.processes[0];

  if (!p) return <p className="text-sm text-muted-foreground">No processes selected. Go back to Scope and pick at least one.</p>;

  const bank = questionsForStep(functionId, p.name);
  const own = custom.filter((q) => q.functionId === functionId && q.step === p.name);
  const total = (x: ProcessResult) => 1 + questionsForStep(functionId, x.name).length + custom.filter((q) => q.functionId === functionId && q.step === x.name).length;
  const qc = quickCheck[p.id];

  return (
    <div className="flex flex-col gap-5">
      <div role="group" aria-label="Pick a process" className="flex flex-wrap gap-2">
        {result.processes.map((x) => {
          const on = x.id === p.id;
          return (
            <button
              key={x.id}
              type="button"
              aria-pressed={on}
              onClick={() => setStepId(x.id)}
              data-testid={`qstep-${x.name}`}
              className={cn(
                "flex items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                on ? "border-primary bg-primary/10 font-medium" : "text-muted-foreground hover:bg-accent",
              )}
            >
              {x.name}
              <span className="text-[11px] tabular text-muted-foreground">
                {answeredCount(x)}/{total(x)}
              </span>
            </button>
          );
        })}
      </div>

      <Tooltip>
        <TooltipTrigger asChild>
          <Card className="ai-surface" data-tour="questionnaire" tabIndex={0} aria-describedby="q-why">
            <CardHeader className="flex-row items-center justify-between gap-3 py-3">
              <CardTitle className="min-w-0 text-base">{p.name}</CardTitle>
              <div className="flex items-center gap-2" aria-live="polite" data-testid="q-level">
                <LevelChip score={p.effective} provenance={p.status === "suggested" ? "ai" : "validated"} />
                <span className="text-[12px] tabular text-muted-foreground">{p.effective === null ? "—" : p.effective.toFixed(2)}</span>
              </div>
              <span id="q-why" className="sr-only">
                {whyLine(p)}
              </span>
            </CardHeader>
          </Card>
        </TooltipTrigger>
        <TooltipContent side="bottom">{whyLine(p)}</TooltipContent>
      </Tooltip>

      <ol className="flex flex-col gap-3">
        <li className="flex flex-col gap-2.5 rounded-xl border bg-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="text-[14px] font-medium" id="q-overall">
              <span className="mr-1.5 text-muted-foreground tabular">Q1.</span>
              Overall, how does {p.name.toLowerCase()} run today?
            </p>
            <QuestionMeta dimension="process" weight={3} />
          </div>
          <div role="radiogroup" aria-labelledby="q-overall" className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {LADDER_LEVELS.map((l) => (
              <Option key={l} on={qc === l} level={l} label={`${LADDER[l].short} — ${LADDER[l].meaning}`} onClick={() => setQuickCheck(p.id, l)} />
            ))}
            <Option on={qc === undefined} level={null} label="Not answered" onClick={() => setQuickCheck(p.id, null)} />
          </div>
        </li>
        {bank.map((q, i) => (
          <BankQuestion key={q.id} q={q} index={i + 2} />
        ))}
        {own.map((q, i) => (
          <OwnQuestion key={q.id} q={q} index={bank.length + i + 2} />
        ))}
      </ol>
      {bank.length === 0 && (
        <p className="text-[12px] text-muted-foreground">The question bank has no detailed questions for {p.name} yet — add your own below.</p>
      )}
      <AddQuestion step={p.name} />
      <p className="text-[11px] text-muted-foreground">
        Each answer counts as an interview signal (reliability 0.85) weighted by its importance. Bank options sit on the same 1–5 scale as the stages, e.g. stage {ladderLevel(toLadder(3))} for an “integrated” answer.
      </p>
    </div>
  );
}

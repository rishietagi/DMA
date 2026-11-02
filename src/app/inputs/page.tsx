"use client";
import * as React from "react";
import { FileText, Loader2, Sparkles, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/overlays";
import { CoverageCard, Findings } from "@/components/dma/findings";
import { InterviewBoard } from "@/components/dma/interview-board";
import { Questionnaire } from "@/components/dma/questionnaire";
import { Page, PageHeader } from "@/components/dma/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProcesses } from "@/components/providers/process-provider";
import { StepNav } from "@/components/shell/step-nav";
import { guessCategory, ingest, loadDemoEvidence, runScoring } from "@/lib/actions";
import { LADDER, LADDER_LEVELS, type LadderLevel } from "@/lib/engine";
import { functionName } from "@/lib/labels";
import { useSession } from "@/lib/store/session";
import type { EvidenceDoc } from "@/lib/store/types";
import { cn } from "@/lib/utils";

const ACCEPT = ".pdf,.docx,.csv,.md,.markdown,.txt";
const SOURCE_LABEL: Record<EvidenceDoc["source"], string> = {
  workshop: "Workshop pack",
  demo: "Illustrative",
  upload: "Uploaded",
};

function Documents() {
  const documents = useSession((s) => s.documents);
  const removeDocument = useSession((s) => s.removeDocument);
  const [over, setOver] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const input = React.useRef<HTMLInputElement>(null);
  const demoLoaded = documents.some((d) => d.source === "demo");
  const workshop = documents.filter((d) => d.source === "workshop");
  const added = documents.filter((d) => d.source !== "workshop");

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  const handle = (files: FileList | null) => {
    if (!files?.length) return;
    const list = [...files];
    const bad = list.filter((f) => !/\.(pdf|docx|csv|md|markdown|txt)$/i.test(f.name) || f.size > 4 * 1024 * 1024);
    if (bad.length)
      toast.error(`Can't read ${bad.map((b) => b.name).join(", ")}`, { description: "Use PDF, DOCX, CSV, MD or TXT files under 4 MB." });
    const ok = list.filter((f) => !bad.includes(f));
    if (!ok.length) return;
    void run(() =>
      ingest(
        ok.map((f) => {
          const title = f.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ");
          const category = guessCategory(f.name);
          return {
            blob: f,
            docId: `upload-${f.name}-${f.size}`,
            title,
            fileName: f.name,
            category,
            source: "upload" as const,
            stakeholder: category === "interview_notes" ? title : undefined,
          };
        }),
      ),
    );
  };

  return (
    <Card data-tour="documents">
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>Documents</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">SOPs, system lists, KPI extracts, interview notes. The AI reads every sentence.</p>
        </div>
        <Button variant="ai" size="sm" onClick={() => void run(loadDemoEvidence)} disabled={busy} data-testid="load-demo">
          {busy ? <Loader2 className="animate-spin" /> : <Sparkles />}
          {demoLoaded ? "Reload demo pack" : "Load demo pack"}
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            handle(e.dataTransfer.files);
          }}
          className={cn(
            "flex flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-6 text-center transition-colors",
            over && "border-primary bg-primary/5",
          )}
          data-testid="dropzone"
        >
          <Upload className="size-5 text-muted-foreground" aria-hidden />
          <p className="text-sm">Drop files here</p>
          <p className="text-xs text-muted-foreground">PDF, DOCX, CSV, MD or TXT · up to 4 MB</p>
          <input
            ref={input}
            type="file"
            multiple
            accept={ACCEPT}
            className="sr-only"
            aria-label="Upload documents"
            data-testid="file-input"
            onChange={(e) => {
              handle(e.target.files);
              e.target.value = "";
            }}
          />
          <Button variant="outline" size="xs" onClick={() => input.current?.click()} disabled={busy}>
            Browse
          </Button>
        </div>

        <ul className="max-h-80 divide-y overflow-y-auto rounded-lg border scrollbar-thin" aria-label="Documents added">
          {workshop.length > 0 && (
            <li className="flex items-center gap-3 px-3 py-2">
              <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium">Workshop pack</p>
                <p className="text-[11px] text-muted-foreground tabular">
                  {workshop.length} documents from the kick-off workshops · Illustrative
                </p>
              </div>
            </li>
          )}
          {added.map((d) => (
            <li key={d.id} className="flex items-center gap-3 px-3 py-2">
              <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium">{d.title}</p>
                <p className="text-[11px] text-muted-foreground">
                  {SOURCE_LABEL[d.source]}
                  {d.status === "analysed" && d.itemCount !== undefined && <span className="tabular"> · {d.itemCount} sentences</span>}
                  {d.status === "parsing" && " · reading…"}
                  {d.status === "error" && <span className="text-destructive"> · {d.error}</span>}
                </p>
              </div>
              <Button variant="ghost" size="icon-sm" onClick={() => removeDocument(d.id)} aria-label={`Remove ${d.title}`}>
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function QuickCheck() {
  const { result } = useProcesses();
  const functionId = useSession((s) => s.functionId);
  const quickCheck = useSession((s) => s.quickCheck);
  const setQuickCheck = useSession((s) => s.setQuickCheck);

  return (
    <Card data-tour="quick-check">
      <CardHeader>
        <CardTitle>Quick check</CardTitle>
        <p className="mt-1 text-sm text-muted-foreground">
          The headline question per process from the {functionName(functionId)} interview. The full questionnaire, and your own questions, are on the next tab.
        </p>
      </CardHeader>
      <CardContent>
        {result.processes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No processes selected. Go back to Scope and pick at least one.</p>
        ) : (
          <ul className="divide-y">
            {result.processes.map((p) => {
              const quotes = p.indicators.filter((i) => i.kind === "evidence").length;
              const value = quickCheck[p.id];
              const labelId = `qc-${p.id.replace(/[^a-z0-9]+/gi, "-")}`;
              return (
                <li key={p.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium" id={labelId}>
                      {p.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground tabular">
                      {quotes ? `${quotes} ${quotes === 1 ? "quote" : "quotes"} found in documents` : "Nothing in the documents yet"}
                    </p>
                  </div>
                  <Select
                    value={value === undefined ? "none" : String(value)}
                    onValueChange={(v) => setQuickCheck(p.id, v === "none" ? null : (Number(v) as LadderLevel))}
                  >
                    <SelectTrigger className="w-full sm:w-56" aria-labelledby={labelId} data-testid={`qc-${p.name}`}>
                      <SelectValue>
                        {value === undefined ? "Not answered" : `L${value} · ${LADDER[value as LadderLevel].short}`}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Not answered</SelectItem>
                      {LADDER_LEVELS.map((l) => (
                        <SelectItem key={l} value={String(l)}>
                          <span className="font-medium">L{l} · {LADDER[l].short}</span>
                          <span className="block text-[11px] text-muted-foreground">{LADDER[l].meaning}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default function InputsPage() {
  return (
    <Page>
      <PageHeader
        stage={2}
        title="Gather inputs"
        description="Add documents, answer the questionnaire (or add your own questions) and capture interview notes. The AI reads everything and places it on the ladder."
      />
      <Tabs defaultValue="add" className="gap-5">
        <TabsList aria-label="Inputs" className="h-auto max-w-full flex-wrap">
          <TabsTrigger value="add">Documents &amp; quick check</TabsTrigger>
          <TabsTrigger value="questions" data-testid="tab-questions">
            Questionnaire
          </TabsTrigger>
          <TabsTrigger value="found" data-testid="tab-found">
            What the AI found
          </TabsTrigger>
          <TabsTrigger value="interviews" data-testid="tab-interviews">
            Interviews
          </TabsTrigger>
        </TabsList>
        <TabsContent value="add" className="flex flex-col gap-6">
          <div className="grid items-start gap-6 lg:grid-cols-2">
            <Documents />
            <QuickCheck />
          </div>
          <CoverageCard />
        </TabsContent>
        <TabsContent value="questions">
          <Questionnaire />
        </TabsContent>
        <TabsContent value="found">
          <Findings />
        </TabsContent>
        <TabsContent value="interviews">
          <InterviewBoard />
        </TabsContent>
      </Tabs>
      <StepNav step={2} nextLabel="Next: Score the processes" onNext={() => void runScoring()} />
    </Page>
  );
}

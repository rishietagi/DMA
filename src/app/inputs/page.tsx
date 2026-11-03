"use client";
import * as React from "react";
import { FileText, Loader2, Sparkles, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/overlays";
import { CoverageCard } from "@/components/dma/findings";
import { InterviewBoard } from "@/components/dma/interview-board";
import { Questionnaire } from "@/components/dma/questionnaire";
import { Page, PageHeader } from "@/components/dma/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { LevelChip } from "@/components/dma/ladder";
import { ScopeLine } from "@/components/dma/scope-line";
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

/** One line that says what a tab is for. */
function TabPrompt({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

function Documents() {
  const functionId = useSession((s) => s.functionId);
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
        <CardTitle>Documents</CardTitle>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ai" size="sm" onClick={() => void run(loadDemoEvidence)} disabled={busy} data-testid="load-demo">
              {busy ? <Loader2 className="animate-spin" /> : <Sparkles />}
              {demoLoaded ? "Reload sample documents" : "Load sample documents"}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Adds the illustrative {functionName(functionId)} pack (SOP, system list, data architecture, KPI extract, interviews) so you can see the AI at work.
            Loading again replaces it.
          </TooltipContent>
        </Tooltip>
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

/** AI insights: the AI's stage per process, how much evidence backs it, and the quick-check answer. */
function AiInsights() {
  const { result } = useProcesses();
  const quickCheck = useSession((s) => s.quickCheck);
  const setQuickCheck = useSession((s) => s.setQuickCheck);

  return (
    <Card data-tour="quick-check" className="ai-surface">
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5">
          <Sparkles className="size-4 text-ai" aria-hidden />
          Maturity indications
        </CardTitle>
      </CardHeader>
      <CardContent>
        {result.processes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No processes selected. Go back to Define &amp; Focus and pick at least one.</p>
        ) : (
          <ul className="divide-y">
            {result.processes.map((p) => {
              const refs = p.indicators.filter((i) => i.kind === "evidence").length;
              const value = quickCheck[p.id];
              return (
                <li key={p.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:gap-4" data-testid={`insight-${p.name}`}>
                  <LevelChip score={p.effective} provenance={p.status === "suggested" ? "ai" : "validated"} className="self-start sm:self-center" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold">{p.name}</p>
                    <p className="text-[11px] text-muted-foreground tabular">
                      {refs ? `${refs} evidence ${refs === 1 ? "reference" : "references"}` : "No evidence references yet"}
                    </p>
                  </div>
                  <span className="text-[11px] text-muted-foreground" aria-hidden>
                    Quick check
                  </span>
                  <Select
                    value={value === undefined ? "none" : String(value)}
                    onValueChange={(v) => setQuickCheck(p.id, v === "none" ? null : (Number(v) as LadderLevel))}
                  >
                    <SelectTrigger className="w-full sm:w-56" aria-label={`Quick check for ${p.name}`} data-testid={`qc-${p.name}`}>
                      <SelectValue>
                        {value === undefined ? "Not answered" : `Stage ${value} · ${LADDER[value as LadderLevel].short}`}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Not answered</SelectItem>
                      {LADDER_LEVELS.map((l) => (
                        <SelectItem key={l} value={String(l)}>
                          <span className="font-medium">Stage {l} · {LADDER[l].short}</span>
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
        title="Assess & Validate"
        description="Build an evidence-backed view of maturity using documents, stakeholder inputs and functional interviews."
      />
      <ScopeLine />
      <Tabs defaultValue="evidence" className="gap-5">
        <TabsList aria-label="Inputs" className="h-auto max-w-full flex-wrap">
          <TabsTrigger value="evidence" data-testid="tab-evidence">
            Evidence
          </TabsTrigger>
          <TabsTrigger value="questions" data-testid="tab-questions">
            Assess
          </TabsTrigger>
          <TabsTrigger value="insights" data-testid="tab-insights">
            AI insights
          </TabsTrigger>
          <TabsTrigger value="interviews" data-testid="tab-interviews">
            Interviews
          </TabsTrigger>
        </TabsList>
        <TabsContent value="evidence" className="flex flex-col gap-6">
          <TabPrompt>Upload relevant documents to strengthen the assessment, like SOPs, KPIs and process documents.</TabPrompt>
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] [&>*]:min-w-0">
            <Documents />
            <CoverageCard />
          </div>
        </TabsContent>
        <TabsContent value="questions" className="flex flex-col gap-5">
          <TabPrompt>What do stakeholders say? Validate maturity through targeted questions, stakeholder evidence and documented inputs.</TabPrompt>
          <Questionnaire />
        </TabsContent>
        <TabsContent value="insights" className="flex flex-col gap-5">
          <TabPrompt>AI-generated maturity indications based on available evidence. Review before validation.</TabPrompt>
          <AiInsights />
        </TabsContent>
        <TabsContent value="interviews" className="flex flex-col gap-5">
          <TabPrompt>What needs challenge or clarification?</TabPrompt>
          <InterviewBoard />
        </TabsContent>
      </Tabs>
      <StepNav step={2} nextLabel="Next: Diagnose" onNext={() => void runScoring()} />
    </Page>
  );
}

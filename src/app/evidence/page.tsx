"use client";
import * as React from "react";
import { FileStack, Loader2, Search, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/form-controls";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/overlays";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CoverageMatrix } from "@/components/dma/coverage-matrix";
import { EvidenceCard } from "@/components/dma/evidence-card";
import { Page, PageHeader } from "@/components/dma/page-header";
import { ingest, loadDemoEvidence } from "@/lib/actions";
import { findContradictions } from "@/lib/classifier/insights";
import { DIMENSION_LABELS, EVIDENCE_CATEGORY_LABELS } from "@/lib/engine";
import { FUNCTION_SHORT } from "@/lib/labels";
import {
  DIMENSIONS,
  EVIDENCE_CATEGORIES,
  FUNCTION_IDS,
  type Dimension,
  type EvidenceCategory,
  type FunctionId,
} from "@/lib/schema";
import { useSession } from "@/lib/store/session";
import type { EvidenceDoc } from "@/lib/store/types";
import { cn } from "@/lib/utils";

const CATEGORY_HINT: Record<EvidenceCategory, string> = {
  self_assessment: "2025 scores for 41 capabilities — the baseline every score is tested against.",
  it_strategy: "Digital and IT strategy, board papers, target operating model.",
  process_docs: "Process maps, SOP narratives, RACI charts.",
  application_landscape: "System inventories and integration maps.",
  data_architecture: "Data flows, master data, reporting stack.",
  policies_sops: "Policies, approval matrices, controls.",
  transformation_portfolio: "Programme and project lists with status.",
  interview_notes: "Stakeholder interviews and workshop notes.",
  kpi_extracts: "KPI packs and operational extracts.",
};
const ACCEPT = ".pdf,.docx,.csv,.md,.markdown,.txt";
const SOURCE_LABEL: Record<EvidenceDoc["source"], string> = {
  workshop: "Workshop pack",
  demo: "Demo · Illustrative",
  upload: "Uploaded",
};

function Dropzone({
  category,
  docs,
  busy,
}: {
  category: EvidenceCategory;
  docs: EvidenceDoc[];
  busy: boolean;
}) {
  const [over, setOver] = React.useState(false);
  const input = React.useRef<HTMLInputElement>(null);
  const isBaseline = category === "self_assessment";

  const handle = async (files: FileList | null) => {
    if (!files?.length) return;
    const list = [...files];
    const bad = list.filter((f) => !/\.(pdf|docx|csv|md|markdown|txt)$/i.test(f.name));
    if (bad.length)
      toast.error(`Can't read ${bad.map((b) => b.name).join(", ")}`, {
        description: "Use PDF, DOCX, CSV, MD or TXT.",
      });
    const ok = list.filter((f) => !bad.includes(f));
    if (!ok.length) return;
    await ingest(
      ok.map((f) => ({
        blob: f,
        docId: `upload-${f.name}-${f.size}`,
        title: f.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " "),
        fileName: f.name,
        category,
        source: "upload" as const,
        stakeholder:
          category === "interview_notes"
            ? f.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ")
            : undefined,
      })),
    );
  };

  return (
    <div
      onDragOver={(e) => {
        if (isBaseline) return;
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        if (!isBaseline) void handle(e.dataTransfer.files);
      }}
      className={cn(
        "bg-card flex flex-col gap-2 rounded-xl border p-3.5 transition-colors",
        over && "border-primary bg-primary/5",
        !isBaseline && "border-dashed",
      )}
      data-testid={`dropzone-${category}`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-[13px] font-semibold">{EVIDENCE_CATEGORY_LABELS[category]}</h3>
        <span
          className={cn(
            "tabular rounded px-1.5 py-0.5 text-[11px]",
            docs.length || isBaseline
              ? "bg-validated/15 text-foreground"
              : "bg-muted text-muted-foreground",
          )}
        >
          {isBaseline ? "Loaded" : `${docs.length} ${docs.length === 1 ? "doc" : "docs"}`}
        </span>
      </div>
      <p className="text-muted-foreground text-xs">{CATEGORY_HINT[category]}</p>
      {!isBaseline && (
        <>
          <input
            ref={input}
            type="file"
            multiple
            accept={ACCEPT}
            className="sr-only"
            aria-label={`Upload ${EVIDENCE_CATEGORY_LABELS[category]}`}
            onChange={(e) => {
              void handle(e.target.files);
              e.target.value = "";
            }}
          />
          <Button
            variant="ghost"
            size="xs"
            className="text-muted-foreground mt-auto -ml-1 w-fit"
            onClick={() => input.current?.click()}
            disabled={busy}
          >
            <Upload />
            Drop files or browse
          </Button>
        </>
      )}
    </div>
  );
}

export default function EvidencePage() {
  const documents = useSession((s) => s.documents);
  const evidence = useSession((s) => s.evidence);
  const removeDocument = useSession((s) => s.removeDocument);
  const [busy, setBusy] = React.useState(false);
  const [fn, setFn] = React.useState<FunctionId | "all">("all");
  const [dim, setDim] = React.useState<Dimension | "all">("all");
  const [pol, setPol] = React.useState<"all" | "pain" | "strength">("all");
  const [q, setQ] = React.useState("");
  const parsing = documents.some((d) => d.status === "parsing") || busy;
  const demoLoaded = documents.some((d) => d.source === "demo" && d.status === "analysed");
  const contradictions = findContradictions(evidence).length;
  const categoriesCovered = new Set([
    "self_assessment",
    ...documents.filter((d) => d.status === "analysed").map((d) => d.category),
  ]).size;

  const filtered = evidence
    .filter(
      (e) =>
        (fn === "all" || e.functionId === fn) &&
        (dim === "all" || e.dimension === dim) &&
        (pol === "all" || e.polarity === pol),
    )
    .filter(
      (e) =>
        !q || `${e.quote} ${e.docTitle} ${e.capabilityId}`.toLowerCase().includes(q.toLowerCase()),
    )
    .slice()
    .reverse();

  const runDemo = async () => {
    setBusy(true);
    try {
      await loadDemoEvidence();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page>
      <PageHeader
        stage={2}
        title="Evidence hub"
        description="Drop strategy papers, SOPs, landscapes, KPI extracts and notes into the nine categories. The analyser reads each sentence, tags function, capability, dimension and level, and maps it to the rubric."
        actions={
          <Button
            variant="ai"
            size="sm"
            onClick={() => void runDemo()}
            disabled={parsing}
            data-testid="load-demo-evidence"
          >
            {parsing ? <Loader2 className="animate-spin" /> : <FileStack />}
            {demoLoaded ? "Re-analyse demo evidence" : "Load demo evidence"}
          </Button>
        }
      />

      <dl className="bg-card grid grid-cols-4 divide-x rounded-xl border">
        {[
          ["Documents", documents.length],
          ["Evidence items", evidence.length],
          ["Categories covered", `${categoriesCovered}/9`],
          ["Contradictions to review", contradictions],
        ].map(([l, v]) => (
          <div key={l} className="px-5 py-3">
            <dt className="text-muted-foreground text-xs">{l}</dt>
            <dd className="tabular text-2xl font-semibold">{v}</dd>
          </div>
        ))}
      </dl>

      <section aria-label="Evidence categories" className="grid gap-3 md:grid-cols-3">
        {EVIDENCE_CATEGORIES.map((c) => (
          <Dropzone
            key={c}
            category={c}
            docs={documents.filter((d) => d.category === c)}
            busy={parsing}
          />
        ))}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Coverage</CardTitle>
          <CardDescription>
            Which functions have which kinds of evidence — and where the question bank expects more.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-3">
          <CoverageMatrix evidence={evidence} documents={documents} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
          <CardDescription>Everything in the evidence store, with parse status.</CardDescription>
        </CardHeader>
        <CardContent className="pt-3">
          <ul className="grid gap-x-6 md:grid-cols-2 xl:grid-cols-3">
            {[...documents].reverse().map((d) => (
              <li key={d.id} className="flex items-center gap-3 border-b py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium">{d.title}</p>
                  <p className="text-muted-foreground truncate text-[11px]">
                    {EVIDENCE_CATEGORY_LABELS[d.category]} · {SOURCE_LABEL[d.source]}
                    {d.dominantFunctionId ? ` · ${FUNCTION_SHORT[d.dominantFunctionId]}` : ""}
                  </p>
                </div>
                <span
                  className={cn(
                    "tabular text-[11px]",
                    d.status === "analysed" && "text-muted-foreground",
                    d.status === "parsing" && "text-ai-foreground",
                    d.status === "error" && "text-destructive",
                  )}
                  title={d.error}
                >
                  {d.status === "analysed"
                    ? `${d.itemCount ?? 0} items`
                    : d.status === "parsing"
                      ? "Reading…"
                      : d.status === "error"
                        ? "Couldn't read"
                        : "Queued"}
                </span>
                {d.source !== "workshop" && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => removeDocument(d.id)}
                    aria-label={`Remove ${d.title}`}
                  >
                    <Trash2 />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <section className="flex flex-col gap-3" aria-label="Evidence items">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="mr-auto text-sm font-semibold">
            Evidence items{" "}
            <span className="text-muted-foreground tabular font-normal">({filtered.length})</span>
          </h2>
          <div className="relative">
            <Search
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2"
              aria-hidden
            />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search quotes"
              className="h-8 w-52 pl-8 text-[13px]"
              aria-label="Search evidence"
            />
          </div>
          <Select value={fn} onValueChange={(v) => setFn(v as FunctionId | "all")}>
            <SelectTrigger size="sm" className="w-40" aria-label="Filter by function">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All functions</SelectItem>
              {FUNCTION_IDS.map((f) => (
                <SelectItem key={f} value={f}>
                  {FUNCTION_SHORT[f]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <ToggleGroup
            type="single"
            value={dim}
            onValueChange={(v) => v && setDim(v as Dimension | "all")}
            aria-label="Filter by dimension"
          >
            <ToggleGroupItem value="all">All</ToggleGroupItem>
            {DIMENSIONS.map((d) => (
              <ToggleGroupItem key={d} value={d}>
                {DIMENSION_LABELS[d].replace(" & Analytics", "")}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <ToggleGroup
            type="single"
            value={pol}
            onValueChange={(v) => v && setPol(v as typeof pol)}
            aria-label="Filter by polarity"
          >
            <ToggleGroupItem value="all">All</ToggleGroupItem>
            <ToggleGroupItem value="pain">Pain points</ToggleGroupItem>
            <ToggleGroupItem value="strength">Strengths</ToggleGroupItem>
          </ToggleGroup>
        </div>
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed px-6 py-10 text-center">
            <p className="text-sm font-medium">No evidence matches</p>
            <p className="text-muted-foreground mt-1 text-xs">
              Load the demo evidence or drop a document into a category above.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
            {filtered.slice(0, 60).map((e) => (
              <EvidenceCard key={e.id} e={e} />
            ))}
          </div>
        )}
        {filtered.length > 60 && (
          <p className="text-muted-foreground text-center text-xs">
            Showing 60 of {filtered.length}. Narrow the filters to see more.
          </p>
        )}
      </section>
    </Page>
  );
}

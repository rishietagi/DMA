"use client";
import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowUpDown, CheckCheck, Gauge, Search } from "lucide-react";
import { toast } from "sonner";
import { useAssessment } from "@/components/providers/assessment-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/form-controls";
import { Label } from "@/components/ui/misc";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/overlays";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CapabilitySheet } from "@/components/dma/capability-sheet";
import { ConfidenceRing } from "@/components/dma/confidence-ring";
import { DetailOnly, PageIntro, useDetailed } from "@/components/dma/explain";
import { FLAG_META, FlagIcons } from "@/components/dma/flags";
import { MaturityChip, MaturityLegend } from "@/components/dma/maturity";
import { Page, PageHeader } from "@/components/dma/page-header";
import { ProvenanceLabel } from "@/components/dma/provenance";
import { runScoring } from "@/lib/actions";
import { formatDelta, formatScore, type CapabilityResult } from "@/lib/engine";
import { capabilityLabel, FUNCTION_SHORT } from "@/lib/labels";
import { DIMENSIONS, FUNCTION_IDS, type Dimension, type FunctionId } from "@/lib/schema";
import { useSession } from "@/lib/store/session";
import { cn } from "@/lib/utils";

const col = createColumnHelper<CapabilityResult>();
const DIM_SHORT: Record<Dimension, string> = {
  process: "Process",
  data: "Data",
  ai: "AI",
  people: "People",
};

const bulkEligible = (c: CapabilityResult) =>
  c.inScope &&
  c.status === "suggested" &&
  c.confidenceBand === "high" &&
  !c.flags.some(
    (f) => f.kind === "INCONSISTENT" || f.kind === "SELF_VARIANCE" || f.kind === "LACKS_EVIDENCE",
  );

function ScoringWorkbench() {
  const { result } = useAssessment();
  const mode = useSession((s) => s.mode);
  const setMode = useSession((s) => s.setMode);
  const rag = useSession((s) => s.ragView);
  const bulkAccept = useSession((s) => s.bulkAccept);
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const openId = params.get("cap");
  const focusDim = (params.get("dim") as Dimension | null) ?? undefined;

  const [fn, setFn] = React.useState<FunctionId | "all">("all");
  const [status, setStatus] = React.useState<"all" | "suggested" | "validated">("all");
  const [flaggedOnly, setFlaggedOnly] = React.useState(false);
  const [q, setQ] = React.useState("");
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [bulkOpen, setBulkOpen] = React.useState(false);
  const detailed = useDetailed();

  const open = (id: string | null, dim?: Dimension) => {
    const sp = new URLSearchParams(params.toString());
    if (id) sp.set("cap", id);
    else sp.delete("cap");
    if (dim) sp.set("dim", dim);
    else sp.delete("dim");
    router.replace(`${pathname}${sp.toString() ? `?${sp}` : ""}`, { scroll: false });
  };

  const rows = React.useMemo(
    () =>
      result.capabilities.filter((c) => {
        if (!c.inScope) return false;
        if (fn !== "all" && !c.capability.functionIds.includes(fn)) return false;
        if (status === "suggested" && c.status !== "suggested") return false;
        if (status === "validated" && c.status === "suggested") return false;
        if (flaggedOnly && !c.flags.some((f) => f.kind !== "LOW_COVERAGE")) return false;
        if (
          q &&
          !`${c.capability.name} ${c.capability.system ?? ""} ${FUNCTION_SHORT[c.capability.primaryFunctionId]}`
            .toLowerCase()
            .includes(q.toLowerCase())
        )
          return false;
        return true;
      }),
    [result, fn, status, flaggedOnly, q],
  );

  const eligible = result.capabilities.filter(bulkEligible);

  const columns = React.useMemo(
    () => [
      col.accessor((c) => capabilityLabel(c.capability.id), {
        id: "name",
        header: "Capability",
        cell: (info) => (
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium">{info.getValue()}</p>
            <p className="text-muted-foreground truncate text-[11px]">
              {info.row.original.capability.functionIds.map((f) => FUNCTION_SHORT[f]).join(", ")}
              {info.row.original.capability.system
                ? ` · ${info.row.original.capability.system}`
                : ""}
            </p>
          </div>
        ),
      }),
      col.accessor("self", {
        header: "2025 rating",
        cell: (info) => (
          <MaturityChip score={info.getValue()} size="sm" provenance="self" rag={rag} />
        ),
      }),
      ...DIMENSIONS.map((d) =>
        col.accessor((c) => c.dimensions[d]?.final ?? 0, {
          id: d,
          header: DIM_SHORT[d],
          cell: (info) => {
            const c = info.row.original;
            const ds = c.dimensions[d];
            return (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  open(c.capability.id, d);
                }}
                className="focus-visible:ring-ring inline-flex min-h-6 min-w-6 items-center rounded-md outline-none focus-visible:ring-2"
                aria-label={`${capabilityLabel(c.capability.id)} ${DIM_SHORT[d]} ${formatScore(ds?.final)} — open evidence`}
              >
                <MaturityChip
                  score={ds?.final}
                  size="sm"
                  rag={rag}
                  className={cn(ds && !ds.hasEvidence && "opacity-60")}
                />
              </button>
            );
          },
        }),
      ),
      col.accessor("evidenceScore", {
        header: "AI score",
        cell: (info) => (
          <MaturityChip
            score={info.row.original.effectiveScore}
            provenance={info.row.original.status === "suggested" ? "ai" : "validated"}
            rag={rag}
          />
        ),
      }),
      col.accessor((c) => c.evidenceScore - c.self, {
        id: "delta",
        header: "Change",
        cell: (info) => {
          const v = info.getValue();
          return (
            <span
              className={cn(
                "tabular text-xs font-medium",
                Math.abs(v) >= 1
                  ? v < 0
                    ? "text-conf-low"
                    : "text-validated"
                  : "text-muted-foreground",
              )}
            >
              {formatDelta(v)}
            </span>
          );
        },
      }),
      col.accessor("confidence", {
        header: "Confidence",
        cell: (info) => (
          <span className="tabular text-muted-foreground inline-flex items-center gap-1.5 text-xs">
            <ConfidenceRing
              value={info.getValue()}
              band={info.row.original.confidenceBand}
              size={18}
            />
            {Math.round(info.getValue() * 100)}%
          </span>
        ),
      }),
      col.accessor((c) => c.flags.length, {
        id: "flags",
        header: "Needs attention",
        cell: (info) => {
          const flags = info.row.original.flags.filter((f) => f.kind !== "LOW_COVERAGE");
          if (detailed) return <FlagIcons flags={flags} />;
          const top =
            flags.find((f) => f.kind === "INCONSISTENT") ??
            flags.find((f) => f.kind === "SELF_VARIANCE") ??
            flags.find((f) => f.kind === "LACKS_EVIDENCE");
          return top ? (
            <span className="text-foreground/80 text-xs">{FLAG_META[top.kind].label}</span>
          ) : (
            <span className="text-muted-foreground text-xs">—</span>
          );
        },
      }),
      col.accessor("status", {
        header: "Status",
        cell: (info) => (
          <ProvenanceLabel
            status={info.getValue()}
            validation={info.row.original.validation}
            compact
          />
        ),
      }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rag, params, detailed],
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: {
      sorting,
      columnVisibility: detailed ? {} : { process: false, data: false, ai: false, people: false },
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (r) => r.capability.id,
  });

  const selected = openId ? (result.byId[openId] ?? null) : null;
  const awaiting = result.kpis.all.awaitingValidation;

  return (
    <Page>
      <PageHeader
        stage={5}
        title="Scoring workbench"
        actions={
          <>
            <DetailOnly>
              <ToggleGroup
                type="single"
                value={mode}
                onValueChange={(v) => v && setMode(v as typeof mode)}
                aria-label="Scoring basis"
              >
                <ToggleGroupItem value="baseline">2025 baseline</ToggleGroupItem>
                <ToggleGroupItem value="evidence">Evidence-based</ToggleGroupItem>
              </ToggleGroup>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void runScoring()}
                disabled={mode === "baseline"}
              >
                <Gauge />
                Run AI scoring
              </Button>
            </DetailOnly>
            <Button
              size="sm"
              onClick={() => setBulkOpen(true)}
              disabled={eligible.length === 0}
              data-testid="bulk-accept"
            >
              <CheckCheck />
              Accept {eligible.length} high-confidence
            </Button>
          </>
        }
      />

      <PageIntro
        what="One row per capability. The AI suggests a score from the evidence; a consultant then accepts it or changes it."
        todo="Click a row to see, in plain words, why it got that score — then accept it or change it with a reason."
        how={[
          "“2025 rating” is what Himalaya gave itself. “AI score” is what the evidence supports. “Change” is the difference.",
          "Each statement of evidence carries a level from 1 to 5. Documents and KPIs count more than workshop answers, which count more than interview remarks; the 2025 rating counts least.",
          "A level can’t be claimed without the one below it: for example, nothing scores 3 (“integrated”) unless something shows the systems really are connected.",
          "Confidence is higher when several independent sources agree, and lower when the score rests on one source or sources contradict each other.",
          "“Needs attention” highlights scores a consultant should look at first: sources that disagree, big differences from 2025, or too little proof.",
        ]}
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2"
            aria-hidden
          />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Find a capability or system"
            className="h-8 w-60 pl-8 text-[13px]"
            aria-label="Search capabilities"
          />
        </div>
        <Select value={fn} onValueChange={(v) => setFn(v as FunctionId | "all")}>
          <SelectTrigger size="sm" className="w-44" aria-label="Filter by function">
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
          value={status}
          onValueChange={(v) => v && setStatus(v as typeof status)}
          aria-label="Filter by status"
        >
          <ToggleGroupItem value="all">All</ToggleGroupItem>
          <ToggleGroupItem value="suggested">Awaiting ({awaiting})</ToggleGroupItem>
          <ToggleGroupItem value="validated">
            Validated ({result.kpis.all.validated})
          </ToggleGroupItem>
        </ToggleGroup>
        <DetailOnly>
          <Label className="gap-2 text-[13px] font-normal">
            <Switch checked={flaggedOnly} onCheckedChange={setFlaggedOnly} />
            Flagged only
          </Label>
        </DetailOnly>
        <MaturityLegend rag={rag} className="ml-auto" alwaysShowLabels={!detailed} />
      </div>

      <div className="bg-card overflow-hidden rounded-xl border">
        <table
          className={cn("w-full border-collapse text-left", detailed && "table-fixed")}
          aria-label="Capability scores"
        >
          {detailed && (
            <colgroup>
              <col className="w-[26%]" />
              <col className="w-[7%]" />
              {DIMENSIONS.map((d) => (
                <col key={d} className="w-[6.5%]" />
              ))}
              <col className="w-[8%]" />
              <col className="w-[6%]" />
              <col className="w-[9%]" />
              <col className="w-[9%]" />
              <col className="w-[9%]" />
            </colgroup>
          )}
          <thead className="bg-muted/40 border-b">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => (
                  <th
                    key={h.id}
                    scope="col"
                    className="text-muted-foreground px-3 py-2 text-[11px] font-medium"
                  >
                    <button
                      type="button"
                      onClick={h.column.getToggleSortingHandler()}
                      className="hover:text-foreground focus-visible:ring-ring inline-flex min-h-6 items-center gap-1 rounded outline-none focus-visible:ring-2"
                      aria-label={`Sort by ${String(h.column.columnDef.header)}`}
                    >
                      {flexRender(h.column.columnDef.header, h.getContext())}
                      <ArrowUpDown
                        className={cn(
                          "size-3",
                          h.column.getIsSorted() ? "text-foreground" : "opacity-30",
                        )}
                      />
                    </button>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y">
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                tabIndex={0}
                data-testid={`row-${row.id}`}
                onClick={() => open(row.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    open(row.id);
                  }
                }}
                className={cn(
                  "hover:bg-accent/50 focus-visible:bg-accent focus-visible:ring-ring cursor-pointer transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset",
                  openId === row.id && "bg-accent/60",
                )}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-3 py-2 align-middle">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={12} className="text-muted-foreground px-3 py-10 text-center text-sm">
                  No capabilities match these filters. Clear the search or switch status to “All”.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <CapabilitySheet
        c={selected}
        focusDimension={focusDim}
        open={!!selected}
        onOpenChange={(o) => !o && open(null)}
      />

      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Accept {eligible.length} high-confidence scores?</DialogTitle>
            <DialogDescription>
              Only capabilities with high confidence and no inconsistency, variance or evidence
              flags are included. Each acceptance is logged with the score at the time.
            </DialogDescription>
          </DialogHeader>
          <ul className="max-h-60 divide-y overflow-y-auto rounded-lg border">
            {eligible.map((c) => (
              <li
                key={c.capability.id}
                className="flex items-center justify-between px-3 py-2 text-[13px]"
              >
                {capabilityLabel(c.capability.id)}
                <MaturityChip score={c.evidenceScore} size="sm" provenance="ai" />
              </li>
            ))}
          </ul>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setBulkOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                bulkAccept(
                  eligible.map((c) => ({ capabilityId: c.capability.id, score: c.evidenceScore })),
                );
                toast.success(`Accepted ${eligible.length} scores`);
                setBulkOpen(false);
              }}
            >
              <CheckCheck />
              Accept {eligible.length}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  );
}

export default function ScoringPage() {
  return (
    <React.Suspense>
      <ScoringWorkbench />
    </React.Suspense>
  );
}

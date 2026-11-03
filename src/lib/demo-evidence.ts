/** Manifest of the synthetic demo documents in public/demo-evidence (all Illustrative). */
import type { EvidenceItem } from "@/lib/engine";
import type { EvidenceCategory, FunctionId } from "@/lib/schema";

export interface DemoDoc {
  id: string;
  fileName: string;
  title: string;
  category: EvidenceCategory;
  stakeholder?: string;
  functionId?: FunctionId;
  date?: string;
}

export const DEMO_DOCS: DemoDoc[] = [
  { id: "demo-scm-sop", fileName: "SCM_Warehouse_and_Logistics_SOP.md", title: "Supply chain operations SOP", category: "process_docs" },
  { id: "demo-finance-close", fileName: "Finance_Close_and_MIS_Process.md", title: "Finance close & MIS process note", category: "process_docs" },
  { id: "demo-app-landscape", fileName: "Application_Landscape.csv", title: "Application landscape", category: "application_landscape" },
  { id: "demo-data-arch", fileName: "Data_Architecture_Note.md", title: "Data architecture note", category: "data_architecture" },
  { id: "demo-portfolio", fileName: "Transformation_Portfolio.csv", title: "Transformation portfolio", category: "transformation_portfolio" },
  { id: "demo-kpis", fileName: "KPI_Extract_Aug2026.csv", title: "KPI extract — Aug 2026", category: "kpi_extracts" },
  { id: "demo-int-ecom", fileName: "Interview_Head_of_Ecommerce.md", title: "Interview — Head of E-commerce", category: "interview_notes", stakeholder: "Head of E-commerce", functionId: "sales-ecom", date: "2026-09-22" },
  { id: "demo-int-finance", fileName: "Interview_Finance_Controller.md", title: "Interview — Finance Controller", category: "interview_notes", stakeholder: "Finance Controller", functionId: "finance", date: "2026-09-23" },
  { id: "demo-int-scm", fileName: "Interview_Supply_Chain_Planning_Lead.md", title: "Interview — Supply Chain Planning Lead", category: "interview_notes", stakeholder: "Supply Chain Planning Lead", functionId: "supply-chain", date: "2026-09-24" },
];

/** Sample interview transcript for the Interviews tab (kept out of the sample document pack). */
export const SAMPLE_TRANSCRIPT: DemoDoc = {
  id: "demo-transcript-warehouse",
  fileName: "Transcript_Warehouse_and_Logistics_Manager.md",
  title: "Interview — Warehouse & Logistics Manager",
  category: "interview_notes",
  stakeholder: "Warehouse & Logistics Manager",
  functionId: "supply-chain",
  date: "2026-09-28",
};

/** Drops sample documents (and their sentences) that are no longer shipped, e.g. from an older saved session. */
export function withoutRetiredSamples<S extends { documents: { id: string; source: string }[]; evidence: EvidenceItem[] }>(
  s: S,
): Pick<S, "documents" | "evidence"> {
  const current = new Set([...DEMO_DOCS, SAMPLE_TRANSCRIPT].map((d) => d.id));
  const retired = new Set(s.documents.filter((d) => d.source === "demo" && !current.has(d.id)).map((d) => d.id));
  return {
    documents: s.documents.filter((d) => !retired.has(d.id)),
    evidence: s.evidence.filter((e) => !retired.has(e.docId)),
  } as Pick<S, "documents" | "evidence">;
}


/** Manifest of the synthetic demo documents in public/demo-evidence (all Illustrative). */
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
  { id: "demo-strategy", fileName: "Digital_IT_Strategy_FY27.md", title: "Digital & IT strategy FY27", category: "it_strategy" },
  { id: "demo-ecom-sop", fileName: "Ecom_O2C_SOP.md", title: "E-com order-to-cash SOP", category: "process_docs" },
  { id: "demo-finance-close", fileName: "Finance_Close_and_MIS_Process.md", title: "Finance close & MIS process note", category: "process_docs" },
  { id: "demo-app-landscape", fileName: "Application_Landscape.csv", title: "Application landscape", category: "application_landscape" },
  { id: "demo-data-arch", fileName: "Data_Architecture_Note.md", title: "Data architecture note", category: "data_architecture" },
  { id: "demo-policies", fileName: "Master_Data_and_Approvals_Policy.md", title: "Master data & approvals policy", category: "policies_sops" },
  { id: "demo-portfolio", fileName: "Transformation_Portfolio.csv", title: "Transformation portfolio", category: "transformation_portfolio" },
  { id: "demo-kpis", fileName: "KPI_Extract_Aug2026.csv", title: "KPI extract — Aug 2026", category: "kpi_extracts" },
  { id: "demo-int-ecom", fileName: "Interview_Head_of_Ecommerce.md", title: "Interview — Head of E-commerce", category: "interview_notes", stakeholder: "Head of E-commerce", functionId: "sales-ecom", date: "2026-09-22" },
  { id: "demo-int-finance", fileName: "Interview_Finance_Controller.md", title: "Interview — Finance Controller", category: "interview_notes", stakeholder: "Finance Controller", functionId: "finance", date: "2026-09-23" },
  { id: "demo-int-scm", fileName: "Interview_Supply_Chain_Planning_Lead.md", title: "Interview — Supply Chain Planning Lead", category: "interview_notes", stakeholder: "Supply Chain Planning Lead", functionId: "supply-chain", date: "2026-09-24" },
];

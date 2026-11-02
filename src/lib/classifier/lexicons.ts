/**
 * Lexicons for the deterministic classifier (SCORING_ENGINE.md §7). All matching is
 * case-insensitive on word boundaries. Order inside each list does not matter.
 */
import type { Dimension, FunctionId } from "@/lib/schema";

/** §7.3 function lexicon */
export const FUNCTION_LEXICON: Record<FunctionId, string[]> = {
  "marketing-design": ["marketing", "brand", "agency", "artwork", "packaging", "campaign", "creative", "digital asset", "dam", "media", "cmi", "consumer insight", "nielsen", "content team"],
  "sales-gt": ["general trade", "gt", "distributor", "distributors", "retailer", "retailers", "beat", "beats", "sales rep", "sales reps", "reps", "field force", "asm", "asms", "saksham", "leap", "sfa", "dms", "outlet", "outlets"],
  "sales-nmt": ["modern trade", "mt", "nmt", "chain", "chains", "key account", "kam", "chain portal", "chain portals"],
  "sales-ecom": ["marketplace", "marketplaces", "amazon", "flipkart", "quick commerce", "q-commerce", "blinkit", "zepto", "e-commerce", "ecommerce", "e-com", "seller portal", "settlement", "settlements", "dark store", "dark stores", "pdp", "finifi", "platform", "platforms"],
  "sales-retail": ["retail store", "stores", "d2c", "loyalty", "pos", "footfall", "store manager", "store managers"],
  "supply-chain": ["supply chain", "ibp", "s&op", "warehouse", "warehouses", "warehousing", "depot", "depots", "cycle count", "cycle counts", "production plan", "production plans", "transport", "transporter", "transporters", "tms", "freight", "fill rate", "logistics", "plant", "plants", "inventory", "sustainability", "esg", "otif"],
  procurement: ["procurement", "sourcing", "rfq", "vendor", "vendors", "supplier", "suppliers", "buyer", "buyers", "spend", "accounts payable", "ap team"],
  finance: ["finance", "general ledger", "gl", "ledger", "bank", "mis", "consolidation", "bpc", "tax", "gst", "fp&a", "budget", "month-end", "close", "controller", "intercompany", "bw4hana", "sac", "journal", "workpaper", "workpapers"],
  "rnd-qa": ["r&d", "formulation", "formulations", "plm", "ennovia", "lims", "qc", "qa", "lab", "labs", "deviation", "deviations", "capa", "npd", "epd", "regulatory", "specification", "specifications"],
  hr: ["hr", "hcm", "successfactors", "payroll", "attrition", "recruitment", "employee", "employees", "headcount", "people analytics", "onboarding", "hrbp"],
};

/** §7.4 capability lexicon + systems dictionary. Ambiguous terms resolve by function. */
export const CAPABILITY_LEXICON: Record<string, string[]> = {
  "mkt-content-gen": ["content generation", "content production", "pdp content", "product content", "creative production", "content variants"],
  "mkt-perf-cmi": ["performance marketing", "marketing spend", "media spend", "campaign", "campaigns", "cmi", "consumer insight", "consumer insights", "nielsen", "marketing roi"],
  "mkt-artwork": ["artwork", "artworks", "packaging artwork"],
  "mkt-dam": ["digital asset", "digital assets", "dam", "asset library", "brand assets", "shared drive"],
  "sales-demand-forecasting": ["demand forecast", "demand forecasting", "forecast", "forecasts", "forecasting", "under-forecast", "under-forecasting", "forecast accuracy", "mape"],
  "sales-te": ["travel and expense", "t&e", "expense claims", "travel claims"],
  "sales-control-tower": ["control tower", "sct"],
  "gt-dms": ["dms", "leap", "distributor management", "secondary sales", "distributor claims"],
  "gt-sfa": ["sfa", "saksham", "order capture", "sales force automation", "field app"],
  "gt-reco-beat": ["recommendation", "recommendations", "beat plan", "beat plans", "beat planning", "beat optimisation", "beat optimization", "suggested sku"],
  "nmt-order-induction": ["purchase order", "purchase orders", "po", "pos", "order induction", "po receipt"],
  "ecom-order-induction": ["purchase order", "purchase orders", "po", "pos", "order induction", "po receipt"],
  "nmt-appointment": ["appointment", "appointments", "delivery slot", "slots", "slot booking"],
  "ecom-appointment": ["appointment", "appointments", "delivery slot", "slots", "slot booking"],
  "nmt-reconciliation": ["reconciliation", "reconciled", "reconcile", "deduction", "deductions", "claims", "chain statements"],
  "ecom-reconciliation": ["reconciliation", "reconciled", "reconcile", "settlement", "settlements", "deduction", "deductions", "claims"],
  "retail-store-mgmt": ["store operations", "store management", "store tasks", "store staffing"],
  "retail-oms": ["oms", "order management", "order routing", "fulfilment node"],
  "retail-loyalty": ["loyalty", "crm", "members", "member", "redemption", "redemptions"],
  "retail-analytics": ["retail analytics", "store performance", "basket", "sell-through"],
  "scm-ibp": ["ibp", "s&op", "integrated planning", "integrated business planning", "supply review", "demand review", "plan versions"],
  "scm-tms": ["tms", "transport", "transportation", "freight", "truck", "trucks", "load planning", "carrier", "carriers", "transporter", "transporters"],
  "scm-dashboard": ["fill rate", "fill-rate", "supply chain dashboard", "otif", "order fulfilment", "cuts"],
  mdm: ["master data", "mdm", "material master", "vendor master", "customer master", "duplicate vendor", "golden record"],
  "scm-sustainability": ["sustainability", "esg", "emissions", "energy", "water", "brsr"],
  "proc-sourcing": ["sourcing", "rfq", "rfqs", "supplier selection", "supplier onboarding", "negotiation", "negotiations"],
  "proc-analytics": ["spend analytics", "spend cube", "spend visibility", "procurement dashboard", "procurement dashboards", "category spend"],
  "proc-invoice-automation": ["vendor invoice", "vendor invoices", "invoice", "invoices", "ocr", "3-way match", "three-way match", "touchless", "invoice matching"],
  "fin-mis": ["mis", "management reporting", "mis pack", "power bi"],
  "fin-consolidation": ["consolidation", "bpc", "eliminations"],
  "fin-tax": ["tax", "gst", "e-invoicing", "dcs", "tax returns"],
  "fin-planning": ["budget", "budgets", "fp&a", "financial planning", "bw4hana", "sac", "rolling forecast"],
  "fin-te": ["travel and expense", "t&e", "expense claims", "travel claims", "expenses"],
  "fin-reconciliation": ["reconciliation", "reconciliations", "reconciled", "bank reconciliation", "intercompany", "workpapers", "open items"],
  "rnd-plm": ["plm", "formulation", "formulations", "specification", "specifications", "spec"],
  "rnd-tqms": ["tqms", "deviation", "deviations", "capa", "quality audit"],
  "rnd-lims": ["lims", "lab", "labs", "samples", "sap mii", "test results", "oos"],
  "rnd-npd-pm": ["npd", "epd", "stage-gate", "stage gate", "launch", "launches", "project tracking"],
  "hr-hcm": ["hcm", "successfactors", "employee records", "recruitment", "onboarding", "hr transactions"],
  "hr-analytics": ["people analytics", "hr analytics", "attrition", "headcount report", "hr dashboard", "people metrics"],
  "hr-payroll": ["payroll"],
};

/** Systems dictionary — named systems resolve straight to capabilities (§7.4). */
export const SYSTEMS: Record<string, string[]> = {
  leap: ["gt-dms"],
  saksham: ["gt-sfa"],
  bpc: ["fin-consolidation"],
  sac: ["fin-planning"],
  bw4hana: ["fin-planning"],
  ennovia: ["rnd-plm", "rnd-tqms"],
  "sap mii": ["rnd-lims"],
  successfactors: ["hr-hcm"],
  finifi: ["ecom-order-induction", "ecom-reconciliation"],
  "power bi": ["fin-mis"],
  "sap dcs": ["fin-tax"],
};

/** System names shown in process analysis (in addition to the dictionary above). */
export const SYSTEM_NAMES = ["SAP", "S/4HANA", "Leap", "Saksham", "BPC", "SAC", "BW4HANA", "Ennovia", "SAP MII", "SuccessFactors", "Finifi", "Power BI", "Excel", "IBP", "TMS", "WMS", "LIMS", "TQMS", "OMS", "DMS", "seller portal", "middleware"];

export interface LevelCue {
  cue: string;
  level: 1 | 2 | 3 | 4 | 5;
}

/** §7.5 generic level cues (process & data) */
export const LEVEL_CUES: LevelCue[] = [
  ...["excel", "spreadsheet", "spreadsheets", "manual", "manually", "email", "emailed", "e-mail", "offline", "re-key", "re-keyed", "rekey", "keyed", "paper", "by hand", "phone", "whatsapp", "printouts"].map((cue) => ({ cue, level: 1 as const })),
  ...["portal", "portals", "uploaded", "upload", "uploads", "digitised", "digitized", "sap entry", "template", "templates", "scanned", "macro", "macros", "bulk upload"].map((cue) => ({ cue, level: 2 as const })),
  ...["integrated", "integration", "api", "apis", "middleware", "single source of truth", "real-time sync", "edi", "synced", "syncs", "flows into", "flow into", "governed"].map((cue) => ({ cue, level: 3 as const })),
  ...["automated", "automatically", "auto-match", "auto-matching", "auto-matched", "alerts", "predictive", "forecast model", "rpa", "exception-based", "exceptions only", "rule-based", "touchless"].map((cue) => ({ cue, level: 4 as const })),
  ...["autonomous", "autonomously", "ai agent", "agentic", "self-learning", "closed-loop", "closed loop", "prescriptive", "self-correcting"].map((cue) => ({ cue, level: 5 as const })),
];

export const PEOPLE_LEVEL_CUES: LevelCue[] = [
  ...["dependent on it", "depend on it", "depends on it", "raise a ticket", "no training", "no formal training"].map((cue) => ({ cue, level: 1 as const })),
  ...["one-time training", "vendor training", "proficient", "standard reports"].map((cue) => ({ cue, level: 2 as const })),
  ...["trained", "power users", "power user", "self-serve", "role-based training"].map((cue) => ({ cue, level: 3 as const })),
  ...["champions", "champion network", "citizen developer", "citizen developers", "data literacy"].map((cue) => ({ cue, level: 4 as const })),
  ...["co-create", "co-creates", "upskilling culture"].map((cue) => ({ cue, level: 5 as const })),
];

export const AI_LEVEL_CUES: LevelCue[] = [
  ...["no ai", "awareness only"].map((cue) => ({ cue, level: 1 as const })),
  ...["pilot", "pilots", "poc", "proof of concept", "vendor demo", "experiment", "experiments"].map((cue) => ({ cue, level: 2 as const })),
  ...["in production", "live", "deployed", "recommendation engine", "copilot"].map((cue) => ({ cue, level: 3 as const })),
  ...["scaled", "model monitoring", "monitored", "ai governance", "governance board"].map((cue) => ({ cue, level: 4 as const })),
  ...["agentic", "ai agent", "autonomous", "self-learning", "closed-loop", "closed loop", "continuously learns"].map((cue) => ({ cue, level: 5 as const })),
];

/** §7.5 dimension cues */
export const DIMENSION_CUES: Record<Exclude<Dimension, "process">, string[]> = {
  ai: ["ml", "machine learning", "ml model", "ai model", "forecast model", "genai", "generative ai", "gen ai", "copilot", "recommendation engine", "ai", "llm", "agentic", "ai agent"],
  people: ["training", "trained", "champions", "champion", "dependent on it", "depend on it", "depends on it", "citizen developer", "citizen developers", "adoption", "skills", "upskilling", "power users", "data literacy", "active users"],
  data: ["dashboard", "dashboards", "report", "reports", "reporting", "data lake", "kpi", "kpis", "analytics", "visibility", "single source of truth", "single view", "plan versions", "versions of", "data quality", "completeness", "data model", "governed view", "governed record", "trended", "visible"],
};

/** §7.6 polarity */
export const PAIN_CUES = ["delay", "delays", "delayed", "rework", "mismatch", "mismatches", "no visibility", "not visible", "under-forecast", "under-forecasting", "leakage", "backlog", "errors", "error-prone", "escalation", "escalations", "missed", "not available", "cannot", "can't", "lack", "lacks", "duplicate", "duplicates", "do not reconcile", "parallel", "multiple versions", "re-key", "re-keyed", "keyed", "manually", "manual", "workaround", "workarounds", "pain", "frustrat", "slow", "only partially", "partial"];
export const STRENGTH_CUES = ["single view", "reduced", "improved", "faster", "real-time", "seamless", "single source of truth", "without re-entry", "no re-entry", "eliminated", "on time", "reached", "live for all"];

/** §7.7 negation window tokens */
export const NEGATIONS = ["not", "no", "never", "without", "yet to", "isn't", "aren't", "doesn't", "don't", "cannot", "lack", "lacks", "absent", "none"];
export const NEGATION_WINDOW = 3;

/** Cross-functional theme taxonomy (§7 interview intelligence) */
export const THEMES: { id: string; label: string; cues: string[]; requiresLevelAtMost?: number }[] = [
  { id: "manual-reconciliation", label: "Manual reconciliation", cues: ["reconciliation", "reconciled", "reconcile", "settlement", "deductions", "workpapers", "intercompany", "matched", "matching", "open items"], requiresLevelAtMost: 2 },
  { id: "data-re-entry", label: "Data re-entry", cues: ["re-key", "re-keyed", "keyed into", "re-entered", "re-entry", "keyed by"] },
  { id: "no-single-source", label: "No single source of truth", cues: ["multiple versions", "parallel plan", "parallel", "do not reconcile", "no single view", "no visibility", "not visible", "versions of the truth"] },
  { id: "forecast-accuracy", label: "Forecast accuracy", cues: ["under-forecast", "under-forecasting", "forecast accuracy", "mape", "forecast bias"] },
  { id: "master-data-quality", label: "Master data quality", cues: ["duplicate", "duplicates", "incomplete", "master data quality", "wrong master"] },
  { id: "approval-delays", label: "Approval delays", cues: ["approval", "approvals", "sign-off", "pending approval", "waiting for approval"] },
  { id: "low-tool-adoption", label: "Low tool adoption", cues: ["adoption", "active users", "not used", "rarely used", "acted on"] },
  { id: "agency-dependence", label: "Agency / IT dependence", cues: ["agency", "dependent on it", "depend on it", "depends on it", "vendor-led", "raise a ticket"] },
];

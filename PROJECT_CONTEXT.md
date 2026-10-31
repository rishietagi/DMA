# Project Context — Himalaya AI-enabled Digital Maturity Assessment (DMA) POC

> Read this before touching code. It explains *who* this is for, *why* it exists, and *what data* it is built on.

## 1. The engagement in one paragraph

KPMG (Digital Solutions – Strategy & Insights) is running a **Digital Maturity Assessment (DMA)** for **Himalaya** (Himalaya Wellness — FMCG / wellness / pharma). Himalaya already did a 2025 assessment the manual way: an IT-led, function-consulted exercise that scored ~41 capabilities on a 1–5 scale and produced heatmaps, priorities and a 2026-27 IT roadmap (in PowerPoint). Our POC shows **the art of the possible**: the *same* methodology, run as a **stepwise, AI-enabled assessment workbench** — evidence goes in, AI-assisted analysis comes out, KPMG practitioners validate, and executive outputs are generated.

**The POC must not look like the PPT.** We reuse its information (scale, parameters, capabilities, scores, priorities, roadmap) — not its visual style.

## 2. What the manager (Swati) asked for — the brief

Two messages from the engagement manager define scope. Paraphrased:

### A. "AI-enabled assessment capabilities" — AI improves how the DMA itself is conducted
| # | Capability | What it means in the product |
|---|---|---|
| 1 | Evidence ingestion | Analyse policies, strategy docs, process maps, architecture diagrams, KPI packs |
| 2 | Interview intelligence | Structure interview notes; surface recurring strengths, pain points, contradictions |
| 3 | Process analysis | Combine interview evidence with process + system info to find manual workarounds and fragmentation |
| 4 | Scoring support | Map evidence to defined maturity criteria; **flag scores lacking supporting evidence** |
| 5 | Cross-functional comparison | Normalise themes across Marketing, Sales, Supply Chain, Manufacturing, R&D, Finance, HR |
| 6 | Use-case generation | Translate maturity gaps into function-specific digital & AI opportunities |
| 7 | Prioritisation support | Compare value, feasibility, data readiness, dependencies, risk |
| 8 | Executive synthesis | Heatmaps, function scorecards, opportunity portfolios, roadmap views |

**Human validation remains essential** for scoring, benchmarking and recommendations. The existing Himalaya methodology already supports executive heatmaps, function scorecards, benchmark views, opportunity prioritisation, phased roadmaps and adoption plans — we are AI-enabling it, not replacing it.

### B. "Put an AI Evidence Analyzer around the diagnostic"
Instead of consultants manually reading every input, a **governed GenAI environment** supports:

**Inputs (9 evidence categories):**
1. Existing Himalaya self-assessment
2. Digital / IT strategy
3. Process documentation
4. Application landscape
5. Data architecture
6. Policies / SOPs
7. Transformation portfolio
8. Interview / workshop notes
9. KPI extracts

**AI-assisted analysis:**
- Classify evidence against **Process / People / Data** assessment criteria (we use the deck's 4 parameters — see §3)
- Identify repeated themes and maturity gaps
- Surface inconsistent evidence for consultant review
- Summarise function-level pain points
- Map evidence to predefined maturity criteria
- Generate an initial opportunity inventory

**Then:** KPMG practitioners validate the interpretation and the final maturity rating. → The UI must make the **AI-suggested → consultant-validated** handoff explicit.

## 3. The methodology we inherit (from Himalaya's 2025 DMA deck)

**Framing:** "Assessing how future-fit Himalaya is across functions — on process, data, AI and people." A function-level view of digital maturity tells whether Himalaya is future-fit and where to invest next.

**Four key parameters (our 4 scoring dimensions):**
| Dimension | Journey |
|---|---|
| Process Digitization | From manual workflows → autonomous processes |
| Data & Analytics | From spreadsheets → prescriptive insight |
| AI | From awareness → embedded intelligence |
| People Skills | From digitally dependent → digital innovators |

**Maturity scale (1–5, half-points allowed — the deck uses 1.5 and 2.5):**
| Level | Label |
|---|---|
| 1 | Excel & email driven (manual) |
| 2 | Digitized |
| 3 | Integrated |
| 4 | Automated & predictive |
| 5 | Autonomous & AI-driven |

**Methodology notes:** Led by IT, functions & partners consulted, vetted by an internal Himalaya reviewer (Jayashree). Output: roadmap & whitespaces aligned with each function.

**Divisions:** CPD (Consumer Products Division) is assessed and "ahead in digital maturity over Green Pharma (GP) and AHP, though many problems are common". GP and AHP are *not* seeded — show them as "Not started" to signal scale. *(Confirm AHP's expansion before using it in UI copy.)*

## 4. Baseline data (2025 self-assessment scores) — seeded in `seed/baseline-2025.json`

### CPD — Marketing & Sales channels (20 capabilities)
| Function | Capability (system) | Score |
|---|---|---|
| Marketing & Design | Content Generation (Agency) | 1 |
| | Performance Marketing & CMI | 2 |
| | Artwork Management | 2 |
| | Digital Asset Management | 2 |
| Sales — all channels (shared) | Demand Forecasting | 1.5 |
| | Travel & Expense | 3 |
| Sales — GT (+NMT, verify span) | Sales Control Tower | 3 |
| Sales — General Trade | DMS (Leap) | 3 |
| | SFA (Saksham) | 3 |
| | Product Recommendation & Beat Optimization | 5 |
| Sales — NMT | Order Induction | 2 |
| | Appointment | 1 |
| | Reconciliation | 1 |
| Sales — E-Commerce | Order Induction | 2 |
| | Appointment | 1 |
| | Reconciliation | 1 |
| Sales — Retail | Store Management | 3 |
| | Order Management System | 3 |
| | Loyalty Management | 3 |
| | Analytics | 3 |

### Enterprise functions (21 capabilities)
| Function | Capability (system) | Score |
|---|---|---|
| Supply Chain | Integrated Planning (IBP) | 2.5 |
| | Transportation Mgmt System | 2 |
| | Supply Chain Dashboard | 3 |
| | Sustainability | 2.5 |
| Supply Chain + Procurement (shared) | MDM (Material, Vendor) | 3 |
| Procurement | Sourcing & Procurement | 1.5 |
| | Procurement Analytics | 1 |
| | Vendor Invoice Automation | 2.5 |
| Finance | MIS Reporting (Excel / Power BI / S4HANA) | 1.5 |
| | Consolidation (SAP BPC) | 3 |
| | Tax & Compliance (SAP DCS) | 3 |
| | Financial Planning (BW4HANA) | 2 |
| | Travel & Expense | 1 |
| | Reconciliation | 1 |
| R&D / QA | PLM (Ennovia) | 3 |
| | TQMS (Ennovia) | 3 |
| | LIMS (SAP MII) | 3 |
| | NPD / EPD Project Management | 3 |
| HR | HCM (SuccessFactors) | 2 |
| | Analytics | 1 |
| | Payroll | 3 |

**Deck headline KPIs (enterprise functions):** 2.3 average maturity · 21 capabilities across 5 enterprise functions · 43% at level 2 or below · 0 at level 5.
✅ Verified: the 21 enterprise scores above average 2.26 (→ 2.3) and 9/21 = 42.9% (→ 43%) are ≤2. **This is the engine's first acceptance test.**

## 5. 2026 Priorities (from deck) — "The gap is not technology investment; it is scaled adoption"
1. **End-to-end platform integration for E-com / NMT** — automate order induction, appointments and reconciliation end-to-end
2. **Marketing spend at PG level** — SKU / PG / channel granularity missing in marketing spend, hurting decisions
3. **AI-driven content generation & PDP** — content at scale using AI; artwork management revamp
4. **Demand forecasting** — under-forecasting constantly impacting fill rate
5. **Fill rate** — single source of truth; improve customer fill rate and root-cause analysis

Closing line: "Clear growth-focused prioritisation."

## 6. Existing IT roadmap 2026-27 (seeded in `seed/roadmap-2026-27.json`)
Legend in deck: Completed / In progress / Planned (read from border colours on a photo — **verify**).

**Sales / Marketing:** Marketing — Omni-channel Market Share (Nielsen, 1DS, POS), Artwork Management, AI-driven Content Generation, Generative Engine Optimization, AI-driven PDP Improvement, Consumer Insights (all in progress). GT — SCT Adoption (completed), Demand Forecasting (in progress). Modern Trade — Demand Forecasting (in progress), Platform Integration (planned). E-Com — Split of QC/EC (completed), Platform-level Demand Forecasting (in progress), Platform Integration: Finifi (in progress), Global E-Comm P&L (planned). Retail/D2C — D2C Revamp (planned).

**Enterprise:** SCM — Order Fulfilment & Fill Rate (in progress), TQMS Revamp — audit req. (planned), IBP (completed), Sustainability Reporting (in progress). Procurement — Procurement Dashboards (in progress), Strategic Sourcing & Supplier Onboarding (completed), Vendor Invoice Automation (in progress). Finance — Monthly MIS @ SKU/PG/Category, FP&A (SAP SAC), Travel & Expense, Global Statutory Consolidation (all planned). HR — AI-driven Recruitment (completed). R&D & QA — NPD Process Improvement (completed), NPD Project Management (completed), PLM Revamp (planned). Cross-cutting — Master Data Management: Customer, Vendor, Material (in progress).

⚠️ **Discrepancy to resolve:** the enterprise slide headline says "14 initiatives — 5 delivered, 4 in flight, 5 committed", but the tiles read as 16 (5 / 5 / 6). Ask the deck owner which statuses are correct before showing the client.

**Why the roadmap matters to the product:** a capability with a maturity gap and **no mapped initiative is a whitespace** (the deck's "Roadmap & whitespaces"). From the seed, candidate whitespaces include Digital Asset Management, Transportation Mgmt System, Finance Reconciliation and HR Analytics. The initiative→capability mapping in the seed is *our proposal* — confirm it.

## 7. The questionnaire pattern
Another engagement's SAP-blueprint questionnaires (MM / SD / PP-MES workbooks) were shared **only as a structural reference**: each workbook has an **L1 process chain banner** (e.g. Presales → Sales Order Processing → Pricing & Contracts → Delivery & Dispatch → Billing → Returns), **L2 process sections**, numbered **questions**, and a **client response column**.

We reuse that *structure*, re-written for Himalaya's functions and tagged for scoring (dimension, capability, level-mapped options). **Never copy that other client's content, names or questions into this repo.** See `seed/question-bank.sample.json` and `docs/SCORING_ENGINE.md §4`.

## 8. Demo story (what the client should feel)
1. "I upload my documents and interview notes, and within minutes I see evidence mapped to every capability."
2. "The AI proposes a score, shows *why* (quotes, sources, confidence) and flags where my self-assessment isn't backed by evidence."
3. "My consultant validates or overrides with a rationale — nothing is a black box."
4. "Gaps turn into prioritised, function-specific AI use cases, sequenced into a roadmap that shows what's already planned and where the whitespaces are."
5. "I get a boardroom-ready synthesis in one click."

**Designed tension for the demo (synthetic, clearly labelled):** most evidence-based scores land within ±0.5 of the 2025 self-assessment, but a few deliberately diverge — e.g. *Product Recommendation & Beat Optimization* self-scored 5, evidence suggests ~3.5 (recommendations exist, but rep adoption is partial and there's no closed-loop learning). **Validate these demo variances with Swati before any client showing** — we must not appear to contradict the client's own scores with invented facts.

## 9. Guardrails
- **Synthetic data only** in the repo (demo evidence docs, interview notes, KPI extracts are fabricated and labelled "Illustrative"). Real Himalaya documents stay out of git (`/private` is gitignored) and out of any public deployment.
- **No real LLM calls in the POC.** Everything "AI" is a deterministic engine + simulated agent trace behind an `AIProvider` interface, so a real model can drop in later.
- A subtle **"Demo mode · simulated AI"** badge stays visible — it protects KPMG if the build is forwarded.
- KPMG / Himalaya logos: don't embed brand assets unless provided by the team; use text wordmarks.

## 10. People
- **Swati Mehta** — engagement manager; owns the brief above.
- **Ashish** — partner.
- **Jayashree** — Himalaya-side reviewer who vetted the 2025 assessment (name appears in the deck).

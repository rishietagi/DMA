# Build Plan — Himalaya AI-enabled DMA Workbench (POC)

## 0. Product in one line
A stepwise **assessment workbench** where evidence and interviews go in, an (simulated) AI analyst maps them to Himalaya's 4-dimension × 5-level maturity criteria, a deterministic engine scores them with evidence and confidence, KPMG consultants validate, and the app generates gaps → use cases → roadmap → executive synthesis.

## 1. Architecture

```
Next.js 15 (App Router, TS strict)
├─ UI: Tailwind v4 + shadcn/ui + lucide + Recharts (shadcn charts) + framer-motion
├─ State: Zustand (persist to localStorage) for the assessment session; TanStack Query for API calls
├─ API: Next.js route handlers (/api/*) — thin, call the engine
├─ Engine: src/lib/engine/*  ← PURE TypeScript, no React, no I/O, 100% unit-tested (Vitest)
│    rubric · indicators → dimension scores · gating · confidence · flags
│    aggregation · KPIs · gaps · prioritisation · whitespace · use-case rules · roadmap phasing
├─ Evidence classifier: src/lib/classifier/*  ← deterministic NLP (lexicons + rules), runs on uploaded text
│    file parsing: unpdf (PDF), mammoth (DOCX), papaparse (CSV), plain text/markdown
├─ AI layer: src/lib/ai/*  ← AIProvider interface
│    MockProvider = classifier + engine + scripted, streamed "agent steps" (SSE)
│    LLMProvider  = stub, throws "not configured" (phase 2: RAG / LLM drop-in)
└─ Data: /seed/*.json (baseline, roadmap, rubric, question bank, use-case rules)
         /public/demo-evidence/* (synthetic docs, notes, CSVs — labelled Illustrative)
```

**Why stateless API + client persistence (no DB):** deploys anywhere (Vercel/local) with zero setup, and the engine stays the single source of truth. Repository interface (`src/lib/store/repo.ts`) so Postgres/Supabase can replace it later.

**Key architectural principle (carry into phase 2):** AI *proposes indicators and evidence*; the **deterministic engine is always the arbiter** of the score; the **consultant has the final word**. This is what makes the scoring defensible to a client.

## 2. Screens — the assessment journey

> **Superseded 2026-11-02.** The app is now a 4-step flow — Scope → Gather inputs → Review levels → Results — rating
> L1 processes of one function on the 0–5 ladder (`docs/SCORING_ENGINE.md §11`, `LOG.md §5`). The 10-screen design
> below, the demo script in §5 and the shell description are kept for history.

Global shell: left rail = 8-stage **journey stepper** with status dots; top bar = engagement switcher (Himalaya · CPD ▾ · FY26 DMA), command palette (⌘K), "Demo mode · simulated AI" badge, theme toggle. Right-side **Agent Console** drawer shows live agent step traces ("Reading Ecom_O2C_SOP.md… 14 evidence items… 2 contradictions") on every AI action.

| # | Route | Screen | Swati capability | Core content |
|---|---|---|---|---|
| 0 | `/` | **Engagement Cockpit** | — | Journey progress, KPI tiles (avg maturity, % ≤2, # at L4+, evidence coverage, items awaiting validation), "Run guided assessment" CTA, recent agent activity, division cards (CPD active; GP/AHP not started) |
| 1 | `/scope` | **Scope & Framework** | — | Function → capability tree (toggle in/out of scope), 4-dimension rubric explorer (level cards per dimension), dimension weights sliders (live recalculation), target ambition per capability |
| 2 | `/evidence` | **Evidence Hub** | 1 Evidence ingestion | 9 category dropzones; doc list with parse status; "Analyze with AI" → streamed agent trace; extracted **evidence cards** (quote highlighted, source + location, function, capability, dimension, level signal, strength/pain); **coverage matrix** function × evidence category with gaps highlighted |
| 3 | `/interviews` | **Interview Intelligence** | 2 Interview intelligence | Tab A *Questionnaire*: function picker → L1 chain banner as a stepper → L2 sections → question cards with level-mapped option chips + notes + "who answered". Tab B *Notes*: paste/upload notes → themes board: Strengths · Pain points · Contradictions, with stakeholder attribution and links to evidence |
| 4 | `/process` | **Process Lens** | 3 Process analysis | Per function, L1 chain as a horizontal flow; each step shows systems, digitization level chip, manual-workaround badges, handoffs, data re-entry points; **fragmentation index** per function |
| 5 | `/scoring` | **Scoring Workbench** | 4 Scoring support | Capability × dimension grid with AI-suggested scores; columns for self-assessment, evidence score, Δ variance, confidence, flags, status. Click a cell → side sheet: score breakdown (indicators, weights, gating), evidence trail with citations, confidence ring, flags ("lacks evidence", "inconsistent"), **Accept / Override (rationale required)**. Bulk-accept high-confidence |
| 6 | `/compare` | **Compare & Themes** | 5 Cross-functional comparison | Heatmap function × dimension; radar per function; **normalised themes** across functions (e.g. "manual reconciliation" in Finance, NMT, E-com) with counts; self vs evidence scatter |
| 7 | `/opportunities` | **Opportunity Studio** | 6 Use-case gen · 7 Prioritisation | Generated use cases (from gap rules) as cards/table; **value × feasibility 2×2** (bubble = gap size, colour = data readiness); filters; each card shows gap addressed, data readiness, dependencies, risk, linked roadmap initiative |
| 8 | `/roadmap` | **Roadmap & Whitespaces** | 7 · 8 | Now / Next / Later swimlanes by function; overlay existing 2026-27 initiatives (completed / in progress / planned) vs **whitespaces** and "accelerate" flags; dependency lines (MDM → forecasting → fill rate) |
| 9 | `/synthesis` | **Executive Synthesis** | 8 Executive synthesis | Boardroom view: templated narrative headline, KPI tiles, heatmap, function scorecards, top-5 priorities, opportunity portfolio, roadmap strip; export to PDF (print stylesheet) |

## 3. Design direction (must NOT look like the PPT)
- **Feel:** a modern analytics product (Linear / Vercel dashboard / Stripe-level polish), not a consulting slide. Dense but calm.
- **Base:** shadcn "zinc" neutrals, light default + dark mode. One accent (deep cobalt/indigo) for actions and AI moments; AI-generated content gets a subtle gradient border + sparkle icon so "AI" is visible at a glance.
- **Maturity colour:** a sequential single-hue ramp (L1 light → L5 deep) for heatmaps, with an optional RAG toggle for execs. Never colour alone — always show the number.
- **Type:** Geist Sans / Geist Mono (numbers tabular). Big numerals for KPIs.
- **Motion:** framer-motion for streamed agent steps, score count-ups, cards entering. Respect `prefers-reduced-motion`.
- **Components:** shadcn Card, Tabs, Sheet, Dialog, Command, Table (+ TanStack Table), Badge, Progress, Slider, Tooltip, HoverCard, Sonner toasts, Chart. Custom: `MaturityChip`, `ConfidenceRing`, `HeatmapGrid`, `EvidenceCard`, `AgentTrace`, `JourneyStepper`, `PriorityMatrix`, `RoadmapSwimlane`.
- **Empty / loading states** are designed, not defaults (skeletons, illustrated empty states).

## 4. Phases & acceptance criteria

### Phase 0 — Foundation (do first, in plan mode)
- Scaffold Next 15 + TS strict + Tailwind v4 + shadcn; ESLint/Prettier; Vitest.
- Load seed JSON with zod schemas (`src/lib/schema.ts`); fail fast on bad seed.
- Engine core: rubric, aggregation, KPIs, rounding.
- ✅ **Acceptance:** unit test reproduces deck KPIs from seed — enterprise avg **2.26 → "2.3"**, **42.9% → "43%"** ≤ L2, **0** at L5, 21 capabilities.

### Phase 1 — The core story
- App shell, journey stepper, theme, Agent Console (scripted).
- Cockpit, Scope & Framework, Scoring Workbench (with validate/override flow), Executive Synthesis.
- Synthetic questionnaire answers (`seed/demo-responses.json`) → engine → evidence-based scores.
- ✅ Changing a dimension weight or overriding a score updates Workbench, KPIs and Synthesis instantly.

### Phase 2 — Evidence & interviews
- Evidence Hub with real file upload → parse → deterministic classifier → evidence items → feed engine.
- 6–8 synthetic demo documents across the 9 categories (labelled Illustrative), preloadable via "Load demo evidence".
- Interview Intelligence: full question bank for all 10 functions (8–15 questions each, generated from the pattern in `seed/question-bank.sample.json`); notes → themes / contradictions.
- ✅ Uploading a new .docx/.pdf containing e.g. "reconciliation is done manually in Excel every week" creates an evidence item on the right capability with a level-1 Process signal and moves the score.

### Phase 3 — Insight to action
- Process Lens, Compare & Themes, Opportunity Studio (use-case rules + prioritisation), Roadmap & Whitespaces.
- ✅ Whitespace list includes capabilities with gap ≥1 and no mapped initiative (DAM, TMS, Finance Reconciliation, HR Analytics given the seed).

### Phase 4 — Demo polish
- "Run guided assessment" tour: one click walks stages 2→9 with the Agent Console narrating (≈3 min).
- Print-to-PDF synthesis, keyboard shortcuts, responsive down to 1280px (laptop demo) and readable on a projector.
- Lighthouse a11y ≥ 90; no console errors.

## 5. Demo script (≈7 minutes)
1. Cockpit → "We're assessing CPD + enterprise functions; here's last year's self-assessment baseline."
2. Evidence Hub → Load demo evidence → Analyze → watch the agent classify 9 input types; show coverage gaps ("no KPI extract for HR").
3. Interviews → E-com questionnaire; paste notes → contradictions surface ("Ecom head says POs are auto-ingested; SOP says manual portal download").
4. Scoring → Product Recommendation: self 5 vs evidence 3.5, low-adoption evidence, consultant overrides to 3.5 with rationale.
5. Compare → "manual reconciliation" is a cross-functional theme (Finance, NMT, E-com).
6. Opportunities → "Agentic marketplace reconciliation" is a quick win; Roadmap shows Finifi integration in progress → *accelerate*; Finance Reconciliation is a whitespace.
7. Synthesis → one-click boardroom view → export.

## 6. Out of scope for the POC
Real LLM / RAG, auth, multi-tenant, real client data, persistence beyond the browser, PPT export (PDF only).

## 7. Phase-2-of-the-engagement notes (if the POC lands)
- Swap `MockProvider` for `LLMProvider`: RAG over the evidence store (chunk → embed → retrieve per capability × criterion → LLM returns `{indicatorId, level, quote, location}` JSON), engine unchanged.
- Governance: citations mandatory, PII redaction on ingest, audit log of every AI suggestion and human decision, data stays in client/KPMG tenant.
- Persistence: Postgres (Supabase) with the existing repo interface.

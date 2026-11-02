# LOG.md — working log and handover

> Read this first in a new session. It is the running memory of the project: what exists, how to run it,
> the decisions taken and why, and what is still open. Append to "Session log" at the bottom after each
> working session. Deeper references: `CLAUDE.md` (rules), `PROJECT_CONTEXT.md` (client and brief),
> `PLAN.md` (screens and phases), `docs/SCORING_ENGINE.md` (scoring spec; §10 lists every deviation).

## 1. What this is

A proof of concept for KPMG: an AI-enabled **Digital Maturity Assessment (DMA) workbench** for the client
Himalaya. It re-runs Himalaya's 2025 self-assessment (41 capabilities, 1–5 scale, 4 areas: process, data,
AI, people) as an evidence-based tool. Documents and interviews go in, a **deterministic engine** suggests
scores with reasons, a consultant accepts or overrides, and the app produces gaps, use cases, a roadmap and
an executive summary.

**Since 2026-11-02 the UI is a 4-step demo** (Scope → Gather inputs → Review levels → Results) that rates the
L1 processes of one function on the client's **Level 0–5 ladder**. The capability engine still runs underneath.

- **No real AI or LLM calls.** All "AI" is rules plus scripted narration behind an `AIProvider` interface.
  A "Demo mode · simulated AI" badge is always visible.
- **All demo data is synthetic** and labelled Illustrative. Never commit real client files (`private/` is
  git-ignored).

## 2. Status (2026-11-02)

- **Built:** phases 0–4 from `PLAN.md §4`, a simplification pass, Vercel prep, then (2026-11-02) a **rebuild into
  4 steps** on the client's Level 0–5 ladder. The 10-screen workbench is gone; old URLs redirect.
- **Tests:** all green.
  - typecheck, lint, `seed:check`;
  - 130 Vitest unit tests (capability engine untouched, plus process ladder, mapping and demo-pack acceptance);
  - 6 Playwright e2e tests (upload lowers Transportation, change needs a reason and reaches Results, every
    step's visuals + details sheet, questionnaire + own question move the level, old links redirect, guided demo);
  - Lighthouse accessibility 100 on all 4 routes in light and dark;
  - 0 console errors in dev.
- **Git:** 7 local commits on `master`. **No remote yet** — the user pushes to GitHub themselves, then deploys
  on Vercel (steps in `README.md`; no env vars needed).
- **Local server:** the user may have `pnpm dev` running on http://localhost:3000.

## 3. Environment and commands

- Use the **existing conda env `it-smo`** (Node 20.20.2 + corepack). **Do not create a new env.**
  - In Git Bash: `export PATH="/c/miniconda/envs/it-smo:$PATH"`, then run pnpm as `corepack pnpm …`
    (pnpm 10.18.3 is pinned in `packageManager`).
- Windows quirk: when passing `/route` arguments to node scripts in Git Bash, prefix `MSYS_NO_PATHCONV=1`.

```bash
corepack pnpm dev                 # localhost:3000
corepack pnpm typecheck && corepack pnpm lint && corepack pnpm test
corepack pnpm seed:check
PORT=3000 corepack pnpm exec playwright test   # reuses a dev server on that port; default port 3100
corepack pnpm build               # don't run while a dev server is using .next
```

Dev scripts in `scripts/`:

| Script | What it does |
|---|---|
| `calibrate.ts` | Self vs evidence score per capability |
| `demo-evidence-report.ts` | What the demo pack does to scores, contradictions, themes and whitespaces |
| `qa-screenshots.mjs` | Screenshots the 4 steps in light + dark, reports console errors (`QA_LOAD_DEMO=1` loads the demo pack first; `QA_OUT` sets the folder) |
| `a11y-audit.mjs` | Lighthouse accessibility per route |
| `print-results.mjs` | Renders Results to PDF (should be 1 page) |
| `time-tour.mjs` | Times the guided demo at real speed (`node scripts/time-tour.mjs http://localhost:3000`) |
| `make-fixtures.mjs` | PDF/DOCX upload fixtures for e2e |

## 4. Stack and layout

**Stack:** Next.js 15.5 App Router, React 19.1, TypeScript strict, Tailwind v4, hand-written shadcn-style
UI on Radix, framer-motion 12.43, Recharts 2.15, Zustand (persisted to localStorage), TanStack
Table/Query, zod 3, unpdf / mammoth / papaparse, Vitest, Playwright, Geist font.

```
src/lib/engine/        PURE scoring engine (no React, fetch, Date.now or randomness) + tests
  config.ts            every tunable constant
  dimension.ts         raw → gated → final, confidence, dimension flags
  assess.ts            single entry point assess(input) → result
  aggregate.ts         capability / function scores, KPIs
  prioritise.ts        target, gap, value, feasibility, risk, priority, quadrant, alignment
  usecases.ts          rule matching, topological sort, Now/Next/Later phasing with prerequisite pull-forward
  format.ts            all display rounding (formatScore = half-points, formatMean = 1 dp, formatPct)
  process.ts           0–5 process ladder: crosswalk, weighted score, confidence, flags, ideas + phasing (§11)
src/lib/classifier/    deterministic evidence classifier (lexicons, negation, polarity, themes, contradictions)
src/lib/ai/            AIProvider, MockProvider, LLMProvider stub, scripted agent steps, SSE client
src/lib/store/         Zustand session store (function, processes, target, quick check, evidence, validations), repo seam
src/lib/process-input.ts   session → process-ladder input: L1 chain, capability/sentence → process mapping
src/lib/process-why.ts     one-line "why this level"
src/lib/actions.ts         upload / demo pack / agent narration, liveResult()
src/app/               4 steps: / · inputs · review · results + api/{agent,classify}; old routes redirect (next.config.ts)
src/components/dma/    ladder.tsx (LevelChip, LadderChart), charts.tsx (radar, bars, compare, distribution), kpi-strip,
                       process-chain (chain + coverage), findings, interview-board, process-sheet, signal-plot,
                       area-heatmap, idea-matrix, process-roadmap, QuoteRow, ConfidenceRing, provenance
src/lib/process-lens.ts    per-step systems / manual work / hand-offs; process-areas.ts; narrative.ts
src/components/shell/  top bar with 4-step stepper, StepNav (Back/Next), Agent Console
src/components/tour/   guided tour (steps.ts + provider)
seed/                  baseline, rubric, roadmap, question-bank.json (full; supply chain has l1Keywords),
                       usecase-rules.json (29 rules), demo-responses.json (Illustrative; incl. quickCheck)
public/demo-evidence/  12 synthetic docs (strategy, e-com SOP, supply-chain ops SOP, finance close, app
                       landscape CSV, data architecture, policies, portfolio CSV, KPI CSV, 3 interviews)
```

## 5. Screens (what each does)

One function at a time (L0 dropdown, Supply chain by default), assessed through its **L1 processes** on the
**0–5 ladder** from the client slide: L0 Digitized · L1 Connected · L2 Real-time · L3 Visibility · L4 Predictive ·
L5 Autonomous.

| Step | Route | What it shows |
|---|---|---|
| 1 Scope | `/` | 10 function cards (2025 level bar), L1 process cards with the capabilities each owns, target level + meaning, snapshot KPIs, the ladder, 2025 baseline bars per capability, 2026 priorities and roadmap items for the function |
| 2 Gather inputs | `/inputs` | Tabs. **Questionnaire:** per process, the overall question + every question-bank question (options on the ladder, demo answers pre-filled) + **your own questions** (add / answer / delete), live "level now". **Documents & quick check:** one drop zone + Load demo pack, one dropdown per process, coverage matrix (process × document type, what's missing). **What the AI found:** KPIs, process chain (level, systems, manual work, hand-offs, strengths/pains per step), filterable quote feed. **Interviews:** strengths / pain points, where sources disagree, recurring themes, paste notes |
| 3 Review levels | `/review` | Summary strip (progress, level distribution, confidence mix, flags); per process AI level, why, confidence, flags, Sources, **Details** sheet (signal plot, calculation table, capabilities × area, quotes, history), Accept / Change (reason required) / Undo, Accept all; audit trail |
| 4 Results | `/results` | Narrative summary, 7 KPIs, ladder, radar (today / target / 2025), 2025-vs-today bars, gap table with roadmap status, area heatmap, value × ease idea matrix + detail, roadmap swimlanes (planned today, gaps with nothing planned, Now / Next / Later, dependency arrows), all functions compared; prints over a few A4 pages |

Old routes redirect: `/scope` → `/`; `/evidence`, `/interviews`, `/process` → `/inputs`; `/scoring`,
`/compare` → `/review`; `/opportunities`, `/roadmap`, `/synthesis` → `/results`.

**Global:**
- **Top bar:** 4-step stepper, "Demo mode · simulated AI" badge, **Guided demo**, agent console, reset demo,
  shortcuts, theme. No sidebar, no ⌘K palette, no Simple/Detailed switch.
- **Guided demo.** 4 beats, about 70 s: picks Supply chain → loads the demo pack → changes Transportation to L1
  with a reason and accepts the rest → shows Results.
- **Shortcuts.** `1`–`4` (steps), `.` (agent console), `T` (theme), `?` (help).
- **URL params.** `?theme=dark` forces the theme; `?tourSpeed=0.05` speeds up the tour (tests).

## 6. Scoring logic (short version)

**What the UI shows (process ladder, `SCORING_ENGINE.md §11`):** per L1 process, a weighted mean of the
quick-check answer (weight 3 × 0.85), every sentence placed on that process (crosswalked, weight × source
reliability) and the 2025 self score of the capabilities it owns (× 0.5). Crosswalk engine 1–5 → ladder
`(e − 1) × 1.25`. A process sits on `round(score)`; gap = target − level. Flags: "No documents yet",
"Sources disagree" (spread ≥ 2.5). Ideas come from the same use-case rules, via the process's capabilities
or `when.steps`.

**The capability engine underneath** (unchanged, still tested):

- **Indicators.** Each questionnaire answer and each extracted sentence becomes an indicator with a level
  (1–5), a weight (1–3) and source reliability: artefact / KPI / system 1.0, questionnaire 0.85,
  interview 0.8, the 2025 self score 0.5.
- **Raw score** = reliability-weighted mean of the indicator levels.
- **Gated score.** You can't claim level n without proof of its foundation, e.g. L3 needs
  `process.system_integration` evidence.
- **Final score** = gated rounded to the half-point.
- **Capability score** = weighted blend of the 4 areas (process 35 / data 25 / AI 20 / people 20).
  The effective score is the consultant's override if there is one.
- **Confidence** = 0.4 · coverage + 0.3 · agreement + 0.3 · quality. Bands: high ≥ 0.75, medium ≥ 0.5.
- **Flags:**
  - Not enough proof (LACKS_EVIDENCE)
  - Sources disagree (INCONSISTENT)
  - Differs from 2025 (SELF_VARIANCE)
  - Held back by a missing basic (GATED)
  - Some document types missing (LOW_COVERAGE)
- **Priority** = 100 × gap/4 × (0.5 · value + 0.3 · feasibility + 0.2 · (6 − risk)) / 5.
- **Alignment:**
  - Whitespace = gap ≥ 1 and no initiative.
  - Accelerate = gap ≥ 2 and the initiative is planned or in progress.
- **Phasing.** Now ≥ 45, Next ≥ 25. Dependencies are respected; prerequisites are pulled forward.

## 7. Key decisions and deviations (details in `docs/SCORING_ENGINE.md` §10)

1. **The 2025 self score is one low-weight indicator per area.** Baseline mode reproduces the deck exactly:
   enterprise 21 capabilities, mean 2.2619 → "2.3", 43% ≤ 2, 0 at L5 (acceptance test).
2. **Gating only applies when there is non-self evidence.** A higher gate met at its own level implies the
   foundation gate.
3. **LACKS_EVIDENCE is judged per capability, not per area.**
4. **Accept follows the live AI score; override pins the score.**
5. **Phasing thresholds were lowered from 60/40 to 45/25.** With gaps ≤ 3, nothing reached "Now".
6. **Accelerate also covers in-progress initiatives.** This matches the demo script (Finifi).
7. **Confidence coverage.** When questions only expect interviews (People), any evidence counts as coverage.
8. **CSV rows are one segment each.**
9. **Display is in half-points.** A single document usually moves an area score rather than the rounded
   capability score; the upload toast reports area-level moves.
10. **The UI is hand-written shadcn-style** (no CLI).
11. **The 4-step flow replaces the workbench (2026-11-02).** The user found the 10 screens "so content heavy"
    and asked for 4 steps on their slide's 0–5 ladder, one function, L0 → L1 only. Decisions they confirmed:
    use the slide's 0–5 scale; remove the old screens (not hide them).
12. **0–5 crosswalk is linear** (`(e − 1) × 1.25`) — a demo choice; see `SCORING_ENGINE.md §11.2`.
13. **Classifier keeps function-only sentences** (no capability match) so Warehousing gets evidence (§10 #19).

## 8. Demo data facts (Illustrative)

- **Deliberate variances vs 2025:**
  - gt-reco-beat 5 → ~3.5;
  - sales-control-tower 3 → ~2.5;
  - proc-invoice-automation 2.5 → ~3.0.
- **Two designed contradictions:**
  - e-com PO induction: Head of E-commerce says automated vs the SOP/KPI saying manual;
  - IBP plan: Supply Chain Planning Lead vs Finance Controller.
- **"Manual reconciliation"** recurs in Finance, NMT and E-com. **HR has no KPI extract** (designed coverage gap).
- **Whitespaces** (baseline and evidence mode): mkt-dam, scm-tms, fin-reconciliation, hr-analytics.
- **After loading the demo pack:** about 11 high-confidence capabilities; 35/41 within ±0.5 of the 2025 score.
- **Supply chain on the ladder (target L3):** workshop pack only → overall L2; after the demo pack → overall
  **L1**: Demand planning L2 (sources disagree), Supply & production planning L2, Warehousing L1,
  Transportation **L0**, Order fulfilment L3 (on target), Sustainability L1. Ideas in Now: TMS optimisation,
  ESG data capture, digital warehouse. New doc: `SCM_Warehouse_and_Logistics_SOP.md` (Illustrative).

## 9. Open items

- **Agree the demo variances with Swati before any client showing.**
- **Confirm with the deck owner:** roadmap statuses (14 vs 16 initiatives), the initiative → capability
  mapping, Sales Control Tower span, and AHP naming.
- **Deploy:** the user pushes to GitHub and deploys on Vercel. If pnpm version issues appear, set
  `ENABLE_EXPERIMENTAL_COREPACK=1`. Consider Deployment Protection.
- **Confirm the 0–5 crosswalk** with the deck owner (the slide's ladder vs the 1–5 rubric).
- **Only supply chain has rich demo data.** Other functions work (their L1 chains and capabilities are mapped) but
  have no quick-check answers and sparser quotes.
- **Possible next asks:** process-specific wording in the quick-check options, real LLM provider (PLAN §7),
  persistence (Supabase via the repo seam).

## 10. Session log

- **2026-10-31 — session 1**
  - Built phases 0–4 in order (see the `CLAUDE.md` progress log).
  - **User feedback: "too populated, not understandable to a layman".** Response:
    - added the Simple (default) / Detailed switch;
    - plain-language intro on every screen;
    - "Why this score";
    - jargon renamed;
    - simpler layouts for Opportunities, Roadmap, Evidence and Compare.
  - Explained every screen in plain words to the user, and gave them a casual walkthrough to show their manager.
  - Prepared for Vercel:
    - `engines` node ≥ 20.9;
    - `maxDuration` 30 s on the agent and classify routes;
    - 4 MB upload cap;
    - `.vercel` ignored;
    - README deploy section.
  - Verified with a clean clone: frozen install, build, then a production smoke test of all API routes.
  - Created this LOG.md.

- **2026-11-02 — session 2: 4-step rebuild**
  - **User feedback:** "so much content for no reason"; wanted 4 steps (evidence + interviews combined), one
    function like supply chain, L0 → L1 process dropdowns, the slide's Level 0–5 ladder as the final output,
    "short and sweet", for a demo.
  - Planned in plan mode; the user approved and chose the 0–5 ladder and removing the old screens.
  - Built: `engine/process.ts` + tests, `lib/process-input.ts` + acceptance tests, new store (v2 key, old
    sessions reset), 4 pages, top-bar stepper, `LadderChart` / `LevelChip`, 4-beat guided demo, redirects,
    print fit to one page, phone layout (stepper wraps to its own row).
  - Seeds: `l1Keywords` for supply chain, `quickCheck` answers, `uc-wms-visibility` rule (`when.steps`);
    classifier lexicon + function-only fallback; new Illustrative supply-chain SOP.
  - Removed: 9 routes, `/api/assess`, sidebar, command palette, cockpit, capability sheet, heatmap, matrices,
    swimlanes, narrative / explain-score / process-lens.
  - Verified: typecheck, lint, 117 unit, 4 e2e, seed check, a11y 100 × 8, tour 69 s, Results PDF = 1 page.

- **2026-11-02 — session 2b: filled the 4 steps back in**
  - **User feedback on the minimal version:** "there's nothing at all… no visualization… use whatever was there
    last time also." Kept the 4 steps and the 0–5 ladder; restored depth inside them (see §5).
  - The provider now runs **both engines**: process ladder (headline) + capability engine (areas, value / ease /
    risk, initiatives). New pure helpers in `engine/process.ts` (shares, distribution, fallback idea scores,
    alignment, self level) + tests; `process-lens.ts`, `process-areas.ts`, `narrative.ts` rewritten for processes.
  - Verified: typecheck, lint, 126 unit, 5 e2e, a11y 100 × 8, 0 console errors, no horizontal scroll at 390 px.
  - **Lesson:** the user wants simple *flow* (few steps, plain words) but rich *content and visuals* within it.

- **2026-11-02 — session 2c: questionnaire and own questions**
  - User: "the questions answering and then adding whatever question we want is not captured".
  - Added the Questionnaire tab (see §5); answers and custom questions are scored as `question` indicators
    (`SCORING_ENGINE.md §11.1`). Store: `responses` back (seeded), `customQuestions` (persisted).
  - Demo data: scm-q06 answer 2 → 1 ("Phone and Excel with transporters") to match the documents, so
    Transportation still lands on L0 after the demo pack. After the guided demo (Transportation changed to L1,
    rest accepted) supply chain reads **Level 2** overall.


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

- **No real AI or LLM calls.** All "AI" is rules plus scripted narration behind an `AIProvider` interface.
  A "Demo mode · simulated AI" badge is always visible.
- **All demo data is synthetic** and labelled Illustrative. Never commit real client files (`private/` is
  git-ignored).

## 2. Status (2026-10-31)

- **Built:** phases 0–4 from `PLAN.md §4`, plus a simplification pass and Vercel prep.
- **Tests:** all green.
  - typecheck, lint, `seed:check`;
  - 93 Vitest unit tests;
  - 4 Playwright e2e tests (evidence upload, whitespaces, dependency order, guided tour);
  - Lighthouse accessibility 100 on all 10 routes in light and dark;
  - 0 console errors in dev and production.
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
| `qa-screenshots.mjs` | Screenshots every route in light + dark, reports console errors (`QA_LOAD_DEMO=1` loads demo evidence first) |
| `a11y-audit.mjs` | Lighthouse accessibility per route |
| `print-synthesis.mjs` | Renders the synthesis to PDF |
| `time-tour.mjs` | Times the guided tour at real speed |
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
src/lib/classifier/    deterministic evidence classifier (lexicons, negation, polarity, themes, contradictions)
src/lib/ai/            AIProvider, MockProvider, LLMProvider stub, scripted agent steps, SSE client
src/lib/store/         Zustand session store, buildInput(), repo seam
src/lib/explain-score.ts   plain-language "Why this score"
src/lib/narrative.ts       templated executive narrative
src/lib/process-lens.ts    process-step analysis
src/app/               10 routes + api/{assess,agent,classify}
src/components/dma/    MaturityChip, ConfidenceRing, HeatmapGrid, MaturityField, CapabilitySheet,
                       EvidenceCard, CoverageMatrix, PriorityMatrix, RoadmapSwimlane, explain.tsx
                       (PageIntro / InfoTip / DetailOnly)
src/components/shell/  sidebar, top bar (Simple/Detailed switch), ⌘K palette, Agent Console
src/components/tour/   guided tour (steps.ts + provider)
seed/                  baseline, rubric, roadmap, question-bank.json (full), usecase-rules.json (28 rules),
                       demo-responses.json (Illustrative)
public/demo-evidence/  11 synthetic docs (strategy, e-com SOP, finance close, app landscape CSV,
                       data architecture, policies, portfolio CSV, KPI CSV, 3 interviews)
```

## 5. Screens (what each does)

| Route | Screen | What it does |
|---|---|---|
| `/` | Overview | Headline numbers; grid of the 41 capabilities (lens: 2025 / evidence / after review); biggest disagreements |
| `/scope` | Scope & framework | Capabilities in scope, target per capability, area-weight sliders (live), meaning of each level |
| `/evidence` | Evidence hub | Upload into 9 categories or load the demo pack; sentence-level classification; "what's still missing" |
| `/interviews` | Interview intelligence | Questionnaire (answers are levels, rescore live); notes → strengths, pain points, contradictions |
| `/process` | Process lens | Per-team process steps: level, systems, manual workarounds, hand-off score |
| `/scoring` | Scoring workbench | Capability table; sheet with "Why this score", evidence, calculation, flags, history; accept / override (rationale required); bulk accept |
| `/compare` | Compare & themes | Team × area heatmap; problems shared across teams (detailed view adds radar + scatter) |
| `/opportunities` | Opportunity studio | Gap rules → ranked ideas with value / ease / risk (detailed view adds the 2×2 matrix) |
| `/roadmap` | Roadmap & whitespaces | Now / Next / Later; gaps with nothing planned; projects to speed up (detailed view adds swimlanes + dependency arrows) |
| `/synthesis` | Executive synthesis | One-page summary, export to PDF via print stylesheet |

**Global:**
- **Simple / Detailed switch.** Simple is the default, added because the user found the UI too dense.
- **Guided tour.** About 2¾ min; stages 2→9; does a real override of reco-beat to 3.5 with a rationale.
- **Shortcuts.** Ctrl/⌘K, `G` + `H`/`1`–`9`, `.` (agent console), `T` (theme), `?` (help).
- **URL params.** `?theme=dark` forces the theme; `?tourSpeed=0.05` speeds up the tour (tests).

## 6. Scoring logic (short version)

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
10. **The UI is hand-written shadcn-style** (no CLI). Deep links: `/scoring?cap=…&dim=…`,
    `/opportunities?uc=…`, `/roadmap?uc=…`, `/interviews?tab=notes`, `/compare?fn=…`.

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

## 9. Open items

- **Agree the demo variances with Swati before any client showing.**
- **Confirm with the deck owner:** roadmap statuses (14 vs 16 initiatives), the initiative → capability
  mapping, Sales Control Tower span, and AHP naming.
- **Deploy:** the user pushes to GitHub and deploys on Vercel. If pnpm version issues appear, set
  `ENABLE_EXPERIMENTAL_COREPACK=1`. Consider Deployment Protection.
- **Possible next asks:** further simplification of specific screens, real LLM provider (PLAN §7),
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

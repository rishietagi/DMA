# CLAUDE.md — Himalaya AI-enabled DMA Workbench (POC)

KPMG POC for Himalaya: a stepwise, AI-enabled Digital Maturity Assessment workbench. Front-end quality is the priority; the back end is a **deterministic** engine that *looks* AI-powered (art of the possible). No real LLM calls.

**Read first:** `LOG.md` (running handover log — current status, env, decisions, open items). Then, as needed: `PROJECT_CONTEXT.md` → `PLAN.md` → `docs/SCORING_ENGINE.md` → `seed/*.json`.

**Keep `LOG.md` up to date:** append to its "Session log" at the end of every working session.

## Workflow
- Plan before code. For any phase or multi-file change: enter plan mode, propose the plan, wait for approval.
- Work in the phase order in `PLAN.md §4`. Don't start a phase until the previous phase's acceptance criteria pass.
- After each phase: run `pnpm typecheck && pnpm lint && pnpm test`, then update the **Progress log** at the bottom of this file (date, what shipped, open issues).
- Small, reviewable commits with conventional messages (`feat(scoring): …`).

## Stack
- Next.js 15 App Router · TypeScript `strict` · pnpm
- Tailwind CSS v4 · shadcn/ui (zinc base) · lucide-react · framer-motion · Recharts via shadcn `chart`
- Zustand (persisted session state) · TanStack Query · TanStack Table · zod
- File parsing: `unpdf`, `mammoth`, `papaparse`
- Tests: Vitest (engine + classifier), Playwright smoke test for the guided demo (phase 4)

## Commands
```
pnpm dev          # local dev
pnpm build        # production build
pnpm typecheck    # tsc --noEmit
pnpm lint
pnpm test         # vitest run
pnpm seed:check   # validate seed/*.json against zod schemas
```

## Layout
```
src/
  app/                    # 4 steps: / (scope) · inputs · review · results (old routes redirect)
    api/                  # route handlers: classify, agent (SSE)
  components/
    ui/                   # shadcn generated — don't hand-edit beyond theming
    dma/                  # LevelChip + LadderChart (0–5 ladder), ConfidenceRing, QuoteRow, provenance
  lib/
    engine/               # PURE scoring engine — capability engine + process.ts (0–5 ladder) — see rules below
    classifier/           # deterministic evidence classifier (lexicons + rules)
    ai/                   # AIProvider interface, MockProvider, LLMProvider stub, scripted agent steps
    store/                # zustand session store + repo interface
    schema.ts             # zod schemas for all seed + domain types
seed/                     # baseline, roadmap, rubric, question bank, use-case rules, demo responses
public/demo-evidence/     # synthetic documents (labelled Illustrative)
docs/SCORING_ENGINE.md    # the scoring spec — source of truth for engine behaviour
private/                  # gitignored — real client files never committed
```

## Non-negotiable rules
1. **Engine is pure.** `src/lib/engine` has no React, no fetch, no Date.now(), no randomness. Same input → same output. Every exported function has unit tests. Behaviour must match `docs/SCORING_ENGINE.md`; if you need to deviate, update the spec in the same change and say why.
2. **AI is simulated behind an interface.** All "AI" goes through `AIProvider`. `MockProvider` composes classifier + engine and streams scripted step events with small delays. Never call an external model. Never hard-code a score in UI — UI renders engine output.
3. **Every AI output is explainable.** Any suggested score shows its indicators, evidence quotes with source + location, confidence, and flags. Every human override requires a rationale and is stored with before/after.
4. **Synthetic data only.** Demo evidence, interview notes and KPI extracts are invented and labelled "Illustrative". Never commit real client documents. Never include content from other clients' questionnaires — structure only.
5. **The UI rates L1 processes on the 0–5 ladder** (Digitized → Autonomous, `SCORING_ENGINE.md §11`); the capability engine underneath stays 1–5 and is crosswalked. Keep full precision internally; a process sits on `ladderLevel(score)`. Results use *validated* levels where they exist, else AI-suggested.
6. **Don't make it look like the PPT.** No full-width green banners, no slide-style tile walls. Follow `PLAN.md §3`.
7. **Keep the "Demo mode · simulated AI" badge** visible in the shell.

## UI conventions
- Use shadcn primitives first; build custom components in `components/dma/` only when no primitive fits.
- Colour tokens as CSS variables in `globals.css`: `--maturity-1 … --maturity-5`, `--ai-accent`, `--confidence-high|med|low`. Dark mode for every token.
- Numbers: `font-variant-numeric: tabular-nums`. Always show the numeric score next to any colour.
- AI-generated surfaces: gradient hairline border + `Sparkles` icon + "AI suggested" label until validated; validated → solid border + `ShieldCheck` "Validated by <name>".
- Loading: skeletons, never spinners alone. Streaming agent steps render line by line in `AgentTrace`.
- Copy: consulting-grade, concise, sentence case. No lorem ipsum.
- Accessibility: keyboard navigable grid, focus rings, aria labels on charts, reduced-motion support.

## Domain vocabulary
- **Function (L0)**: marketing-design, sales-gt, sales-nmt, sales-ecom, sales-retail, supply-chain, procurement, finance, rnd-qa, hr
- **Process (L1)**: a step of a function's `l1Chain` (e.g. supply-chain → Warehousing). The 4-step flow scores these on the **ladder** L0–L5. No L2/L3 in the UI.
- **Quick check**: one interview answer per process, on the ladder.
- **Capability**: scored unit (e.g. `ecom-reconciliation`). May span functions (`functionIds`), has one `primaryFunctionId`.
- **Dimension**: process · data · ai · people
- **Indicator**: a question or evidence signal that yields a level 1–5 for (capability, dimension)
- **Evidence item**: quote + source doc + location + tags (function, capability, dimension, levelSignal, polarity)
- **Self score**: Himalaya 2025 self-assessment (baseline). **Evidence score**: engine output. **Validated score**: consultant decision.
- **Whitespace**: capability with gap ≥ 1 and no mapped roadmap initiative.

## Progress log
<!-- Append after each phase: YYYY-MM-DD — phase — what shipped — open issues -->
- 2026-10-31 — Phase 0 — Next 15 + TS strict + Tailwind v4 scaffold (pnpm 10 via corepack in the existing `it-smo` conda env, Node 20.20); zod schemas for all seeds + `pnpm seed:check`; pure engine (`src/lib/engine`: config, rubric, dimension scoring raw→gated→final, confidence, flags, aggregation, KPIs, prioritisation, use cases, phasing, format); full question bank (10 functions, 8–13 Qs) and 28 use-case rules generated from the samples; `seed/demo-responses.json` (Illustrative); 69 Vitest tests incl. deck-KPI acceptance (21 caps, 2.2619→"2.3", 43%, 0 at L5). Open: spec deviations logged in SCORING_ENGINE.md §10.
- 2026-10-31 — Phase 1 — App shell (journey stepper with status dots, Himalaya/CPD switcher, Ctrl/⌘K palette, keyboard shortcuts, theme toggle, "Demo mode · simulated AI" badge, docked Agent Console streaming SSE steps from `/api/agent`); Cockpit (maturity-field hero: 41 capabilities re-coloured by lens self / AI evidence / validated, KPI strip, variance list, journey, divisions); Scope (scope switches, targets, live weight sliders with impact, rubric explorer with gates + crosswalk); Scoring workbench (TanStack table, explainability sheet with raw→gated→final, indicators + quotes + sources, confidence ring, flags, history; Accept / Override with mandatory rationale; bulk-accept high-confidence); Executive synthesis (templated narrative, heatmap, scorecards, priorities, portfolio, roadmap strip, print-to-PDF). `/api/assess`, `/api/agent`, AIProvider + MockProvider + LLMProvider stub; deterministic classifier landed early (needed by MockProvider). Visual direction: zinc neutrals, cobalt action accent, indigo→violet gradient hairline for AI, blue single-hue maturity ramp with RAG toggle. Open: few high-confidence scores until evidence is loaded (by design).
- 2026-10-31 — Phase 2 — Evidence hub (9 category dropzones, real upload of PDF/DOCX/CSV/MD/TXT via `/api/classify` using unpdf / mammoth / papaparse, agent-narrated analysis, document list, function × category coverage matrix with expected-evidence gaps, filterable evidence cards with highlighted cues); deterministic classifier (§7) incl. negation window, polarity, theme taxonomy, contradictions, recurring themes, process-analysis helpers; 11 synthetic Illustrative demo documents in `public/demo-evidence` (strategy, e-com SOP, finance close/MIS, app landscape CSV, data architecture, policies, portfolio CSV, KPI CSV, 3 interviews) with 2 designed contradictions (e-com PO induction; IBP plan) and no HR KPI extract; Interview intelligence (questionnaire with L1 chain stepper + level-mapped option chips that rescore live; notes → Strengths / Pain points / Contradictions board; paste-to-classify). Acceptance: unit + Playwright e2e — uploading a PDF with "Reconciliation is done manually in Excel every week" creates an L1 process item on fin-reconciliation and moves its Process score 2.0 → 1.5; negation tests pass. Open: capability-level display is half-point, so a single document typically moves a dimension (shown in toast + grid) rather than the rounded capability score; spec §10 #16–17 added.
- 2026-10-31 — Phase 3 — Process lens (L1 chain per function with digitisation level, systems, manual workarounds, hand-offs, re-entry, fragmentation index across functions); Compare & themes (keyboard heatmap with RAG toggle, radar vs all functions, theme × function matrix from the taxonomy, self vs current scatter); Opportunity studio (accessible SVG value × feasibility matrix — size = gap, colour = data readiness — with use-case detail: gap addressed, data readiness, dependencies, risk, roadmap link; ranked table); Roadmap & whitespaces (function swimlanes: existing 2026-27 initiatives with accelerate / revisit flags and hatched whitespaces next to Now / Next / Later use cases, drawn dependency arrows with chain highlighting, dependency-chain list). Use-case library at 28 rules (all 10 functions). Acceptance: unit + e2e — baseline whitespaces exactly mkt-dam, scm-tms, fin-reconciliation, hr-analytics; no use case placed before its dependency. Open: initiative statuses / mapping still to verify with the deck owner (shown in UI copy).
- 2026-10-31 — Phase 4 — "Run guided assessment" tour (stages 2→9, 9 steps following PLAN §5: loads evidence, surfaces contradictions, opens reco-beat sheet and overrides 5→3.5 with rationale, bulk-accepts high-confidence, themes, use case, whitespaces, synthesis); narrates into the Agent Console, spotlights the element under discussion, pause/back/next/exit, Esc pauses; 166 s at real speed. Print-to-PDF synthesis (print stylesheet, A4 landscape); keyboard shortcuts (Ctrl/⌘K, G+H/1–9, ., T, ?); `?theme=` switch; reduced motion (MotionConfig + CSS). QA: every route screenshotted at 1280 and 1440 in light + dark, fixes applied (coverage overflow, radar, process chain fit, matrix overlap, roadmap fit at 1280, narrative grammar, row flag noise); Lighthouse accessibility 100 on all 10 routes in both themes; 0 console errors in dev and production; Playwright e2e (4 tests incl. tour smoke) green; production build green. Open: verify deck statuses/mapping and demo variances with Swati before any client showing; capability display is half-point so single documents usually move a dimension rather than the rounded capability score.
- 2026-10-31 — Simplification pass — Simple view (default) vs Detailed view switch in the top bar; every screen opens with a plain-language intro ("what this is / what to do / how this works"); jargon replaced (e.g. flags → "Sources disagree", "Not enough proof"; Δ self → "Change"; whitespace → "Gap with nothing planned"; fragmentation index → "Hand-off score"; stage gates explained in plain words); Scoring shows 6 plain columns and a generated "Why this score" summary per capability (built only from engine output) with the calculation folded away; Evidence shows "What's still missing" instead of the matrix; Opportunities shows a ranked idea list instead of the 2×2; Roadmap shows Now / Next / Later columns instead of swimlanes; Compare lists shared problems in sentences. Detailed view keeps everything from phases 1–4. Tests updated; all unit + e2e green.
- 2026-11-02 — 4-step rebuild — User asked for something far simpler for the demo: 4 steps, evidence + interviews merged, one function at a time (L0 → L1 processes), and the client slide's Level 0–5 ladder as the final output. Shipped: **Scope** (function dropdown, L1 process chips, target, ladder) → **Gather inputs** (one drop zone + demo pack, one quick-check dropdown per process) → **Review levels** (AI level + one-line why + quotes; accept / change with reason; accept all) → **Results** (headline, staircase ladder with processes and target, gap table, Now/Next/Later ideas, one-page A4 print). New pure `engine/process.ts` (crosswalk, weighted score, confidence, flags, ideas + phasing) and `lib/process-input.ts` (mapping); classifier keeps function-only sentences; `l1Keywords` + Warehousing rule + quick-check answers in seeds; new Illustrative supply-chain SOP. Removed 9 old routes (redirected), sidebar, ⌘K palette, Simple/Detailed switch. Guided demo is 4 beats, 69 s. 117 unit + 4 e2e green; Lighthouse a11y 100 on all 4 routes, light + dark. Open: the 1–5 → 0–5 crosswalk is a demo choice (§11.2) — confirm with the deck owner.
- 2026-11-02 — 4 steps, filled back in — User found the 4-step version too empty ("no visualization… use whatever was there last time"). Kept the 4 steps and the 0–5 ladder; brought the old workbench's depth back inside them, with the capability engine running alongside the process ladder. **Scope:** function cards with 2025 bars, process cards with owned capabilities, target explainer, snapshot KPIs, ladder, 2025 baseline bars, 2026 priorities + roadmap. **Gather inputs:** tabs — documents & quick check + coverage matrix; "What the AI found" (KPIs, process chain with systems / manual work / hand-offs, filterable quote feed); interviews (strengths / pain points board, where sources disagree, paste notes). **Review:** summary strip (progress, level distribution, confidence mix, flags), Details sheet per process (signal plot, calculation table, capability × area, quotes, history), audit trail. **Results:** narrative summary, 7-KPI strip, ladder, radar, 2025-vs-today bars, gap table with roadmap status, area heatmap, value × ease idea matrix with detail, roadmap swimlanes with dependency arrows and gaps with nothing planned, cross-function comparison. 126 unit + 5 e2e green; a11y 100 × 8; no horizontal scroll at 390 px.
- 2026-11-02 — Questionnaire + your own questions — Gather inputs gets a **Questionnaire** tab: pick a process, answer the overall question and every question-bank question for it (options shown on the ladder, demo answers pre-filled), and **add your own questions** (text, area, importance, answer on L0–L5; delete any time). Answers are a new `question` indicator in `engine/process.ts` (weight × 0.85) and move the level live; bank answers also feed the capability engine. Signal plot, calculation table and "why" line show them. Demo answer to "How are transport loads planned" aligned with the documents (Phone and Excel). 130 unit + 6 e2e green; a11y 100 × 8.


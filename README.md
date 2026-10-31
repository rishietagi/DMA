# Himalaya AI-enabled DMA — Claude Code startup pack

## What's in here
| File | Purpose |
|---|---|
| `CLAUDE.md` | Standing instructions for Claude Code (stack, rules, conventions, progress log) |
| `PROJECT_CONTEXT.md` | Client, brief from Swati, inherited methodology, all baseline scores, priorities, roadmap, guardrails |
| `PLAN.md` | Architecture, the 10 screens, design direction, phases with acceptance criteria, demo script |
| `docs/SCORING_ENGINE.md` | Rule-based scoring spec grounded in open frameworks (JRC DMAT, acatech, SIRI, MITRE AI MM, TM Forum, CMMI) + deterministic classifier + RAG note |
| `seed/baseline-2025.json` | 10 functions, 41 capabilities with 2025 self scores, 2026 priorities |
| `seed/roadmap-2026-27.json` | 31 initiatives with status + proposed capability mapping, dependencies |
| `seed/rubric.json` | Level descriptors and gates for the 4 dimensions + framework crosswalk |
| `seed/question-bank.sample.json` | Question pattern (level-mapped options) — Claude Code expands to all functions |
| `seed/usecase-rules.sample.json` | 12 gap → use-case rules — Claude Code expands to ~25 |
| `KICKOFF_PROMPT.md` | Prompt 1 (Phase 0) + prompts for Phases 1–4 |

## How to start
1. `mkdir himalaya-dma && cd himalaya-dma && git init`
2. Copy everything in this pack into the repo root (keep `docs/` and `seed/` folders).
3. Add `private/` to `.gitignore` before anything else.
4. Run `claude`, switch to plan mode, paste **Prompt 1** from `KICKOFF_PROMPT.md`.
5. Review the plan, approve, and move phase by phase.

## Verify with the team before a client showing
- Roadmap statuses (enterprise slide says 14 / 5-4-5, tiles read 16 / 5-5-6).
- Initiative → capability mapping in `roadmap-2026-27.json` (our proposal).
- Sales Control Tower span (GT only, or GT + NMT) and AHP's expansion.
- The deliberate demo variances (e.g. Product Recommendation 5 → 3.5) — fine as illustrative, but agree them with Swati.

## Running the workbench

Uses the existing `it-smo` conda env (Node 20.20 + corepack → pnpm 10). No new environment is needed.

```bash
conda activate it-smo            # or: export PATH="/c/miniconda/envs/it-smo:$PATH"
corepack pnpm install
corepack pnpm dev                # http://localhost:3000
corepack pnpm typecheck && corepack pnpm lint && corepack pnpm test
corepack pnpm seed:check
corepack pnpm exec playwright test   # e2e incl. guided-tour smoke test (starts dev on :3100)
```

Demo flow: open the Cockpit → **Run guided assessment** (top bar, ≈ 3 min, narrated in the Agent Console), or
Evidence hub → **Load demo evidence**. `?theme=dark` forces the theme; `Ctrl/⌘ K` opens the palette; `?` lists shortcuts.

Dev tools: `scripts/calibrate.ts` (self vs evidence per capability), `scripts/demo-evidence-report.ts` (what the demo pack
does to scores, contradictions, themes), `scripts/qa-screenshots.mjs` (every route, light + dark, console errors),
`scripts/a11y-audit.mjs` (Lighthouse accessibility per route), `scripts/print-synthesis.mjs` (synthesis → PDF),
`scripts/time-tour.mjs`, `scripts/make-fixtures.mjs` (PDF/DOCX upload fixtures for e2e).

# Scoring Engine Spec — rule-based, deterministic, explainable

Source of truth for `src/lib/engine` and `src/lib/classifier`. All formulas are deterministic; all constants live in `src/lib/engine/config.ts` so they can be tuned in one place (and some are exposed in the Scope screen).

---

## 1. Open frameworks this borrows from (and what we take from each)

| Framework | What it is | What we borrow |
|---|---|---|
| **EU JRC Digital Maturity Assessment Tool (DMAT)** — used by the European Digital Innovation Hubs | Questionnaire across 6 dimensions (digital business strategy, digital readiness, human-centric digitalisation, data management, automation & AI, green); each dimension scored 0–100, each question 0–10 | **Transparent arithmetic** from question → dimension → overall; we show a **0–100 index** alongside the 1–5 level for exec readability. Its "Human-centric" and "Automation & AI" dimensions map to our People and AI. |
| **acatech Industrie 4.0 Maturity Index** (2017, updated 2020) | Six successive stages (computerisation → connectivity → visibility → transparency → predictive capacity → adaptability) across four structural areas (resources, information systems, organisational structure, culture); capabilities built incrementally | **Stage gating** — you can't credibly claim level *n* while level *n−1* foundations are missing. Our 5 levels line up with its progression (Digitized≈connectivity, Integrated≈visibility/transparency, Automated & predictive≈predictive capacity, Autonomous≈adaptability). |
| **Smart Industry Readiness Index (SIRI)** — Singapore EDB / INCIT | 3 building blocks (process, technology, organisation), 8 pillars, 16 dimensions, each with 6 maturity bands; plus a **Prioritisation Matrix** (TIER) | **Band descriptors as an assessment matrix** (our `seed/rubric.json`) and **prioritisation logic** that weighs today's state, impact and essential objectives — our priority score. |
| **MITRE AI Maturity Model** (public guide, built on CMMI appraisal practice) | 6 pillars, 20 dimensions, 5 levels (Initial → Adopted → Defined → Managed → Optimized); not every org needs level 5 everywhere | **AI dimension sub-criteria** (strategy, data, tech enablers, organisation, responsible use, performance) for AI questions; **target maturity per capability** rather than "5 everywhere". |
| **TM Forum Digital Maturity Model** | 5 dimensions (customer, strategy, technology, operations, culture/people/org), sub-dimensions → criteria → characteristics for each of 5 phases, scored 1–5 | **Criteria with per-level characteristics** = our questions whose options each map to a level. |
| **CMMI appraisal practice (SCAMPI)** | Ratings rest on objective evidence: artefacts + affirmations (interviews) | **Evidence weighting and the "lacks evidence" flag** — a score backed only by self-assertion is low confidence. |
| **Gartner AI Maturity Model** (proprietary, widely cited) | 5 levels: Awareness → Active → Operational → Systemic → Transformational | Language for the AI dimension level descriptors. |

Links:
- JRC DMAT FAQ: https://european-digital-innovation-hubs.ec.europa.eu/sq/node/7909 · Questionnaire PDF: https://european-digital-innovation-hubs.ec.europa.eu/system/files/2024-05/DMA%20Questionnaire%20for%20SMEs_EDIH_network_EN_0.pdf
- acatech Maturity Index (Update 2020, free PDF): https://en.acatech.de/publication/industrie-4-0-maturity-index-update-2020/
- SIRI white paper + prioritisation matrix: https://www.edb.gov.sg/SIRI
- MITRE AI Maturity Model guide: https://mitre.org/sites/default/files/2023-11/PR-22-1879-MITRE-AI-Maturity-Model-and-Organizational-Assessment-Tool-Guide.pdf
- TM Forum DMM (GB997): https://tmforum.org/resources/standard/gb997-digital-maturity-model-r17-0-1

**Positioning line for the client:** "Himalaya's 4-parameter, 5-level model, made evidence-based using the gating logic of acatech, the band-descriptor matrix and prioritisation approach of SIRI, the AI criteria of MITRE, and the evidence discipline of CMMI appraisals."

---

## 2. Data model (zod in `src/lib/schema.ts`)

```ts
type Dimension = 'process' | 'data' | 'ai' | 'people';
type Level = 1 | 2 | 3 | 4 | 5;
type SourceType = 'artifact' | 'kpi' | 'system' | 'interview' | 'questionnaire' | 'self_assessment';

interface Indicator {           // one question OR one evidence signal
  id: string;
  capabilityId: string;
  dimension: Dimension;
  level: Level | null;          // null = "don't know / N/A" → ignored, but counts against coverage
  weight: 1 | 2 | 3;            // question importance
  sourceType: SourceType;
  sourceRef?: { docId: string; location?: string; quote?: string; stakeholder?: string };
  gateKey?: string;             // marks a must-have criterion (see §3.3)
}

interface DimensionScore {
  capabilityId: string; dimension: Dimension;
  raw: number; gated: number; final: number;   // final = rounded to 0.5
  confidence: number;                          // 0..1
  confidenceBand: 'high' | 'medium' | 'low';
  flags: Flag[];
  contributing: Indicator[];                   // for the explainability sheet
}

type Flag =
  | { kind: 'LACKS_EVIDENCE'; reason: string }
  | { kind: 'INCONSISTENT'; reason: string; indicatorIds: string[] }
  | { kind: 'SELF_VARIANCE'; self: number; evidence: number }
  | { kind: 'GATED'; cappedAt: number; missingGate: string }
  | { kind: 'LOW_COVERAGE'; missing: SourceType[] };
```

---

## 3. Scoring a (capability, dimension)

### 3.1 Source reliability `r`
| sourceType | r | rationale |
|---|---|---|
| artifact (SOP, architecture doc, process map) | 1.00 | direct objective evidence |
| kpi / system (KPI extract, app landscape) | 1.00 | direct objective evidence |
| questionnaire (answered by function owner in workshop) | 0.85 | structured affirmation |
| interview (notes) | 0.80 | affirmation |
| self_assessment (2025 baseline score) | 0.50 | self-reported, unevidenced |

### 3.2 Raw score
```
raw = Σ(wᵢ · rᵢ · levelᵢ) / Σ(wᵢ · rᵢ)        over indicators with level ≠ null
```
If no indicators exist except the self-assessment → raw = self score, and `LACKS_EVIDENCE` is raised.

### 3.3 Stage gating (acatech / CMMI style)
`seed/rubric.json` defines must-have **gates** per dimension level, e.g. Process L3 requires gate `process.system_integration` (an indicator with that `gateKey` at level ≥ 3); L4 requires `process.rule_automation`; Data L3 requires `data.single_source_of_truth`.
```
gateCap = highest level L such that every gate for levels 2..L is satisfied (or has no indicator → not satisfied)
        + 0.5 if at least half the indicators for level gateCap+1 are at ≥ gateCap+1
gated  = min(raw, gateCap)          (if no gates defined for a dimension, gated = raw)
```
If `gated < raw` → `GATED` flag ("Capped at 2.5 — no evidence of system integration").

### 3.4 Rounding
`final = round(gated × 2) / 2`, clamped to [1, 5]. Index (0–100) = `(final − 1) / 4 × 100`.

### 3.5 Confidence (0–1)
```
coverage   = |distinct objective source types present (artifact|kpi|system)| / expected   (expected from question bank, default 2), capped at 1
agreement  = 1 − min(1, stdev(levels) / 2)
quality    = mean(rᵢ) over contributing indicators
confidence = 0.40·coverage + 0.30·agreement + 0.30·quality
band       = high ≥ 0.75 · medium ≥ 0.50 · low < 0.50
```

### 3.6 Flags
| Flag | Rule |
|---|---|
| `LACKS_EVIDENCE` | band = low, **or** no artifact/kpi/system indicator at all |
| `INCONSISTENT` | any two indicators on the same (capability, dimension) differ by ≥ 2 levels and at least one is objective; list both |
| `SELF_VARIANCE` | \|capability evidence score − self score\| ≥ 1.0 |
| `LOW_COVERAGE` | an expected evidence category for that function has zero items |
| `GATED` | see 3.3 |

---

## 4. Questions → indicators (the questionnaire pattern)

Each function has an **L1 process chain** (banner) → **L2 process sections** → **questions**. Every question is tagged so it becomes an indicator:

```json
{
  "id": "ecom-q04",
  "l2": "Reconciliation",
  "text": "How are marketplace settlements, deductions and claims reconciled against invoices?",
  "dimension": "process",
  "capabilityIds": ["ecom-reconciliation"],
  "weight": 3,
  "gateKey": "process.system_integration",
  "options": [
    {"level": 1, "label": "Manually in Excel from downloaded portal reports"},
    {"level": 2, "label": "Templates/macros; settlement files uploaded to SAP"},
    {"level": 3, "label": "Integrated feed from marketplace into SAP via middleware"},
    {"level": 4, "label": "Auto-matching with rules; only exceptions to the team"},
    {"level": 5, "label": "AI agent reconciles, raises disputes and learns from outcomes"}
  ],
  "evidenceExpected": ["process_docs", "kpi_extracts", "application_landscape"]
}
```
Rules for writing the bank (Claude Code generates the full bank for 10 functions):
- 8–15 questions per function; every in-scope capability gets ≥ 1 question per dimension it's scored on (Process and Data mandatory; AI and People at least at function level).
- Function-level People/AI questions use `capabilityIds: ["*"]` → applied to every capability of that function.
- Options are concrete, observable states — not "low/medium/high".
- Always allow "Don't know / N/A" (level null).

---

## 5. Aggregation

| Level | Formula |
|---|---|
| **Capability score** | `Σ w_d · final_d` with default weights process 0.35 · data 0.25 · ai 0.20 · people 0.20 (normalised over dimensions actually scored). Weights editable on Scope screen → live recalculation. |
| **Capability confidence** | weighted mean of dimension confidences (same weights) |
| **Effective score** | validated score if consultant validated/overrode, else evidence score |
| **Function score** | mean of effective capability scores where function ∈ `functionIds` (shared capabilities count in each function they span), optionally weighted by `criticality` (1–3) |
| **Division / enterprise KPIs** | over **unique** capabilities in scope: average, % ≤ 2.0, count ≥ 4.0, count = 5.0, count with `LACKS_EVIDENCE`, count awaiting validation |

**Baseline mode:** with no indicators loaded, engine runs on self scores only. ✅ Must reproduce the deck: enterprise 21 caps, mean 2.2619 → "2.3", 9/21 = 42.9% → "43%", 0 at L5.

---

## 6. Gap, prioritisation, whitespace

### 6.1 Target and gap
`target` per capability from seed (default: 4 for capabilities linked to a 2026 priority, 3.5 for revenue-facing functions, 3 otherwise). `gap = max(0, target − effective)`.

### 6.2 Value, feasibility, risk (each 1–5, deterministic rules)
```
value       = 2
            + 2 if linked to a 2026 priority
            + 1 if function is revenue-facing (sales-*, marketing-design)
            + 1 if interviews/evidence tag a pain point on this capability (≥2 pain items)
            (cap 5)
feasibility = 1 + round(dataScore)            // Data dimension score as data readiness proxy, 1..5 → 2..6 capped 5
            − 1 if an unmet dependency exists (see seed dependencies, dependency capability effective < 3)
            + 1 if a roadmap initiative is in progress/completed for it
            (clamp 1..5)
risk        = 1 + (1 if dimension People ≤ 2) + (1 if confidence band low) + (1 if cross-functional, >2 functions)
```

### 6.3 Priority score (0–100) — SIRI-TIER-inspired
```
priority = 100 × (gap / 4) × (0.5·value + 0.3·feasibility + 0.2·(6 − risk)) / 5
quadrant = value ≥ 3.5 && feasibility ≥ 3 → "Quick win"
         | value ≥ 3.5                   → "Strategic bet"
         | feasibility ≥ 3               → "Fill-in"
         | else                          → "Deprioritise"
```

### 6.4 Whitespace & roadmap alignment
| Status | Rule |
|---|---|
| `WHITESPACE` | gap ≥ 1 and no initiative maps to the capability |
| `ACCELERATE` | gap ≥ 2 and mapped initiative status = planned |
| `ON_TRACK` | mapped initiative in progress/completed and gap < 2 |
| `REVISIT` | initiative completed but gap ≥ 1.5 (adoption gap — echoes "the gap is scaled adoption") |

### 6.5 Use-case generation (rule library `seed/usecase-rules.json`)
Each rule: `when` (capability match by id/tag, dimension, score range, optional flag) → `useCase` (title, description, AI pattern, KPIs impacted, data prerequisites, typical effort S/M/L). Engine evaluates all rules, de-duplicates by use-case id, attaches the triggering gap. Target ~25 rules covering every function.

### 6.6 Roadmap phasing
1. Topologically sort use cases by `dependsOn` (e.g. MDM → demand forecasting → fill-rate RCA; platform integration → reconciliation automation).
2. `Now (0–6 m)`: priority ≥ 60, feasibility ≥ 3, no unmet deps. `Next (6–12 m)`: priority ≥ 40 or deps satisfied by a Now item. `Later (12–24 m)`: rest.
3. A use case never lands earlier than any of its dependencies.

---

## 7. Deterministic evidence classifier (`src/lib/classifier`) — what "AI" does in the POC

Pipeline per uploaded document:
1. **Parse** → plain text with locations (page / paragraph / row).
2. **Segment** into sentences (CSV: one row = one segment).
3. **Tag function** via function lexicon (e.g. sales-ecom: "marketplace", "Amazon", "Flipkart", "quick commerce", "PO", "appointment", "settlement"…).
4. **Tag capability** via capability lexicon + systems dictionary (Leap→DMS, Saksham→SFA, BPC→Consolidation, SAC/BW4HANA→Financial Planning, Ennovia→PLM/TQMS, SAP MII→LIMS, SuccessFactors→HCM, Finifi→e-com platform integration, Power BI→MIS/analytics).
5. **Tag dimension + level signal** via cue lexicons:
   - L1: excel, spreadsheet, manual, email, offline, re-key, paper
   - L2: portal, uploaded, digitised, SAP entry, template, scanned
   - L3: integrated, API, middleware, single source of truth, real-time sync, master data
   - L4: automated, auto-match, alerts, predictive, forecast model, RPA, exception-based
   - L5: autonomous, AI agent, self-learning, closed-loop, prescriptive
   - Data cues (dashboard, report, data lake, KPI) → data; skill cues (training, champions, dependent on IT, citizen developer) → people; AI cues (ML, model, GenAI, copilot, recommendation engine) → ai.
6. **Polarity**: pain lexicon (delay, rework, mismatch, no visibility, under-forecast, leakage, backlog) vs strength lexicon (single view, reduced, automated, improved).
7. **Negation window** (3 tokens: "not", "no", "yet to") flips or drops the level signal.
8. Emit evidence items → indicators (`sourceType` from the evidence category: SOP/strategy/architecture → artifact; KPI extract → kpi; application landscape → system; notes → interview).

**Interview intelligence** = same classifier on notes + grouping by capability:
- *Recurring theme*: same (capability, polarity) mentioned by ≥ 2 stakeholders.
- *Contradiction*: same capability, level signals differ by ≥ 2 across stakeholders or vs an artifact.
- *Cross-functional theme normalisation*: map pain items to a fixed theme taxonomy (manual reconciliation, data re-entry, no single source of truth, forecast accuracy, master data quality, approval delays, low tool adoption, agency dependence) and count by function.

**Process analysis:** for each L1 step, mark `manualWorkaround` when L1 cues co-occur with a system name in the same segment ("downloaded from SAP and reworked in Excel"), and `handoff` when two systems/teams appear. Fragmentation index = (#systems touched + #manual handoffs) / #steps.

The `MockProvider` wraps these in an agent narrative: *Plan → Read documents → Extract evidence → Map to criteria → Detect contradictions → Score → Draft opportunities*, emitting SSE events with 150–600 ms delays.

---

## 8. Do you need RAG now? — No.
For the POC, the classifier above is enough and fully explainable. When moving to a real build:
- Replace steps 3–6 with **retrieval per (capability × criterion)** over chunked evidence + an LLM that returns `{indicatorId, level, quote, location}` strictly as JSON.
- Keep §3–§6 unchanged — the engine stays the arbiter; the LLM never outputs a final score.
- Add: citation enforcement (reject outputs without a resolvable quote), PII redaction, prompt/version logging, consultant feedback loop (overrides become eval data).

## 9. Test checklist (Vitest)
- Baseline KPIs reproduce deck (see §5).
- Raw/gated/final for hand-computed fixtures, including gating cap and half-point rounding.
- Confidence bands at boundaries (0.50, 0.75).
- Each flag fires and doesn't fire on fixtures.
- Shared capability counts once in KPIs, in each function for function averages.
- Weight change recalculates capability score; weights normalise if a dimension is unscored.
- Priority/quadrant/whitespace for 3 known seed capabilities.
- Roadmap never schedules a use case before its dependency.
- Classifier: "Reconciliation is done manually in Excel every week" in a finance document → `fin-reconciliation`, process, L1, pain. The same sentence in a marketplace/e-com document (function lexicon hits "marketplace", "settlement", "Amazon") → `ecom-reconciliation`. Function context comes from the document's dominant function when the sentence itself has no function cue.
- Negation: "invoice matching is not yet automated" must NOT emit an L4 signal.

---

## 10. Implementation notes & deviations (kept in sync with `src/lib/engine`)

Each item below is a decision the spec left open or a deliberate change, with the reason.

| # | Topic | Implementation | Why |
|---|---|---|---|
| 1 | Self-assessment indicator | One implicit indicator per (capability, dimension): `level = selfScore` (half-points allowed), `weight 1`, `r 0.50`. | §3.2 lists `self_assessment` as a source; the 2025 score is capability-level, so it seeds every dimension. Baseline mode therefore returns the self score exactly. |
| 2 | Gating scope | Gating applies only when at least one non-self indicator exists, and only non-self indicators are inspected. | Otherwise baseline mode would cap every self score at 2.5 (no gate evidence) and break the §5 acceptance test. |
| 3 | Gate +0.5 rule | "+0.5 if ≥ 50% of the (non-self) indicators sit at ≥ gateCap+1". | The spec's "indicators for level gateCap+1" was ambiguous. |
| 4 | Implied foundation | A gate is also satisfied by a *higher* gate of the same dimension met at its own level (e.g. `process.rule_automation` at L4 implies `process.system_integration`). | Evidence of rule automation cannot coexist with no integration; without this, L4 evidence alone would cap at 2.5. |
| 5 | `LACKS_EVIDENCE` at capability level | Dimension flags follow §3.6 exactly. The capability row shows `LACKS_EVIDENCE` only if it has no evidence at all, no objective evidence in any dimension, or a *capability* confidence band of low. | People/AI rarely have artefacts; a per-dimension union flagged every capability and made the flag meaningless. |
| 6 | `INCONSISTENT` | Ignores the self-assessment indicator. | Self vs evidence divergence is what `SELF_VARIANCE` is for. |
| 7 | `LOW_COVERAGE.missing` | Lists **evidence categories** (`kpi_extracts` …), evaluated against the categories the question bank expects for the capability's primary function, and only when coverage is supplied (evidence mode). | §3.6 defines it on evidence categories; the §2 type said `SourceType[]`. |
| 8 | Expected objective types (confidence coverage) | Distinct objective source types implied by the `evidenceExpected` of the questions scoring that (capability, dimension); default 2 when none. | §3.5 "expected from question bank". |
| 9 | KPI thresholds | `% ≤ 2`, `≥ 4`, `= 5` use the half-point-rounded capability score; the mean uses full precision. | Counts then agree with what the UI shows. |
| 10 | Accept vs override | *Override* pins the consultant's score. *Accept* endorses the engine's method, so the effective score keeps following the live evidence score (weight changes still flow). Before/after are stored either way. | Keeps the Scope weight sliders meaningful after validation. |
| 11 | Effective dimension score (rules, feasibility, risk) | Dimension final shifted by the capability-level override delta, clamped 1–5. | Overrides are capability-level; rules need dimension scores. |
| 12 | Alignment statuses | Adds `PLANNED` (planned initiative, gap < 2) and `AT_TARGET` (no initiative, gap < 1). `ACCELERATE` also fires for **in-progress** initiatives with gap ≥ 2. Precedence: WHITESPACE → REVISIT → ACCELERATE → ON_TRACK → PLANNED. | Demo script §5.6 expects Finifi (in progress) to read "accelerate". |
| 13 | Use-case triggers | A rule triggers only for in-scope capabilities with gap > 0; the use case takes the metrics of its highest-priority trigger. | Avoids recommending work on capabilities already at target. |
| 14 | Phasing thresholds | Now ≥ **45**, Next ≥ **25** (spec: 60 / 40). | Targets are 3–4, so gap ≤ 3 and priority tops out near 75; with 60 nothing reached "Now". |
| 15 | Prerequisite pull-forward | After base phases, a dependency is pulled forward to its earliest dependent's phase (`pulledForward: true`), then the floor rule (never earlier than a dependency) is applied. | A planner would not leave the foundation for a priority item in "Later" (e.g. DAM → AI content). |
| 16 | Coverage when only affirmations are expected | If the questions scoring a (capability, dimension) expect no objective categories (e.g. People questions expect interview notes), `expected = 0` and coverage = 1 when any non-self indicator exists. | Otherwise People/AI could never exceed medium confidence and no capability could reach "high", making bulk-accept unusable. Baseline (self only) still scores coverage 0. |
| 17 | Classifier: CSV rows | One CSV row is one segment, columns joined as `Header: value; …`. Theme tags that require a low level also accept a pain statement with no level signal. | §7.2 "CSV: one row = one segment"; keeps system names in context. |

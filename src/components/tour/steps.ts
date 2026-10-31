/**
 * Guided assessment script (PLAN.md §5 demo script, stages 2 → 9). Narration is computed from
 * live engine output at the moment each step runs, so it always matches the screen.
 */
import { runAgent } from "@/lib/ai/client";
import { synthesisContext } from "@/lib/ai/contexts";
import { loadDemoEvidence } from "@/lib/actions";
import { assess, formatScore, type AssessmentResult } from "@/lib/engine";
import { capabilityLabel } from "@/lib/labels";
import { buildNarrative } from "@/lib/narrative";
import { buildInput } from "@/lib/store/build-input";
import { useSession } from "@/lib/store/session";

export const live = (): AssessmentResult => assess(buildInput(useSession.getState()));

export interface TourStep {
  stage: number;
  title: string;
  route: string;
  target?: string;
  /** lines narrated before the action */
  intro: () => string[];
  action?: () => Promise<void> | void;
  /** lines narrated after the action (computed after it runs) */
  outro?: () => string[];
}

const RECO = "gt-reco-beat";
export const RECO_RATIONALE =
  "Field review: the recommendation engine is live but only about 38% of reps act on it weekly and the model is not retrained on outcomes. Validated at 3.5.";

export const TOUR_STEPS: TourStep[] = [
  {
    stage: 2,
    title: "Evidence goes in",
    route: "/evidence",
    target: "coverage",
    intro: () => [
      "We start with the evidence pack: strategy, SOPs, the application landscape, data architecture, policies, the transformation portfolio, a KPI extract and three interviews. All illustrative.",
    ],
    action: async () => {
      await loadDemoEvidence();
    },
    outro: () => {
      const r = live();
      return [
        `Every sentence is tagged to a function, capability, dimension and maturity level, with its source and location. ${r.kpis.all.highConfidence} capabilities now have high-confidence scores.`,
        "Coverage shows what is missing too: there is no KPI extract for HR yet.",
      ];
    },
  },
  {
    stage: 3,
    title: "Interview intelligence",
    route: "/interviews?tab=notes",
    target: "contradictions",
    intro: () => [
      "Interview notes are structured into strengths, pain points and contradictions, with the stakeholder attached to every statement.",
      "The Head of E-commerce says marketplace POs are auto-ingested. The SOP and the KPI extract say they are keyed into SAP by hand. That goes to the consultant, not into a score.",
    ],
  },
  {
    stage: 4,
    title: "Process lens",
    route: "/process",
    target: "workarounds",
    intro: () => [
      "In E-commerce the manual work sits at order induction and settlement: portal downloads re-keyed into SAP and reconciled in Excel.",
    ],
  },
  {
    stage: 5,
    title: "Scores with reasons",
    route: `/scoring?cap=${RECO}`,
    target: "validation",
    intro: () => {
      const c = live().byId[RECO]!;
      return [
        `${capabilityLabel(RECO)} was self-assessed at ${formatScore(c.self)}. The evidence suggests ${formatScore(c.evidenceScore)}: the engine is live, but adoption is partial and there is no closed-loop learning.`,
        "Every AI score opens to its indicators, quotes, sources, confidence and flags.",
      ];
    },
    action: () => {
      const c = live().byId[RECO]!;
      useSession.getState().override(RECO, c.evidenceScore, 3.5, RECO_RATIONALE);
    },
    outro: () => ["The consultant overrides to 3.5 and records why. The before and after scores go to the audit trail."],
  },
  {
    stage: 5,
    title: "Validate at scale",
    route: "/scoring",
    intro: () => ["High-confidence scores with no open flags can be accepted in one step; flagged ones stay with the consultant."],
    action: () => {
      const r = live();
      const eligible = r.capabilities.filter(
        (c) =>
          c.inScope &&
          c.status === "suggested" &&
          c.confidenceBand === "high" &&
          !c.flags.some((f) => f.kind === "INCONSISTENT" || f.kind === "SELF_VARIANCE" || f.kind === "LACKS_EVIDENCE"),
      );
      useSession.getState().bulkAccept(eligible.map((c) => ({ capabilityId: c.capability.id, score: c.evidenceScore })));
    },
    outro: () => {
      const k = live().kpis.all;
      return [`${k.validated} capabilities validated so far; ${k.awaitingValidation} still awaiting review.`];
    },
  },
  {
    stage: 6,
    title: "Cross-functional themes",
    route: "/compare?fn=finance",
    target: "themes",
    intro: () => [
      "The same rubric across every function makes them comparable. Manual reconciliation is not only a finance problem: it recurs in Finance, Modern Trade and E-commerce.",
    ],
  },
  {
    stage: 7,
    title: "From gaps to use cases",
    route: "/opportunities?uc=uc-ecom-recon-agent",
    target: "uc-detail",
    intro: () => {
      const u = live().useCases.find((x) => x.id === "uc-ecom-recon-agent");
      return [
        "A rule library turns maturity gaps into function-specific AI and digital use cases, scored on value, feasibility and risk.",
        u
          ? `Agentic marketplace reconciliation lands as a ${u.quadrant.toLowerCase()} with priority ${Math.round(u.priority)}. It depends on unified PO ingestion, which is sequenced first.`
          : "Agentic marketplace reconciliation depends on unified PO ingestion, which is sequenced first.",
      ];
    },
  },
  {
    stage: 8,
    title: "Roadmap and whitespaces",
    route: "/roadmap?uc=uc-ecom-recon-agent",
    target: "whitespaces",
    intro: () => {
      const o = live().opportunities;
      const ws = Object.values(o)
        .filter((x) => x.alignment === "WHITESPACE")
        .map((x) => capabilityLabel(x.capabilityId));
      return [
        "Finifi platform integration is in progress, but the e-commerce gap is still more than two levels: accelerate it.",
        `Whitespaces — material gaps with nothing on the roadmap: ${ws.join(", ")}.`,
      ];
    },
  },
  {
    stage: 9,
    title: "Boardroom synthesis",
    route: "/synthesis",
    target: "headline",
    intro: () => ["One click turns the validated assessment into a boardroom view."],
    action: async () => {
      const r = live();
      await runAgent("synthesis", synthesisContext(r, buildNarrative(r).headline));
    },
    outro: () => ["Export to PDF from the toolbar. That is the assessment, end to end, with every number traceable."],
  },
];

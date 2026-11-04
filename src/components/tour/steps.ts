/**
 * Guided demo script: the four steps, about a minute at real speed. Narration is computed from
 * live engine output at the moment each step runs, so it always matches the screen.
 */
import { liveResult, loadDemoEvidence, runResults } from "@/lib/actions";
import { LADDER } from "@/lib/engine";
import { functionName } from "@/lib/labels";
import { processKey } from "@/lib/process-input";
import { whyLine } from "@/lib/process-why";
import { useSession } from "@/lib/store/session";

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

const FN = "supply-chain" as const;
const TRANSPORT = processKey(FN, "Transportation");
export const TRANSPORT_RATIONALE =
  "Site visit: SAP creates a shipment document for every load, so transport is point-digitized (Tested) even without a TMS.";

export const TOUR_STEPS: TourStep[] = [
  {
    stage: 1,
    title: "Define & Focus",
    route: "/",
    target: "scope",
    action: () => {
      const s = useSession.getState();
      if (s.functionId !== FN) s.setFunction(FN);
      s.setTarget(3);
    },
    intro: () => [
      `We assess one function at a time. ${functionName(FN)} is picked, with its six L1 processes and a target of stage 3 · ${LADDER[3].short}.`,
    ],
  },
  {
    stage: 2,
    title: "Assess & Validate",
    route: "/inputs",
    target: "documents",
    intro: () => [
      "Documents go in: an operations SOP, the system list, a KPI extract and interview notes. All illustrative. The quick check holds one interview answer per process.",
    ],
    action: async () => {
      await loadDemoEvidence();
    },
    outro: () => {
      const r = liveResult();
      const quotes = r.processes.reduce((a, p) => a + p.indicators.filter((i) => i.kind === "evidence").length, 0);
      return [`The AI read every sentence. ${quotes} quotes now sit on ${functionName(FN).toLowerCase()} processes, each with its source.`];
    },
  },
  {
    stage: 3,
    title: "Diagnose",
    route: "/review",
    target: "process-Transportation",
    intro: () => {
      const p = liveResult().processes.find((x) => x.id === TRANSPORT);
      return p ? [`The AI suggests Transportation at stage ${p.level}. ${whyLine(p)}`] : [];
    },
    action: () => {
      const s = useSession.getState();
      const r = liveResult();
      const p = r.processes.find((x) => x.id === TRANSPORT);
      if (p && p.status === "suggested" && p.suggested !== null) s.change(TRANSPORT, p.suggested, 2, TRANSPORT_RATIONALE);
      const pending = liveResult().processes.filter((x) => x.status === "suggested" && x.suggested !== null);
      s.acceptAll(pending.map((x) => ({ processId: x.id, score: x.suggested! })));
    },
    outro: () => [
      `The consultant moves it to stage 2 · ${LADDER[2].short} and records why; the before and after are kept. The rest are confirmed in one click.`,
    ],
  },
  {
    stage: 4,
    title: "Prioritize & Roadmap",
    route: "/results",
    target: "headline",
    intro: () => [],
    action: async () => {
      await runResults();
    },
    outro: () => {
      const r = liveResult();
      const now = r.ideas.filter((i) => i.phase === "Now").map((i) => i.title);
      return [
        r.overall === null
          ? "Not enough input to rate the function."
          : `${functionName(FN)} is at ${r.overall.toFixed(1)} against a target of ${r.target}.0. The diagnostic table shows where the gap sits by process, people and data.`,
        now.length ? `Start now with: ${now.join("; ")}. Print it as a one-page PDF.` : "Print it as a one-page PDF.",
      ];
    },
  },
];

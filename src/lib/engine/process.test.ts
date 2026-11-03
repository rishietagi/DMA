import { describe, expect, it } from "vitest";
import type { UseCaseRule } from "@/lib/schema";
import {
  assessProcesses,
  fallbackIdeaScores,
  ideaPhase,
  indicatorShares,
  levelDistribution,
  ladderLevel,
  scoreProcess,
  stageLabel,
  toLadder,
  type ProcessDef,
  type ProcessInput,
} from "./process";
import type { EvidenceItem } from "./types";

const ev = (id: string, level: 1 | 2 | 3 | 4 | 5, over: Partial<EvidenceItem> = {}): EvidenceItem => ({
  id,
  docId: `doc-${id}`,
  docTitle: "Doc",
  category: "process_docs",
  sourceType: "artifact",
  location: "¶1",
  quote: `quote ${id}`,
  functionId: "supply-chain",
  capabilityId: "scm-tms",
  dimension: "process",
  level,
  polarity: "neutral",
  weight: 2,
  cues: [],
  ...over,
});

const def = (over: Partial<ProcessDef> = {}): ProcessDef => ({
  id: "supply-chain:Transportation",
  name: "Transportation",
  capabilityIds: ["scm-tms"],
  selfScores: [],
  evidence: [],
  quickCheck: null,
  ...over,
});

const rule = (id: string, over: Partial<UseCaseRule["when"]> = {}, uc: Partial<UseCaseRule["useCase"]> = {}): UseCaseRule => ({
  id,
  when: { capabilityIds: ["scm-tms"], dimension: "process", maxScore: 3, ...over },
  useCase: { title: id, description: "", aiPattern: "", kpis: [], dataPrerequisites: [], effort: "M", dependsOn: [], ...uc },
});

const input = (processes: ProcessDef[], rules: UseCaseRule[] = [], target: ProcessInput["target"] = 3): ProcessInput => ({
  functionId: "supply-chain",
  target,
  processes,
  rules,
});

describe("process ladder crosswalk (§11.2)", () => {
  it("writes levels as stages, never as L0–L5", () => {
    expect(stageLabel(3)).toBe("Stage 3");
  });
  it("maps engine 1–5 linearly onto ladder 0–5", () => {
    expect([1, 2, 3, 4, 5].map(toLadder)).toEqual([0, 1.25, 2.5, 3.75, 5]);
    expect(toLadder(2.5)).toBe(1.875);
  });
  it("places a score on a whole level, half rounding up, clamped to 0–5", () => {
    expect(ladderLevel(2.5)).toBe(3);
    expect(ladderLevel(2.49)).toBe(2);
    expect(ladderLevel(0.4)).toBe(0);
    expect(ladderLevel(7)).toBe(5);
    expect(ladderLevel(-1)).toBe(0);
  });
});

describe("scoreProcess (§11.1)", () => {
  it("is a reliability × weight weighted mean of quick check, evidence and self score", () => {
    const p = scoreProcess(def({ quickCheck: 1, evidence: [ev("a", 1)], selfScores: [3] }), 3);
    // quick check 1 × (3 × 0.85) + evidence 0 × (2 × 1.0) + self 2.5 × (1 × 0.5)
    expect(p.suggested).toBeCloseTo((1 * 2.55 + 0 * 2 + 2.5 * 0.5) / (2.55 + 2 + 0.5), 10);
    expect(p.level).toBe(1);
    expect(p.gap).toBe(2);
    expect(p.status).toBe("suggested");
  });

  it("is deterministic", () => {
    const d = def({ quickCheck: 2, evidence: [ev("a", 3), ev("b", 1)], selfScores: [2] });
    expect(scoreProcess(d, 3)).toEqual(scoreProcess(d, 3));
  });

  it("returns no level and no gap when there is nothing to score", () => {
    const p = scoreProcess(def(), 3);
    expect(p.suggested).toBeNull();
    expect(p.level).toBeNull();
    expect(p.gap).toBeNull();
    expect(p.confidence).toBe(0);
    expect(p.flags).toEqual(["LACKS_EVIDENCE"]);
  });

  it("flags 'no documents' when only the interview and self score speak", () => {
    expect(scoreProcess(def({ quickCheck: 2, selfScores: [2] }), 3).flags).toContain("LACKS_EVIDENCE");
  });

  it("flags disagreement at a spread of 2.5 levels, ignoring the self score", () => {
    expect(scoreProcess(def({ quickCheck: 3, evidence: [ev("a", 1)] }), 3).flags).toContain("INCONSISTENT");
    expect(scoreProcess(def({ quickCheck: 2, evidence: [ev("a", 1)] }), 3).flags).not.toContain("INCONSISTENT");
    expect(scoreProcess(def({ evidence: [ev("a", 1)], selfScores: [5] }), 3).flags).not.toContain("INCONSISTENT");
  });

  it("rates confidence higher with more agreeing sources", () => {
    const thin = scoreProcess(def({ selfScores: [2] }), 3);
    const rich = scoreProcess(def({ quickCheck: 1, evidence: [ev("a", 2), ev("b", 2, { docId: "doc-2" })] }), 3);
    expect(thin.band).toBe("low");
    expect(rich.band).toBe("high");
    expect(rich.documents).toBe(2);
  });

  it("uses the consultant's level once changed, keeping the suggestion", () => {
    const p = scoreProcess(
      def({ quickCheck: 0, validation: { kind: "overridden", before: 0, after: 1, rationale: "seen on site", by: "A", at: "t" } }),
      3,
    );
    expect(p.suggested).toBe(0);
    expect(p.effective).toBe(1);
    expect(p.level).toBe(1);
    expect(p.status).toBe("overridden");
    expect(p.gap).toBe(2);
  });

  it("keeps at most three quotes, strongest source first", () => {
    const p = scoreProcess(
      def({ evidence: [ev("a", 1, { sourceType: "interview" }), ev("b", 1), ev("c", 1, { weight: 3 }), ev("d", 1)] }),
      3,
    );
    expect(p.quotes.map((q) => q.id)).toEqual(["c", "b", "d"]);
  });
});

describe("ideas and phasing (§11.4)", () => {
  it("puts big gaps first and large efforts one phase later", () => {
    expect(ideaPhase(3, "S")).toBe("Now");
    expect(ideaPhase(2, "L")).toBe("Next");
    expect(ideaPhase(1, "M")).toBe("Next");
    expect(ideaPhase(1, "L")).toBe("Later");
  });

  it("matches rules by capability or by step name, only for gaps of a level or more", () => {
    const transport = def({ quickCheck: 0 });
    const wh = def({ id: "supply-chain:Warehousing", name: "Warehousing", capabilityIds: [], quickCheck: 1 });
    const done = def({ id: "supply-chain:Order", name: "Order", capabilityIds: ["scm-dashboard"], quickCheck: 3 });
    const r = assessProcesses(
      input([transport, wh, done], [rule("tms"), rule("wms", { capabilityIds: [], steps: ["Warehousing"] }), rule("fill", { capabilityIds: ["scm-dashboard"] })]),
    );
    expect(r.ideas.map((i) => [i.id, i.processName, i.phase])).toEqual([
      ["tms", "Transportation", "Now"],
      ["wms", "Warehousing", "Now"],
    ]);
  });

  it("never places an idea before its dependency", () => {
    const r = assessProcesses(
      input(
        [def({ quickCheck: 0 }), def({ id: "supply-chain:Supply", name: "Supply", capabilityIds: ["mdm"], quickCheck: 2 })],
        [rule("dependent", {}, { dependsOn: ["foundation"], effort: "S" }), rule("foundation", { capabilityIds: ["mdm"] }, { effort: "S" })],
      ),
    );
    const phase = Object.fromEntries(r.ideas.map((i) => [i.id, i.phase]));
    expect(phase).toEqual({ foundation: "Next", dependent: "Next" });
    expect(r.ideas.map((i) => i.id)).toEqual(["foundation", "dependent"]);
  });
});

describe("assessProcesses", () => {
  it("averages effective scores and counts reviewed processes", () => {
    const r = assessProcesses(
      input([
        def({ quickCheck: 1 }),
        def({ id: "b", name: "B", quickCheck: 3, validation: { kind: "accepted", before: 3, after: 3, rationale: "", by: "A", at: "t" } }),
        def({ id: "c", name: "C" }),
      ]),
    );
    expect(r.overall).toBe(2);
    expect(r.overallLevel).toBe(2);
    expect(r.validated).toBe(1);
  });
});

describe("explainability helpers (§11.5)", () => {
  it("splits the score into shares that add up to 1 and contributions that add up to the score", () => {
    const p = scoreProcess(def({ quickCheck: 2, evidence: [ev("a", 1), ev("b", 3)], selfScores: [2] }), 3);
    const rows = indicatorShares(p);
    expect(rows.reduce((a, r) => a + r.share, 0)).toBeCloseTo(1, 10);
    expect(rows.reduce((a, r) => a + r.contribution, 0)).toBeCloseTo(p.suggested!, 10);
  });

  it("counts processes per level", () => {
    expect(levelDistribution([{ level: 0 }, { level: 2 }, { level: 2 }, { level: null }])).toEqual([1, 0, 2, 0, 0, 0]);
  });

  it("scores ideas from capability value / ease / risk, else from gap and effort", () => {
    expect(fallbackIdeaScores(3, "S")).toEqual({ value: 5, feasibility: 4, risk: 2 });
    expect(fallbackIdeaScores(1, "L")).toEqual({ value: 3, feasibility: 2, risk: 4 });
    const r = assessProcesses({ ...input([def({ quickCheck: 0 })], [rule("tms")]), ideaScores: { "scm-tms": { value: 4, feasibility: 4, risk: 2 } } });
    expect(r.ideas[0]).toMatchObject({ value: 4, feasibility: 4, risk: 2, quadrant: "Quick win" });
    expect(r.ideas[0]!.priority).toBeGreaterThan(0);
  });

  it("marks a gap with nothing planned as a whitespace, and planned work with a big gap as speed up", () => {
    const planned = { id: "i1", functionId: "supply-chain" as const, title: "TMS", status: "planned" as const, mapsTo: ["scm-tms"] };
    expect(scoreProcess(def({ quickCheck: 1 }), 3).alignment).toBe("WHITESPACE");
    expect(scoreProcess(def({ quickCheck: 0, initiatives: [planned] }), 3).alignment).toBe("ACCELERATE");
    expect(scoreProcess(def({ quickCheck: 3 }), 3).alignment).toBe("AT_TARGET");
  });

  it("carries the 2025 self level per process and for the function", () => {
    const r = assessProcesses(input([def({ quickCheck: 1, selfScores: [3] }), def({ id: "b", name: "B", quickCheck: 1 })]));
    expect(r.processes[0]!.self).toBe(2.5);
    expect(r.processes[1]!.self).toBeNull();
    expect(r.self).toBe(2.5);
  });
});

describe("questionnaire answers (§11.1)", () => {
  it("counts each answer at its weight × 0.85, and the interview as one source", () => {
    const p = scoreProcess(
      def({
        quickCheck: 1,
        answers: [
          { questionId: "q1", text: "Bank question", value: 0, weight: 3, custom: false },
          { questionId: "cq", text: "My question", value: 4, weight: 1, custom: true },
        ],
      }),
      3,
    );
    expect(p.suggested).toBeCloseTo((1 * 2.55 + 0 * 2.55 + 4 * 0.85) / (2.55 + 2.55 + 0.85), 10);
    expect(p.indicators.filter((i) => i.kind === "question")).toHaveLength(2);
    const onlyAnswers = scoreProcess(def({ answers: [{ questionId: "q1", text: "", value: 2, weight: 2, custom: false }] }), 3);
    expect(onlyAnswers.level).toBe(2);
    expect(onlyAnswers.flags).toContain("LACKS_EVIDENCE");
  });
});

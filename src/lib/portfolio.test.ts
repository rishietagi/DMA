/** Portfolio views (§11.6) on the demo pack: 2×2, narrative, themes, layers, governance, charter. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { classifyDocument } from "@/lib/classifier";
import { assessProcesses, type EvidenceItem } from "@/lib/engine";
import { DEMO_DOCS } from "@/lib/demo-evidence";
import { parseText } from "@/lib/parse-text";
import {
  byLayer,
  byTheme,
  charterFor,
  foundations,
  governance,
  ideaRag,
  leadershipNarrative,
  PHASE_LABEL,
  PHASE_MONTHS,
  portfolioIdeas,
  portfolioPoints,
  portfolioResponse,
  priorityThemes,
} from "@/lib/portfolio";
import { assessAllFunctions, buildProcessInput, l1Processes, processKey } from "@/lib/process-input";
import { seed } from "@/lib/seed";

const FN = "supply-chain" as const;
const workshop: EvidenceItem[] = seed.demoResponses.evidence.map((e) => ({
  ...e,
  functionId: seed.baseline.capabilities.find((c) => c.id === e.capabilityId)!.primaryFunctionId,
  cues: [],
}));
const demo: EvidenceItem[] = DEMO_DOCS.flatMap((d) =>
  classifyDocument({
    id: d.id,
    title: d.title,
    category: d.category,
    stakeholder: d.stakeholder,
    segments: parseText(d.fileName, readFileSync(join("public/demo-evidence", d.fileName), "utf8")),
  }),
);
const evidence = [...workshop, ...demo];
const session = { evidence, quickCheck: seed.demoResponses.quickCheck, target: 3 as const, responses: seed.demoResponses.responses };
const r = assessProcesses(
  buildProcessInput({ ...session, functionId: FN, processes: l1Processes(FN).map((s) => processKey(FN, s)), processValidations: {} }),
);
const all = assessAllFunctions(session, assessProcesses);

describe("horizons", () => {
  it("labels the engine's phases with the deck's horizons", () => {
    expect(PHASE_LABEL.Later).toBe("Beyond");
    expect(PHASE_MONTHS).toEqual({ Now: "0–6 months", Next: "6–18 months", Later: "18–36 months" });
  });
});

describe("criticality × maturity 2×2 (output 2)", () => {
  it("follows the four responses", () => {
    expect(portfolioResponse("High", 2)).toBe("Transform now");
    expect(portfolioResponse("High", 3.2)).toBe("Sustain & differentiate");
    expect(portfolioResponse("Low", 3.4)).toBe("Scale selectively");
    expect(portfolioResponse("Low", 1.5)).toBe("Rationalize / monitor");
    expect(portfolioResponse("Medium", 1.2)).toBe("Transform now");
  });

  it("places every scored demo process, without two points on the same spot", () => {
    const pts = portfolioPoints(r.processes);
    expect(pts).toHaveLength(r.processes.length);
    expect(pts.find((p) => p.name === "Order fulfilment & fill rate")!.response).toBe("Sustain & differentiate");
    expect(pts.find((p) => p.name === "Transportation")!.response).toBe("Transform now");
    const spots = pts.map((p) => `${p.maturity.toFixed(2)}|${p.y.toFixed(2)}`);
    expect(new Set(spots).size).toBe(spots.length);
  });
});

describe("leadership narrative (output 1)", () => {
  it("gives four points: strongest start, largest gap, data constraint, portfolio mix", () => {
    const lines = leadershipNarrative(r);
    expect(lines).toHaveLength(4);
    expect(lines[0]).toMatch(/^Order fulfilment & fill rate provides the strongest starting point \(stage 3 · Scaled\)/);
    expect(lines[1]).toMatch(/largest gap: 2 levels/);
    expect(lines[2]).toMatch(/^Data ownership constrains scaling: sources disagree on/);
    expect(lines[3]).toMatch(/^Focus on .*scale-now/);
  });
});

describe("portfolio, themes and layers (outputs 4–5)", () => {
  const fnIdeas = portfolioIdeas(r, all, "function");
  const allIdeas = portfolioIdeas(r, all, "all");

  it("keeps each rule once across functions, current function's version first", () => {
    expect(new Set(allIdeas.map((i) => i.id)).size).toBe(allIdeas.length);
    expect(allIdeas.length).toBeGreaterThan(fnIdeas.length);
    expect(fnIdeas.every((i) => i.functionId === FN)).toBe(true);
  });

  it("puts every idea in exactly one theme cell and one layer cell", () => {
    const count = (g: Record<string, Record<string, unknown[]>>) => Object.values(g).flatMap((row) => Object.values(row)).reduce((a, c) => a + c.length, 0);
    expect(count(byTheme(allIdeas))).toBe(allIdeas.length);
    expect(count(byLayer(allIdeas))).toBe(allIdeas.length);
    expect(byTheme(fnIdeas)["Plan & fulfil"].Now.map((i) => i.id)).toContain("uc-tms-optimiser");
  });

  it("names the foundations and counts priority themes", () => {
    expect(foundations(fnIdeas).length).toBeGreaterThan(0);
    expect(foundations(fnIdeas)).toContain("ML demand sensing by channel");
    expect(priorityThemes(r.ideas)).toEqual(expect.arrayContaining(["Plan & fulfil"]));
  });
});

describe("activation and value governance (output 7)", () => {
  it("rates initiatives red, amber or green from conflicts, feasibility, dependencies and risk", () => {
    expect(ideaRag({ feasibility: 4, dependencies: 1, risk: 2 }, true).rag).toBe("red");
    expect(ideaRag({ feasibility: 2, dependencies: 4, risk: 2 }, false).rag).toBe("red");
    expect(ideaRag({ feasibility: 2, dependencies: 2, risk: 2 }, false).rag).toBe("amber");
    expect(ideaRag({ feasibility: 3, dependencies: 2, risk: 4 }, false).rag).toBe("amber");
    expect(ideaRag({ feasibility: 4, dependencies: 1, risk: 2 }, false)).toEqual({ rag: "green", reason: null });
  });

  it("counts initiatives, delivery, risk and value, and lists the decisions required", () => {
    const ideas = portfolioIdeas(r, all, "function");
    const inits = seed.roadmap.initiatives.filter((i) => i.functionId === FN);
    const g = governance(ideas, r.processes, inits);
    expect(g.initiatives).toBe(ideas.length + inits.filter((i) => i.status !== "completed").length);
    expect(g.inDelivery).toBe(inits.filter((i) => i.status === "in_progress").length);
    expect(g.atRisk).toBe(g.health.filter((h) => h.rag === "red").length);
    expect(g.valueCr[1]).toBeGreaterThan(g.valueCr[0]);
    expect(g.decisions[0]).toMatch(/^Release pilot funding for /);
    expect(g.decisions.some((d) => /data ownership/.test(d))).toBe(true);
    expect(g.decisions.length).toBeLessThanOrEqual(4);
  });
});

describe("initiative charter (output 6)", () => {
  it("uses the seed charter where there is one, else builds one from the assessment", () => {
    const tms = r.ideas.find((i) => i.id === "uc-tms-optimiser")!;
    const c = charterFor(tms, r.processes.find((p) => p.id === tms.processId), { capabilities: ["Transportation Management System"], dependsOnTitles: [] });
    expect(c.problem).toMatch(/phone and Excel/);
    expect(c.first90).toHaveLength(5);
    expect(c.horizon).toBe("Now");

    const bare = { ...tms, charter: undefined };
    const built = charterFor(bare, r.processes.find((p) => p.id === tms.processId), { capabilities: [], dependsOnTitles: [] });
    expect(built.outcome).toBe(tms.description);
    expect(built.first90[0]).toBe("Confirm sponsor");
    expect(built.successMeasures).toEqual(tms.kpis);
  });
});

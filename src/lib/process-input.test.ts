/** Process-ladder acceptance: the demo pack, end to end through the classifier and the engine. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { classifyDocument } from "@/lib/classifier";
import { assess, assessProcesses, ideaQuadrant, type EvidenceItem } from "@/lib/engine";
import { processInsights, processNarrative } from "@/lib/narrative";
import { sourceBreakdown } from "@/lib/process-why";
import { buildReport, ladderHex, LEVEL_HEX } from "@/lib/report/report-data";
import { processAreas } from "@/lib/process-areas";
import { processLens } from "@/lib/process-lens";
import { capabilityInput } from "@/lib/store/build-input";
import { DEMO_DOCS, SAMPLE_TRANSCRIPT, withoutRetiredSamples } from "@/lib/demo-evidence";
import { parseText } from "@/lib/parse-text";
import { answersForStep, assessAllFunctions, buildProcessInput, capabilitiesForStep, capabilitiesOf, criticalityOf, ideaContextFor, suggestedCriticality, suggestedTarget, targetOf, type CustomProcess, type CustomQuestion, l1Processes, processKey, renameProcessKeys, stepForEvidence, stepKeywords } from "@/lib/process-input";
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
const run = (evidence: EvidenceItem[], quickCheck = seed.demoResponses.quickCheck, custom: CustomQuestion[] = []) =>
  assessProcesses(
    buildProcessInput({
      functionId: FN,
      processes: l1Processes(FN).map((s) => processKey(FN, s)),
      target: 3,
      evidence,
      quickCheck,
      responses: seed.demoResponses.responses,
      customQuestions: custom,
      processValidations: {},
    }),
  );
const byName = (r: ReturnType<typeof run>, name: string) => r.processes.find((p) => p.name === name)!;

describe("process mapping (§11.3)", () => {
  it("gives each supply-chain capability to exactly one L1 process", () => {
    const owned = l1Processes(FN).flatMap((s) => capabilitiesForStep(FN, s));
    expect(new Set(owned).size).toBe(owned.length);
    expect(capabilitiesForStep(FN, "Transportation")).toEqual(["scm-tms"]);
    expect(capabilitiesForStep(FN, "Warehousing")).toEqual([]);
  });

  it("places a sentence by the process it names before its capability", () => {
    const item = demo.find((e) => e.quote.startsWith("Cycle counts in the depots"))!;
    expect(item.capabilityId).toBeNull();
    expect(stepForEvidence(FN, item)).toBe("Warehousing");
    const fill = demo.find((e) => e.quote.startsWith("Customer fill rate flows"))!;
    expect(stepForEvidence(FN, fill)).toBe("Order fulfilment & fill rate");
  });

  it("ignores evidence from other functions", () => {
    const finance = demo.find((e) => e.functionId === "finance" && e.capabilityId === "fin-reconciliation")!;
    expect(stepForEvidence(FN, finance)).toBeNull();
  });
});

describe("demo pack acceptance (Illustrative)", () => {
  const before = run(workshop);
  const after = run([...workshop, ...demo]);

  it("puts every supply-chain process on the ladder with documents behind it", () => {
    for (const p of after.processes) {
      expect(p.level).not.toBeNull();
      expect(p.documents).toBeGreaterThan(0);
    }
  });

  it("keeps Transportation at Stage 1 (Initiated) and lowers it further once the SOP and interviews are read", () => {
    expect(byName(after, "Transportation").level).toBe(1);
    expect(byName(after, "Transportation").effective!).toBeLessThan(byName(before, "Transportation").effective!);
  });

  it("puts Order fulfilment one level below its higher target and flags the IBP contradiction", () => {
    expect(byName(after, "Order fulfilment & fill rate").level).toBe(3);
    expect(byName(after, "Order fulfilment & fill rate").target).toBe(4);
    expect(byName(after, "Order fulfilment & fill rate").gap).toBe(1);
    expect(byName(after, "Demand planning / IBP").flags).toContain("INCONSISTENT");
  });

  it("rates supply chain at Stage 2 (Tested) with transport optimisation in Now", () => {
    expect(after.overallLevel).toBe(2);
    expect(after.ideas.find((i) => i.id === "uc-tms-optimiser")?.phase).toBe("Now");
    expect(after.ideas.find((i) => i.id === "uc-wms-visibility")?.phase).toBe("Next");
  });

  it("lowers Transportation when an uploaded note says transport is planned by phone", () => {
    const upload = classifyDocument({
      id: "upload-transport",
      title: "Logistics notes",
      category: "process_docs",
      segments: parseText("notes.md", "Transport is planned by phone with transporters; there is no TMS."),
    });
    const base = run(workshop, { ...seed.demoResponses.quickCheck, [processKey(FN, "Transportation")]: 2 });
    const next = run([...workshop, ...upload], { ...seed.demoResponses.quickCheck, [processKey(FN, "Transportation")]: 2 });
    expect(byName(next, "Transportation").effective!).toBeLessThan(byName(base, "Transportation").effective!);
  });
});

describe("results helpers on the demo pack", () => {
  const evidence = [...workshop, ...demo];
  const r = run(evidence);
  const input = buildProcessInput({
    functionId: FN,
    processes: l1Processes(FN).map((s) => processKey(FN, s)),
    target: 3,
    evidence,
    quickCheck: seed.demoResponses.quickCheck,
    processValidations: {},
  });

  it("finds systems, manual workarounds and hand-offs per step", () => {
    const lens = processLens(FN, evidence);
    const transport = lens.steps.find((s) => s.step === "Transportation")!;
    expect(transport.pains.length).toBeGreaterThan(0);
    expect(lens.index).toBeGreaterThan(0);
    expect(lens.steps.map((s) => s.step)).toEqual(l1Processes(FN));
  });

  it("scores areas from capabilities, and from documents for Warehousing", () => {
    const caps = assess(capabilityInput(evidence, []));
    const areas = processAreas(input.processes, caps);
    expect(areas[processKey(FN, "Transportation")]?.process?.source).toBe("capabilities");
    expect(areas[processKey(FN, "Warehousing")]?.process?.source).toBe("documents");
  });

  it("writes a summary that names the weakest process and the ideas to start now", () => {
    const lines = processNarrative(r, "Supply Chain");
    expect(lines[0]).toMatch(/^Supply Chain sits at stage 2/);
    expect(lines.join(" ")).toMatch(/Transportation is furthest behind at stage 1, with nothing on the 2026-27 roadmap/);
    expect(lines.join(" ")).toMatch(/Start now with/);
  });

  it("gives three insights: closest to target, the unplanned gap, where to start", () => {
    const ins = processInsights(r);
    expect(ins.map((i) => i.kind)).toEqual(["strength", "gap", "priority"]);
    expect(ins[1]!.text).toMatch(/^Transportation remains \d levels? below target with no initiative currently mapped\.$/);
    expect(ins[2]!.text).toMatch(/^Start with .+ on .+\.$/);
  });

  it("breaks each process down by source, in a fixed order", () => {
    const t = r.processes.find((p) => p.name === "Transportation")!;
    const rows = sourceBreakdown(t);
    expect(rows.map((x) => x.source)).toEqual(["Interview", "Questionnaire", "Documents", "Baseline"].filter((s) => rows.some((x) => x.source === s)));
    expect(rows.every((x) => /^Stages? \d(–\d)?$/.test(x.stages))).toBe(true);
    expect(sourceBreakdown({ indicators: [] })).toEqual([]);
  });

  it("rates every function on the ladder for comparison", () => {
    const all = assessAllFunctions({ evidence, quickCheck: seed.demoResponses.quickCheck, target: 3 }, assessProcesses);
    expect(all).toHaveLength(10);
    expect(all.every((f) => f.overall !== null)).toBe(true);
  });
});

describe("questionnaire answers and custom questions (§11.1)", () => {
  const q = (over: Partial<CustomQuestion> = {}): CustomQuestion => ({
    id: "cq-1",
    functionId: FN,
    step: "Transportation",
    text: "Do drivers use a mobile app for proof of delivery?",
    dimension: "process",
    weight: 3,
    answer: 4,
    ...over,
  });

  it("turns bank answers into ladder values and skips don't-know", () => {
    const responses = [...seed.demoResponses.responses.filter((r) => r.questionId !== "scm-q07"), { questionId: "scm-q07", functionId: FN, level: null }];
    const answers = answersForStep(FN, "Transportation", responses, []);
    expect(answers.map((a) => [a.questionId, a.value])).toEqual([["scm-q06", 1]]);
  });

  it("counts a custom question only for its own function and step", () => {
    expect(answersForStep(FN, "Transportation", [], [q()])).toHaveLength(1);
    expect(answersForStep(FN, "Warehousing", [], [q()])).toHaveLength(0);
    expect(answersForStep("finance", "Transportation", [], [q()])).toHaveLength(0);
    expect(answersForStep(FN, "Transportation", [], [q({ answer: null })])).toHaveLength(0);
  });

  it("raises Transportation when a custom question is answered high", () => {
    const evidence = [...workshop, ...demo];
    const base = byName(run(evidence), "Transportation");
    const withQ = byName(run(evidence, seed.demoResponses.quickCheck, [q()]), "Transportation");
    expect(withQ.effective!).toBeGreaterThan(base.effective!);
    expect(withQ.indicators.some((i) => i.kind === "question" && i.custom)).toBe(true);
  });
});


describe("MDM left out of the process view", () => {
  it("drops MDM from Supply & production planning, the function's capabilities and its evidence", () => {
    expect(capabilitiesForStep(FN, "Supply & production planning")).not.toContain("mdm");
    expect(capabilitiesOf(FN).map((c) => c.id)).not.toContain("mdm");
    const mdmItem = workshop.find((e) => e.capabilityId === "mdm")!;
    expect(stepForEvidence(FN, mdmItem)).toBeNull();
    expect(run([...workshop, ...demo]).ideas.map((i) => i.id)).not.toContain("uc-mdm-quality");
  });
});

describe("processes the consultant adds (§11.3)", () => {
  const q = (over: Partial<CustomQuestion>): CustomQuestion => ({
    id: "cq-1",
    functionId: FN,
    step: "Transportation",
    text: "Is proof of delivery digital?",
    dimension: "process",
    weight: 2,
    answer: 2,
    ...over,
  });
  const returns: CustomProcess = { id: "cp-1", functionId: FN, name: "Returns management", keywords: ["returns", "reverse logistics"] };
  const sentence = { ...demo.find((e) => e.functionId === FN && e.level !== null)!, id: "ret-1", quote: "Customer returns are logged on paper at the depot.", capabilityId: null };

  it("adds the process to its own function's chain only", () => {
    expect(l1Processes(FN, [returns]).at(-1)).toBe("Returns management");
    expect(l1Processes("finance", [returns])).not.toContain("Returns management");
  });

  it("places sentences by its words, else by the distinctive words of its name", () => {
    expect(stepForEvidence(FN, sentence, [returns])).toBe("Returns management");
    expect(stepKeywords(FN, "Returns management", [{ ...returns, keywords: [] }])).toEqual(["returns"]);
  });

  it("scores it from the quick check, own questions and its sentences, with no capabilities", () => {
    const key = processKey(FN, returns.name);
    const r = assessProcesses(
      buildProcessInput({
        functionId: FN,
        processes: [key],
        target: 3,
        evidence: [sentence],
        quickCheck: { [key]: 1 },
        customQuestions: [{ id: "cq-r", functionId: FN, step: returns.name, text: "Are returns tracked in SAP?", dimension: "process", weight: 2, answer: 2 }],
        customProcesses: [returns],
        processValidations: {},
      }),
    );
    const p = r.processes[0]!;
    expect(p.self).toBeNull();
    expect(p.indicators.map((i) => i.kind).sort()).toEqual(["evidence", "question", "quick-check"]);
    expect(p.level).not.toBeNull();
  });

  it("moves everything keyed on a process when it is renamed, and drops it when deleted", () => {
    const oldKey = processKey(FN, "Returns management");
    const newKey = processKey(FN, "Returns & reverse logistics");
    const state = {
      processes: [processKey(FN, "Warehousing"), oldKey],
      quickCheck: { [oldKey]: 2 },
      validations: { [oldKey]: { kind: "accepted" as const, before: 2, after: 2, rationale: "ok", by: "A", at: "t" } },
      customQuestions: [q({ step: "Returns management" }), q({ id: "cq-2" })],
      audit: [{ processId: oldKey }],
    };
    const renamed = renameProcessKeys(state, FN, "Returns management", "Returns & reverse logistics");
    expect(renamed.processes).toEqual([processKey(FN, "Warehousing"), newKey]);
    expect(renamed.quickCheck).toEqual({ [newKey]: 2 });
    expect(Object.keys(renamed.validations)).toEqual([newKey]);
    expect(renamed.customQuestions.map((x) => x.step)).toEqual(["Returns & reverse logistics", "Transportation"]);
    expect(renamed.audit[0]!.processId).toBe(newKey);

    const gone = renameProcessKeys(state, FN, "Returns management", null);
    expect(gone.processes).toEqual([processKey(FN, "Warehousing")]);
    expect(gone.quickCheck).toEqual({});
    expect(gone.customQuestions).toHaveLength(1);
    expect(gone.audit).toHaveLength(1);
  });
});

describe("sample interview transcript (Illustrative)", () => {
  const items = classifyDocument({
    id: SAMPLE_TRANSCRIPT.id,
    title: SAMPLE_TRANSCRIPT.title,
    category: SAMPLE_TRANSCRIPT.category,
    stakeholder: SAMPLE_TRANSCRIPT.stakeholder,
    segments: parseText(SAMPLE_TRANSCRIPT.fileName, readFileSync(join("public/demo-evidence", SAMPLE_TRANSCRIPT.fileName), "utf8")),
  });
  const placed = items.filter((e) => e.level !== null && stepForEvidence(FN, e));

  it("gives supply-chain strengths and pain points across several processes", () => {
    expect(items.every((e) => e.sourceType === "interview")).toBe(true);
    expect(new Set(placed.map((e) => stepForEvidence(FN, e)))).toEqual(new Set(["Warehousing", "Transportation", "Order fulfilment & fill rate", "Sustainability"]));
    expect(placed.some((e) => e.polarity === "strength")).toBe(true);
    expect(placed.some((e) => e.polarity !== "strength")).toBe(true);
  });
});

describe("retired sample documents", () => {
  it("drops sample documents no longer shipped, with their sentences, and keeps everything else", () => {
    const ev = (docId: string) => ({ ...demo[0]!, id: `x-${docId}`, docId });
    const s = {
      documents: [
        { id: "demo-ecom-sop", source: "demo" },
        { id: "demo-scm-sop", source: "demo" },
        { id: SAMPLE_TRANSCRIPT.id, source: "demo" },
        { id: "upload-x", source: "upload" },
      ],
      evidence: [ev("demo-ecom-sop"), ev("demo-scm-sop"), ev("upload-x")],
    };
    const out = withoutRetiredSamples(s);
    expect(out.documents.map((d) => d.id)).toEqual(["demo-scm-sop", SAMPLE_TRANSCRIPT.id, "upload-x"]);
    expect(out.evidence.map((e) => e.docId)).toEqual(["demo-scm-sop", "upload-x"]);
  });
});

describe("PDF report model", () => {
  const evidence = [...workshop, ...demo];
  const r = run(evidence);
  const input = buildProcessInput({
    functionId: FN,
    processes: l1Processes(FN).map((s) => processKey(FN, s)),
    target: 3,
    evidence,
    quickCheck: seed.demoResponses.quickCheck,
    responses: seed.demoResponses.responses,
    processValidations: {},
  });
  const areas = processAreas(input.processes, assess(capabilityInput(evidence, [])));
  const inits = seed.roadmap.initiatives.filter((i) => i.functionId === FN);
  const m = buildReport(r, areas, { functionName: "Supply Chain", date: "3 November 2026", sources: [{ title: "SOP", kind: "Document", sentences: 10 }], initiatives: inits });

  it("carries the engine's headline numbers and the four-point leadership narrative", () => {
    expect(m.headline.current).toBe(r.overall);
    expect(m.headline.target).toBe(r.targetMean);
    expect(m.headline.ambitionGap).toBeCloseTo(r.targetMean - r.overall!, 10);
    expect(m.headline.below).toBe(r.processes.filter((p) => (p.gap ?? 0) > 0).length);
    expect(m.narrative).toHaveLength(4);
  });

  it("carries the 2×2, the portfolio by theme and layer, a charter and the governance view", () => {
    expect(m.portfolio).toHaveLength(r.processes.length);
    expect(m.themes.length).toBeGreaterThan(0);
    expect(m.layers.map((l) => l.layer)).toEqual(["Business experiences", "Operations", "Data, AI & platforms", "Operating model"]);
    expect(m.charter?.title).toBe([...r.ideas].sort((a, b) => b.priority - a.priority)[0]!.title);
    expect(m.governance.inDelivery).toBe(inits.filter((i) => i.status === "in_progress").length);
    expect(m.diagnostic[0]).toHaveProperty("ai");
  });

  it("keeps process order in the diagnostic table and marks unplanned gaps", () => {
    expect(m.diagnostic.map((d) => d.name)).toEqual(r.processes.map((p) => p.name));
    const t = m.diagnostic.find((d) => d.name === "Transportation")!;
    expect(t.nothingPlanned).toBe(true);
    expect(m.nothingPlanned.map((g) => g.name)).toContain("Transportation");
  });

  it("groups ideas by phase and names their dependencies", () => {
    const all = [...m.ideas.Now, ...m.ideas.Next, ...m.ideas.Later];
    expect(all).toHaveLength(r.ideas.length);
    for (const i of r.ideas) expect(m.ideas[i.phase].some((x) => x.title === i.title)).toBe(true);
    const deps = all.flatMap((i) => i.dependsOn);
    for (const d of deps) expect(all.some((i) => i.title === d)).toBe(true);
  });

  it("gives every process a stage, a status and at most two quotes", () => {
    for (const p of m.processes) {
      expect(p.status).toMatch(/^(AI suggested|Validated by|Changed by)/);
      expect(p.quotes.length).toBeLessThanOrEqual(2);
    }
    expect(m.ladder.map((l) => l.name)).toEqual(["Initiated", "Tested", "Scaled", "Optimized", "Intelligent"]);
  });

  it("colours each stage with its own tint and ink, like the app", () => {
    expect(ladderHex(null).fill).toBe("#f1f1f3");
    expect(ladderHex(1)).toEqual({ fill: LEVEL_HEX[1].soft, text: LEVEL_HEX[1].ink });
    expect(ladderHex(2.6)).toEqual({ fill: LEVEL_HEX[3].soft, text: LEVEL_HEX[3].ink });
    expect(ladderHex(5).fill).toBe(LEVEL_HEX[5].soft);
  });
});

describe("criticality, targets and strategic alignment (§11.4, §11.6)", () => {
  it("rates processes on 2026 focus areas High, ones with capabilities Medium, the rest Low", () => {
    expect(suggestedCriticality(FN, "Demand planning / IBP")).toBe("High");
    expect(suggestedCriticality(FN, "Order fulfilment & fill rate")).toBe("High");
    expect(suggestedCriticality(FN, "Transportation")).toBe("Medium");
    expect(suggestedCriticality(FN, "Warehousing")).toBe("Low");
  });

  it("sets targets by importance around the function's ambition, clamped to 1–5", () => {
    expect(suggestedTarget(3, "High")).toBe(4);
    expect(suggestedTarget(3, "Medium")).toBe(3);
    expect(suggestedTarget(3, "Low")).toBe(2);
    expect(suggestedTarget(5, "High")).toBe(5);
    expect(suggestedTarget(1, "Low")).toBe(1);
  });

  it("lets the consultant override criticality and target per process", () => {
    const key = processKey(FN, "Warehousing");
    expect(criticalityOf(FN, "Warehousing", { [key]: { criticality: "High" } })).toBe("High");
    expect(targetOf(FN, "Warehousing", 3, { [key]: { criticality: "High" } })).toBe(4);
    expect(targetOf(FN, "Warehousing", 3, { [key]: { target: 5 } })).toBe(5);
  });

  it("aligns ideas that hit a 2026 focus area and serve a High process", () => {
    const ctx = ideaContextFor(FN, seed.useCaseRules.rules);
    expect(ctx["uc-ml-forecast"]!.alignment).toBe(5);
    expect(ctx["uc-tms-optimiser"]!.alignment).toBe(2);
    const raised = ideaContextFor(FN, seed.useCaseRules.rules, { [processKey(FN, "Transportation")]: { criticality: "High" } });
    expect(raised["uc-tms-optimiser"]!.alignment).toBe(3);
  });

  it("places the demo ideas on the deck's matrix: transport a quick win, ML demand sensing scale now", () => {
    const r = run([...workshop, ...demo]);
    for (const i of r.ideas) expect(i.quadrant).toBe(ideaQuadrant(i.value, i.alignment));
    expect(r.ideas.find((i) => i.id === "uc-tms-optimiser")!.quadrant).toBe("Quick wins");
    expect(r.ideas.find((i) => i.id === "uc-ml-forecast")!.quadrant).toBe("Scale now");
    expect(r.targetMean).toBeGreaterThan(2.9);
  });
});


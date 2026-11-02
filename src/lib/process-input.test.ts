/** Process-ladder acceptance: the demo pack, end to end through the classifier and the engine. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { classifyDocument } from "@/lib/classifier";
import { assess, assessProcesses, type EvidenceItem } from "@/lib/engine";
import { processNarrative } from "@/lib/narrative";
import { processAreas } from "@/lib/process-areas";
import { processLens } from "@/lib/process-lens";
import { capabilityInput } from "@/lib/store/build-input";
import { DEMO_DOCS } from "@/lib/demo-evidence";
import { parseText } from "@/lib/parse-text";
import { answersForStep, assessAllFunctions, buildProcessInput, capabilitiesForStep, type CustomQuestion, l1Processes, processKey, stepForEvidence } from "@/lib/process-input";
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

  it("drops Transportation to L0 once the SOP and interviews are read", () => {
    expect(byName(before, "Transportation").level).toBe(1);
    expect(byName(after, "Transportation").level).toBe(0);
  });

  it("keeps Order fulfilment on target and flags the IBP contradiction", () => {
    expect(byName(after, "Order fulfilment & fill rate").gap).toBe(0);
    expect(byName(after, "Demand planning / IBP").flags).toContain("INCONSISTENT");
  });

  it("rates supply chain at Level 1 with a warehousing idea in Now", () => {
    expect(after.overallLevel).toBe(1);
    expect(after.ideas.find((i) => i.id === "uc-wms-visibility")?.phase).toBe("Now");
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
    expect(lines[0]).toMatch(/^Supply Chain sits at Level 1/);
    expect(lines.join(" ")).toMatch(/Transportation is furthest behind at L0, with nothing on the 2026-27 roadmap/);
    expect(lines.join(" ")).toMatch(/Start now with/);
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
    expect(answers.map((a) => [a.questionId, a.value])).toEqual([["scm-q06", 0]]);
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


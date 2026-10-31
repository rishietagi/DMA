import { describe, expect, it } from "vitest";
import { seed } from "./seed";

describe("seed integrity", () => {
  const capIds = new Set(seed.baseline.capabilities.map((c) => c.id));

  it("roadmap initiatives and dependencies reference real capabilities", () => {
    for (const i of seed.roadmap.initiatives) for (const id of i.mapsTo) expect(capIds.has(id)).toBe(true);
    for (const d of seed.roadmap.dependencies) {
      expect(capIds.has(d.from)).toBe(true);
      expect(capIds.has(d.to)).toBe(true);
    }
  });

  it("question bank: 8–15 questions for each of the 10 functions", () => {
    const fns = seed.questionBank.functions.filter((f) => f.functionId !== "*");
    expect(fns).toHaveLength(10);
    for (const f of fns) {
      expect(f.questions.length).toBeGreaterThanOrEqual(8);
      expect(f.questions.length).toBeLessThanOrEqual(15);
      expect(f.l1Chain.length).toBeGreaterThan(0);
    }
  });

  it("every capability has at least one Process and one Data question (§4)", () => {
    const qs = seed.questionBank.functions.flatMap((f) => f.questions);
    for (const id of capIds) {
      for (const dim of ["process", "data"] as const)
        expect(qs.some((q) => q.dimension === dim && q.capabilityIds.includes(id)), `${id} ${dim}`).toBe(true);
    }
  });

  it("question ids are unique and capability ids valid", () => {
    const qs = seed.questionBank.functions.flatMap((f) => f.questions);
    expect(new Set(qs.map((q) => q.id)).size).toBe(qs.length);
    for (const q of qs) for (const id of q.capabilityIds) expect(id === "*" || capIds.has(id)).toBe(true);
  });

  it("use-case rules: ~25 rules covering every function, valid capability ids and dependsOn", () => {
    const rules = seed.useCaseRules.rules;
    expect(rules.length).toBeGreaterThanOrEqual(25);
    const ruleIds = new Set(rules.map((r) => r.id));
    const fns = new Set<string>();
    for (const r of rules) {
      for (const id of r.when.capabilityIds) {
        expect(capIds.has(id)).toBe(true);
        fns.add(seed.baseline.capabilities.find((c) => c.id === id)!.primaryFunctionId);
      }
      for (const d of r.useCase.dependsOn) expect(ruleIds.has(d)).toBe(true);
    }
    expect(fns.size).toBe(10);
  });

  it("demo data is labelled Illustrative", () => {
    expect(seed.demoResponses.meta.label).toBe("Illustrative");
  });
});

import { describe, expect, it } from "vitest";
import { seed } from "@/lib/seed";
import { normaliseWeights } from "./aggregate";
import { assess } from "./assess";
import { baselineInput, demoInput } from "./fixtures.test-utils";
import { formatMean, formatPct } from "./format";

describe("baseline mode — deck KPIs (acceptance)", () => {
  const r = assess(baselineInput());
  const ent = r.kpis.enterprise;

  it("enterprise = 21 capabilities", () => expect(ent.capabilities).toBe(21));
  it("mean 2.2619 → displays 2.3", () => {
    expect(ent.mean).toBeCloseTo(2.2619, 4);
    expect(formatMean(ent.mean)).toBe("2.3");
  });
  it("42.9% at ≤ 2 → displays 43%", () => {
    expect(ent.pctAtOrBelow2).toBeCloseTo(9 / 21, 10);
    expect(formatPct(ent.pctAtOrBelow2)).toBe("43%");
  });
  it("0 at level 5", () => expect(ent.countAt5).toBe(0));
  it("every capability score equals its self score and lacks evidence", () => {
    for (const c of r.capabilities) {
      expect(c.evidenceScore).toBe(c.self);
      expect(c.flags[0]?.kind).toBe("LACKS_EVIDENCE");
    }
  });
  it("ignores loaded responses and evidence in baseline mode", () => {
    const r2 = assess(demoInput({ mode: "baseline" }));
    expect(r2.kpis.enterprise.mean).toBe(ent.mean);
  });
});

describe("aggregation (§5)", () => {
  it("a shared capability counts once in KPIs but in each function it spans", () => {
    const r = assess(baselineInput());
    // sales-demand-forecasting spans 4 sales functions; 41 unique capabilities overall
    expect(r.kpis.all.capabilities).toBe(41);
    const fnCaps = r.functions.flatMap((f) => f.capabilityIds);
    expect(fnCaps.filter((id) => id === "sales-demand-forecasting")).toHaveLength(4);
    expect(fnCaps.filter((id) => id === "mdm")).toHaveLength(2);
    const nmt = r.functions.find((f) => f.fn.id === "sales-nmt")!;
    // nmt: order induction 2, appointment 1, reconciliation 1, forecasting 1.5, T&E 3, control tower 3
    expect(nmt.score).toBeCloseTo((2 + 1 + 1 + 1.5 + 3 + 3) / 6, 10);
  });

  it("a weight change recalculates the capability score", () => {
    const a = assess(demoInput()).byId["gt-reco-beat"]!;
    const b = assess(demoInput({ weights: { process: 1, data: 0, ai: 0, people: 0 } })).byId["gt-reco-beat"]!;
    expect(b.evidenceScore).toBe(a.dimensions.process!.final);
    expect(b.evidenceScore).not.toBe(a.evidenceScore);
  });

  it("weights normalise over scored dimensions", () => {
    expect(normaliseWeights({ process: 0.35, data: 0.25, ai: 0.2, people: 0.2 }, ["process", "data"])).toEqual({
      process: 0.35 / 0.6,
      data: 0.25 / 0.6,
    });
    expect(normaliseWeights({ process: 0, data: 0, ai: 0, people: 0 }, ["ai", "people"])).toEqual({ ai: 0.5, people: 0.5 });
  });

  it("an override pins the effective score; an acceptance follows the evidence score", () => {
    const v = (kind: "accepted" | "overridden", after: number) => ({
      capabilityId: "gt-reco-beat",
      kind,
      before: 3.35,
      after,
      rationale: "Adoption evidence reviewed with the GT lead",
      by: "Consultant",
      at: "2026-10-01T10:00:00.000Z",
    });
    const over = assess(demoInput({ validations: { "gt-reco-beat": v("overridden", 4) } })).byId["gt-reco-beat"]!;
    expect(over.effectiveScore).toBe(4);
    expect(over.status).toBe("overridden");
    const acc = assess(
      demoInput({ validations: { "gt-reco-beat": v("accepted", 3.35) }, weights: { process: 1, data: 1, ai: 1, people: 1 } }),
    ).byId["gt-reco-beat"]!;
    expect(acc.status).toBe("accepted");
    expect(acc.effectiveScore).toBe(acc.evidenceScore);
  });

  it("excluded capabilities drop out of KPIs", () => {
    const r = assess(baselineInput({ excludedCapabilityIds: ["hr-analytics"] }));
    expect(r.kpis.enterprise.capabilities).toBe(20);
    expect(r.byId["hr-analytics"]!.inScope).toBe(false);
  });

  it("is deterministic", () => {
    expect(JSON.stringify(assess(demoInput()))).toBe(JSON.stringify(assess(demoInput())));
  });
});

describe("capability flags", () => {
  const r = assess(demoInput());
  it("SELF_VARIANCE fires for gt-reco-beat (self 5 vs evidence ~3.5)", () => {
    expect(r.byId["gt-reco-beat"]!.flags.some((f) => f.kind === "SELF_VARIANCE")).toBe(true);
  });
  it("SELF_VARIANCE does not fire within ±1", () => {
    expect(r.byId["gt-dms"]!.flags.some((f) => f.kind === "SELF_VARIANCE")).toBe(false);
  });
  it("LOW_COVERAGE fires when an expected category is missing for the function", () => {
    const withCov = assess(demoInput({ evidenceCategoriesByFunction: { hr: ["process_docs"] } }));
    const flag = withCov.byId["hr-analytics"]!.flags.find((f) => f.kind === "LOW_COVERAGE");
    expect(flag).toBeDefined();
    expect(flag && "missing" in flag && flag.missing).toContain("kpi_extracts");
    expect(r.byId["hr-analytics"]!.flags.some((f) => f.kind === "LOW_COVERAGE")).toBe(false);
  });
});

describe("demo responses (Illustrative) land on the intended variances", () => {
  const r = assess(demoInput());
  it.each([
    ["gt-reco-beat", 3.5],
    ["sales-control-tower", 2.5],
    ["proc-invoice-automation", 3],
  ])("%s ≈ %d", (id, expected) => {
    expect(Math.abs(r.byId[id]!.evidenceScore - expected)).toBeLessThanOrEqual(0.25);
  });
  it("most capabilities land within ±0.5 of the self score", () => {
    const within = r.capabilities.filter((c) => Math.abs(c.evidenceScore - c.self) <= 0.5).length;
    expect(within / r.capabilities.length).toBeGreaterThanOrEqual(0.8);
  });
  it("every demo response references a real question", () => {
    const ids = new Set(seed.questionBank.functions.flatMap((f) => f.questions.map((q) => q.id)));
    for (const resp of seed.demoResponses.responses) expect(ids.has(resp.questionId)).toBe(true);
  });
});

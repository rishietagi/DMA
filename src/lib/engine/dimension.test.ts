import { describe, expect, it } from "vitest";
import {
  confidence,
  confidenceBand,
  findInconsistency,
  gateCap,
  isGateSatisfied,
  rawScore,
  scoreDimension,
} from "./dimension";
import { dataDim, ind, peopleDim, processDim } from "./fixtures.test-utils";

describe("rawScore (§3.2)", () => {
  it("is the reliability- and weight-weighted mean", () => {
    // (3·0.85·2 + 2·1.0·3) / (3·0.85 + 2·1.0) = (5.1 + 6) / 4.55
    const r = rawScore([
      ind({ level: 2, weight: 3, sourceType: "questionnaire" }),
      ind({ level: 3, weight: 2, sourceType: "artifact" }),
    ]);
    expect(r).toBeCloseTo(11.1 / 4.55, 10);
  });
  it("ignores N/A (null) indicators and returns null when nothing is scored", () => {
    expect(rawScore([ind({ level: null, sourceType: "questionnaire" })])).toBeNull();
    expect(rawScore([ind({ level: 4, sourceType: "kpi" }), ind({ level: null, sourceType: "kpi" })])).toBe(4);
  });
});

describe("gating (§3.3)", () => {
  it("does not apply without evidence (self-assessment only)", () => {
    expect(gateCap(processDim, [ind({ level: 3, sourceType: "self_assessment" })])).toBeNull();
  });
  it("does not apply to a dimension without gates (People)", () => {
    expect(gateCap(peopleDim, [ind({ level: 4, sourceType: "interview", dimension: "people" })])).toBeNull();
  });
  it("caps at 2 when the L3 integration gate is missing", () => {
    const g = gateCap(processDim, [
      ind({ level: 3, sourceType: "questionnaire" }),
      ind({ level: 2, sourceType: "artifact" }),
      ind({ level: 2, sourceType: "artifact" }),
    ]);
    expect(g).toEqual({ cap: 2, missingGate: "process.system_integration" });
  });
  it("adds 0.5 when at least half the indicators sit at the next level", () => {
    const g = gateCap(processDim, [
      ind({ level: 4, sourceType: "questionnaire" }),
      ind({ level: 3, sourceType: "artifact" }),
    ]);
    expect(g).toEqual({ cap: 2.5, missingGate: "process.system_integration" });
  });
  it("is satisfied by a gate indicator at or above the level", () => {
    const list = [ind({ level: 3, sourceType: "artifact", gateKey: "process.system_integration" })];
    expect(isGateSatisfied(processDim, "process.system_integration", 3, list)).toBe(true);
    expect(gateCap(processDim, list)?.cap).toBe(3);
  });
  it("treats a higher gate met at its own level as implying the foundation", () => {
    const list = [ind({ level: 4, sourceType: "kpi", gateKey: "process.rule_automation" })];
    expect(isGateSatisfied(processDim, "process.system_integration", 3, list)).toBe(true);
    expect(gateCap(processDim, list)?.cap).toBe(4);
  });
  it("a gate answered below its level does not satisfy it", () => {
    const list = [ind({ level: 2, sourceType: "questionnaire", gateKey: "process.system_integration" })];
    expect(isGateSatisfied(processDim, "process.system_integration", 3, list)).toBe(false);
  });
});

describe("scoreDimension raw → gated → final", () => {
  it("rounds to the nearest half-point", () => {
    const ds = scoreDimension("cap", processDim, [
      ind({ level: 3, weight: 3, sourceType: "questionnaire", gateKey: "process.system_integration" }),
      ind({ level: 2, weight: 1, sourceType: "self_assessment" }),
    ])!;
    // raw = (2.55·3 + 0.5·2) / 3.05 = 2.836 → 3.0
    expect(ds.raw).toBeCloseTo(8.65 / 3.05, 10);
    expect(ds.gated).toBe(ds.raw);
    expect(ds.final).toBe(3);
  });
  it("applies the gate cap and raises GATED", () => {
    const ds = scoreDimension("cap", processDim, [
      ind({ level: 4, weight: 3, sourceType: "questionnaire" }),
      ind({ level: 4, weight: 2, sourceType: "artifact" }),
    ])!;
    expect(ds.raw).toBe(4);
    expect(ds.gated).toBe(2.5);
    expect(ds.final).toBe(2.5);
    expect(ds.flags).toContainEqual({ kind: "GATED", cappedAt: 2.5, missingGate: "system integration" });
  });
  it("with only a self-assessment: raw = self and LACKS_EVIDENCE", () => {
    const ds = scoreDimension("cap", dataDim, [ind({ level: 2.5, sourceType: "self_assessment", dimension: "data" })])!;
    expect(ds.final).toBe(2.5);
    expect(ds.hasEvidence).toBe(false);
    expect(ds.flags.map((f) => f.kind)).toEqual(["LACKS_EVIDENCE"]);
  });
  it("clamps final to [1, 5]", () => {
    const ds = scoreDimension("cap", peopleDim, [ind({ level: 5, sourceType: "kpi", dimension: "people" })])!;
    expect(ds.final).toBe(5);
  });
});

describe("confidence (§3.5)", () => {
  it("bands at the 0.50 and 0.75 boundaries", () => {
    expect(confidenceBand(0.75)).toBe("high");
    expect(confidenceBand(0.7499)).toBe("medium");
    expect(confidenceBand(0.5)).toBe("medium");
    expect(confidenceBand(0.4999)).toBe("low");
  });
  it("combines coverage, agreement and quality", () => {
    const c = confidence([
      ind({ level: 3, sourceType: "artifact" }),
      ind({ level: 3, sourceType: "kpi" }),
    ]);
    expect(c).toMatchObject({ coverage: 1, agreement: 1, quality: 1, value: 1, band: "high" });
  });
  it("self-assessment alone is low confidence (0.45)", () => {
    const c = confidence([ind({ level: 2, sourceType: "self_assessment" })]);
    expect(c.value).toBeCloseTo(0.45, 10);
    expect(c.band).toBe("low");
  });
  it("agreement drops with spread (stdev / 2)", () => {
    const c = confidence([ind({ level: 1, sourceType: "artifact" }), ind({ level: 3, sourceType: "artifact" })], 1);
    // stdev = 1 → agreement 0.5; coverage 1/1; quality 1 → 0.4 + 0.15 + 0.3
    expect(c.agreement).toBeCloseTo(0.5, 10);
    expect(c.value).toBeCloseTo(0.85, 10);
  });
});

describe("flags (§3.6)", () => {
  it("INCONSISTENT fires for a ≥2-level gap with an objective source", () => {
    const f = findInconsistency([
      ind({ id: "a", level: 4, sourceType: "interview", sourceRef: { docId: "n", stakeholder: "Head of E-commerce" } }),
      ind({ id: "b", level: 1, sourceType: "artifact", sourceRef: { docId: "s", docTitle: "O2C SOP" } }),
    ]);
    expect(f).toMatchObject({ kind: "INCONSISTENT", indicatorIds: ["a", "b"] });
  });
  it("INCONSISTENT does not fire between two affirmations, or for a 1-level gap", () => {
    expect(
      findInconsistency([ind({ level: 4, sourceType: "interview" }), ind({ level: 1, sourceType: "questionnaire" })]),
    ).toBeNull();
    expect(findInconsistency([ind({ level: 3, sourceType: "artifact" }), ind({ level: 2, sourceType: "kpi" })])).toBeNull();
  });
  it("INCONSISTENT ignores the self-assessment (SELF_VARIANCE covers it)", () => {
    expect(
      findInconsistency([ind({ level: 5, sourceType: "self_assessment" }), ind({ level: 2, sourceType: "artifact" })]),
    ).toBeNull();
  });
  it("LACKS_EVIDENCE fires with affirmations only and not with good objective evidence", () => {
    const affirm = scoreDimension("cap", peopleDim, [ind({ level: 3, sourceType: "interview", dimension: "people" })])!;
    expect(affirm.flags.some((f) => f.kind === "LACKS_EVIDENCE")).toBe(true);
    const solid = scoreDimension("cap", peopleDim, [
      ind({ level: 3, sourceType: "artifact", dimension: "people" }),
      ind({ level: 3, sourceType: "kpi", dimension: "people" }),
    ])!;
    expect(solid.flags).toEqual([]);
  });
});

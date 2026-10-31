import { describe, expect, it } from "vitest";
import { assess } from "./assess";
import { baselineInput, demoInput } from "./fixtures.test-utils";
import {
  alignmentFor,
  feasibilityScore,
  priorityScore,
  quadrantFor,
  riskScore,
  valueScore,
} from "./prioritise";
import { phaseUseCases, topoSort } from "./usecases";

describe("component scores (§6.2)", () => {
  it("value caps at 5", () => {
    expect(valueScore({ priorityLinked: true, revenueFacing: true, painItems: 2 })).toBe(5);
    expect(valueScore({ priorityLinked: false, revenueFacing: false, painItems: 1 })).toBe(2);
  });
  it("feasibility = 1 + round(data) − unmet dep + initiative, clamped", () => {
    expect(feasibilityScore({ dataScore: 2.5, hasUnmetDependency: false, initiativeUnderway: false })).toBe(4);
    expect(feasibilityScore({ dataScore: 1, hasUnmetDependency: true, initiativeUnderway: false })).toBe(1);
    expect(feasibilityScore({ dataScore: 5, hasUnmetDependency: false, initiativeUnderway: true })).toBe(5);
  });
  it("risk adds people ≤ 2, low confidence and > 2 functions", () => {
    expect(riskScore({ peopleScore: 2, lowConfidence: true, functionCount: 4 })).toBe(4);
    expect(riskScore({ peopleScore: 3, lowConfidence: false, functionCount: 1 })).toBe(1);
  });
  it("priority formula (§6.3)", () => {
    expect(priorityScore(4, 5, 5, 1)).toBeCloseTo(100, 10);
    expect(priorityScore(0, 5, 5, 1)).toBe(0);
  });
  it("quadrants", () => {
    expect(quadrantFor(4, 3)).toBe("Quick win");
    expect(quadrantFor(4, 2)).toBe("Strategic bet");
    expect(quadrantFor(3, 3)).toBe("Fill-in");
    expect(quadrantFor(3, 2)).toBe("Deprioritise");
  });
  it("alignment precedence", () => {
    const i = (status: "completed" | "in_progress" | "planned") => ({
      id: "x",
      functionId: "finance" as const,
      title: "x",
      status,
      mapsTo: [],
    });
    expect(alignmentFor(1, [])).toBe("WHITESPACE");
    expect(alignmentFor(0.5, [])).toBe("AT_TARGET");
    expect(alignmentFor(1.5, [i("completed")])).toBe("REVISIT");
    expect(alignmentFor(2, [i("planned")])).toBe("ACCELERATE");
    expect(alignmentFor(2.5, [i("in_progress")])).toBe("ACCELERATE");
    expect(alignmentFor(1, [i("in_progress")])).toBe("ON_TRACK");
    expect(alignmentFor(1, [i("planned")])).toBe("PLANNED");
  });
});

describe("three known seed capabilities in baseline mode", () => {
  const r = assess(baselineInput());
  it("ecom-reconciliation: gap 3, strategic bet, accelerate (Finifi in progress)", () => {
    const o = r.opportunities["ecom-reconciliation"]!;
    expect(o).toMatchObject({ target: 4, gap: 3, value: 5, feasibility: 2, risk: 3, quadrant: "Strategic bet", alignment: "ACCELERATE" });
    expect(o.unmetDependencies).toEqual(["ecom-order-induction"]);
    expect(o.priority).toBeCloseTo(55.5, 10);
  });
  it("fin-reconciliation: whitespace, deprioritise", () => {
    const o = r.opportunities["fin-reconciliation"]!;
    expect(o).toMatchObject({ target: 3, gap: 2, value: 2, feasibility: 2, risk: 3, quadrant: "Deprioritise", alignment: "WHITESPACE" });
    expect(o.priority).toBeCloseTo(22, 10);
  });
  it("mkt-dam: whitespace, fill-in", () => {
    const o = r.opportunities["mkt-dam"]!;
    expect(o).toMatchObject({ target: 3.5, gap: 1.5, value: 3, feasibility: 3, risk: 3, quadrant: "Fill-in", alignment: "WHITESPACE" });
    expect(o.priority).toBeCloseTo(22.5, 10);
  });
  it("whitespace list is exactly DAM, TMS, Finance reconciliation, HR analytics (acceptance)", () => {
    const ws = Object.values(r.opportunities)
      .filter((o) => o.alignment === "WHITESPACE")
      .map((o) => o.capabilityId)
      .sort();
    expect(ws).toEqual(["fin-reconciliation", "hr-analytics", "mkt-dam", "scm-tms"]);
  });
});

describe("roadmap phasing (§6.6)", () => {
  const order = { Now: 0, Next: 1, Later: 2 } as const;
  for (const [name, input] of [
    ["baseline", baselineInput()],
    ["demo evidence", demoInput()],
  ] as const) {
    it(`never schedules a use case before its dependency (${name})`, () => {
      const ucs = assess(input).useCases;
      expect(ucs.length).toBeGreaterThan(10);
      const byId = new Map(ucs.map((u) => [u.id, u]));
      for (const u of ucs)
        for (const d of u.dependsOn) {
          const dep = byId.get(d);
          if (dep) {
            expect(order[dep.phase]).toBeLessThanOrEqual(order[u.phase]);
            expect(dep.order).toBeLessThan(u.order);
          }
        }
    });
  }

  it("pulls a prerequisite forward to its dependent's phase", () => {
    const opp = {} as never;
    const mk = (id: string, priority: number, dependsOn: string[] = []) => ({
      id, priority, dependsOn, feasibility: 3, primaryCapabilityId: id,
    }) as never;
    const out = phaseUseCases([mk("a", 10), mk("b", 50, ["a"])], opp);
    const a = out.find((u) => u.id === "a")!;
    const b = out.find((u) => u.id === "b")!;
    expect(b.phase).toBe("Now");
    expect(a.phase).toBe("Now");
    expect(a.pulledForward).toBe(true);
  });

  it("topoSort orders dependencies first", () => {
    const s = topoSort([
      { id: "c", dependsOn: ["b"], priority: 90 },
      { id: "b", dependsOn: ["a"], priority: 50 },
      { id: "a", dependsOn: [], priority: 10 },
    ]);
    expect(s.map((x) => x.id)).toEqual(["a", "b", "c"]);
  });

  it("generates de-duplicated use cases with triggering gaps", () => {
    const ucs = assess(demoInput()).useCases;
    expect(new Set(ucs.map((u) => u.id)).size).toBe(ucs.length);
    for (const u of ucs) expect(u.triggers.every((t) => t.gap > 0)).toBe(true);
  });
});

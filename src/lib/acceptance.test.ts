/** Phase 2 + 3 acceptance tests that run the classifier and engine end to end. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { classifyDocument, findContradictions, themeMatrix } from "@/lib/classifier";
import { assess, DEFAULT_WEIGHTS, formatScore, type EvidenceItem } from "@/lib/engine";
import { DEMO_DOCS } from "@/lib/demo-evidence";
import { parseText } from "@/lib/parse-text";
import { seed } from "@/lib/seed";
import { coverageByFunction } from "@/lib/store/build-input";

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
const run = (evidence: EvidenceItem[]) =>
  assess({ ...seed, mode: "evidence", weights: DEFAULT_WEIGHTS, responses: seed.demoResponses.responses, evidence });

const upload = classifyDocument({
  id: "upload-recon",
  title: "Finance team procedures",
  category: "process_docs",
  segments: parseText(
    "procedures.md",
    "Finance team procedures for the month-end close and the general ledger.\n\nReconciliation is done manually in Excel every week.",
  ),
});

describe("phase 2 acceptance — uploading a reconciliation statement", () => {
  it("creates an L1 process evidence item on fin-reconciliation", () => {
    expect(upload).toContainEqual(
      expect.objectContaining({ capabilityId: "fin-reconciliation", dimension: "process", level: 1, polarity: "pain", sourceType: "artifact" }),
    );
  });

  it.each([
    ["the workshop pack only", workshop],
    ["after the demo evidence pack", [...workshop, ...demo]],
  ])("visibly moves the fin-reconciliation score (%s)", (_, base) => {
    const before = run(base).byId["fin-reconciliation"]!;
    const after = run([...base, ...upload]).byId["fin-reconciliation"]!;
    expect(after.evidenceScore).toBeLessThan(before.evidenceScore);
    expect(formatScore(after.dimensions.process!.final)).not.toBe(formatScore(before.dimensions.process!.final));
  });

  it("negated phrases do not produce false high levels", () => {
    const items = classifyDocument({
      id: "neg",
      title: "AP note",
      category: "process_docs",
      segments: [{ text: "Vendor invoice matching is not yet automated. Settlement disputes are never auto-matched.", location: "¶1" }],
    });
    expect(items.every((i) => i.level === null || i.level < 4)).toBe(true);
  });
});

describe("demo evidence pack (Illustrative)", () => {
  it("covers all 9 evidence categories with the workshop pack", () => {
    const cats = new Set([...DEMO_DOCS.map((d) => d.category), ...workshop.map((w) => w.category), "self_assessment"]);
    expect(cats.size).toBe(9);
  });
  it("surfaces at least two contradictions", () => {
    const c = findContradictions([...workshop, ...demo]);
    expect(new Set(c.map((x) => x.capabilityId)).size).toBeGreaterThanOrEqual(2);
    expect(c.map((x) => x.capabilityId)).toEqual(expect.arrayContaining(["ecom-order-induction", "scm-ibp"]));
  });
  it("shows manual reconciliation as a cross-functional theme (Finance, NMT, E-com)", () => {
    const t = themeMatrix([...workshop, ...demo]).find((x) => x.themeId === "manual-reconciliation")!;
    expect(Object.keys(t.byFunction).sort()).toEqual(["finance", "sales-ecom", "sales-nmt"]);
  });
  it("leaves HR without a KPI extract (designed coverage gap)", () => {
    const cov = coverageByFunction([...workshop, ...demo], []);
    expect(cov.hr ?? []).not.toContain("kpi_extracts");
  });
  it("keeps most scores within ±0.5 of the self-assessment and raises confidence", () => {
    const r = run([...workshop, ...demo]);
    const within = r.capabilities.filter((c) => Math.abs(c.evidenceScore - c.self) <= 0.5).length;
    expect(within).toBeGreaterThanOrEqual(33);
    expect(r.kpis.all.highConfidence).toBeGreaterThanOrEqual(8);
  });
});

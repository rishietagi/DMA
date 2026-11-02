import { describe, expect, it } from "vitest";
import type { ParsedDocument } from "@/lib/ai/types";
import type { EvidenceItem } from "@/lib/engine/types";
import { classifyDocument, classifySegment, levelSignal, matchCues, splitSentences, tagCapability } from "./classify";
import { findContradictions, fragmentationIndex, isManualWorkaround, recurringThemes, themeMatrix } from "./insights";

const doc = (text: string, over: Partial<ParsedDocument> = {}): ParsedDocument => ({
  id: "d1",
  title: "Test doc",
  category: "process_docs",
  segments: text.split("\n\n").map((t, i) => ({ text: t, location: `¶${i + 1}` })),
  ...over,
});

const SENTENCE = "Reconciliation is done manually in Excel every week.";

describe("classifier (§7, §9)", () => {
  it("finance context → fin-reconciliation, process, L1, pain", () => {
    const items = classifyDocument(
      doc(`Finance month-end close: the controller reviews GL balances and the MIS pack.\n\n${SENTENCE}`),
    );
    const item = items.find((i) => i.quote === SENTENCE);
    expect(item).toMatchObject({
      capabilityId: "fin-reconciliation",
      dimension: "process",
      level: 1,
      polarity: "pain",
      functionId: "finance",
      sourceType: "artifact",
      gateKey: "process.system_integration",
    });
  });

  it("the same sentence in a marketplace document → ecom-reconciliation", () => {
    const items = classifyDocument(
      doc(`Amazon and Flipkart marketplace settlement reports are downloaded from the seller portal.\n\n${SENTENCE}`),
    );
    expect(items.find((i) => i.quote === SENTENCE)?.capabilityId).toBe("ecom-reconciliation");
  });

  it("negation: 'invoice matching is not yet automated' must not emit L4", () => {
    const sig = levelSignal("Invoice matching is not yet automated.");
    expect(sig.level).not.toBe(4);
    expect(sig.negatedCues).toContain("automated");
    const c = classifySegment("Vendor invoice matching is not yet automated.", { docFunction: "procurement" });
    expect(c?.level ?? null).not.toBe(4);
    expect(c?.polarity).toBe("pain");
  });

  it("negation does not leak beyond its 3-token window", () => {
    expect(levelSignal("There is no backlog because invoices are automatically matched.").level).toBe(4);
  });

  it("takes the weakest level when cues conflict (manual workaround)", () => {
    expect(levelSignal("POs are downloaded from the seller portal and keyed into SAP.").level).toBe(1);
  });

  it("system names resolve straight to capabilities", () => {
    expect(tagCapability("Leap syncs stock nightly", null).capabilityId).toBe("gt-dms");
    expect(tagCapability("Claims raised in Saksham", "sales-gt").capabilityId).toBe("gt-sfa");
  });

  it("longest match wins (supply chain ≠ chain)", () => {
    expect(matchCues("supply chain planning", ["chain", "supply chain"]).map((m) => m.cue)).toEqual(["supply chain"]);
  });

  it("dimension cues route data / people / ai", () => {
    expect(levelSignal("The fill-rate dashboard is compiled in Excel.").dimension).toBe("data");
    expect(levelSignal("Only 40% of reps are trained on Saksham.").dimension).toBe("people");
    expect(levelSignal("A GenAI pilot drafts PDP copy.").dimension).toBe("ai");
    expect(levelSignal("A GenAI pilot drafts PDP copy.").level).toBe(2);
  });

  it("segments sentences and drops fragments", () => {
    expect(splitSentences("First sentence here. Second one follows!\n- short\n- A bullet that is long enough")).toEqual([
      "First sentence here.",
      "Second one follows!",
      "A bullet that is long enough",
    ]);
  });

  it("keeps a function-level signal when no capability matches (process ladder, §11)", () => {
    const c = classifySegment("Cycle counts in the depots are recorded on paper and keyed into Excel.", { docFunction: null });
    expect(c).toMatchObject({ functionId: "supply-chain", capabilityId: null, dimension: "process", level: 1 });
  });

  it("drops a sentence with no capability unless it names its own function", () => {
    expect(classifySegment("Counts are recorded on paper and keyed into Excel.", { docFunction: "supply-chain" })).toBeNull();
    expect(classifySegment("The depots are being repainted this year.", { docFunction: null })).toBeNull();
  });
});

const ev = (p: Partial<EvidenceItem>): EvidenceItem => ({
  id: Math.random().toString(36),
  docId: "d",
  docTitle: "d",
  category: "interview_notes",
  sourceType: "interview",
  location: "¶1",
  quote: "",
  functionId: "sales-ecom",
  capabilityId: "ecom-order-induction",
  dimension: "process",
  level: 4,
  polarity: "strength",
  weight: 2,
  cues: [],
  ...p,
});

describe("interview intelligence & process analysis", () => {
  it("contradiction: interview L4 vs SOP L1 on the same capability", () => {
    const c = findContradictions([
      ev({ docId: "n1", stakeholder: "Head of E-commerce", level: 4 }),
      ev({ docId: "sop", sourceType: "artifact", category: "process_docs", level: 1, polarity: "pain" }),
    ]);
    expect(c).toHaveLength(1);
    expect(c[0]).toMatchObject({ kind: "stakeholder-vs-artefact", diff: 3 });
  });
  it("no contradiction within 1 level", () => {
    expect(findContradictions([ev({ docId: "a", stakeholder: "A", level: 3 }), ev({ docId: "b", stakeholder: "B", level: 2 })])).toEqual([]);
  });
  it("recurring theme needs ≥ 2 stakeholders", () => {
    const items = [ev({ stakeholder: "A", polarity: "pain" }), ev({ stakeholder: "B", polarity: "pain" }), ev({ stakeholder: "A", polarity: "strength" })];
    const t = recurringThemes(items);
    expect(t).toHaveLength(1);
    expect(t[0]!.polarity).toBe("pain");
  });
  it("theme matrix counts pain items by function", () => {
    const m = themeMatrix([
      ev({ polarity: "pain", themes: ["manual-reconciliation"], functionId: "finance" }),
      ev({ polarity: "pain", themes: ["manual-reconciliation"], functionId: "sales-ecom" }),
    ]);
    expect(m[0]).toMatchObject({ themeId: "manual-reconciliation", total: 2 });
  });
  it("manual workaround = L1 cue next to a system name", () => {
    expect(isManualWorkaround(ev({ level: 1, quote: "Downloaded from SAP and reworked in Excel." }))).toBe(true);
    expect(isManualWorkaround(ev({ level: 1, quote: "Tracked in Excel." }))).toBe(false);
  });
  it("fragmentation index", () => {
    expect(
      fragmentationIndex([
        { step: "a", level: 1, systems: ["SAP", "Excel"], workarounds: [ev({})], handoffs: 1, evidence: [] },
        { step: "b", level: 2, systems: ["SAP"], workarounds: [], handoffs: 0, evidence: [] },
      ]),
    ).toBe((2 + 2) / 2);
  });
});

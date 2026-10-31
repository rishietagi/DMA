/**
 * Dev tool: classifies the demo evidence pack and shows what it does to the scores.
 * `pnpm tsx scripts/demo-evidence-report.ts [--items]`
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { classifyDocument, countNegated, findContradictions, themeMatrix } from "@/lib/classifier";
import { assess, DEFAULT_WEIGHTS, formatDelta, formatScore, type EvidenceItem } from "@/lib/engine";
import { DEMO_DOCS } from "@/lib/demo-evidence";
import { parseText } from "@/lib/parse-text";
import { seed } from "@/lib/seed";

const showItems = process.argv.includes("--items");
const workshop: EvidenceItem[] = seed.demoResponses.evidence.map((e) => ({
  ...e,
  functionId: seed.baseline.capabilities.find((c) => c.id === e.capabilityId)!.primaryFunctionId,
  cues: [],
}));

const demo: EvidenceItem[] = [];
for (const d of DEMO_DOCS) {
  const text = readFileSync(join("public/demo-evidence", d.fileName), "utf8");
  const doc = { id: d.id, title: d.title, category: d.category, segments: parseText(d.fileName, text), stakeholder: d.stakeholder };
  const items = classifyDocument(doc);
  demo.push(...items);
  console.log(`\n## ${d.title} — ${doc.segments.length} segments, ${items.length} items, ${countNegated(doc)} negated`);
  if (showItems)
    for (const i of items)
      console.log(`  ${(i.capabilityId ?? "-").padEnd(24)} ${String(i.dimension).padEnd(7)} L${i.level ?? "-"} ${i.polarity.padEnd(8)} ${i.quote.slice(0, 90)}`);
}

const base = { ...seed, weights: DEFAULT_WEIGHTS, mode: "evidence" as const, responses: seed.demoResponses.responses };
const before = assess({ ...base, evidence: workshop });
const after = assess({ ...base, evidence: [...workshop, ...demo] });
console.log("\n## Score changes after demo evidence");
let within = 0;
for (const c of after.capabilities) {
  const b = before.byId[c.capability.id]!;
  if (Math.abs(c.evidenceScore - c.self) <= 0.5) within++;
  const flags = [...new Set(c.flags.map((f) => f.kind))].join(",");
  if (formatScore(b.evidenceScore) !== formatScore(c.evidenceScore) || c.confidenceBand === "high" || Math.abs(c.evidenceScore - c.self) > 0.5)
    console.log(
      `${c.capability.id.padEnd(26)} self ${formatScore(c.self)}  ${formatScore(b.evidenceScore)} → ${formatScore(c.evidenceScore)} (${c.evidenceScore.toFixed(2)}, Δself ${formatDelta(c.evidenceScore - c.self)})  ${c.confidenceBand} ${c.confidence.toFixed(2)}  ${flags}`,
    );
}
console.log(`within ±0.5 of self: ${within}/41; high confidence: ${after.kpis.all.highConfidence}`);
console.log("\n## Contradictions");
for (const x of findContradictions([...workshop, ...demo]))
  console.log(`  ${x.capabilityId} ${x.kind} L${x.a.level} (${x.a.stakeholder ?? x.a.docTitle}) vs L${x.b.level} (${x.b.stakeholder ?? x.b.docTitle})`);
console.log("\n## Themes");
for (const t of themeMatrix([...workshop, ...demo]).filter((t) => t.total > 0))
  console.log(`  ${t.label}: ${t.total} — ${Object.entries(t.byFunction).map(([f, l]) => `${f} ${l!.length}`).join(", ")}`);
console.log("\n## Whitespaces");
console.log(Object.values(after.opportunities).filter((o) => o.alignment === "WHITESPACE").map((o) => o.capabilityId).join(", "));

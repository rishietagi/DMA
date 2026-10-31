/**
 * Dev tool: prints self vs evidence scores for the demo session so the Illustrative demo
 * data can be checked against the intended variances. `pnpm calibrate`
 */
import { assess, DEFAULT_WEIGHTS, formatDelta, formatMean, formatPct, formatScore } from "@/lib/engine";
import { seed } from "@/lib/seed";

const r = assess({
  ...seed,
  mode: "evidence",
  weights: DEFAULT_WEIGHTS,
  responses: seed.demoResponses.responses,
  evidence: seed.demoResponses.evidence.map((e) => ({ ...e, functionId: null, cues: [] })),
});

let within = 0;
for (const c of r.capabilities) {
  const d = c.evidenceScore - c.self;
  if (Math.abs(d) <= 0.5) within++;
  const dims = (["process", "data", "ai", "people"] as const)
    .map((k) => `${k[0]}${formatScore(c.dimensions[k]?.final)}`)
    .join(" ");
  const flags = [...new Set(c.flags.map((f) => f.kind))].join(",");
  console.log(
    `${c.capability.id.padEnd(26)} self ${formatScore(c.self)} ev ${c.evidenceScore.toFixed(2)} (${formatScore(c.evidenceScore)}) Δ ${formatDelta(d).padStart(5)}  ${dims}  conf ${c.confidence.toFixed(2)} ${c.confidenceBand.padEnd(6)} ${flags}`,
  );
}
console.log(`\nwithin ±0.5: ${within}/${r.capabilities.length}`);
for (const k of ["all", "cpd", "enterprise"] as const)
  console.log(k, formatMean(r.kpis[k].mean), formatPct(r.kpis[k].pctAtOrBelow2), "high conf", r.kpis[k].highConfidence);
console.log("\nUse cases:");
for (const u of r.useCases)
  console.log(`${u.phase.padEnd(5)} ${u.priority.toFixed(0).padStart(3)} ${u.quadrant.padEnd(13)} v${u.value} f${u.feasibility} r${u.risk} ${u.id} ← ${u.primaryCapabilityId} [${u.alignment}]`);

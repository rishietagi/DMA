/**
 * `pnpm seed:check` — validates every seed/*.json against its zod schema and prints a summary.
 * Exits non-zero on the first invalid file.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { ZodTypeAny } from "zod";
import {
  baselineSchema,
  demoResponsesSchema,
  questionBankSchema,
  roadmapSchema,
  rubricSchema,
  useCaseRulesSchema,
} from "../src/lib/schema";

const SCHEMAS: Record<string, ZodTypeAny> = {
  "baseline-2025.json": baselineSchema,
  "rubric.json": rubricSchema,
  "roadmap-2026-27.json": roadmapSchema,
  "question-bank.json": questionBankSchema,
  "question-bank.sample.json": questionBankSchema,
  "usecase-rules.json": useCaseRulesSchema,
  "usecase-rules.sample.json": useCaseRulesSchema,
  "demo-responses.json": demoResponsesSchema,
};

const dir = join(process.cwd(), "seed");
let failed = false;
for (const file of readdirSync(dir).filter((f) => f.endsWith(".json")).sort()) {
  const schema = SCHEMAS[file];
  if (!schema) {
    console.log(`?  ${file} — no schema registered`);
    failed = true;
    continue;
  }
  const res = schema.safeParse(JSON.parse(readFileSync(join(dir, file), "utf8")));
  if (res.success) {
    console.log(`✓  ${file}`);
  } else {
    failed = true;
    console.log(`✗  ${file}`);
    for (const issue of res.error.issues.slice(0, 10)) console.log(`     ${issue.path.join(".")}: ${issue.message}`);
  }
}
process.exit(failed ? 1 : 0);

/**
 * Seed loading. Every seed file is parsed through its zod schema on first import,
 * so a bad seed fails fast (in the app, in tests and in `pnpm seed:check`).
 */
import baselineJson from "@seed/baseline-2025.json";
import demoResponsesJson from "@seed/demo-responses.json";
import questionBankJson from "@seed/question-bank.json";
import roadmapJson from "@seed/roadmap-2026-27.json";
import rubricJson from "@seed/rubric.json";
import useCaseRulesJson from "@seed/usecase-rules.json";
import {
  baselineSchema,
  demoResponsesSchema,
  questionBankSchema,
  roadmapSchema,
  rubricSchema,
  useCaseRulesSchema,
} from "./schema";

export const baseline = baselineSchema.parse(baselineJson);
export const rubric = rubricSchema.parse(rubricJson);
export const roadmap = roadmapSchema.parse(roadmapJson);
export const questionBank = questionBankSchema.parse(questionBankJson);
export const useCaseRules = useCaseRulesSchema.parse(useCaseRulesJson);
export const demoResponses = demoResponsesSchema.parse(demoResponsesJson);

export const seed = { baseline, rubric, roadmap, questionBank, useCaseRules, demoResponses };
export type Seed = typeof seed;

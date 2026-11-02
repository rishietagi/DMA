/**
 * zod schemas for every seed file and the engine's domain types
 * (docs/SCORING_ENGINE.md §2). Seed data is parsed through these at load time,
 * so a malformed seed fails fast.
 */
import { z } from "zod";

// ─── Primitives ──────────────────────────────────────────────────────────────

export const DIMENSIONS = ["process", "data", "ai", "people"] as const;
export const dimensionSchema = z.enum(DIMENSIONS);
export type Dimension = z.infer<typeof dimensionSchema>;

/** 1–5 in half-points (seed scores) */
export const halfPointScoreSchema = z
  .number()
  .min(1)
  .max(5)
  .refine((n) => Number.isInteger(n * 2), "must be a half-point (e.g. 1.5, 2, 2.5)");

export const levelSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
]);
export type Level = z.infer<typeof levelSchema>;

export const SOURCE_TYPES = [
  "artifact",
  "kpi",
  "system",
  "interview",
  "questionnaire",
  "self_assessment",
] as const;
export const sourceTypeSchema = z.enum(SOURCE_TYPES);
export type SourceType = z.infer<typeof sourceTypeSchema>;
export const OBJECTIVE_SOURCE_TYPES: readonly SourceType[] = ["artifact", "kpi", "system"];

/** The 9 evidence categories from the brief (PROJECT_CONTEXT.md §2B) */
export const EVIDENCE_CATEGORIES = [
  "self_assessment",
  "it_strategy",
  "process_docs",
  "application_landscape",
  "data_architecture",
  "policies_sops",
  "transformation_portfolio",
  "interview_notes",
  "kpi_extracts",
] as const;
export const evidenceCategorySchema = z.enum(EVIDENCE_CATEGORIES);
export type EvidenceCategory = z.infer<typeof evidenceCategorySchema>;

export const FUNCTION_IDS = [
  "marketing-design",
  "sales-gt",
  "sales-nmt",
  "sales-ecom",
  "sales-retail",
  "supply-chain",
  "procurement",
  "finance",
  "rnd-qa",
  "hr",
] as const;
export const functionIdSchema = z.enum(FUNCTION_IDS);
export type FunctionId = z.infer<typeof functionIdSchema>;

export const groupSchema = z.enum(["cpd", "enterprise"]);
export type Group = z.infer<typeof groupSchema>;

// ─── seed/baseline-2025.json ─────────────────────────────────────────────────

export const functionSchema = z.object({
  id: functionIdSchema,
  name: z.string(),
  group: groupSchema,
  revenueFacing: z.boolean(),
});
export type FunctionDef = z.infer<typeof functionSchema>;

export const capabilitySchema = z.object({
  id: z.string(),
  name: z.string(),
  primaryFunctionId: functionIdSchema,
  functionIds: z.array(functionIdSchema).min(1),
  group: groupSchema,
  selfScore: halfPointScoreSchema,
  criticality: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  system: z.string().optional(),
  note: z.string().optional(),
});
export type Capability = z.infer<typeof capabilitySchema>;

export const prioritySchema = z.object({
  rank: z.number().int().positive(),
  id: z.string(),
  title: z.string(),
  detail: z.string(),
  capabilityIds: z.array(z.string()),
});
export type Priority2026 = z.infer<typeof prioritySchema>;

export const baselineSchema = z
  .object({
    meta: z.object({
      source: z.string(),
      transcribedFrom: z.string().optional(),
      scale: z.record(z.string(), z.string()),
      halfPoints: z.boolean(),
      deckKpis: z.object({
        scope: z.string(),
        avgMaturity: z.number(),
        capabilities: z.number(),
        pctAtOrBelow2: z.number(),
        countAtLevel5: z.number(),
      }),
      deckTagline: z.string(),
    }),
    divisions: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        status: z.enum(["assessed", "not_started"]),
        note: z.string().optional(),
      }),
    ),
    functions: z.array(functionSchema),
    capabilities: z.array(capabilitySchema),
    priorities2026: z.array(prioritySchema),
    targets: z.object({
      rule: z.string(),
      overrides: z.record(z.string(), halfPointScoreSchema),
    }),
  })
  .superRefine((b, ctx) => {
    const caps = new Set<string>();
    for (const c of b.capabilities) {
      if (caps.has(c.id)) ctx.addIssue({ code: "custom", message: `duplicate capability ${c.id}` });
      caps.add(c.id);
      if (!c.functionIds.includes(c.primaryFunctionId))
        ctx.addIssue({ code: "custom", message: `${c.id}: primaryFunctionId not in functionIds` });
    }
    for (const p of b.priorities2026)
      for (const id of p.capabilityIds)
        if (!caps.has(id))
          ctx.addIssue({ code: "custom", message: `priority ${p.id} → unknown capability ${id}` });
  });
export type Baseline = z.infer<typeof baselineSchema>;

// ─── seed/rubric.json ────────────────────────────────────────────────────────

const levelMap = <T extends z.ZodTypeAny>(t: T) =>
  z.object({ "1": t, "2": t, "3": t, "4": t, "5": t });

export const rubricDimensionSchema = z.object({
  id: dimensionSchema,
  name: z.string(),
  journey: z.string(),
  defaultWeight: z.number().min(0).max(1),
  levels: levelMap(z.string()),
  gates: z.record(z.enum(["2", "3", "4", "5"]), z.array(z.string())),
});
export type RubricDimension = z.infer<typeof rubricDimensionSchema>;

export const rubricSchema = z.object({
  scale: levelMap(z.string()),
  dimensions: z.array(rubricDimensionSchema).length(4),
  frameworkCrosswalk: z.record(z.string(), z.record(z.string(), z.string())),
});
export type Rubric = z.infer<typeof rubricSchema>;

// ─── seed/roadmap-2026-27.json ───────────────────────────────────────────────

export const initiativeStatusSchema = z.enum(["completed", "in_progress", "planned"]);
export type InitiativeStatus = z.infer<typeof initiativeStatusSchema>;

export const initiativeSchema = z.object({
  id: z.string(),
  functionId: functionIdSchema,
  title: z.string(),
  status: initiativeStatusSchema,
  mapsTo: z.array(z.string()),
});
export type Initiative = z.infer<typeof initiativeSchema>;

export const capabilityDependencySchema = z.object({
  from: z.string(),
  to: z.string(),
  why: z.string(),
});
export type CapabilityDependency = z.infer<typeof capabilityDependencySchema>;

export const roadmapSchema = z.object({
  meta: z.record(z.string(), z.string()),
  initiatives: z.array(initiativeSchema),
  dependencies: z.array(capabilityDependencySchema),
});
export type Roadmap = z.infer<typeof roadmapSchema>;

// ─── seed/question-bank*.json ────────────────────────────────────────────────

export const questionOptionSchema = z.object({
  level: levelSchema.nullable(),
  label: z.string(),
});

export const questionSchema = z
  .object({
    id: z.string(),
    l2: z.string(),
    text: z.string(),
    dimension: dimensionSchema,
    capabilityIds: z.array(z.string()).min(1),
    weight: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    options: z.array(questionOptionSchema).min(2),
    evidenceExpected: z.array(evidenceCategorySchema),
    gateKey: z.string().optional(),
  })
  .refine((q) => q.options.some((o) => o.level === null), {
    message: "every question must allow \"Don't know / N/A\" (level null)",
  });
export type Question = z.infer<typeof questionSchema>;

export const questionBankFunctionSchema = z.object({
  functionId: z.union([functionIdSchema, z.literal("*")]),
  l1Chain: z.array(z.string()),
  /** words that place a sentence on an L1 process (process ladder, SCORING_ENGINE.md §11.3) */
  l1Keywords: z.record(z.string(), z.array(z.string())).optional(),
  note: z.string().optional(),
  questions: z.array(questionSchema),
});
export type QuestionBankFunction = z.infer<typeof questionBankFunctionSchema>;

export const questionBankSchema = z.object({
  meta: z.record(z.string(), z.unknown()),
  functions: z.array(questionBankFunctionSchema),
});
export type QuestionBank = z.infer<typeof questionBankSchema>;

// ─── seed/usecase-rules*.json ────────────────────────────────────────────────

export const effortSchema = z.enum(["S", "M", "L"]);

export const useCaseRuleSchema = z.object({
  id: z.string(),
  when: z.object({
    capabilityIds: z.array(z.string()),
    /** L1 process names the rule also applies to (process ladder, SCORING_ENGINE.md §11.4) */
    steps: z.array(z.string()).optional(),
    dimension: dimensionSchema,
    maxScore: z.number().min(1).max(5),
    minScore: z.number().min(1).max(5).optional(),
    flag: z.string().optional(),
  }),
  useCase: z.object({
    title: z.string(),
    description: z.string(),
    aiPattern: z.string(),
    kpis: z.array(z.string()),
    dataPrerequisites: z.array(z.string()),
    effort: effortSchema,
    dependsOn: z.array(z.string()),
  }),
}).refine((r) => r.when.capabilityIds.length > 0 || (r.when.steps?.length ?? 0) > 0, {
  message: "a rule needs at least one capability or step",
});
export type UseCaseRule = z.infer<typeof useCaseRuleSchema>;

export const useCaseRulesSchema = z.object({
  meta: z.record(z.string(), z.unknown()),
  rules: z.array(useCaseRuleSchema),
});
export type UseCaseRules = z.infer<typeof useCaseRulesSchema>;

// ─── seed/demo-responses.json ────────────────────────────────────────────────

export const questionnaireResponseSchema = z.object({
  questionId: z.string(),
  /** function the answer was given for — needed for '*' questions */
  functionId: functionIdSchema,
  level: levelSchema.nullable(),
  notes: z.string().optional(),
  answeredBy: z.string().optional(),
  date: z.string().optional(),
});
export type QuestionnaireResponse = z.infer<typeof questionnaireResponseSchema>;

export const seededEvidenceSchema = z.object({
  id: z.string(),
  capabilityId: z.string(),
  dimension: dimensionSchema,
  level: levelSchema,
  weight: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  sourceType: sourceTypeSchema,
  category: evidenceCategorySchema,
  gateKey: z.string().optional(),
  docId: z.string(),
  docTitle: z.string(),
  location: z.string(),
  quote: z.string(),
  polarity: z.enum(["pain", "strength", "neutral"]),
  stakeholder: z.string().optional(),
});
export type SeededEvidence = z.infer<typeof seededEvidenceSchema>;

export const demoResponsesSchema = z.object({
  meta: z.object({ label: z.literal("Illustrative"), note: z.string() }),
  responses: z.array(questionnaireResponseSchema),
  evidence: z.array(seededEvidenceSchema),
  /** quick-check answers on the 0–5 process ladder, keyed "<functionId>:<L1 process>" */
  quickCheck: z.record(z.string(), z.number().int().min(0).max(5)).default({}),
});
export type DemoResponses = z.infer<typeof demoResponsesSchema>;

// ─── Engine domain types (SCORING_ENGINE.md §2) ──────────────────────────────

export const indicatorSchema = z.object({
  id: z.string(),
  capabilityId: z.string(),
  dimension: dimensionSchema,
  /** null = "don't know / N/A" → ignored, counts against coverage. Half-points only for self scores. */
  level: z.number().min(1).max(5).nullable(),
  weight: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  sourceType: sourceTypeSchema,
  category: evidenceCategorySchema.optional(),
  sourceRef: z
    .object({
      docId: z.string(),
      docTitle: z.string().optional(),
      location: z.string().optional(),
      quote: z.string().optional(),
      stakeholder: z.string().optional(),
    })
    .optional(),
  gateKey: z.string().optional(),
  /** human-readable label for the explainability sheet */
  label: z.string().optional(),
});
export type Indicator = z.infer<typeof indicatorSchema>;

export type Flag =
  | { kind: "LACKS_EVIDENCE"; reason: string }
  | { kind: "INCONSISTENT"; reason: string; indicatorIds: string[] }
  | { kind: "SELF_VARIANCE"; self: number; evidence: number }
  | { kind: "GATED"; cappedAt: number; missingGate: string }
  | { kind: "LOW_COVERAGE"; missing: EvidenceCategory[] };
export type FlagKind = Flag["kind"];

export type ConfidenceBand = "high" | "medium" | "low";

export const validationSchema = z.object({
  capabilityId: z.string(),
  kind: z.enum(["accepted", "overridden"]),
  /** score at decision time (AI-suggested) */
  before: z.number(),
  /** for overrides: the consultant's score; for accepts: the accepted score at the time */
  after: z.number(),
  rationale: z.string(),
  by: z.string(),
  at: z.string(),
});
export type Validation = z.infer<typeof validationSchema>;

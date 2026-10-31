/** POST /api/assess — session in, engine output out. Thin: validation + MockProvider.assess. */
import { z } from "zod";
import { ai } from "@/lib/ai";
import { DEFAULT_WEIGHTS } from "@/lib/engine";
import {
  dimensionSchema,
  evidenceCategorySchema,
  functionIdSchema,
  questionnaireResponseSchema,
  sourceTypeSchema,
  validationSchema,
} from "@/lib/schema";
import { seed } from "@/lib/seed";

export const runtime = "nodejs";

const evidenceSchema = z.object({
  id: z.string(),
  docId: z.string(),
  docTitle: z.string(),
  category: evidenceCategorySchema,
  sourceType: sourceTypeSchema,
  location: z.string(),
  quote: z.string(),
  functionId: functionIdSchema.nullable(),
  capabilityId: z.string().nullable(),
  dimension: dimensionSchema.nullable(),
  level: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]).nullable(),
  polarity: z.enum(["pain", "strength", "neutral"]),
  weight: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  gateKey: z.string().optional(),
  stakeholder: z.string().optional(),
  cues: z.array(z.string()).default([]),
  themes: z.array(z.string()).optional(),
});

const sessionSchema = z.object({
  mode: z.enum(["baseline", "evidence"]).default("evidence"),
  weights: z.record(dimensionSchema, z.number().min(0)).optional(),
  excludedCapabilityIds: z.array(z.string()).optional(),
  responses: z.array(questionnaireResponseSchema).optional(),
  evidence: z.array(evidenceSchema).optional(),
  validations: z.record(z.string(), validationSchema).optional(),
  targetOverrides: z.record(z.string(), z.number()).optional(),
});

export async function POST(req: Request) {
  const parsed = sessionSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: parsed.error.issues }, { status: 400 });
  const s = parsed.data;
  const result = ai.assess({
    ...seed,
    mode: s.mode,
    weights: { ...DEFAULT_WEIGHTS, ...s.weights },
    excludedCapabilityIds: s.excludedCapabilityIds,
    responses: s.responses ?? (s.mode === "evidence" ? seed.demoResponses.responses : []),
    evidence: s.evidence,
    validations: s.validations,
    targetOverrides: s.targetOverrides,
  });
  return Response.json(result);
}

export async function GET() {
  const result = ai.assess({ ...seed, mode: "baseline", weights: DEFAULT_WEIGHTS });
  return Response.json({ provider: ai.name, simulated: ai.simulated, kpis: result.kpis });
}

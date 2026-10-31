/** POST /api/classify — multipart file → parse → deterministic classifier → evidence items. */
import { ai } from "@/lib/ai";
import { countNegated, dominantFunction, splitSentences } from "@/lib/classifier";
import { parseFile } from "@/lib/parse";
import { evidenceCategorySchema } from "@/lib/schema";

export const runtime = "nodejs";
/** PDF parsing can take a few seconds on a cold start */
export const maxDuration = 30;

/** Vercel functions reject request bodies above 4.5 MB */
const MAX_BYTES = 4 * 1024 * 1024;

export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!form || !(file instanceof File)) return Response.json({ error: "Attach a file in the 'file' field." }, { status: 400 });
  if (file.size > MAX_BYTES) return Response.json({ error: "File is larger than 4 MB. Split it or upload the relevant section." }, { status: 413 });

  const category = evidenceCategorySchema.safeParse(form.get("category"));
  if (!category.success) return Response.json({ error: "Choose an evidence category." }, { status: 400 });
  const docId = String(form.get("docId") ?? `upload-${file.name}`);
  const title = String(form.get("title") ?? file.name);
  const stakeholder = form.get("stakeholder") ? String(form.get("stakeholder")) : undefined;

  try {
    const segments = await parseFile(file);
    const doc = { id: docId, title, category: category.data, segments, stakeholder };
    const items = ai.classify(doc);
    const sentences = segments.flatMap((s) => splitSentences(s.text));
    return Response.json({
      items,
      segments: segments.length,
      dominantFunctionId: dominantFunction(sentences),
      negated: countNegated(doc),
      text: segments.map((s) => s.text).join("\n\n").slice(0, 20_000),
    });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Could not parse the file." }, { status: 422 });
  }
}

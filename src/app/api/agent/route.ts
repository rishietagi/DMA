/** POST /api/agent — streams scripted agent steps from the MockProvider as SSE. */
import { z } from "zod";
import { ai, type AgentTask } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** the longest scripted run (evidence analysis) streams for under 10 s; headroom for cold starts */
export const maxDuration = 30;

const TASKS = ["analyze-evidence", "score", "results"] as const satisfies readonly AgentTask[];

const bodySchema = z.object({
  task: z.enum(TASKS),
  context: z.record(z.string(), z.union([z.string(), z.number(), z.array(z.string())])).default({}),
  speed: z.number().min(0).max(4).optional(),
});

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues }, { status: 400 });
  const { task, context, speed } = parsed.data;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const ev of ai.runAgent(task, context, { speed })) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(ev)}\n\n`));
        }
      } catch (e) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", message: String(e) })}\n\n`));
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" },
  });
}

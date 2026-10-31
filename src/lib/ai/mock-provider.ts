/**
 * MockProvider: the POC's "AI". Deterministic classifier + engine, wrapped in a scripted,
 * streamed agent narrative. No external model is ever called.
 */
import { assess } from "@/lib/engine";
import { classifyDocument } from "@/lib/classifier";
import { agentScript } from "./scripts";
import type { AIProvider, AgentEvent } from "./types";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const MockProvider: AIProvider = {
  name: "MockProvider (deterministic)",
  simulated: true,
  assess,
  classify: classifyDocument,
  async *runAgent(task, ctx, opts = {}): AsyncGenerator<AgentEvent> {
    const speed = opts.speed ?? 1;
    const script = agentScript(task, ctx);
    yield { type: "start", title: script.title };
    let i = 0;
    for (const step of script.steps) {
      const id = `s${i++}`;
      yield { type: "step", id, kind: step.kind, label: step.label };
      await sleep(Math.round(step.ms * speed));
      yield { type: "step-done", id, detail: step.detail };
    }
    yield { type: "done", summary: script.summary };
  },
};

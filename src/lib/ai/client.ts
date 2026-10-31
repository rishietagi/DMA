"use client";
/**
 * Client-side agent runner: POSTs to /api/agent and streams SSE events into the session store
 * (rendered line by line by AgentTrace). Falls back to running the MockProvider in the
 * browser if the route is unavailable.
 */
import { useSession } from "@/lib/store/session";
import { MockProvider } from "./mock-provider";
import type { AgentContext, AgentEvent, AgentTask } from "./types";

let speedFactor = 1;
/** Global narration speed (guided tour / tests can speed it up). */
export function setAgentSpeed(f: number) {
  speedFactor = f;
}

async function* streamFromApi(task: AgentTask, context: AgentContext): AsyncGenerator<AgentEvent> {
  const res = await fetch("/api/agent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ task, context, speed: speedFactor }),
  });
  if (!res.ok || !res.body) throw new Error(`agent route ${res.status}`);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buf.indexOf("\n\n")) >= 0) {
      const chunk = buf.slice(0, idx).trim();
      buf = buf.slice(idx + 2);
      if (chunk.startsWith("data:")) yield JSON.parse(chunk.slice(5)) as AgentEvent;
    }
  }
}

export interface RunOptions {
  open?: boolean;
}

export async function runAgent(task: AgentTask, context: AgentContext, opts: RunOptions = {}): Promise<string | undefined> {
  const store = useSession.getState();
  const runId = `run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  if (opts.open !== false) store.setAgentOpen(true);
  store.startRun({ id: runId, task, title: "Agent", startedAt: new Date().toISOString(), status: "running", steps: [] });

  const consume = async (gen: AsyncGenerator<AgentEvent>) => {
    let summary: string | undefined;
    for await (const ev of gen) {
      const s = useSession.getState();
      if (ev.type === "start") useSession.setState({ runs: s.runs.map((r) => (r.id === runId ? { ...r, title: ev.title } : r)) });
      else if (ev.type === "step") s.pushStep(runId, { id: ev.id, kind: ev.kind, label: ev.label, status: "running" });
      else if (ev.type === "step-done") s.completeStep(runId, ev.id, ev.detail);
      else if (ev.type === "done") summary = ev.summary;
      else if (ev.type === "error") throw new Error(ev.message);
    }
    return summary;
  };

  try {
    let summary: string | undefined;
    try {
      summary = await consume(streamFromApi(task, context));
    } catch {
      summary = await consume(MockProvider.runAgent(task, context, { speed: speedFactor }));
    }
    useSession.getState().finishRun(runId, summary);
    return summary;
  } catch (e) {
    useSession.getState().finishRun(runId, String(e), "error");
    return undefined;
  }
}

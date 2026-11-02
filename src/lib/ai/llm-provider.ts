/**
 * LLMProvider — phase-2 drop-in (PLAN.md §7). Retrieval per (L1 process × ladder level) over
 * chunked evidence, an LLM returning {indicatorId, level, quote, location} strictly as JSON,
 * citations enforced. The engine stays the arbiter. Not configured in the POC.
 */
import type { AIProvider } from "./types";

const notConfigured = () => {
  throw new Error("LLMProvider is not configured in the POC — use MockProvider.");
};

export const LLMProvider: AIProvider = {
  name: "LLMProvider (not configured)",
  simulated: false,
  assessProcesses: notConfigured,
  classify: notConfigured,
  async *runAgent() {
    notConfigured();
  },
};

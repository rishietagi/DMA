import { MockProvider } from "./mock-provider";
import type { AIProvider } from "./types";

/** The active provider. Swap for LLMProvider in a real build. */
export const ai: AIProvider = MockProvider;

export * from "./types";
export { agentScript } from "./scripts";

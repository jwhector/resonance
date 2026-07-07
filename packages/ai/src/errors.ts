import { ResonanceError } from "@resonance/core";

/**
 * Something went wrong running an agent through the shared runner — the model failed,
 * a required tool was never called, or a tool's input/output didn't validate. Thrown at
 * the runner boundary so the surface that invoked it (a route handler or Server Action)
 * reports one typed failure instead of leaking AI SDK internals (design spec § Error handling).
 */
export class AgentError extends ResonanceError {
  constructor(message: string, options?: { cause?: unknown }) {
    super("agent_error", message, options);
    this.name = "AgentError";
  }
}

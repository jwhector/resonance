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

/**
 * An onboarding session was handed to a behaviour that did not produce it.
 *
 * Thrown rather than returned as a transition rejection: every rejection reason describes a
 * creator's action, and this is a wiring fault no creator can cause or fix. Reinterpreting the
 * session under rules it never ran under would be worse than failing (ADR-0022).
 */
export class UnsupportedBehaviorVersionError extends ResonanceError {
  constructor(expected: string, received: string) {
    super(
      "unsupported_behavior_version",
      `Onboarding behaviour "${expected}" cannot interpret a session pinned to "${received}".`,
    );
    this.name = "UnsupportedBehaviorVersionError";
  }
}

/**
 * An onboarding session is internally inconsistent in a way no transition can produce — for
 * example sitting at the foundation stage with no generated draft. Signals corrupt or
 * hand-edited state, so it is thrown instead of being silently repaired.
 */
export class CreatorOnboardingStateError extends ResonanceError {
  constructor(message: string) {
    super("invalid_onboarding_state", message);
    this.name = "CreatorOnboardingStateError";
  }
}

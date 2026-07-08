import { type LanguageModel } from "ai";
import { createFakeEmbedder, createFakeOnboardingModel } from "@resonance/ai/testing";
import { type Embedder } from "@resonance/ai";
import { createFakeMail } from "@resonance/auth/testing";
import { type AuthMailPort } from "@resonance/auth";

/**
 * ⚠️ E2E-ONLY HARNESS — the SINGLE, isolated place fakes are selected (ADR-0018 §4).
 *
 * ADR-0018 makes the `@resonance/*` packages LIVE-BY-DEFAULT: there is no `RESONANCE_FAKES` flag
 * and no fake branch inside any package. The one thing DI cannot reach is the full-flow Playwright
 * E2E, which drives the app as a *separate server process* — you cannot inject a fake into it.
 * ADR-0018 §4 sanctions exactly one escape hatch for that: "an explicit, isolated, clearly-named
 * E2E-only harness" — this file.
 *
 * It is HARD-GUARDED against production: {@link E2E_HARNESS} is only ever true when the app is
 * booted with `E2E_HARNESS=1` (set by `playwright.config.ts`) AND `NODE_ENV !== "production"`. So
 * even if the flag leaked into a prod deploy, the fakes below can never activate. Shipped code
 * paths consult `E2E_HARNESS` at their composition roots (`interview/route.ts`, the onboarding
 * Server Actions, and the auth mount) with a single `E2E_HARNESS ? harness : live` — nowhere else.
 *
 * The fake IMPLEMENTATIONS live in the package test subpaths (`@resonance/ai/testing`,
 * `@resonance/auth/testing`); this module only SELECTS them.
 */
export const E2E_HARNESS = process.env.E2E_HARNESS === "1" && process.env.NODE_ENV !== "production";

/**
 * The deterministic onboarding model for the E2E: one fake that both streams the canned Weave
 * interview line (`runAgentStream`) and returns the canned `proposeProfile` draft
 * (`runAgentStructured`). Injected via the `RunInput.model` DI seam at the composition roots.
 */
export function harnessModel(): LanguageModel {
  return createFakeOnboardingModel();
}

/** The deterministic 1024-dim fake embedder, injected via `commitCreatorProfile`'s `embedder`. */
export function harnessEmbedder(): Embedder {
  return createFakeEmbedder();
}

// Module-singleton fake mail. It MUST be one shared instance so the auth handler that WRITES the
// login code (`sendLoginCode`) and the `/api/test/last-otp` read-back (`peekLoginCode`) observe the
// SAME captured codes: `createFakeMail()` registers its `codes` buffer into a process-wide slot on
// construction, and the last writer wins that slot — so constructing it once is load-bearing.
let _harnessMail: AuthMailPort | undefined;

/** The shared in-memory mail transport for the E2E auth flow. See the singleton note above. */
export function harnessMail(): AuthMailPort {
  if (!_harnessMail) _harnessMail = createFakeMail().port;
  return _harnessMail;
}

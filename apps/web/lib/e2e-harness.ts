import { type LanguageModel } from "ai";
import { resolveEmbedder, type Embedder } from "@resonance/ai";
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
 * HARD-GUARDED against production: {@link E2E_HARNESS} is only ever true when the app is booted
 * with `E2E_HARNESS=1` (set by `playwright.config.ts`) AND `NODE_ENV !== "production"`, so the
 * fakes can never activate in a prod deploy.
 *
 * ISOLATION: the fake implementations (`@resonance/ai/testing`, `@resonance/auth/testing`) are
 * loaded with a DYNAMIC `import()` *inside* the harness branch, so they are NOT statically bundled
 * into the shipped server — `ai/test` never enters the live runtime (ADR-0018). Composition roots
 * call one intent-named accessor below; the `E2E_HARNESS` decision lives ONLY here (nowhere else
 * re-derives the ternary).
 */
export const E2E_HARNESS = process.env.E2E_HARNESS === "1" && process.env.NODE_ENV !== "production";

/**
 * Model override for the onboarding runner, spread into `RunInput.model`. Under the harness: the
 * deterministic onboarding fake — ONE model that both streams the canned Weave line
 * (`runAgentStream`) and returns the canned `proposeProfile` draft (`runAgentStructured`). Live
 * path returns `{}`, so the runner resolves the real model (`resolveModel`, ADR-0018).
 */
export async function onboardingModelOverride(): Promise<{ model?: LanguageModel }> {
  if (!E2E_HARNESS) return {};
  const { createFakeOnboardingModel } = await import("@resonance/ai/testing");
  return { model: createFakeOnboardingModel() };
}

/** Embedder for the commit path: the deterministic 1024-dim fake under the harness, else live `resolveEmbedder()`. */
export async function onboardingEmbedder(): Promise<Embedder> {
  if (!E2E_HARNESS) return resolveEmbedder();
  const { createFakeEmbedder } = await import("@resonance/ai/testing");
  return createFakeEmbedder();
}

/**
 * Mail transport for the auth mount: the shared in-memory fake under the harness (so the auth
 * handler that WRITES the login code and the `/api/test/last-otp` read-back observe the SAME
 * captured codes), else `undefined` → the caller uses the live `getAuth()`.
 *
 * Singleton: one shared instance. `createFakeMail()` registers its captured-codes buffer into a
 * process-wide slot on construction (last writer wins), so constructing it exactly once is
 * load-bearing for the OTP read-back.
 */
let _harnessMail: AuthMailPort | undefined;
export async function harnessMailOverride(): Promise<AuthMailPort | undefined> {
  if (!E2E_HARNESS) return undefined;
  if (!_harnessMail) {
    const { createFakeMail } = await import("@resonance/auth/testing");
    _harnessMail = createFakeMail().port;
  }
  return _harnessMail;
}

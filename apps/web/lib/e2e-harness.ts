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

/**
 * Whether the onboarding entry (`/onboarding/creator`) should run the live-provider fail-fast
 * (`assertAiConfigured`). Under the harness the model AND embedder are injected fakes (see
 * `onboardingModelOverride` / `onboardingEmbedder`), so no real AI credentials exist or are
 * needed — running the presence check there would spuriously throw and break the E2E. Live path
 * keeps the guard so a partial prod config still fails fast.
 */
export function onboardingAiCheckEnabled(): boolean {
  return !E2E_HARNESS;
}

/**
 * Embedder for the profile-commit path: the deterministic 1024-dim fake under the harness, else
 * live `resolveEmbedder()`.
 */
export async function onboardingEmbedder(): Promise<Embedder> {
  return webEmbedder();
}

/**
 * Embedder for the discovery **query** path (`/discover`'s search action, which injects
 * `(text) => embedder.embed(text)` into `@resonance/db`'s `createDiscoveryAdapter`).
 *
 * Named for its own composition root rather than shared by reference, because the two roots
 * embed different things — a whole profile at commit time, a raw query string at search time —
 * and only reading the same harness decision makes the E2E work at all: the ranked search only
 * finds the profile the E2E just committed if the query vector and the profile vector come from
 * the SAME embedder. The `createFakeEmbedder` hash is text-derived and deterministic, so under
 * the harness they do.
 */
export async function discoveryEmbedder(): Promise<Embedder> {
  return webEmbedder();
}

/**
 * Embedder for the member interest-selection path (`/interests`' Server Action, which hands it to
 * `@resonance/db`'s `setMemberInterests`).
 *
 * Named for its own composition root like the two above, and reading the same harness decision for
 * the same reason: `/discover`'s personalized ranking only finds anything if the member's stored
 * interest vector and the creator-profile vectors came from the SAME embedder. Under the harness
 * both are the deterministic text-derived fake, so the E2E can assert a ranking rather than hope
 * for one.
 */
export async function interestsEmbedder(): Promise<Embedder> {
  return webEmbedder();
}

/** The one place the harness/live embedder decision is made; all accessors above read it. */
async function webEmbedder(): Promise<Embedder> {
  if (!E2E_HARNESS) return resolveEmbedder();
  const { createFakeEmbedder } = await import("@resonance/ai/testing");
  return createFakeEmbedder();
}

/**
 * Mail transport for the auth mount: the shared in-memory fake under the harness (so the auth
 * handler that WRITES the login code and the `/api/test/last-otp` read-back observe the SAME
 * captured codes), else `undefined` → the caller uses the live `getAuth()`.
 *
 * We EXPLICITLY register the fake's captured codes AND its captured magic links for read-back, via
 * `observeLoginCodes(fake)` and `observeMagicLinks(fake)` — sign-up dispatches both channels, so a
 * test that could only read one could only ever prove half the front door.
 * Construction alone registers nothing, so building a fake elsewhere — or a
 * session read routing through `getWebAuth()` — cannot silently hijack either read-back; only these
 * intentional calls feed `peekLoginCode` and `peekMagicLink`.
 *
 * Singleton pinned to `globalThis` (not a module-level `let`), because in Next.js the auth mount,
 * the RSC/Server-Action session reads, and the `/api/test/last-otp` route can evaluate in different
 * module scopes. Pinning guarantees the fake is built — and
 * both observations registered — exactly ONCE per process, so every scope shares the one fake and the
 * read-back never gets clobbered by a later empty buffer.
 *
 * The slot holds the in-flight PROMISE, not the resolved port, so the singleton survives concurrent
 * callers. The signup form fires two auth requests in parallel (magic link + OTP send), and on a
 * cold server both would reach a "build it if absent" check before either finished building. With
 * the port stored, both built a fake: one won this slot (the transport auth actually sends through)
 * while the other won the process-wide observation slot, so `peekLoginCode` read a buffer nothing
 * wrote to and `/api/test/last-otp` answered `null` forever. Storing the
 * promise makes the assignment atomic — it happens before any `await`, so concurrent callers all
 * await the same construction. A failed construction clears the slot rather than caching a rejected
 * promise, so a transient dynamic-import failure on a cold server can be retried.
 */
const HARNESS_MAIL_KEY = "__resonance_web_harness_mail__";
function harnessMailStore(): { [HARNESS_MAIL_KEY]?: Promise<AuthMailPort> } {
  return globalThis as unknown as { [HARNESS_MAIL_KEY]?: Promise<AuthMailPort> };
}
export async function harnessMailOverride(): Promise<AuthMailPort | undefined> {
  if (!E2E_HARNESS) return undefined;
  const store = harnessMailStore();
  store[HARNESS_MAIL_KEY] ??= (async () => {
    const { createFakeMail, observeLoginCodes, observeMagicLinks } =
      await import("@resonance/auth/testing");
    const fake = createFakeMail();
    observeLoginCodes(fake);
    observeMagicLinks(fake);
    return fake.port;
  })().catch((err: unknown) => {
    delete store[HARNESS_MAIL_KEY];
    throw err;
  });
  return store[HARNESS_MAIL_KEY];
}

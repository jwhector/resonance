import { AgentError } from "./errors";

/**
 * AI provider configuration — the one place the key-precedence ladder and the fail-fast joint gate
 * live (ADR-0009, ADR-0018). Both external tiers (the chat/generation model and the Voyage
 * embedder) select a provider by the SAME rule, so it lives here once instead of being hand-rolled
 * in `gateway.ts` and `embeddings.ts` (where it drifted). **Internal seam** — only
 * `assertAiConfigured` is re-exported from `@resonance/ai`; `selectProvider` is not.
 */

/**
 * An env var counts as "present" when it holds a non-empty value. This is exactly the truthiness
 * the seams used before this helper existed (`if (process.env.X)`), so behavior is preserved:
 * empty string / undefined → absent → fail closed.
 */
function envPresent(value: string | undefined): boolean {
  return Boolean(value);
}

/**
 * The provider-selection ladder shared by `resolveModel` and `resolveEmbedder` (ADR-0018,
 * live-by-default). One place expresses the precedence + fail-closed contract so the two seams
 * can't drift:
 *
 *   1. **Vercel AI Gateway** (`gatewayKey` present) — preferred; one key routes every provider.
 *   2. **Direct provider** (`directKey` present) — the per-provider fallback (Anthropic / Voyage).
 *   3. **Neither** — fail closed with an actionable `AgentError` (`missing`), never silently faking.
 *
 * Results are built lazily via thunks so only the selected branch runs — the direct builder never
 * constructs a provider client when the Gateway is chosen, and may itself fail closed (e.g. the
 * `anthropic/*`-only guard). There is deliberately no fake branch here (ADR-0018); tests inject
 * fakes upstream via DI.
 */
export function selectProvider<T>(opts: {
  /** Env value gating the Gateway branch — typically `process.env.AI_GATEWAY_API_KEY`. */
  gatewayKey: string | undefined;
  /** Build the Gateway-routed result. Called only when the Gateway key is present. */
  buildGateway: () => T;
  /** Env value gating the direct-provider branch — e.g. `ANTHROPIC_API_KEY` / `VOYAGE_API_KEY`. */
  directKey: string | undefined;
  /** Build the direct-provider result. Called only when the Gateway key is absent + `directKey` present. */
  buildDirect: () => T;
  /** Fail-closed message thrown as an `AgentError` when neither key is present. */
  missing: string;
}): T {
  if (envPresent(opts.gatewayKey)) return opts.buildGateway();
  if (envPresent(opts.directKey)) return opts.buildDirect();
  throw new AgentError(opts.missing);
}

/**
 * Fail-fast boot-time config gate (ADR-0018). Asserts the model AND embedding providers are
 * **jointly** resolvable from env **before** any AI work starts, so a PARTIAL config surfaces here
 * rather than being deferred: e.g. `ANTHROPIC_API_KEY` set but `VOYAGE_API_KEY` absent lets
 * `resolveModel` succeed and only makes `resolveEmbedder` throw at the profile-commit step — a
 * late, confusing failure. This turns that into one clear up-front error.
 *
 * Checks env **presence only** — it never calls a live provider. It mirrors the joint gate in
 * `scripts/verify-live.mjs`:
 *
 *   `AI_GATEWAY_API_KEY` present (covers model + embedding), OR
 *   `ANTHROPIC_API_KEY` (model) AND `VOYAGE_API_KEY` (embedding) both present.
 *
 * Throws a single `AgentError` naming exactly which direct key(s) are missing. Call it once at each
 * onboarding entry point that will drive an agent and then embed — i.e. before starting the
 * interview / profile generation — so onboarding can't begin against a config that fails at commit.
 */
export function assertAiConfigured(): void {
  // The Gateway key alone satisfies both tiers — the common, preferred config.
  if (envPresent(process.env.AI_GATEWAY_API_KEY)) return;

  // No Gateway: both direct keys are required (model AND embedding). Report exactly what's absent.
  const missing: string[] = [];
  if (!envPresent(process.env.ANTHROPIC_API_KEY))
    missing.push("ANTHROPIC_API_KEY (model provider)");
  if (!envPresent(process.env.VOYAGE_API_KEY)) missing.push("VOYAGE_API_KEY (embedding provider)");

  if (missing.length === 0) return; // both direct keys present → jointly resolvable

  throw new AgentError(
    `assertAiConfigured: AI is not fully configured — ${missing.join(" and ")} missing. ` +
      `Set AI_GATEWAY_API_KEY (Vercel AI Gateway, preferred — covers model + embedding), ` +
      `or provide both ANTHROPIC_API_KEY (model) and VOYAGE_API_KEY (embedding).`,
  );
}

#!/usr/bin/env node
// verify:live — the credential-gated live-smoke gate (ADR-0018 §3).
//
// ADR-0018 makes shipped code LIVE-BY-DEFAULT and moves every fake into test injection. The risk
// that creates: a green unit/CI build can still hide BROKEN LIVE WIRING (the exact failure ADR-0018
// was written for — the Gateway-vs-Anthropic mismatch and the missing Resend adapter were invisible
// while everything ran on fakes). This gate closes that hole by driving the SAME live paths product
// code uses — the ProfileGen reference slice (ADR-0013) — through the public `@resonance/*` seams,
// so "green for release" includes "the live wiring works." The checks:
//   • interview  — streaming model call via runAgentStream(creatorInterviewAgent) (the chat path).
//   • profilegen — the structured, forced single-tool-call path runAgentStructured(profileGenAgent):
//                  the more failure-prone route against a live model, and the one the slice depends
//                  on. Asserts a schema-valid CreatorProfileDraft (non-empty nameOptions + headline).
//   • embedding  — one real embedding through resolveEmbedder() (the 1024-dim Voyage contract).
//   • email      — one real send through resolveMail() (Resend) to VERIFY_LIVE_EMAIL_TO.
//   • commit     — the REAL write path commitCreatorProfile(): embed → createCreatorProfile →
//                  upsertProfileEmbedding (the 1024-dim pgvector write) → role flip (ADR-0004
//                  ordering, ADR-0010). Proves it landed via findSimilarProfiles (the pgvector ANN
//                  read) + a user.roles read, then deletes everything it created so the gate is
//                  idempotent and leaves no residue.
//
// CREDENTIAL-GATED: with no credentials it SKIPS and exits 0, so it is safe in the credential-free
// fast loop and no-secret CI (forks, PRs). It only does real work when the required secrets are
// present. Required env, by check:
//   • model + embedding — AI_GATEWAY_API_KEY  (preferred, covers both)  OR  ANTHROPIC_API_KEY (model)
//                         + VOYAGE_API_KEY (embedding)  (the commit check needs BOTH model+db creds)
//   • email            — RESEND_API_KEY + VERIFY_LIVE_EMAIL_TO  (address the smoke email is sent to;
//                         RESEND_FROM_EMAIL optionally overrides the sender)
//   • DB write         — DATABASE_URL  (a real Neon Postgres WITH pgvector enabled; the commit check
//                        writes a profile + a 1024-dim vector row, reads them back, then deletes both)
//
// RUN: `pnpm verify:live` (root). The live checks import the workspace TypeScript packages, so the
// script registers the `tsx` loader on demand (a root devDependency) before importing them; the
// SKIP path imports nothing and runs under plain `node`.
//
// CI WIRING: `.github/workflows/verify-live.yml` runs this nightly (schedule) + on-demand
// (workflow_dispatch), passing the secrets above from the repo's GitHub Actions secrets. Without
// the secrets it is a clean no-op (this script's skip path). It is deliberately NOT in the PR/CI
// fast gate — it costs a small token/email budget and needs live credentials.

const env = process.env;
const has = (key) => typeof env[key] === "string" && env[key].trim() !== "";

// --- Credential gate (process.env only — NO imports before this, so the skip path is dependency-
// free and runs under plain `node`). -------------------------------------------------------------
const aiPresent = has("AI_GATEWAY_API_KEY") || (has("ANTHROPIC_API_KEY") && has("VOYAGE_API_KEY"));
const emailPresent = has("RESEND_API_KEY") && has("VERIFY_LIVE_EMAIL_TO");
const dbPresent = has("DATABASE_URL");

const missing = [];
if (!aiPresent)
  missing.push("model/embedding (AI_GATEWAY_API_KEY, or ANTHROPIC_API_KEY+VOYAGE_API_KEY)");
if (!emailPresent) missing.push("email (RESEND_API_KEY+VERIFY_LIVE_EMAIL_TO)");
if (!dbPresent) missing.push("DB (DATABASE_URL)");

if (missing.length > 0) {
  console.log(`verify:live SKIPPED — ${missing.join("; ")} credentials absent`);
  process.exit(0);
}

// --- Live path. Enable TypeScript loading for the workspace packages, then import them. ----------
let tsxHandle;
try {
  const tsx = await import("tsx/esm/api");
  tsxHandle = tsx.register();
} catch (err) {
  console.error("verify:live: failed to load the tsx TypeScript loader (root devDependency).");
  console.error(`  ${err?.message ?? err}`);
  console.error("  Run `pnpm install` so tsx is available, then `pnpm verify:live`.");
  process.exit(1);
}

// Import through the PUBLIC package entrypoints only (never `src/` internals) — the gate must drive
// the exact seams product code drives. The commit check uses the `@resonance/db` query helper
// (findSimilarProfiles) rather than raw drizzle; the only raw drizzle here is `eq` + the table
// objects, used solely to seed a throwaway `user` row and to delete the throwaway rows in cleanup
// (there is no public "create user" / "delete profile" helper — auth owns signup).
const [
  { createDb, user, creatorProfiles, embeddings, findSimilarProfiles },
  ai,
  { resolveMail },
  { eq },
] = await Promise.all([
  import("@resonance/db"),
  import("@resonance/ai"),
  import("@resonance/auth"),
  import("drizzle-orm"),
]);
const {
  resolveEmbedder,
  runAgentStream,
  creatorInterviewAgent,
  runAgentStructured,
  profileGenAgent,
  commitCreatorProfile,
} = ai;

// --- Run all checks in PARALLEL. Each is isolated (its own try/catch) so one failure never masks
// another; Promise.all preserves input order, so the report stays deterministic. -----------------
async function check(name, fn) {
  const startedAt = Date.now();
  try {
    const detail = await fn();
    return { name, ok: true, detail: detail ?? "ok", ms: Date.now() - startedAt };
  } catch (err) {
    return { name, ok: false, detail: String(err?.message ?? err), ms: Date.now() - startedAt };
  }
}

const results = await Promise.all([
  // 1) interview — one real STREAMING generation through the live `resolveModel` seam via the
  //    shared runner (the Weave interview chat path).
  check("interview", async () => {
    const result = runAgentStream(creatorInterviewAgent, {
      messages: [{ role: "user", content: "Reply with a single short word." }],
    });
    const text = await result.text;
    if (!text || text.trim().length === 0) throw new Error("interview returned no text");
    return `streamed reply (${text.trim().length} chars)`;
  }),
  // 2) profilegen — the STRUCTURED path the slice depends on: runAgentStructured forces
  //    profileGenAgent's single `proposeProfile` tool call against a live model and returns its
  //    validated output. The tool handler already re-parses via CreatorProfileDraftSchema, so a
  //    returned `output` is a schema-valid CreatorProfileDraft; we assert its content is non-empty.
  check("profilegen", async () => {
    const { output } = await runAgentStructured(profileGenAgent, {
      messages: [
        { role: "assistant", content: "Tell me about what you make and who it's for." },
        {
          role: "user",
          content:
            "I hand-throw small-batch stoneware mugs and bowls glazed in earthy tones, for people " +
            "who want everyday tableware with a human touch.",
        },
      ],
    });
    if (!Array.isArray(output?.nameOptions) || output.nameOptions.length === 0) {
      throw new Error("profilegen returned no nameOptions");
    }
    if (typeof output.headline !== "string" || output.headline.trim().length === 0) {
      throw new Error("profilegen returned an empty headline");
    }
    return `structured draft ok (${output.nameOptions.length} name option(s), headline ${output.headline.trim().length} chars)`;
  }),
  // 3) embedding — one real embedding through the live `resolveEmbedder` seam (1024-dim contract).
  check("embedding", async () => {
    const vector = await resolveEmbedder().embed("verify:live embedding probe");
    if (!Array.isArray(vector) || vector.length !== 1024) {
      throw new Error(
        `expected a 1024-dim vector, got ${Array.isArray(vector) ? vector.length : typeof vector}`,
      );
    }
    return `embedded 1 text → ${vector.length} dims`;
  }),
  // 4) email — one real send through the live `resolveMail` seam (Resend) to VERIFY_LIVE_EMAIL_TO.
  check("email", async () => {
    const to = env.VERIFY_LIVE_EMAIL_TO.trim();
    await resolveMail().sendLoginCode({ email: to, otp: "000000", type: "sign-in" });
    return `sent smoke email to ${to}`;
  }),
  // 5) commit — the REAL ProfileGen write path (ADR-0013), the one a raw user insert never touched.
  //    commitCreatorProfile drives embed → createCreatorProfile → upsertProfileEmbedding (the
  //    1024-dim pgvector write) → role flip, in the no-interactive-transaction order (ADR-0004).
  //    We seed a throwaway user (FK target), commit, then PROVE it landed by the same pgvector ANN
  //    read product code uses (findSimilarProfiles) + a user.roles read, then clean up everything.
  check("commit", async () => {
    const db = createDb();
    const embedder = resolveEmbedder();
    const userId = `verify-live-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const email = `${userId}@verify-live.invalid`;
    // A throwaway user must exist first: creator_profiles.user_id is an FK → user.id. No public
    // "create user" helper exists (auth owns signup), so a raw insert of a throwaway row is the
    // minimal seam — deleted in `finally`.
    await db.insert(user).values({ id: userId, name: "verify:live smoke", email });
    try {
      const input = {
        displayName: "Verify Live Smoke",
        headline: "Live-smoke creator profile",
        bio: "A throwaway profile written by verify:live to exercise the real commit path.",
        tags: ["verify-live", "smoke"],
      };
      const { profileId } = await commitCreatorProfile(
        { userId, currentRoles: ["member"], db, embedder },
        input,
      );

      // Prove the pgvector write landed AND is queryable via the real matching read path. Re-embed
      // the exact committed content (same embedder → ~identical vector → similarity ≈ 1), so our
      // row is the top ANN hit; findSimilarProfiles innerJoins creator_profiles, so a hit confirms
      // BOTH the profile row and its embedding row exist and are joined.
      const { embedding: probe } = await embedder.embedProfile({ ...input, offerings: [] });
      const hits = await findSimilarProfiles(db, probe, 5);
      if (!hits.some((h) => h.id === profileId)) {
        throw new Error(`committed profile ${profileId} not found via findSimilarProfiles`);
      }

      // Confirm the role flip (the last step of the ordering): member → member+creator, additive.
      const [row] = await db.select({ roles: user.roles }).from(user).where(eq(user.id, userId));
      const roles = (row?.roles ?? "").split(",");
      if (!roles.includes("creator")) {
        throw new Error(`role flip missing: user.roles = ${JSON.stringify(row?.roles)}`);
      }

      return `embed → profile → pgvector → role flip ok (profile ${profileId})`;
    } finally {
      // Idempotent cleanup, robust to partial failure. Embeddings are polymorphic (no FK), so
      // delete them explicitly by the profile's id; deleting the user cascades to creator_profiles
      // (onDelete: "cascade"). Look the profile up by our throwaway userId so we clean up even if
      // commit threw before returning the id.
      const [profile] = await db
        .select({ id: creatorProfiles.id })
        .from(creatorProfiles)
        .where(eq(creatorProfiles.userId, userId));
      if (profile) await db.delete(embeddings).where(eq(embeddings.sourceId, profile.id));
      await db.delete(user).where(eq(user.id, userId));
    }
  }),
]);

tsxHandle?.unregister?.();

// --- Report ------------------------------------------------------------------------------------
let failed = 0;
for (const r of results) {
  const status = r.ok ? "PASS" : "FAIL";
  console.log(`verify:live ${status} ${r.name.padEnd(10)} ${r.detail} (${r.ms}ms)`);
  if (!r.ok) failed += 1;
}

if (failed > 0) {
  console.error(
    `\nverify:live: ${failed}/${results.length} checks FAILED — live wiring is broken.`,
  );
  process.exit(1);
}
console.log(`\nverify:live OK — all ${results.length} live checks passed.`);
process.exit(0);

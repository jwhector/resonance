#!/usr/bin/env node
// verify:live — the credential-gated live-smoke gate (ADR-0018 §3).
//
// ADR-0018 makes shipped code LIVE-BY-DEFAULT and moves every fake into test injection. The risk
// that creates: a green unit/CI build can still hide BROKEN LIVE WIRING (the exact failure ADR-0018
// was written for — the Gateway-vs-Anthropic mismatch and the missing Resend adapter were invisible
// while everything ran on fakes). This gate closes that hole: it exercises all four external
// services FOR REAL — one model call, one embedding, one email, one DB write — through the public
// `@resonance/*` seams, so "green for release" includes "the live wiring works."
//
// CREDENTIAL-GATED: with no credentials it SKIPS and exits 0, so it is safe in the credential-free
// fast loop and no-secret CI (forks, PRs). It only does real work when the required secrets are
// present. Required env, by check:
//   • model + embedding — AI_GATEWAY_API_KEY  (preferred, covers both)  OR  ANTHROPIC_API_KEY (model)
//                         + VOYAGE_API_KEY (embedding)
//   • email            — RESEND_API_KEY + VERIFY_LIVE_EMAIL_TO  (address the smoke email is sent to;
//                         RESEND_FROM_EMAIL optionally overrides the sender)
//   • DB write         — DATABASE_URL  (a real Neon Postgres; the check writes+reads+deletes one row)
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

const [{ createDb, user }, ai, { resolveMail }, { eq }] = await Promise.all([
  import("@resonance/db"),
  import("@resonance/ai"),
  import("@resonance/auth"),
  import("drizzle-orm"),
]);
const { resolveEmbedder, runAgentStream, creatorInterviewAgent } = ai;

// --- Run each check independently so one failure never masks another; report all, fail on any. ---
const results = [];
async function check(name, fn) {
  const startedAt = Date.now();
  try {
    const detail = await fn();
    results.push({ name, ok: true, detail: detail ?? "ok", ms: Date.now() - startedAt });
  } catch (err) {
    results.push({
      name,
      ok: false,
      detail: String(err?.message ?? err),
      ms: Date.now() - startedAt,
    });
  }
}

// 1) model — one real generation through the live `resolveModel` seam via the shared runner.
await check("model", async () => {
  const result = runAgentStream(creatorInterviewAgent, {
    messages: [{ role: "user", content: "Reply with a single short word." }],
  });
  const text = await result.text;
  if (!text || text.trim().length === 0) throw new Error("model returned no text");
  return `model responded (${text.trim().length} chars)`;
});

// 2) embedding — one real embedding through the live `resolveEmbedder` seam (1024-dim contract).
await check("embedding", async () => {
  const vector = await resolveEmbedder().embed("verify:live embedding probe");
  if (!Array.isArray(vector) || vector.length !== 1024) {
    throw new Error(
      `expected a 1024-dim vector, got ${Array.isArray(vector) ? vector.length : typeof vector}`,
    );
  }
  return `embedded 1 text → ${vector.length} dims`;
});

// 3) email — one real send through the live `resolveMail` seam (Resend) to VERIFY_LIVE_EMAIL_TO.
await check("email", async () => {
  const to = env.VERIFY_LIVE_EMAIL_TO.trim();
  await resolveMail().sendLoginCode({ email: to, otp: "000000", type: "sign-in" });
  return `sent smoke email to ${to}`;
});

// 4) DB write — one real write+read+cleanup through `@resonance/db` createDb() against Neon.
await check("db", async () => {
  const db = createDb();
  const id = `verify-live-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const email = `${id}@verify-live.invalid`;
  await db.insert(user).values({ id, name: "verify:live smoke", email });
  try {
    const rows = await db.select().from(user).where(eq(user.id, id));
    if (rows.length !== 1) throw new Error(`read-back expected 1 row, got ${rows.length}`);
  } finally {
    await db.delete(user).where(eq(user.id, id)); // always clean up the throwaway row
  }
  return "insert → read-back → delete ok";
});

tsxHandle?.unregister?.();

// --- Report ------------------------------------------------------------------------------------
let failed = 0;
for (const r of results) {
  const status = r.ok ? "PASS" : "FAIL";
  console.log(`verify:live ${status} ${r.name.padEnd(9)} ${r.detail} (${r.ms}ms)`);
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

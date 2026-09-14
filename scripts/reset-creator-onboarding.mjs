#!/usr/bin/env node
// onboarding:reset — put one dev account back to "never started creator onboarding".
//
// The staged creator interview keeps ONE session per user and completing it publishes a
// profile, so once an account has finished the flow it cannot be walked again. Manual
// testing against real services (a real model, real Neon, real email) needs a way back to
// the opening stage that does not touch anything else about the account. This script is that
// way back. For the named user it:
//   • deletes the creator_profile embedding row(s) (polymorphic, no FK — deleted by profile id),
//   • deletes the creator_profiles row,
//   • deletes the creator_onboarding_sessions row,
//   • removes "creator" from user.roles (everything else in the role list is kept).
// The account, its auth sessions, its interests and its stated intent are left alone, so the
// next visit to /onboarding/creator starts a fresh interview without signing in again.
//
// It is a dev tool: it refuses to run with NODE_ENV=production, requires an explicit --email,
// and prints what it removed. It reads DATABASE_URL from process.env only. The pnpm script loads
// apps/web/.env.local into the process when that file exists, so the usual invocation is
//   pnpm onboarding:reset -- --email you@example.com
// (Node flags such as --env-file must come before the script path, so they cannot be passed
// through pnpm's `--`; without the pnpm script, run
//   node --env-file=apps/web/.env.local scripts/reset-creator-onboarding.mjs --email you@example.com
// instead.) The workspace TypeScript packages are loaded through the tsx loader, like verify-live.

const args = process.argv.slice(2);
const emailFlag = args.indexOf("--email");
const email = emailFlag >= 0 ? args[emailFlag + 1]?.trim() : undefined;
const dryRun = args.includes("--dry-run");

if (process.env.NODE_ENV === "production") {
  console.error("onboarding:reset refuses to run with NODE_ENV=production.");
  process.exit(2);
}
if (!email || !email.includes("@")) {
  console.error("usage: pnpm onboarding:reset -- --email <address> [--dry-run]");
  process.exit(2);
}
if (!process.env.DATABASE_URL?.trim()) {
  console.error(
    "onboarding:reset needs DATABASE_URL: put it in apps/web/.env.local (pnpm onboarding:reset loads that file) or export it.",
  );
  process.exit(2);
}

let tsxHandle;
try {
  const tsx = await import("tsx/esm/api");
  tsxHandle = tsx.register();
} catch (err) {
  console.error(`onboarding:reset: failed to load the tsx loader: ${err?.message ?? err}`);
  process.exit(1);
}

const [{ createDb, user, creatorProfiles, creatorOnboardingSessions, embeddings }, { eq, and }] =
  await Promise.all([import("@resonance/db"), import("drizzle-orm")]);

const db = createDb();

const [account] = await db
  .select({ id: user.id, roles: user.roles })
  .from(user)
  .where(eq(user.email, email));
if (!account) {
  console.error(`onboarding:reset: no user with email ${email}`);
  tsxHandle?.unregister?.();
  process.exit(1);
}

const profiles = await db
  .select({ id: creatorProfiles.id, displayName: creatorProfiles.displayName })
  .from(creatorProfiles)
  .where(eq(creatorProfiles.userId, account.id));
const sessions = await db
  .select({ sessionId: creatorOnboardingSessions.sessionId })
  .from(creatorOnboardingSessions)
  .where(eq(creatorOnboardingSessions.userId, account.id));

const roles = (account.roles ?? "").split(",").filter((r) => r.trim() !== "");
const keptRoles = roles.filter((r) => r !== "creator");

console.log(`onboarding:reset ${dryRun ? "(dry run) " : ""}for ${email}`);
console.log(
  `  profiles to delete:  ${profiles.length}${profiles.map((p) => ` (${p.displayName})`).join("")}`,
);
console.log(`  sessions to delete:  ${sessions.length}`);
console.log(`  roles: ${roles.join(",") || "(none)"} → ${keptRoles.join(",") || "member"}`);

if (!dryRun) {
  for (const profile of profiles) {
    await db
      .delete(embeddings)
      .where(
        and(eq(embeddings.sourceType, "creator_profile"), eq(embeddings.sourceId, profile.id)),
      );
  }
  await db.delete(creatorProfiles).where(eq(creatorProfiles.userId, account.id));
  await db
    .delete(creatorOnboardingSessions)
    .where(eq(creatorOnboardingSessions.userId, account.id));
  // Roles are written last so a failure above leaves the account still marked as a creator
  // whose profile is missing — visible — rather than a member with a stray profile.
  await db
    .update(user)
    .set({ roles: keptRoles.length > 0 ? keptRoles.join(",") : "member" })
    .where(eq(user.id, account.id));
  console.log("  done — the next visit to /onboarding/creator starts a fresh interview.");
}

tsxHandle?.unregister?.();

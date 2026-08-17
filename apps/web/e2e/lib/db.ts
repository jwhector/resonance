import { createDb } from "@resonance/db";

/**
 * The database access the E2E fixtures share.
 *
 * Playwright's test process is a *separate* process from the app under test, so it has to reach
 * the same database itself in order to seed rows the product cannot produce (a `draft` profile) or
 * to clean up accounts a test signed up. Everything here is fixture plumbing — no product
 * behaviour lives in this file.
 */

/** The Neon tagged template Drizzle keeps on `$client`. Typed locally to avoid a driver import. */
export type RawSql = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown[]>;

/**
 * Load `DATABASE_URL` from `apps/web/.env.local` when the Playwright runner does not already
 * have it. `next dev` reads that file itself, but the test process is a separate process and
 * needs the same database to seed into. The file is gitignored and never printed.
 */
export function ensureDatabaseUrl(): void {
  if (process.env.DATABASE_URL) return;
  const loadEnvFile = (process as unknown as { loadEnvFile?: (p: string) => void }).loadEnvFile;
  if (!loadEnvFile) throw new Error("DATABASE_URL is not set and process.loadEnvFile is missing");
  for (const candidate of [".env.local", "apps/web/.env.local"]) {
    try {
      loadEnvFile(candidate);
      if (process.env.DATABASE_URL) return;
    } catch {
      /* try the next candidate */
    }
  }
  throw new Error("DATABASE_URL is not set and no apps/web/.env.local could be read");
}

/**
 * The raw SQL escape hatch, for the handful of fixture statements Drizzle's typed builders cannot
 * express here: inserting a Better Auth `user` row directly, and deleting fixture rows on cleanup.
 * Reached through `db.$client` rather than a `drizzle-orm` import, because `apps/web` does not
 * depend on `drizzle-orm` and should not start now.
 */
export function rawClient(db: ReturnType<typeof createDb>): RawSql {
  return (db as unknown as { $client: RawSql }).$client;
}

/**
 * The intent stored against an account, read straight from the column rather than inferred from
 * where the browser ended up.
 *
 * Where someone lands and what was recorded about them are two different claims: routing reads the
 * value off the URL, so a fork that worked would look identical to one that routed correctly and
 * wrote nothing. `null` is a real answer here — it means nobody ever stated an intent.
 */
export async function readOnboardingIntent(email: string): Promise<string | null> {
  ensureDatabaseUrl();
  const raw = rawClient(createDb());
  const rows = (await raw`
    select onboarding_intent from "user" where email = ${email}
  `) as Array<{ onboarding_intent: string | null }>;
  return rows[0]?.onboarding_intent ?? null;
}

/**
 * Remove an account created by signing up during a test, addressed by email because Better Auth
 * mints the id. The `user` delete cascades to their creator profile, sessions and follow edges.
 *
 * **Both kinds of embedding are deleted explicitly first, because no cascade can reach them.**
 * `embeddings` has no foreign key to anything — its `source_id` is plain text, holding creator
 * profile uuids and member ids alike — so deleting the user leaves:
 *
 * - the member's **interest vector** (`source_type = 'interest'`, keyed by user id), and
 * - the **creator-profile vector** of any profile the test committed (`source_type =
 *   'creator_profile'`, keyed by the profile uuid that is about to cascade away).
 *
 * The second one is not inert. A stranded creator vector still joins nothing and so never
 * appears in results — but the profile row it described is gone, and while the profile *is*
 * there it ranks in real searches. That is how the dev database accumulated 70 `New Creator`
 * profiles: every full-flow run committed one and deleted none.
 */
export async function deleteUserByEmail(email: string): Promise<void> {
  ensureDatabaseUrl();
  const raw = rawClient(createDb());
  await raw`
    delete from embeddings
    where source_type = 'interest'
      and source_id in (select id from "user" where email = ${email})
  `;
  // Profile uuid compared as text: `source_id` is a text column, so casting the uuid side is the
  // safe direction — `source_id::uuid` would raise the moment it met a non-uuid interest key.
  await raw`
    delete from embeddings
    where source_id in (
      select p.id::text
      from creator_profiles p
      join "user" u on u.id = p.user_id
      where u.email = ${email}
    )
  `;
  await raw`delete from "user" where email = ${email}`;
}

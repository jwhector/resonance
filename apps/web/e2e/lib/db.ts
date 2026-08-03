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
 * Remove a member created by signing up during a test, addressed by email because Better Auth
 * mints the id. Cascades to their profile, session and follow edges.
 *
 * Their **interest vector** is deleted explicitly first: `embeddings` has no foreign key to
 * `user` (its `source_id` is text, holding profile uuids and member ids alike), so the cascade
 * cannot reach it and a member who picked topics would otherwise leave a vector behind on every
 * run. It is inert — discovery only joins `source_type = 'creator_profile'` rows — but it
 * accumulates, and "inert today" is how the last pile of leaked rows started.
 */
export async function deleteUserByEmail(email: string): Promise<void> {
  ensureDatabaseUrl();
  const raw = rawClient(createDb());
  await raw`
    delete from embeddings
    where source_type = 'interest'
      and source_id in (select id from "user" where email = ${email})
  `;
  await raw`delete from "user" where email = ${email}`;
}

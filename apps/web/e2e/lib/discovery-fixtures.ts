import { createFakeEmbedder } from "@resonance/ai/testing";
import { createCreatorProfile, createDb, upsertProfileEmbedding } from "@resonance/db";

/**
 * Deterministic discovery fixtures for the `/discover` E2E (`resonance-3f15`).
 *
 * ## Why the fixtures are seeded, not driven through the UI
 *
 * Two of the plan's acceptance criteria cannot be produced by driving the product:
 *
 * 1. **A `status: "draft"` profile** (criterion 1, and the slice's original live bug). Nothing
 *    in the app can leave a profile in `draft` — `commitCreatorProfile` writes `ready` — so the
 *    only way to prove drafts are excluded is to put one in the database and look for it.
 * 2. **A known ranking order.** The dev database already holds ~20 committed profiles, so
 *    "the results are ranked" is only assertable against rows whose similarity we control.
 *
 * ## How the ranking is made deterministic
 *
 * Under `E2E_HARNESS=1` the app embeds the query with `createFakeEmbedder()` (see
 * `apps/web/lib/e2e-harness.ts` → `discoveryEmbedder`). That embedder is a pure, text-derived
 * hash, so seeding a profile whose embedded **content is byte-identical to the query text**
 * yields cosine similarity `1.0` — the top of the ranking by construction. A second profile
 * embedded from the query *plus a suffix* lands just below it. The assertions therefore compare
 * the two fixtures' **relative** order rather than absolute positions, so unrelated rows already
 * in the dev DB (or another Playwright worker's fixtures) can interleave harmlessly.
 *
 * The draft is embedded from the **same exact text as the top row**, so a regression in the
 * `status = 'ready'` filter would put it at rank 1 — the loudest possible failure, not a silent
 * one.
 *
 * ## Isolation and cleanup
 *
 * Every fixture id, email and display name carries a per-worker `runId`, so parallel workers and
 * repeated runs never collide. `cleanup()` deletes the embeddings and then the users; the
 * `creator_profiles` and `follows` rows go with them via `ON DELETE cascade`. Deletes go through
 * `db.$client` (the raw Neon tagged template Drizzle exposes) rather than a `drizzle-orm` import,
 * because `apps/web` does not depend on `drizzle-orm` and should not start now.
 */

/** One seeded creator. */
export interface SeededCreator {
  /** Better Auth user id — the follow target. */
  userId: string;
  /** `creator_profiles.id` — the `/creator/[id]` segment. */
  profileId: string;
  displayName: string;
  headline: string;
}

export interface DiscoveryFixture {
  /** The exact text to type into the search field. */
  query: string;
  /** Ranks first: its embedded content is byte-identical to {@link query}. */
  top: SeededCreator;
  /** Ranks below {@link top}: same content plus a suffix. */
  second: SeededCreator;
  /** `status: "draft"`, embedded from the same text as {@link top}. Must never be returned. */
  draft: SeededCreator;
  /** The single offering rendered on {@link top}'s profile page. */
  offering: { title: string; description: string };
  /** Extra user ids to remove on cleanup (e.g. a member created by signing up mid-test). */
  trackUserId(userId: string): void;
  cleanup(): Promise<void>;
}

/** The Neon tagged template Drizzle keeps on `$client`. Typed locally to avoid a driver import. */
type RawSql = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown[]>;

/**
 * Load `DATABASE_URL` from `apps/web/.env.local` when the Playwright runner does not already
 * have it. `next dev` reads that file itself, but the test process is a separate process and
 * needs the same database to seed into. The file is gitignored and never printed.
 */
function ensureDatabaseUrl(): void {
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
 * Seed the three profiles above and return them with a cleanup handle.
 *
 * `runId` should be unique per worker — the caller passes one built in `beforeAll`, which runs
 * once per worker process.
 */
export async function seedDiscoveryFixture(runId: string): Promise<DiscoveryFixture> {
  ensureDatabaseUrl();
  const db = createDb();
  const raw = (db as unknown as { $client: RawSql }).$client;
  const embedder = createFakeEmbedder();

  // Distinctive enough that it cannot collide with a real profile's text, and well under the
  // 200-character cap `DiscoveryQuerySchema` enforces.
  const query = `zzdiscovery ${runId} handthrown stoneware kiln work`;
  const offering = {
    title: `Stoneware mug set ${runId}`,
    description: "Four hand-thrown mugs, glazed and fired in a small gas kiln.",
  };

  const userIds: string[] = [];
  const profileIds: string[] = [];

  async function seed(
    slot: string,
    displayName: string,
    content: string,
    status: "ready" | "draft",
    offerings: Array<{ title: string; description: string }> = [],
  ): Promise<SeededCreator> {
    const userId = `e2e-discovery-${runId}-${slot}`;
    await raw`
      insert into "user" (id, name, email, email_verified, roles)
      values (${userId}, ${displayName}, ${`${userId}@example.com`}, true, 'member,creator')
      on conflict (id) do nothing
    `;
    userIds.push(userId);

    const headline = `Ranked ${slot} fixture for ${runId}`;
    const profile = await createCreatorProfile(db, {
      userId,
      displayName,
      headline,
      bio: content,
      tags: ["e2e", "stoneware"],
      offerings,
      status,
    });
    profileIds.push(profile.id);

    await upsertProfileEmbedding(db, {
      profileId: profile.id,
      model: embedder.model,
      content,
      embedding: await embedder.embed(content),
    });

    return { userId, profileId: profile.id, displayName, headline };
  }

  // `top` and `draft` share the query text exactly — similarity 1.0 for both, so the only thing
  // separating them in the results is the status filter under test.
  const top = await seed("top", `E2E Top ${runId}`, query, "ready", [offering]);
  const second = await seed(
    "second",
    `E2E Second ${runId}`,
    `${query} plus adjacent glaze notes`,
    "ready",
  );
  const draft = await seed("draft", `E2E Draft ${runId}`, query, "draft");

  const extraUserIds: string[] = [];

  return {
    query,
    top,
    second,
    draft,
    offering,
    trackUserId(userId: string) {
      extraUserIds.push(userId);
    },
    async cleanup() {
      // Embeddings have no FK to creator_profiles, so they must go explicitly and first. No
      // `::uuid` cast on `source_id`: it is a polymorphic key that may be stored as text, so let
      // the column drive the bound parameter's type instead of forcing uuid.
      for (const id of profileIds) {
        await raw`delete from embeddings where source_id = ${id}`;
      }
      // Users cascade to creator_profiles, follows and sessions.
      for (const id of [...userIds, ...extraUserIds]) {
        await raw`delete from "user" where id = ${id}`;
      }
    },
  };
}

/**
 * Remove a member created by signing up during a test, addressed by email because Better Auth
 * mints the id. Cascades to their profile, session and follow edges.
 */
export async function deleteUserByEmail(email: string): Promise<void> {
  ensureDatabaseUrl();
  const db = createDb();
  const raw = (db as unknown as { $client: RawSql }).$client;
  await raw`delete from "user" where email = ${email}`;
}

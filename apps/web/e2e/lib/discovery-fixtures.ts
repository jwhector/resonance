import { createFakeEmbedder } from "@resonance/ai/testing";
import { createCreatorProfile, createDb, upsertProfileEmbedding } from "@resonance/db";
import { ensureDatabaseUrl, rawClient } from "./db";
import {
  discoveryQueryFor,
  FIXTURE_NAME_PREFIX,
  SECOND_FIXTURE_SUFFIX,
} from "./discovery-query";

/**
 * Deterministic discovery fixtures for the `/discover` E2E.
 *
 * ## Why the fixtures are seeded, not driven through the UI
 *
 * Two things these tests must prove cannot be produced by driving the product:
 *
 * 1. **A `status: "draft"` profile** (the original live bug this guards against). Nothing
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
 * `creator_profiles` and `follows` rows go with them via `ON DELETE cascade`. The database
 * plumbing itself — reaching the same Neon instance from the test process, and the raw SQL
 * escape hatch — is shared with the other fixtures in `./db`.
 *
 * ## Why the query text is a high-entropy token
 *
 * Cleanup can fail — it has — and the dev database is shared, so fixtures from earlier runs may
 * still be sitting in it. Those rows must be inert rather than competitors, which is a property
 * of the query TEXT, not of the display names: ranking reads what was embedded. `./discovery-query`
 * owns that property and documents the measurements behind it; `discovery-query.test.ts` pins it.
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
  /**
   * Any names in `names` that are discovery fixtures **from a different run** — rows an earlier
   * run failed to clean up.
   *
   * Assert this is empty alongside the ranking assertions. A leaked row can no longer outrank
   * this run's fixtures, but its presence still means cleanup is broken, and this reports that
   * as itself rather than as a confusing ordering failure several runs later.
   */
  foreignFixtureNames(names: string[]): string[];
  cleanup(): Promise<void>;
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
  const raw = rawClient(db);
  const embedder = createFakeEmbedder();

  const query = discoveryQueryFor(runId);
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
  const top = await seed("top", `${FIXTURE_NAME_PREFIX}Top ${runId}`, query, "ready", [offering]);
  const second = await seed(
    "second",
    `${FIXTURE_NAME_PREFIX}Second ${runId}`,
    `${query}${SECOND_FIXTURE_SUFFIX}`,
    "ready",
  );
  const draft = await seed("draft", `${FIXTURE_NAME_PREFIX}Draft ${runId}`, query, "draft");

  return {
    query,
    top,
    second,
    draft,
    offering,
    foreignFixtureNames(names) {
      return names.filter(
        (name) => name.startsWith(FIXTURE_NAME_PREFIX) && !name.endsWith(` ${runId}`),
      );
    },
    async cleanup() {
      // Embeddings have no FK to creator_profiles, so they must go explicitly and first.
      // `source_id` is text — it also keys interest vectors to Better Auth user ids — so the
      // profile uuid is compared as text; a `::uuid` cast here would no longer typecheck in SQL.
      for (const id of profileIds) {
        await raw`delete from embeddings where source_id = ${id}`;
      }
      // Users cascade to creator_profiles, follows and sessions.
      for (const id of userIds) {
        await raw`delete from "user" where id = ${id}`;
      }
    },
  };
}

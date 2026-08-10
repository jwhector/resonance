import { createFakeEmbedder } from "@resonance/ai/testing";
import { MEMBER_INTEREST_TARGET, type Topic } from "@resonance/core";
import { createCreatorProfile, createDb, listTopics, upsertProfileEmbedding } from "@resonance/db";
import { ensureDatabaseUrl, rawClient, type RawSql } from "./db";

/**
 * The fixture that makes `/discover`'s **personalized** ranking assertable.
 *
 * ## Why a creator has to be seeded at all
 *
 * "Empty query + a member with interests returns interest-ranked creators" is only a real claim if
 * the test can name the creator that *should* come back and why. The dev database holds real
 * profiles about unrelated things, so without a seeded row the strongest available assertion is
 * "some rows appeared" — which a regression that ranked by, say, insertion order would also pass.
 *
 * ## How the ranking is made deterministic — and exact
 *
 * Under `E2E_HARNESS=1` both sides of the comparison run through `createFakeEmbedder()`: the
 * member's interest vector (via `/interests`' Server Action → `setMemberInterests`) and this
 * fixture's profile vector. That embedder is a pure text hash, so **byte-identical content yields
 * cosine similarity 1.0** — the maximum, and therefore rank 1 by construction, since
 * `searchCreatorProfiles` orders by `similarity DESC`.
 *
 * So this fixture does not guess at the content string: it derives it exactly the way
 * `setMemberInterests` does — the selected topics' **labels**, in the taxonomy's own order,
 * joined with `", "`. `listTopics` returns that order, so taking the first
 * `MEMBER_INTEREST_TARGET` topics and joining their labels reproduces the member's interest text
 * character for character. The test clicks those same topics.
 *
 * If `setMemberInterests` ever changes how it builds that string, this fixture stops scoring 1.0
 * and the test fails — which is the correct outcome, because the member's vector and the creator
 * vectors would no longer be built to be compared.
 *
 * ## Isolation and cleanup — three layers, because leaking here is *contagious*
 *
 * The fixture id, email and display name all carry `runId`, so repeated runs never collide. The
 * **content** cannot be run-scoped, though — it is dictated by the taxonomy — so a leaked fixture
 * from a previous run scores the same 1.0 and can take rank 1 on the id tiebreak, failing the
 * *next* run as an inscrutable ordering assertion. That failure mode was reproduced while
 * building this fixture: a test that times out never runs the `finally` in
 * its own body, so its rows survive. Hence three layers, in order of preference:
 *
 * 1. `cleanup()`, called from an `afterEach` — a hook Playwright still runs after a timeout,
 *    unlike an in-test `finally`. This is the one that normally does the work.
 * 2. {@link sweepStaleInterestFixtures} at seed time, which removes any sibling an earlier run
 *    left behind, so a single leak cannot poison every run after it.
 * 3. The spec's own pollution check, which catches what neither of those can — a sibling that
 *    appears *during* the run — and says so in as many words instead of failing as a ranking bug.
 *
 * Every sweep is scoped to the `e2e-interest-` user-id prefix, which only this fixture ever
 * writes, so it can never reach a real account.
 */

/** Display-name prefix shared by every creator this fixture seeds, for the pollution check. */
export const INTEREST_FIXTURE_PREFIX = "E2E Interest";

/** User-id prefix for the same rows. Only this fixture writes it, which is what makes the sweep safe. */
const INTEREST_USER_PREFIX = "e2e-interest-";

export interface InterestFixture {
  /** The topics the member should select, in the order the picker renders them. */
  topics: readonly Topic[];
  /** The exact text `setMemberInterests` will embed for {@link topics}. */
  interestContent: string;
  /** The creator seeded to match {@link interestContent} exactly — similarity 1.0. */
  match: { userId: string; profileId: string; displayName: string };
  cleanup(): Promise<void>;
}

/**
 * Seed one creator whose embedded content is byte-identical to the interest text
 * {@link InterestFixture.topics} produces.
 *
 * Seeded per *test* rather than per worker (no `beforeAll`): two workers seeding this fixture
 * concurrently would both score 1.0 and tie for rank 1, so exactly one test owns it.
 */
export async function seedInterestFixture(runId: string): Promise<InterestFixture> {
  ensureDatabaseUrl();
  const db = createDb();
  const raw = rawClient(db);
  const embedder = createFakeEmbedder();

  await sweepStaleInterestFixtures(raw);

  // `listTopics` orders by (sortOrder, slug) — the same order `setMemberInterests` reads the
  // selected rows in, which is what makes the joined labels below reproduce its content string.
  const all = await listTopics(db);
  if (all.length < MEMBER_INTEREST_TARGET) {
    throw new Error(
      `Expected at least ${MEMBER_INTEREST_TARGET} curated topics, found ${all.length}. ` +
        "Is the topics seed applied to this database?",
    );
  }
  const topics = all.slice(0, MEMBER_INTEREST_TARGET);
  const interestContent = topics.map((topic) => topic.label).join(", ");

  const userId = `e2e-interest-${runId}`;
  const displayName = `${INTEREST_FIXTURE_PREFIX} ${runId}`;
  await raw`
    insert into "user" (id, name, email, email_verified, roles)
    values (${userId}, ${displayName}, ${`${userId}@example.com`}, true, 'member,creator')
    on conflict (id) do nothing
  `;

  const profile = await createCreatorProfile(db, {
    userId,
    displayName,
    headline: `Interest-ranked fixture for ${runId}`,
    bio: interestContent,
    tags: ["e2e", "interests"],
    offerings: [],
    status: "ready",
  });

  await upsertProfileEmbedding(db, {
    profileId: profile.id,
    model: embedder.model,
    content: interestContent,
    embedding: await embedder.embed(interestContent),
  });

  return {
    topics,
    interestContent,
    match: { userId, profileId: profile.id, displayName },
    async cleanup() {
      // Embeddings have no FK to creator_profiles, so they go explicitly and first. `source_id`
      // is text — it also keys interest vectors to Better Auth user ids — so the profile uuid is
      // compared as text rather than cast to `::uuid`.
      await raw`delete from embeddings where source_id = ${profile.id}`;
      await raw`delete from "user" where id = ${userId}`;
    },
  };
}

/**
 * Remove interest fixtures an earlier run left behind, so one leak cannot poison every run after
 * it.
 *
 * Scoped to the `e2e-interest-` user-id prefix that only {@link seedInterestFixture} writes — it
 * cannot touch a real account, or even the other E2E fixtures. Safe to run unconditionally
 * because exactly one test seeds this family, so there is never a sibling legitimately in flight
 * within a run.
 *
 * Embeddings first: they carry no foreign key to `creator_profiles`, so deleting the user (which
 * cascades to the profile) would otherwise strand the vector — and a stranded creator vector is
 * exactly what competes for rank 1.
 */
async function sweepStaleInterestFixtures(raw: RawSql): Promise<void> {
  const pattern = `${INTEREST_USER_PREFIX}%`;
  await raw`
    delete from embeddings
    where source_id in (
      select id::text from creator_profiles where user_id like ${pattern}
    )
  `;
  await raw`delete from "user" where id like ${pattern}`;
}

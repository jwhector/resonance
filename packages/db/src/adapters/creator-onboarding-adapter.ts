import { and, eq, sql } from "drizzle-orm";
import {
  CommitProfileInputSchema,
  CompletedCreatorOnboardingSessionSchema,
  CreatorOnboardingSessionSchema,
  ResonanceError,
  assertEmbeddingDims,
  type CommitProfileInput,
  type CreatorOnboardingActor,
  type CreatorOnboardingCompletion,
  type CreatorOnboardingSession,
  type CreatorOnboardingSessionStore,
  type SessionSaveResult,
} from "@resonance/core";
import { user } from "../schema/auth";
import { creatorProfiles, embeddings, type Offering } from "../schema/creator";
import { creatorOnboardingSessions } from "../schema/creator-onboarding";
import type { Db } from "../types";

/**
 * The `@resonance/db` adapter for `core`'s `CreatorOnboardingSessionStore` — the persistence
 * half of the creator-onboarding seam (ADR-0022). The in-memory fake in `core`'s contract tests
 * is the second adapter.
 *
 * Three methods over one owned row per creator. The interesting part is `complete`: it
 * publishes the creator profile, stores its embedding, grants the `creator` role and retires the
 * interview's private answers, and it has to do all four or none. Neither driver can hold a
 * transaction across statements (Neon's HTTP driver has none, PGlite has no batch), so the
 * whole commit is **one statement** of data-modifying `WITH` clauses, the construction
 * `queries/observations.ts` established. The failure-prone external call — embedding — runs
 * before it, so an embedder outage leaves storage untouched.
 */

/**
 * The slice of an embedder this adapter needs. **Injected, never imported**: the dependency runs
 * `ai → db` (ADR-0003), so this package must not know which model produces the vector.
 * `@resonance/ai`'s `resolveEmbedder()` satisfies the shape structurally.
 */
export type ProfileEmbedder = {
  embedProfile(profile: {
    displayName: string;
    headline: string;
    bio: string;
    tags: string[];
    offerings: Offering[];
  }): Promise<{ model: string; content: string; embedding: number[] }>;
};

export type CreatorOnboardingStoreDeps = {
  db: Db;
  embedder: ProfileEmbedder;
};

type StoredSession = { session: CreatorOnboardingSession; completionKey: string | null };

const t = creatorOnboardingSessions;

async function readSession(db: Db, userId: string): Promise<StoredSession | null> {
  const [row] = await db
    .select({
      sessionId: t.sessionId,
      revision: t.revision,
      state: t.state,
      completionKey: t.completionKey,
    })
    .from(t)
    .where(eq(t.userId, userId))
    .limit(1);
  if (!row) return null;

  const parsed = CreatorOnboardingSessionSchema.safeParse({
    ...row.state,
    sessionId: row.sessionId,
    revision: row.revision,
  });
  if (!parsed.success) {
    // Never repaired and never echoed: the issues can quote stored values, and stored values
    // include private answers. An unknown behaviour version lands here by design — reading it
    // needs an explicit migration, not a best-effort reinterpretation.
    throw new ResonanceError(
      "onboarding_session_unreadable",
      "The stored creator-onboarding session does not match the session schema.",
      { cause: parsed.error.issues.map((issue) => issue.path.join(".")) },
    );
  }
  return { session: parsed.data, completionKey: row.completionKey };
}

/** The `state` column's contents: the session minus the fields that live in their own columns. */
function toState(session: CreatorOnboardingSession): Record<string, unknown> {
  const { sessionId: _sessionId, revision: _revision, ...state } = session;
  return state;
}

/**
 * Build the live `CreatorOnboardingSessionStore`.
 *
 * Honours the invariants documented on the port: every method is keyed by the actor's user id
 * and nothing else; stored state is parsed on read and a mismatch is an error; `save` is a
 * compare-and-bump on `revision`; `complete` is atomic and, once a session is completed, every
 * later call returns that completion unchanged.
 */
export function createCreatorOnboardingStore({
  db,
  embedder,
}: CreatorOnboardingStoreDeps): CreatorOnboardingSessionStore {
  return {
    async load(actor: CreatorOnboardingActor): Promise<CreatorOnboardingSession | null> {
      return (await readSession(db, actor.userId))?.session ?? null;
    },

    async save(
      actor: CreatorOnboardingActor,
      session: CreatorOnboardingSession,
    ): Promise<SessionSaveResult> {
      const next = CreatorOnboardingSessionSchema.parse(session);
      if (next.status !== "in_progress") {
        // Completion is not a state a caller may simply write: it is the step that publishes the
        // profile, and only `complete` does that and the erasure together.
        throw new ResonanceError(
          "onboarding_session_save_completed",
          "A completed onboarding session can only be written by complete().",
        );
      }

      const revision = next.revision + 1;
      const state = toState(next);
      // One compare-and-bump statement. A first save inserts; any later one updates only when
      // the stored revision is the one the caller acted on AND the stored session is still in
      // progress, so neither a stale tab nor a retried request can overwrite newer progress or
      // resurrect a completed interview.
      const written = await db
        .insert(t)
        .values({ userId: actor.userId, sessionId: next.sessionId, revision, state })
        .onConflictDoUpdate({
          target: t.userId,
          set: { sessionId: next.sessionId, revision, state, updatedAt: new Date() },
          setWhere: and(eq(t.revision, next.revision), sql`${t.state}->>'status' = 'in_progress'`),
        })
        .returning({ revision: t.revision });

      if (written.length === 0) {
        const current = await readSession(db, actor.userId);
        if (!current) {
          throw new ResonanceError(
            "onboarding_session_missing",
            "A conflicting onboarding session disappeared before it could be read.",
          );
        }
        return { outcome: "stale", session: current.session };
      }
      return { outcome: "saved", session: { ...next, revision } };
    },

    async complete(
      actor: CreatorOnboardingActor,
      args: {
        sessionId: string;
        profile: CommitProfileInput;
        idempotencyKey: string;
      },
    ): Promise<CreatorOnboardingCompletion> {
      const current = await readSession(db, actor.userId);
      if (current?.session.status === "completed") {
        return { session: current.session, alreadyCompleted: true };
      }
      if (!current || current.session.sessionId !== args.sessionId) {
        throw new ResonanceError(
          "onboarding_session_not_found",
          "There is no in-progress onboarding session to complete for this creator.",
        );
      }

      const profile = CommitProfileInputSchema.parse(args.profile);
      // Embed before writing anything: the model call is the step most likely to fail, and a
      // failure here must leave the session, the profile and the role exactly as they were. The
      // onboarding flow has no offerings editor, so a new profile starts with none.
      const { model, content, embedding } = await embedder.embedProfile({
        ...profile,
        offerings: [],
      });
      // A wrong-width vector does not error inside pgvector, it silently matches nothing (ADR-0010).
      assertEmbeddingDims(embedding);

      const completed = CompletedCreatorOnboardingSessionSchema.parse({
        status: "completed",
        sessionId: args.sessionId,
        behaviorVersion: current.session.behaviorVersion,
        completedAt: new Date().toISOString(),
        committedProfile: profile,
        revision: current.session.revision + 1,
      });

      // One statement, so the four writes land together or not at all. Every clause after the
      // first selects from `completed`, so if the session is no longer in progress — someone else
      // completed it first, or it was replaced — the statement writes nothing anywhere.
      //
      // The profile upsert leaves `offerings` alone on conflict: a creator who already has a
      // profile keeps what they published through other flows.
      await db.execute(sql`
        with completed as (
          update ${t}
          set state = ${JSON.stringify(toState(completed))}::jsonb,
              revision = ${t.revision} + 1,
              completion_key = ${args.idempotencyKey},
              updated_at = now()
          where ${t.userId} = ${actor.userId}
            and ${t.sessionId} = ${args.sessionId}
            and ${t.state}->>'status' = 'in_progress'
          returning ${t.userId} as user_id
        ),
        profile as (
          insert into ${creatorProfiles} (user_id, display_name, headline, bio, tags, offerings, status)
          select user_id, ${profile.displayName}, ${profile.headline}, ${profile.bio},
                 ${JSON.stringify(profile.tags)}::jsonb, '[]'::jsonb, 'ready'
          from completed
          on conflict (user_id) do update
          set display_name = excluded.display_name,
              headline = excluded.headline,
              bio = excluded.bio,
              tags = excluded.tags,
              status = excluded.status,
              updated_at = now()
          returning id
        ),
        embedded as (
          insert into ${embeddings} (source_type, source_id, model, content, embedding)
          select 'creator_profile', id::text, ${model}, ${content},
                 ${`[${embedding.join(",")}]`}::vector
          from profile
          on conflict (source_type, source_id, model) do update
          set content = excluded.content, embedding = excluded.embedding
        )
        update ${user}
        set roles = case
          when 'creator' = any(string_to_array(${user.roles}, ',')) then ${user.roles}
          when ${user.roles} = '' then 'creator'
          else ${user.roles} || ',creator'
        end
        where ${user.id} in (select user_id from completed)
      `);

      // Read the outcome back rather than trusting a result set: the two drivers shape raw
      // results differently, and the stored completion key says unambiguously whose commit won.
      const after = await readSession(db, actor.userId);
      if (after?.session.status !== "completed") {
        throw new ResonanceError(
          "onboarding_session_changed",
          "The onboarding session changed before it could be completed; reload and try again.",
        );
      }
      return {
        session: after.session,
        alreadyCompleted: after.completionKey !== args.idempotencyKey,
      };
    },
  };
}

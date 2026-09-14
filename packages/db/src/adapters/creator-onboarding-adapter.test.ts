import { eq, sql } from "drizzle-orm";
import {
  EMBEDDING_DIMS,
  ResonanceError,
  type ActiveCreatorOnboardingSession,
  type CommitProfileInput,
  type CreatorOnboardingActor,
  type CreatorOnboardingSessionStore,
} from "@resonance/core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { user } from "../schema/auth";
import { creatorProfiles, embeddings } from "../schema/creator";
import { creatorOnboardingSessions } from "../schema/creator-onboarding";
import { createTestDb, type TestDb } from "../testing/create-test-db";
import { createCreatorOnboardingStore, type ProfileEmbedder } from "./creator-onboarding-adapter";

/**
 * The creator-onboarding store against real Postgres (PGlite) with every real migration applied,
 * through the same port the web layer calls.
 */

const ALICE: CreatorOnboardingActor = { userId: "alice" };
const BOB: CreatorOnboardingActor = { userId: "bob" };

/** A private answer, distinctive enough to search the whole row for after completion. */
const ORIGIN_SECRET = "I started after my grandmother's garden was sold";

function activeSession(
  overrides: Partial<ActiveCreatorOnboardingSession> = {},
): ActiveCreatorOnboardingSession {
  return {
    status: "in_progress",
    sessionId: "session-1",
    behaviorVersion: "snapshot-v1",
    currentStage: "summary",
    slots: {
      offering: { status: "answered", answer: { kind: "text", text: "Herbal tea workshops" } },
      origin: { status: "answered", answer: { kind: "text", text: ORIGIN_SECRET } },
      resonance_moment: { status: "skipped" },
    },
    draft: {
      nameOptions: [{ name: "Leaf & Kettle", description: "Warm and domestic." }],
      headline: "Slow tea for busy people",
      bio: "Small-batch herbal blends and workshops.",
      tags: ["tea", "herbalism"],
    },
    revision: 0,
    ...overrides,
  };
}

const PROFILE: CommitProfileInput = {
  displayName: "Leaf & Kettle",
  headline: "Slow tea for busy people",
  bio: "Small-batch herbal blends and workshops.",
  tags: ["tea", "herbalism", "workshops"],
};

function fakeEmbedder(options: { fail?: boolean; dims?: number } = {}): ProfileEmbedder & {
  calls: number;
} {
  const embedder = {
    calls: 0,
    async embedProfile(profile: Parameters<ProfileEmbedder["embedProfile"]>[0]) {
      embedder.calls += 1;
      if (options.fail) throw new Error("embedder unavailable");
      const embedding = Array.from({ length: options.dims ?? EMBEDDING_DIMS }, () => 0);
      embedding[0] = 1;
      return { model: "voyage-3.5", content: profile.displayName, embedding };
    },
  };
  return embedder;
}

describe("createCreatorOnboardingStore", () => {
  let db: TestDb;
  let close: () => Promise<void>;
  let embedder: ReturnType<typeof fakeEmbedder>;
  let store: CreatorOnboardingSessionStore;

  // PGlite WASM cold-init plus migrations can exceed the 10s default under CI contention.
  beforeEach(async () => {
    ({ db, close } = await createTestDb());
    await db.insert(user).values([
      { id: "alice", name: "Alice", email: "alice@x.com", roles: "member" },
      { id: "bob", name: "Bob", email: "bob@x.com", roles: "member" },
    ]);
    embedder = fakeEmbedder();
    store = createCreatorOnboardingStore({ db, embedder });
  }, 30000);
  afterEach(async () => {
    await close();
  });

  describe("load and save", () => {
    it("returns null for a creator who has not started", async () => {
      expect(await store.load(ALICE)).toBeNull();
    });

    it("saves a fresh session and resumes it exactly, with the revision advanced", async () => {
      const saved = await store.save(ALICE, activeSession());
      expect(saved.outcome).toBe("saved");
      expect(saved.session.revision).toBe(1);

      expect(await store.load(ALICE)).toEqual({ ...activeSession(), revision: 1 });
    });

    it("advances the revision on every successful save", async () => {
      await store.save(ALICE, activeSession());
      const second = await store.save(
        ALICE,
        activeSession({ currentStage: "foundation", revision: 1 }),
      );
      expect(second).toMatchObject({ outcome: "saved", session: { revision: 2 } });
      expect(await store.load(ALICE)).toMatchObject({ currentStage: "foundation", revision: 2 });
    });

    it("rejects a stale revision and returns the stored state without overwriting it", async () => {
      await store.save(ALICE, activeSession());
      await store.save(ALICE, activeSession({ currentStage: "foundation", revision: 1 }));

      // A second tab still looking at revision 1.
      const stale = await store.save(ALICE, activeSession({ currentStage: "origin", revision: 1 }));
      expect(stale).toMatchObject({
        outcome: "stale",
        session: { currentStage: "foundation", revision: 2 },
      });
      expect(await store.load(ALICE)).toMatchObject({ currentStage: "foundation", revision: 2 });
    });

    it("treats a replayed first save as stale rather than restarting the interview", async () => {
      await store.save(ALICE, activeSession({ currentStage: "origin" }));
      const replay = await store.save(ALICE, activeSession({ sessionId: "session-2" }));
      expect(replay).toMatchObject({
        outcome: "stale",
        session: { sessionId: "session-1", currentStage: "origin" },
      });
    });

    it("scopes every read and write to the actor", async () => {
      await store.save(ALICE, activeSession({ currentStage: "origin" }));
      expect(await store.load(BOB)).toBeNull();

      await store.save(BOB, activeSession({ sessionId: "bob-session", currentStage: "opening" }));
      expect(await store.load(ALICE)).toMatchObject({
        sessionId: "session-1",
        currentStage: "origin",
      });
      expect(await store.load(BOB)).toMatchObject({ sessionId: "bob-session" });
    });

    it("refuses to save a completed session — only complete() may finish one", async () => {
      await expect(
        store.save(ALICE, {
          status: "completed",
          sessionId: "session-1",
          behaviorVersion: "snapshot-v1",
          completedAt: "2026-09-13T23:00:00.000Z",
          committedProfile: PROFILE,
          revision: 0,
        }),
      ).rejects.toMatchObject({ code: "onboarding_session_save_completed" });
      expect(await store.load(ALICE)).toBeNull();
    });

    it("stores no revision or session id inside the JSON, so a column cannot disagree with it", async () => {
      await store.save(ALICE, activeSession());
      const [row] = await db.select().from(creatorOnboardingSessions);
      expect(row?.state).not.toHaveProperty("revision");
      expect(row?.state).not.toHaveProperty("sessionId");
    });

    it("fails loudly on stored state that does not parse, including an unknown behaviour version", async () => {
      await store.save(ALICE, activeSession());
      await db
        .update(creatorOnboardingSessions)
        .set({ state: sql`jsonb_set(state, '{behaviorVersion}', '"weave-os-v9"')` })
        .where(eq(creatorOnboardingSessions.userId, "alice"));

      const error = await store.load(ALICE).catch((e: unknown) => e);
      expect(error).toBeInstanceOf(ResonanceError);
      expect(error).toMatchObject({ code: "onboarding_session_unreadable" });
      // Parse issues can quote stored values; the message must not carry a private answer.
      expect(String((error as Error).message)).not.toContain(ORIGIN_SECRET);
    });
  });

  describe("complete", () => {
    beforeEach(async () => {
      await store.save(ALICE, activeSession());
    });

    it("publishes the profile, stores its embedding and grants the creator role", async () => {
      const result = await store.complete(ALICE, {
        sessionId: "session-1",
        profile: PROFILE,
        idempotencyKey: "commit-key-1",
      });

      expect(result.alreadyCompleted).toBe(false);
      expect(result.session).toMatchObject({
        status: "completed",
        sessionId: "session-1",
        behaviorVersion: "snapshot-v1",
        committedProfile: PROFILE,
        revision: 2,
      });

      const [profile] = await db
        .select()
        .from(creatorProfiles)
        .where(eq(creatorProfiles.userId, "alice"));
      expect(profile).toMatchObject({
        displayName: PROFILE.displayName,
        headline: PROFILE.headline,
        bio: PROFILE.bio,
        tags: PROFILE.tags,
        offerings: [],
        status: "ready",
      });

      const vectors = await db
        .select()
        .from(embeddings)
        .where(eq(embeddings.sourceId, profile!.id));
      expect(vectors).toHaveLength(1);
      expect(vectors[0]).toMatchObject({ sourceType: "creator_profile", model: "voyage-3.5" });

      const [alice] = await db.select().from(user).where(eq(user.id, "alice"));
      expect(alice?.roles).toBe("member,creator");
    });

    it("erases every private answer and the draft from storage", async () => {
      await store.complete(ALICE, {
        sessionId: "session-1",
        profile: PROFILE,
        idempotencyKey: "commit-key-1",
      });

      const [row] = await db.select().from(creatorOnboardingSessions);
      const stored = JSON.stringify(row?.state);
      expect(stored).not.toContain(ORIGIN_SECRET);
      expect(row?.state).not.toHaveProperty("slots");
      expect(row?.state).not.toHaveProperty("draft");
      expect(await store.load(ALICE)).not.toHaveProperty("slots");
    });

    it("is idempotent: a replay with the same or a different key changes nothing", async () => {
      const first = await store.complete(ALICE, {
        sessionId: "session-1",
        profile: PROFILE,
        idempotencyKey: "commit-key-1",
      });

      const sameKey = await store.complete(ALICE, {
        sessionId: "session-1",
        profile: PROFILE,
        idempotencyKey: "commit-key-1",
      });
      const otherKey = await store.complete(ALICE, {
        sessionId: "session-1",
        profile: { ...PROFILE, headline: "A different headline" },
        idempotencyKey: "commit-key-2",
      });

      for (const replay of [sameKey, otherKey]) {
        expect(replay.alreadyCompleted).toBe(true);
        expect(replay.session).toEqual(first.session);
      }
      // Nothing republished: one embedding call, the original headline, one role grant.
      expect(embedder.calls).toBe(1);
      const [profile] = await db.select().from(creatorProfiles);
      expect(profile?.headline).toBe(PROFILE.headline);
      const [alice] = await db.select().from(user).where(eq(user.id, "alice"));
      expect(alice?.roles).toBe("member,creator");
    });

    it("lets exactly one of two racing commits win, and the loser reports the winner's completion", async () => {
      // Both read the session as in progress before either writes, so the one-statement guard —
      // not the early read — is what decides the race.
      const [a, b] = await Promise.all([
        store.complete(ALICE, {
          sessionId: "session-1",
          profile: PROFILE,
          idempotencyKey: "tab-a",
        }),
        store.complete(ALICE, {
          sessionId: "session-1",
          profile: { ...PROFILE, headline: "The other tab's headline" },
          idempotencyKey: "tab-b",
        }),
      ]);

      expect([a.alreadyCompleted, b.alreadyCompleted].sort()).toEqual([false, true]);
      expect(a.session).toEqual(b.session);
      const winner = a.alreadyCompleted ? b : a;
      const [profile] = await db.select().from(creatorProfiles);
      expect(profile?.headline).toBe(winner.session.committedProfile.headline);
      expect(await db.select().from(embeddings)).toHaveLength(1);
    });

    it("rejects later saves against the completed session instead of resurrecting it", async () => {
      await store.complete(ALICE, {
        sessionId: "session-1",
        profile: PROFILE,
        idempotencyKey: "commit-key-1",
      });
      const late = await store.save(ALICE, activeSession({ revision: 1 }));
      expect(late).toMatchObject({ outcome: "stale", session: { status: "completed" } });
    });

    it("does not add the creator role twice for someone who already holds it", async () => {
      await db.update(user).set({ roles: "member,creator" }).where(eq(user.id, "alice"));
      await store.complete(ALICE, {
        sessionId: "session-1",
        profile: PROFILE,
        idempotencyKey: "commit-key-1",
      });
      const [alice] = await db.select().from(user).where(eq(user.id, "alice"));
      expect(alice?.roles).toBe("member,creator");
    });

    it("leaves a creator's existing offerings in place when their profile already exists", async () => {
      const offering = { title: "Tea tasting", description: "A guided tasting." };
      await db.insert(creatorProfiles).values({
        userId: "alice",
        displayName: "Old name",
        headline: "Old headline",
        bio: "Old bio",
        tags: [],
        offerings: [offering],
        status: "draft",
      });
      await store.complete(ALICE, {
        sessionId: "session-1",
        profile: PROFILE,
        idempotencyKey: "commit-key-1",
      });
      const rows = await db.select().from(creatorProfiles);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ displayName: PROFILE.displayName, offerings: [offering] });
    });

    it("writes nothing when the embedder fails", async () => {
      const failing = createCreatorOnboardingStore({ db, embedder: fakeEmbedder({ fail: true }) });
      await expect(
        failing.complete(ALICE, {
          sessionId: "session-1",
          profile: PROFILE,
          idempotencyKey: "commit-key-1",
        }),
      ).rejects.toThrow("embedder unavailable");

      expect(await store.load(ALICE)).toMatchObject({ status: "in_progress", revision: 1 });
      expect(await db.select().from(creatorProfiles)).toHaveLength(0);
      const [alice] = await db.select().from(user).where(eq(user.id, "alice"));
      expect(alice?.roles).toBe("member");
    });

    it("refuses a wrong-width vector before any write", async () => {
      const narrow = createCreatorOnboardingStore({ db, embedder: fakeEmbedder({ dims: 8 }) });
      await expect(
        narrow.complete(ALICE, {
          sessionId: "session-1",
          profile: PROFILE,
          idempotencyKey: "commit-key-1",
        }),
      ).rejects.toThrow();
      expect(await store.load(ALICE)).toMatchObject({ status: "in_progress" });
      expect(await db.select().from(creatorProfiles)).toHaveLength(0);
    });

    it("refuses a commit from a session that is not the creator's current one", async () => {
      await expect(
        store.complete(ALICE, {
          sessionId: "an-old-session",
          profile: PROFILE,
          idempotencyKey: "commit-key-1",
        }),
      ).rejects.toMatchObject({ code: "onboarding_session_not_found" });
      expect(embedder.calls).toBe(0);
    });

    it("cannot complete another creator's session", async () => {
      await expect(
        store.complete(BOB, {
          sessionId: "session-1",
          profile: PROFILE,
          idempotencyKey: "commit-key-1",
        }),
      ).rejects.toMatchObject({ code: "onboarding_session_not_found" });
      expect(await store.load(ALICE)).toMatchObject({ status: "in_progress" });
      const [bob] = await db.select().from(user).where(eq(user.id, "bob"));
      expect(bob?.roles).toBe("member");
    });

    it("validates the profile at the boundary", async () => {
      await expect(
        store.complete(ALICE, {
          sessionId: "session-1",
          profile: { ...PROFILE, displayName: "" },
          idempotencyKey: "commit-key-1",
        }),
      ).rejects.toThrow();
      expect(embedder.calls).toBe(0);
    });
  });

  it("removes the session with its user", async () => {
    await store.save(ALICE, activeSession());
    await db.delete(user).where(eq(user.id, "alice"));
    expect(await db.select().from(creatorOnboardingSessions)).toHaveLength(0);
  });
});

import {
  CompletedCreatorOnboardingSessionSchema,
  CreatorOnboardingSessionSchema,
  type CommitProfileInput,
  type CreatorOnboardingActor,
  type CreatorOnboardingSession,
  type CreatorOnboardingSessionStore,
  type TransitionCommand,
} from "@resonance/core";
import { describe, expect, it, vi } from "vitest";
import {
  FAKE_CREATOR_FOUNDATION_DRAFT,
  createFailingFoundationGenerator,
  createFakeFoundationGenerator,
} from "../testing";
import type { FoundationGenerator } from "../agents/profile-gen/creator-foundation";
import {
  createCreatorOnboardingService,
  type CreatorOnboardingService,
  type CreatorOnboardingView,
} from "./service";
import { snapshotV1CreatorOnboardingBehavior as behavior } from "./snapshot-v1";

const ACTOR: CreatorOnboardingActor = { userId: "creator-1" };

/** The store seam's in-memory adapter, with the same semantics as the database one. */
function memoryStore() {
  const rows = new Map<string, CreatorOnboardingSession>();
  const store: CreatorOnboardingSessionStore = {
    load: async (actor) => rows.get(actor.userId) ?? null,
    save: async (actor, session) => {
      const stored = rows.get(actor.userId);
      if (stored && (stored.revision !== session.revision || stored.status === "completed")) {
        return { outcome: "stale", session: stored };
      }
      const saved = CreatorOnboardingSessionSchema.parse({
        ...session,
        revision: session.revision + 1,
      });
      rows.set(actor.userId, saved);
      return { outcome: "saved", session: saved };
    },
    complete: async (actor, args) => {
      const stored = rows.get(actor.userId);
      if (stored?.status === "completed") return { session: stored, alreadyCompleted: true };
      const completed = CompletedCreatorOnboardingSessionSchema.parse({
        status: "completed",
        sessionId: args.sessionId,
        behaviorVersion: "snapshot-v1",
        completedAt: "2026-09-14T00:00:00.000Z",
        committedProfile: args.profile,
        revision: (stored?.revision ?? 0) + 1,
      });
      rows.set(actor.userId, completed);
      return { session: completed, alreadyCompleted: false };
    },
  };
  return { store, rows, complete: vi.spyOn(store, "complete") };
}

function setup(generateFoundation: FoundationGenerator = createFakeFoundationGenerator()) {
  const memory = memoryStore();
  let ids = 0;
  const service = createCreatorOnboardingService({
    behavior,
    store: memory.store,
    generateFoundation,
    newSessionId: () => `session-${++ids}`,
  });
  return { service, ...memory };
}

let keys = 0;
function command(
  view: CreatorOnboardingView,
  action: TransitionCommand["action"],
  input?: TransitionCommand["input"],
): TransitionCommand {
  return {
    action,
    expectedRevision: view.revision,
    idempotencyKey: `key-${++keys}-padding`,
    ...(input ? { input } : {}),
  };
}

const text = (value: string) => ({ kind: "text" as const, text: value });

/** Drive a fresh interview to the summary, answering only what gates generation. */
async function toSummary(service: CreatorOnboardingService): Promise<CreatorOnboardingView> {
  let view = await service.open(ACTOR);
  const steps: Array<[TransitionCommand["action"], TransitionCommand["input"]?]> = [
    ["begin"],
    ["skip"],
    ["submit", text("Herbal blends and dream sessions")],
    ["skip"],
    ["submit", text("Calmer and more reflective")],
    ["skip"],
    ["skip"],
    ["submit", { kind: "choice", choiceId: "calm_clean" }],
  ];
  for (const [action, input] of steps) {
    view = await service.transition(ACTOR, command(view, action, input));
    expect(view.notice, `${action} at ${view.render.stage}`).toBeNull();
  }
  expect(view.render.stage).toBe("summary");
  return view;
}

const PROFILE: CommitProfileInput = {
  displayName: FAKE_CREATOR_FOUNDATION_DRAFT.nameOptions[0]!.name,
  headline: "An edited headline",
  bio: FAKE_CREATOR_FOUNDATION_DRAFT.bio,
  tags: ["dreamwork", "tea"],
};

describe("createCreatorOnboardingService", () => {
  it("starts and persists a session on first open, then resumes the same one", async () => {
    const { service, rows } = setup();
    const first = await service.open(ACTOR);
    expect(first).toMatchObject({ status: "in_progress", revision: 1, notice: null });
    expect(first.render.stage).toBe("opening");

    const again = await service.open(ACTOR);
    expect(again).toEqual(first);
    expect(rows.size).toBe(1);
  });

  it("saves each accepted transition, so a reload resumes where the creator left off", async () => {
    const { service } = setup();
    const opened = await service.open(ACTOR);
    const begun = await service.transition(ACTOR, command(opened, "begin"));
    expect(begun).toMatchObject({ revision: 2, notice: null });
    expect(begun.render.stage).toBe("creator_name");

    expect((await service.open(ACTOR)).render.stage).toBe("creator_name");
  });

  it("answers a rejection with the unchanged state and the reason", async () => {
    const { service } = setup();
    let view = await service.open(ACTOR);
    view = await service.transition(ACTOR, command(view, "begin"));
    view = await service.transition(ACTOR, command(view, "skip"));
    const rejected = await service.transition(ACTOR, command(view, "submit"));
    expect(rejected).toMatchObject({ notice: "required_input_missing", revision: view.revision });
    expect(rejected.render.stage).toBe("offering");
  });

  it("refuses a replayed command instead of advancing twice", async () => {
    const { service } = setup();
    const opened = await service.open(ACTOR);
    const begin = command(opened, "begin");
    const first = await service.transition(ACTOR, begin);
    const replay = await service.transition(ACTOR, begin);
    expect(replay).toMatchObject({ notice: "stale_revision", revision: first.revision });
    expect(replay.render).toEqual(first.render);
  });

  it("generates the foundation at the summary and persists the draft", async () => {
    const generate = vi.fn(createFakeFoundationGenerator());
    const { service, rows } = setup(generate);
    const summary = await toSummary(service);

    const foundation = await service.transition(ACTOR, command(summary, "submit"));
    expect(foundation.notice).toBeNull();
    expect(foundation.render.stage).toBe("foundation");
    expect(foundation.render.input).toEqual({
      kind: "foundation",
      draft: FAKE_CREATOR_FOUNDATION_DRAFT,
    });

    // The generator saw only structured answers, never prose it would have to trust.
    expect(generate).toHaveBeenCalledTimes(1);
    expect(generate.mock.calls[0]![0].answers.map((a) => a.stage)).toEqual([
      "offering",
      "intended_experience",
      "expression_style",
    ]);
    expect(rows.get(ACTOR.userId)).toMatchObject({ currentStage: "foundation" });
  });

  it("keeps the creator's progress when generation fails, and says so", async () => {
    const { service } = setup(createFailingFoundationGenerator());
    const summary = await toSummary(service);

    const failed = await service.transition(ACTOR, command(summary, "submit", text("Anything")));
    expect(failed.notice).toBe("generation_failed");
    expect(failed.render.stage).toBe("summary");

    // The summary answer was saved before the model was called, so a retry starts from it.
    const reloaded = await service.open(ACTOR);
    expect(reloaded.revision).toBe(failed.revision);
    expect(reloaded.revision).toBeGreaterThan(summary.revision);
  });

  it("lets an unexpected generator error escape rather than disguising it", async () => {
    const { service } = setup(async () => {
      throw new TypeError("wiring bug");
    });
    const summary = await toSummary(service);
    await expect(service.transition(ACTOR, command(summary, "submit"))).rejects.toThrow(
      "wiring bug",
    );
  });

  it("commits the approved foundation once, and a replay reports the existing completion", async () => {
    const { service, complete } = setup();
    const summary = await toSummary(service);
    const foundation = await service.transition(ACTOR, command(summary, "submit"));

    const publish = command(foundation, "submit", { kind: "foundation", profile: PROFILE });
    const done = await service.transition(ACTOR, publish);
    expect(done).toMatchObject({ status: "completed", committedProfile: PROFILE, notice: null });
    expect(done.render.stage).toBe("completion");

    const replay = await service.transition(ACTOR, publish);
    expect(replay).toMatchObject({ status: "completed", committedProfile: PROFILE });
    expect(replay.notice).toBe("already_completed");
    expect(complete).toHaveBeenCalledTimes(1);

    expect((await service.open(ACTOR)).committedProfile).toEqual(PROFILE);
  });

  it("reports a save that lost a race as stale, showing the state that won", async () => {
    const { service, store } = setup();
    const opened = await service.open(ACTOR);
    // Another tab advances first, through the store directly.
    const current = await store.load(ACTOR);
    await store.save(ACTOR, { ...(current as CreatorOnboardingSession) });

    const lost = await service.transition(ACTOR, command(opened, "begin"));
    expect(lost.notice).toBe("stale_revision");
    expect(lost.revision).toBe(opened.revision + 1);
  });
});

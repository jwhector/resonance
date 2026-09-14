import { describe, expect, it } from "vitest";

import type { CommitProfileInput, CreatorProfileDraft } from "./profile-draft";
import {
  ActiveCreatorOnboardingSessionSchema,
  CREATOR_ONBOARDING_ACTIONS,
  CREATOR_ONBOARDING_GENERATION_REQUIRES,
  CREATOR_ONBOARDING_STAGE_COUNT,
  CREATOR_ONBOARDING_STAGES,
  CompletedCreatorOnboardingSessionSchema,
  CreatorOnboardingSessionSchema,
  CreatorOnboardingSlotSchema,
  CreatorOnboardingStageInputSchema,
  StageRenderModelSchema,
  TransitionCommandSchema,
  type ActiveCreatorOnboardingSession,
  type CreatorOnboardingActor,
  type CreatorOnboardingBehavior,
  type CreatorOnboardingCompletion,
  type CreatorOnboardingSession,
  type CreatorOnboardingSessionStore,
  type CreatorOnboardingStage,
  type SessionSaveResult,
  type StageRenderModel,
  type TransitionCommand,
  type TransitionResult,
} from "./creator-onboarding";

const DRAFT: CreatorProfileDraft = {
  nameOptions: [{ name: "Lumen Herb Lab", description: "Plain and botanical." }],
  headline: "Herbal dreamwork for quiet mornings",
  bio: "I make small-batch herbal blends and hold reflective sessions.",
  tags: ["herbalism", "dreamwork"],
};

const PROFILE: CommitProfileInput = {
  displayName: "Lumen Herb Lab",
  headline: DRAFT.headline,
  bio: DRAFT.bio,
  tags: DRAFT.tags,
};

/** Stages the fake treats as optional, i.e. everything the generation gate does not require. */
const OPTIONAL_STAGES = CREATOR_ONBOARDING_STAGES.filter(
  (stage) =>
    !(CREATOR_ONBOARDING_GENERATION_REQUIRES as readonly string[]).includes(stage) &&
    !["opening", "foundation", "completion"].includes(stage),
);

/**
 * The second adapter at the behaviour seam: a deterministic stage machine with no prose
 * generation and no model call. It exists so the contract can be driven end to end here,
 * and so `apply`'s rejection rules are asserted against a real implementation rather than
 * described.
 */
function makeFakeBehavior(): CreatorOnboardingBehavior {
  const indexOf = (stage: CreatorOnboardingStage) => CREATOR_ONBOARDING_STAGES.indexOf(stage);

  function render(session: CreatorOnboardingSession): StageRenderModel {
    const stage = session.status === "completed" ? "completion" : session.currentStage;
    const progress = {
      stageNumber: indexOf(stage) + 1,
      stageCount: CREATOR_ONBOARDING_STAGE_COUNT,
    } as const;

    if (stage === "opening") {
      return {
        stage,
        prompt: ["You do not need a finished business to start."],
        input: { kind: "none" },
        actions: [
          { id: "begin", label: "Yes let's begin", emphasis: "primary", availability: "available" },
          {
            id: "later",
            label: "I want to do it later",
            emphasis: "text",
            availability: "available",
          },
        ],
        progress,
      };
    }

    if (stage === "expression_style") {
      return {
        stage,
        prompt: ["How should your profile feel?"],
        input: {
          kind: "choice",
          options: [
            { id: "calm_clean", label: "Calm & Clean" },
            { id: "dreamy_reflective", label: "Dreamy & Reflective" },
            { id: "bold_expressive", label: "Bold & Expressive" },
          ],
          customTextChoiceId: null,
        },
        actions: [
          { id: "submit", label: "Good to go", emphasis: "primary", availability: "available" },
          {
            id: "choose_for_me",
            label: "Choose for me",
            emphasis: "secondary",
            availability: "available",
          },
          { id: "skip", label: "Skip", emphasis: "text", availability: "available" },
        ],
        progress,
      };
    }

    if (stage === "foundation") {
      // `revise_with_weave` is deliberately not offered — the capability does not exist.
      return {
        stage,
        prompt: ["Here is a first foundation."],
        input: {
          kind: "foundation",
          draft: (session.status === "in_progress" ? session.draft : null) ?? DRAFT,
        },
        actions: [
          { id: "submit", label: "Good to go", emphasis: "primary", availability: "available" },
        ],
        progress,
      };
    }

    if (stage === "completion") {
      return {
        stage,
        prompt: ["Your profile is live."],
        input: { kind: "none" },
        actions: [
          { id: "finish", label: "Finish for now", emphasis: "primary", availability: "available" },
          {
            id: "create_profile_image",
            label: "Create profile image",
            emphasis: "secondary",
            availability: "coming_soon",
          },
          {
            id: "create_cover_image",
            label: "Create cover image",
            emphasis: "secondary",
            availability: "coming_soon",
          },
          {
            id: "refine_profile",
            label: "Refine profile",
            emphasis: "secondary",
            availability: "coming_soon",
          },
        ],
        progress,
      };
    }

    const required = (CREATOR_ONBOARDING_GENERATION_REQUIRES as readonly string[]).includes(stage);
    return {
      stage,
      prompt: [`Tell me about ${stage}.`],
      input: {
        kind: "text",
        placeholder: "Type your answer",
        multiline: true,
        maxLength: 4000,
        required,
      },
      actions: required
        ? [{ id: "submit", label: "Good to go", emphasis: "primary", availability: "available" }]
        : [
            { id: "submit", label: "Good to go", emphasis: "primary", availability: "available" },
            { id: "skip", label: "Skip", emphasis: "text", availability: "available" },
          ],
      progress,
    };
  }

  function apply(session: CreatorOnboardingSession, command: TransitionCommand): TransitionResult {
    const current = render(session);

    if (session.status === "completed") {
      return { outcome: "rejected", reason: "already_completed", render: current };
    }

    if (command.expectedRevision !== session.revision) {
      return { outcome: "rejected", reason: "stale_revision", render: current };
    }

    const offered = current.actions.find((action) => action.id === command.action);
    if (!offered) {
      return { outcome: "rejected", reason: "unsupported_action", render: current };
    }
    if (offered.availability === "coming_soon") {
      return { outcome: "rejected", reason: "unavailable_action", render: current };
    }

    if (command.action === "submit" && current.input.kind === "text") {
      if (!command.input) {
        return current.input.required
          ? { outcome: "rejected", reason: "required_input_missing", render: current }
          : { outcome: "rejected", reason: "invalid_input", render: current };
      }
      if (command.input.kind !== "text") {
        return { outcome: "rejected", reason: "invalid_input", render: current };
      }
    }

    if (command.action === "submit" && current.input.kind === "choice") {
      if (command.input?.kind !== "choice") {
        return { outcome: "rejected", reason: "invalid_input", render: current };
      }
      const known = current.input.options.some((o) => o.id === command.input?.choiceId);
      if (!known) {
        return { outcome: "rejected", reason: "invalid_input", render: current };
      }
    }

    if (session.currentStage === "foundation" && command.action === "submit") {
      if (command.input?.kind !== "foundation") {
        return { outcome: "rejected", reason: "invalid_input", render: current };
      }
      return { outcome: "commit", session, profile: command.input.profile };
    }

    // Record the answer, then advance.
    const slots = { ...session.slots };
    if (command.action === "skip" || command.action === "later") {
      slots[session.currentStage] = { status: "skipped" };
    } else if (command.input?.kind === "text") {
      slots[session.currentStage] = {
        status: "answered",
        answer: { kind: "text", text: command.input.text },
      };
    } else if (command.input?.kind === "choice") {
      slots[session.currentStage] = {
        status: "answered",
        answer: { kind: "choice", choiceId: command.input.choiceId },
      };
    }

    if (session.currentStage === "summary") {
      const answers = CREATOR_ONBOARDING_STAGES.flatMap((stage) => {
        const slot = slots[stage];
        return slot?.status === "answered" ? [{ stage, answer: slot.answer }] : [];
      });
      const missing = CREATOR_ONBOARDING_GENERATION_REQUIRES.filter(
        (stage) => slots[stage]?.status !== "answered",
      );
      if (missing.length > 0) {
        return { outcome: "rejected", reason: "required_input_missing", render: current };
      }
      const next: ActiveCreatorOnboardingSession = { ...session, slots };
      return {
        outcome: "generate",
        session: next,
        request: { behaviorVersion: session.behaviorVersion, answers },
      };
    }

    const nextStage = CREATOR_ONBOARDING_STAGES[indexOf(session.currentStage) + 1];
    const next: ActiveCreatorOnboardingSession = {
      ...session,
      slots,
      currentStage: nextStage,
    };
    return { outcome: "advanced", session: next, render: render(next) };
  }

  return {
    version: "snapshot-v1",
    start: ({ sessionId }) => ({
      status: "in_progress",
      sessionId,
      behaviorVersion: "snapshot-v1",
      currentStage: "opening",
      slots: {},
      draft: null,
      revision: 0,
    }),
    render,
    apply,
    acceptFoundation: (session, result) => {
      const next: ActiveCreatorOnboardingSession = {
        ...session,
        currentStage: "foundation",
        draft: result.draft,
      };
      return { outcome: "advanced", session: next, render: render(next) };
    },
  };
}

/** The second adapter at the store seam: one in-memory row per actor, no database. */
function makeFakeStore(): CreatorOnboardingSessionStore {
  const rows = new Map<string, CreatorOnboardingSession>();

  return {
    load: (actor) => Promise.resolve(rows.get(actor.userId) ?? null),
    save: (actor, session): Promise<SessionSaveResult> => {
      const stored = rows.get(actor.userId);
      if (stored && stored.revision !== session.revision) {
        return Promise.resolve({ outcome: "stale", session: stored });
      }
      const saved = CreatorOnboardingSessionSchema.parse({
        ...session,
        revision: session.revision + 1,
      });
      rows.set(actor.userId, saved);
      return Promise.resolve({ outcome: "saved", session: saved });
    },
    complete: (actor, args): Promise<CreatorOnboardingCompletion> => {
      const stored = rows.get(actor.userId);
      if (stored?.status === "completed") {
        return Promise.resolve({ session: stored, alreadyCompleted: true });
      }
      const completed = CompletedCreatorOnboardingSessionSchema.parse({
        status: "completed",
        sessionId: args.sessionId,
        behaviorVersion: "snapshot-v1",
        completedAt: "2026-09-13T23:00:00.000Z",
        committedProfile: args.profile,
        revision: (stored?.revision ?? 0) + 1,
      });
      rows.set(actor.userId, completed);
      return Promise.resolve({ session: completed, alreadyCompleted: false });
    },
  };
}

const ACTOR: CreatorOnboardingActor = { userId: "user-1" };
const OTHER: CreatorOnboardingActor = { userId: "user-2" };

const command = (over: Partial<TransitionCommand> = {}): TransitionCommand => ({
  action: "submit",
  expectedRevision: 0,
  idempotencyKey: "idem-0000-0001",
  ...over,
});

describe("the stage vocabulary", () => {
  it("orders opening first and completion last, because order is contract", () => {
    expect(CREATOR_ONBOARDING_STAGES[0]).toBe("opening");
    expect(CREATOR_ONBOARDING_STAGES.at(-1)).toBe("completion");
  });

  it("gates generation on exactly the offering and intended experience", () => {
    expect([...CREATOR_ONBOARDING_GENERATION_REQUIRES]).toEqual([
      "offering",
      "intended_experience",
    ]);
  });

  it("offers no Revise with Weave action, so no provider can emit one", () => {
    expect(CREATOR_ONBOARDING_ACTIONS).not.toContain("revise_with_weave");
  });

  it("names the free-text choice by id, and refuses an id that is not an option", () => {
    const options = [
      { id: "own_words", label: "Custom direction" },
      { id: "calm_clean", label: "Calm & Clean" },
    ];
    const parse = (customTextChoiceId: string | null) =>
      CreatorOnboardingStageInputSchema.safeParse({ kind: "choice", options, customTextChoiceId });

    expect(parse("own_words").success).toBe(true);
    expect(parse(null).success).toBe(true);
    expect(parse("not_an_option").success).toBe(false);
  });
});

describe("slots", () => {
  it("cannot be answered without an answer", () => {
    expect(CreatorOnboardingSlotSchema.safeParse({ status: "answered" }).success).toBe(false);
  });

  it("drops an answer smuggled onto a skipped slot", () => {
    const parsed = CreatorOnboardingSlotSchema.parse({
      status: "skipped",
      answer: { kind: "text", text: "secret" },
    });
    expect(parsed).toEqual({ status: "skipped" });
  });

  it("distinguishes never-reached from declined", () => {
    expect(CreatorOnboardingSlotSchema.parse({ status: "pending" }).status).toBe("pending");
    expect(CreatorOnboardingSlotSchema.parse({ status: "skipped" }).status).toBe("skipped");
  });
});

describe("the session shape", () => {
  it("pins every session to a known behaviour version and rejects an unknown one", () => {
    const behavior = makeFakeBehavior();
    const session = behavior.start({ sessionId: "s1" });
    expect(session.behaviorVersion).toBe(behavior.version);
    expect(
      ActiveCreatorOnboardingSessionSchema.safeParse({
        ...session,
        behaviorVersion: "weave-os-v2",
      }).success,
    ).toBe(false);
  });

  it("erases raw answers when a completed session is parsed", () => {
    const parsed = CreatorOnboardingSessionSchema.parse({
      status: "completed",
      sessionId: "s1",
      behaviorVersion: "snapshot-v1",
      completedAt: "2026-09-13T23:00:00.000Z",
      committedProfile: PROFILE,
      revision: 9,
      slots: { origin: { status: "answered", answer: { kind: "text", text: "private" } } },
      draft: DRAFT,
    });
    expect(parsed).not.toHaveProperty("slots");
    expect(parsed).not.toHaveProperty("draft");
    expect(JSON.stringify(parsed)).not.toContain("private");
  });
});

describe("the transition command", () => {
  it("strips an identity the browser tried to assert", () => {
    const parsed = TransitionCommandSchema.parse({
      ...command(),
      userId: "user-999",
      behaviorVersion: "snapshot-v1",
    });
    expect(parsed).not.toHaveProperty("userId");
    expect(parsed).not.toHaveProperty("behaviorVersion");
  });

  it("requires an idempotency key long enough to be a real key", () => {
    expect(TransitionCommandSchema.safeParse({ ...command(), idempotencyKey: "x" }).success).toBe(
      false,
    );
  });
});

describe("the behaviour seam, driven through a deterministic adapter", () => {
  const behavior = makeFakeBehavior();

  it("renders a schema-valid model for every stage", () => {
    for (const stage of CREATOR_ONBOARDING_STAGES) {
      const session: ActiveCreatorOnboardingSession = {
        ...behavior.start({ sessionId: "s1" }),
        currentStage: stage,
        draft: stage === "foundation" ? DRAFT : null,
      };
      expect(StageRenderModelSchema.safeParse(behavior.render(session)).success).toBe(true);
    }
  });

  it("renders the same model twice, so a reload shows what the creator left", () => {
    const session = behavior.start({ sessionId: "s1" });
    expect(behavior.render(session)).toEqual(behavior.render(session));
  });

  it("rejects a stale revision and leaves the session untouched", () => {
    const session = behavior.start({ sessionId: "s1" });
    const before = structuredClone(session);
    const result = behavior.apply(session, command({ action: "begin", expectedRevision: 7 }));
    expect(result).toMatchObject({ outcome: "rejected", reason: "stale_revision" });
    expect(session).toEqual(before);
  });

  it("does not mutate the session it advances", () => {
    const session = behavior.start({ sessionId: "s1" });
    const before = structuredClone(session);
    behavior.apply(session, command({ action: "begin" }));
    expect(session).toEqual(before);
  });

  it("refuses an action the stage does not offer", () => {
    const session = behavior.start({ sessionId: "s1" });
    const result = behavior.apply(session, command({ action: "finish" }));
    expect(result).toMatchObject({ outcome: "rejected", reason: "unsupported_action" });
  });

  it("refuses a coming-soon action instead of pretending it worked", () => {
    const session: ActiveCreatorOnboardingSession = {
      ...behavior.start({ sessionId: "s1" }),
      currentStage: "completion",
    };
    const result = behavior.apply(session, command({ action: "refine_profile" }));
    expect(result).toMatchObject({ outcome: "rejected", reason: "unavailable_action" });
  });

  it("blocks a required stage that was left empty", () => {
    const session: ActiveCreatorOnboardingSession = {
      ...behavior.start({ sessionId: "s1" }),
      currentStage: "offering",
    };
    const result = behavior.apply(session, command({ action: "submit" }));
    expect(result).toMatchObject({ outcome: "rejected", reason: "required_input_missing" });
  });

  it("offers no skip on a generation-gating stage", () => {
    for (const stage of CREATOR_ONBOARDING_GENERATION_REQUIRES) {
      const session: ActiveCreatorOnboardingSession = {
        ...behavior.start({ sessionId: "s1" }),
        currentStage: stage,
      };
      const ids = behavior.render(session).actions.map((a) => a.id);
      expect(ids).not.toContain("skip");
    }
  });

  it("lets every optional stage be skipped without blocking generation", () => {
    for (const stage of OPTIONAL_STAGES) {
      const session: ActiveCreatorOnboardingSession = {
        ...behavior.start({ sessionId: "s1" }),
        currentStage: stage,
      };
      const ids = behavior.render(session).actions.map((a) => a.id);
      expect(ids).toContain("skip");
    }
  });

  it("rejects an unknown choice id on the expression-style stage", () => {
    const session: ActiveCreatorOnboardingSession = {
      ...behavior.start({ sessionId: "s1" }),
      currentStage: "expression_style",
    };
    const result = behavior.apply(
      session,
      command({ action: "submit", input: { kind: "choice", choiceId: "not-an-option" } }),
    );
    expect(result).toMatchObject({ outcome: "rejected", reason: "invalid_input" });
  });

  it("carries the creator from opening to a generation request, skipping what is optional", () => {
    let session = behavior.start({ sessionId: "s1" });
    const seen: CreatorOnboardingStage[] = [session.currentStage];

    const advance = (cmd: Partial<TransitionCommand>) => {
      const result = behavior.apply(
        session,
        command({ ...cmd, expectedRevision: session.revision }),
      );
      if (result.outcome !== "advanced") return result;
      session = result.session;
      seen.push(session.currentStage);
      return result;
    };

    advance({ action: "begin" });
    advance({ action: "skip" }); // creator_name
    advance({ action: "submit", input: { kind: "text", text: "Herbal blends and sessions" } });
    advance({ action: "skip" }); // origin
    advance({ action: "submit", input: { kind: "text", text: "Calmer and more reflective" } });
    advance({ action: "skip" }); // resonance_moment
    advance({ action: "skip" }); // resonant_people
    advance({
      action: "submit",
      input: { kind: "choice", choiceId: "dreamy_reflective" },
    });

    expect(session.currentStage).toBe("summary");
    expect(seen).toEqual([
      "opening",
      "creator_name",
      "offering",
      "origin",
      "intended_experience",
      "resonance_moment",
      "resonant_people",
      "expression_style",
      "summary",
    ]);

    const generated = behavior.apply(
      session,
      command({
        action: "submit",
        expectedRevision: session.revision,
        input: { kind: "text", text: "Nothing else to add" },
      }),
    );
    expect(generated.outcome).toBe("generate");
    if (generated.outcome !== "generate") throw new Error("expected a generation request");

    // Skipped stages contribute nothing; answered ones carry their structured value.
    const stages = generated.request.answers.map((a) => a.stage);
    expect(stages).toContain("offering");
    expect(stages).toContain("intended_experience");
    expect(stages).not.toContain("origin");
    expect(generated.request.behaviorVersion).toBe("snapshot-v1");

    const withDraft = behavior.acceptFoundation(generated.session, { draft: DRAFT });
    expect(withDraft.outcome).toBe("advanced");
    if (withDraft.outcome !== "advanced") throw new Error("expected the foundation stage");
    expect(withDraft.session.currentStage).toBe("foundation");
    expect(withDraft.session.draft).toEqual(DRAFT);

    const committed = behavior.apply(
      withDraft.session,
      command({
        action: "submit",
        expectedRevision: withDraft.session.revision,
        input: { kind: "foundation", profile: PROFILE },
      }),
    );
    expect(committed).toMatchObject({ outcome: "commit", profile: PROFILE });
  });

  it("leaves the revision for the store to advance", () => {
    const session = behavior.start({ sessionId: "s1" });
    const result = behavior.apply(session, command({ action: "begin" }));
    if (result.outcome !== "advanced") throw new Error("expected an advance");
    expect(result.session.currentStage).toBe("creator_name");
    expect(result.session.revision).toBe(session.revision);

    const withDraft = behavior.acceptFoundation(result.session, { draft: DRAFT });
    if (withDraft.outcome !== "advanced") throw new Error("expected the foundation stage");
    expect(withDraft.session.revision).toBe(session.revision);
  });

  it("renders the completion rail for a completed session after a reload", () => {
    const completed = CompletedCreatorOnboardingSessionSchema.parse({
      status: "completed",
      sessionId: "s1",
      behaviorVersion: "snapshot-v1",
      completedAt: "2026-09-13T23:00:00.000Z",
      committedProfile: PROFILE,
      revision: 4,
    });
    const rail = behavior.render(completed);
    expect(StageRenderModelSchema.safeParse(rail).success).toBe(true);
    expect(rail.stage).toBe("completion");
    expect(rail.actions.map((a) => [a.id, a.availability])).toEqual([
      ["finish", "available"],
      ["create_profile_image", "coming_soon"],
      ["create_cover_image", "coming_soon"],
      ["refine_profile", "coming_soon"],
    ]);
  });

  it("rejects every action on a completed session as already completed", () => {
    const completed = CompletedCreatorOnboardingSessionSchema.parse({
      status: "completed",
      sessionId: "s1",
      behaviorVersion: "snapshot-v1",
      completedAt: "2026-09-13T23:00:00.000Z",
      committedProfile: PROFILE,
      revision: 4,
    });
    for (const action of CREATOR_ONBOARDING_ACTIONS) {
      const result = behavior.apply(completed, command({ action, expectedRevision: 4 }));
      expect(result).toMatchObject({ outcome: "rejected", reason: "already_completed" });
    }
  });

  it("will not generate while a required answer is still missing", () => {
    const session: ActiveCreatorOnboardingSession = {
      ...behavior.start({ sessionId: "s1" }),
      currentStage: "summary",
      slots: { offering: { status: "answered", answer: { kind: "text", text: "blends" } } },
    };
    const result = behavior.apply(
      session,
      command({ action: "submit", input: { kind: "text", text: "done" } }),
    );
    expect(result).toMatchObject({ outcome: "rejected", reason: "required_input_missing" });
  });
});

describe("the store seam, driven through an in-memory adapter", () => {
  it("has nothing to read before the creator starts", async () => {
    const store = makeFakeStore();
    await expect(store.load(ACTOR)).resolves.toBeNull();
  });

  it("scopes every session to its own actor", async () => {
    const store = makeFakeStore();
    const behavior = makeFakeBehavior();
    await store.save(ACTOR, behavior.start({ sessionId: "s1" }));
    await expect(store.load(OTHER)).resolves.toBeNull();
    await expect(store.load(ACTOR)).resolves.not.toBeNull();
  });

  it("resumes the creator where they left off", async () => {
    const store = makeFakeStore();
    const behavior = makeFakeBehavior();
    const started = behavior.start({ sessionId: "s1" });
    const advanced = behavior.apply(started, command({ action: "begin" }));
    if (advanced.outcome !== "advanced") throw new Error("expected an advance");
    await store.save(ACTOR, advanced.session);

    const resumed = await store.load(ACTOR);
    expect(resumed?.status).toBe("in_progress");
    if (resumed?.status !== "in_progress") throw new Error("expected an active session");
    expect(resumed.currentStage).toBe("creator_name");
  });

  it("refuses a stale write and hands back the authoritative state", async () => {
    const store = makeFakeStore();
    const behavior = makeFakeBehavior();
    const session = behavior.start({ sessionId: "s1" });
    const first = await store.save(ACTOR, session);
    expect(first.outcome).toBe("saved");

    const replayed = await store.save(ACTOR, session);
    expect(replayed.outcome).toBe("stale");
    expect(replayed.session.revision).toBe(first.session.revision);
  });

  it("completes once and reports a replay as already completed", async () => {
    const store = makeFakeStore();
    const behavior = makeFakeBehavior();
    await store.save(ACTOR, behavior.start({ sessionId: "s1" }));

    const args = { sessionId: "s1", profile: PROFILE, idempotencyKey: "idem-commit-1" };
    const first = await store.complete(ACTOR, args);
    expect(first.alreadyCompleted).toBe(false);
    expect(first.session.committedProfile).toEqual(PROFILE);

    const second = await store.complete(ACTOR, args);
    expect(second.alreadyCompleted).toBe(true);
    expect(second.session).toEqual(first.session);
  });

  it("completes an already-completed session once, whatever the idempotency key", async () => {
    const store = makeFakeStore();
    const behavior = makeFakeBehavior();
    await store.save(ACTOR, behavior.start({ sessionId: "s1" }));

    const first = await store.complete(ACTOR, {
      sessionId: "s1",
      profile: PROFILE,
      idempotencyKey: "idem-tab-one",
    });
    const second = await store.complete(ACTOR, {
      sessionId: "s1",
      profile: { ...PROFILE, displayName: "Someone Else" },
      idempotencyKey: "idem-tab-two",
    });

    expect(second.alreadyCompleted).toBe(true);
    expect(second.session).toEqual(first.session);
    await expect(store.load(ACTOR)).resolves.toMatchObject({ committedProfile: PROFILE });
  });

  it("leaves no raw answer recoverable after completion", async () => {
    const store = makeFakeStore();
    const behavior = makeFakeBehavior();
    const session: ActiveCreatorOnboardingSession = {
      ...behavior.start({ sessionId: "s1" }),
      slots: {
        origin: { status: "answered", answer: { kind: "text", text: "a private memory" } },
      },
      draft: DRAFT,
    };
    await store.save(ACTOR, session);
    await store.complete(ACTOR, {
      sessionId: "s1",
      profile: PROFILE,
      idempotencyKey: "idem-commit-2",
    });

    const after = await store.load(ACTOR);
    expect(after?.status).toBe("completed");
    expect(JSON.stringify(after)).not.toContain("a private memory");
  });
});

describe("the two seams, driven together", () => {
  it("advances across a save and reload without going stale", async () => {
    const store = makeFakeStore();
    const behavior = makeFakeBehavior();

    const first = await store.save(ACTOR, behavior.start({ sessionId: "s1" }));
    expect(first.outcome).toBe("saved");

    const loaded = await store.load(ACTOR);
    if (loaded?.status !== "in_progress") throw new Error("expected an active session");
    const result = behavior.apply(
      loaded,
      command({ action: "begin", expectedRevision: loaded.revision }),
    );
    if (result.outcome !== "advanced") throw new Error("expected an advance");

    const second = await store.save(ACTOR, result.session);
    expect(second.outcome).toBe("saved");

    const reloaded = await store.load(ACTOR);
    if (reloaded?.status !== "in_progress") throw new Error("expected an active session");
    expect(reloaded.currentStage).toBe("creator_name");
    expect(reloaded.revision).toBe(loaded.revision + 1);
  });
});

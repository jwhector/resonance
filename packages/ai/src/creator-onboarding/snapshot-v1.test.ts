import {
  CREATOR_ONBOARDING_ACTIONS,
  CREATOR_ONBOARDING_GENERATION_REQUIRES,
  CREATOR_ONBOARDING_STAGES,
  CompletedCreatorOnboardingSessionSchema,
  StageRenderModelSchema,
  type ActiveCreatorOnboardingSession,
  type CommitProfileInput,
  type CreatorOnboardingSession,
  type CreatorOnboardingStage,
  type CreatorProfileDraft,
  type TransitionCommand,
  type TransitionResult,
} from "@resonance/core";
import { describe, expect, it } from "vitest";
import { CreatorOnboardingStateError, UnsupportedBehaviorVersionError } from "../errors";
import { snapshotV1CreatorOnboardingBehavior as behavior } from "./snapshot-v1";

const DRAFT: CreatorProfileDraft = {
  nameOptions: [
    { name: "Moonroot Studio", description: "Reflective herbal and dream-centered experiences." },
    { name: "Night Bloom Collective", description: "Quiet herbal gatherings." },
    { name: "Lumen Herb Lab", description: "Plain and botanical." },
  ],
  headline: "Dreamwork and herbal reflection for slower inner connection.",
  bio: "Explores dreamwork, herbal blends, and reflective sessions.",
  tags: ["dreamwork", "herbalism", "reflection", "tea blends"],
};

const PROFILE: CommitProfileInput = {
  displayName: "Moonroot Studio",
  headline: DRAFT.headline,
  bio: DRAFT.bio,
  tags: DRAFT.tags,
};

const COMPLETED = CompletedCreatorOnboardingSessionSchema.parse({
  status: "completed",
  sessionId: "s1",
  behaviorVersion: "snapshot-v1",
  completedAt: "2026-09-13T23:00:00.000Z",
  committedProfile: PROFILE,
  revision: 4,
});

const command = (over: Partial<TransitionCommand> = {}): TransitionCommand => ({
  action: "submit",
  expectedRevision: 0,
  idempotencyKey: "idem-0000-0001",
  ...over,
});

const text = (value: string) => ({ kind: "text", text: value }) as const;

/** A fresh session parked on `stage`, with the two required answers already given. */
function at(
  stage: CreatorOnboardingStage,
  over: Partial<ActiveCreatorOnboardingSession> = {},
): ActiveCreatorOnboardingSession {
  return {
    ...behavior.start({ sessionId: "s1" }),
    currentStage: stage,
    slots: {
      offering: { status: "answered", answer: text("Herbal blends and dream sessions") },
      intended_experience: { status: "answered", answer: text("Calmer, more reflective") },
    },
    draft: stage === "foundation" ? DRAFT : null,
    ...over,
  };
}

function expectAdvanced(result: TransitionResult) {
  if (result.outcome !== "advanced") {
    throw new Error(
      `expected an advance, got ${result.outcome}${result.outcome === "rejected" ? `: ${result.reason}` : ""}`,
    );
  }
  return result;
}

/** Freeze a value all the way down, so any mutation throws in strict-mode ESM. */
function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

describe("snapshot-v1 creator onboarding behaviour", () => {
  describe("a full interview", () => {
    it("carries a creator from the opening to a commit, answering every stage", () => {
      let session = behavior.start({ sessionId: "s1" });
      expect(session).toMatchObject({ behaviorVersion: "snapshot-v1", revision: 0, draft: null });

      const step = (over: Partial<TransitionCommand>) => {
        session = expectAdvanced(
          behavior.apply(session, command({ ...over, expectedRevision: session.revision })),
        ).session;
        return session.currentStage;
      };

      const seen = [session.currentStage];
      seen.push(step({ action: "begin" }));
      seen.push(step({ input: text("Moonroot Studio") }));
      seen.push(step({ input: text("Herbal blends and dream sessions") }));
      seen.push(step({ input: text("A season of disconnection") }));
      seen.push(step({ input: text("Calmer, more reflective") }));
      seen.push(step({ input: text("A friend's dream journal") }));
      seen.push(step({ input: text("People slowing down") }));
      seen.push(step({ input: { kind: "choice", choiceId: "dreamy_reflective" } }));
      expect(seen).toEqual(CREATOR_ONBOARDING_STAGES.slice(0, indexOfSummary() + 1));

      const generate = behavior.apply(
        session,
        command({ expectedRevision: session.revision, input: text("Night-time atmosphere") }),
      );
      if (generate.outcome !== "generate") throw new Error("expected a generation request");
      expect(generate.session.currentStage).toBe("summary");
      expect(generate.request.answers.map((a) => a.stage)).toEqual([
        "creator_name",
        "offering",
        "origin",
        "intended_experience",
        "resonance_moment",
        "resonant_people",
        "expression_style",
        "summary",
      ]);

      const foundation = expectAdvanced(
        behavior.acceptFoundation(generate.session, { draft: DRAFT }),
      );
      expect(foundation.session).toMatchObject({ currentStage: "foundation", draft: DRAFT });
      expect(foundation.render.input).toEqual({ kind: "foundation", draft: DRAFT });

      const commit = behavior.apply(
        foundation.session,
        command({
          expectedRevision: foundation.session.revision,
          input: { kind: "foundation", profile: PROFILE },
        }),
      );
      expect(commit).toMatchObject({ outcome: "commit", profile: PROFILE });

      // The completed session the store produces renders the rail and accepts nothing more.
      expect(behavior.render(COMPLETED).stage).toBe("completion");
    });
  });

  describe("skipping", () => {
    const optional = CREATOR_ONBOARDING_STAGES.filter(
      (stage) =>
        !(CREATOR_ONBOARDING_GENERATION_REQUIRES as readonly string[]).includes(stage) &&
        !["opening", "foundation", "completion"].includes(stage),
    );

    it.each(optional)("lets %s be skipped, recording the decline", (stage) => {
      const session = at(stage);
      const result = behavior.apply(session, command({ action: "skip" }));
      const slot = (s: ActiveCreatorOnboardingSession) => s.slots[stage];

      if (stage === "summary") {
        // Skipping the summary is how a creator says "nothing to add" and asks for generation.
        if (result.outcome !== "generate") throw new Error("expected a generation request");
        expect(slot(result.session)).toEqual({ status: "skipped" });
        return;
      }
      const next = expectAdvanced(result).session;
      expect(slot(next)).toEqual({ status: "skipped" });
      expect(next.currentStage).toBe(CREATOR_ONBOARDING_STAGES[indexOf(stage) + 1]);
    });

    it.each([...CREATOR_ONBOARDING_GENERATION_REQUIRES])(
      "offers no skip on %s and refuses an empty answer",
      (stage) => {
        const session = at(stage, { slots: {} });
        const render = behavior.render(session);
        expect(render.actions.map((a) => a.id)).not.toContain("skip");
        expect(render.input).toMatchObject({ kind: "text", required: true });

        expect(behavior.apply(session, command({ action: "skip" }))).toMatchObject({
          outcome: "rejected",
          reason: "unsupported_action",
        });
        expect(behavior.apply(session, command())).toMatchObject({
          outcome: "rejected",
          reason: "required_input_missing",
        });
        expect(behavior.apply(session, command({ input: text("   ") }))).toMatchObject({
          outcome: "rejected",
          reason: "required_input_missing",
        });
      },
    );

    it("keeps a creator who wants to do it later at the opening, marked as deferred", () => {
      const session = behavior.start({ sessionId: "s1" });
      const later = expectAdvanced(behavior.apply(session, command({ action: "later" })));
      expect(later.session.currentStage).toBe("opening");
      expect(later.session.slots.opening).toEqual({ status: "skipped" });

      const begun = expectAdvanced(behavior.apply(later.session, command({ action: "begin" })));
      expect(begun.session.currentStage).toBe("creator_name");
      expect(begun.session.slots).not.toHaveProperty("opening");
    });

    it("generates from the two required answers alone when everything else is skipped", () => {
      const session = at("summary", {
        slots: {
          creator_name: { status: "skipped" },
          offering: { status: "answered", answer: text("Blends") },
          origin: { status: "skipped" },
          intended_experience: { status: "answered", answer: text("Calm") },
          resonance_moment: { status: "skipped" },
          resonant_people: { status: "skipped" },
          expression_style: { status: "skipped" },
        },
      });
      const result = behavior.apply(session, command({ action: "skip" }));
      if (result.outcome !== "generate") throw new Error("expected a generation request");
      expect(result.request).toEqual({
        behaviorVersion: "snapshot-v1",
        answers: [
          { stage: "offering", answer: text("Blends") },
          { stage: "intended_experience", answer: text("Calm") },
        ],
      });
    });
  });

  describe("generation gating", () => {
    it.each([...CREATOR_ONBOARDING_GENERATION_REQUIRES])(
      "refuses to generate while %s is unanswered",
      (missing) => {
        const session = at("summary");
        const slots = { ...session.slots, [missing]: { status: "skipped" } };
        const result = behavior.apply({ ...session, slots }, command({ action: "skip" }));
        expect(result).toMatchObject({ outcome: "rejected", reason: "required_input_missing" });
      },
    );

    it("treats Yes I'm ready with nothing typed at the summary as nothing to add", () => {
      const result = behavior.apply(at("summary"), command());
      if (result.outcome !== "generate") throw new Error("expected a generation request");
      expect(result.session.slots.summary).toEqual({ status: "skipped" });
    });

    it("will not fold a foundation into a session that cannot generate yet", () => {
      expect(behavior.acceptFoundation(at("origin"), { draft: DRAFT })).toMatchObject({
        outcome: "rejected",
        reason: "unsupported_action",
      });
      expect(
        behavior.acceptFoundation(at("summary", { slots: {} }), { draft: DRAFT }),
      ).toMatchObject({ outcome: "rejected", reason: "required_input_missing" });
    });

    it("replaces the draft when a retried generation lands at the foundation", () => {
      const replacement = { ...DRAFT, headline: "A second take" };
      const result = expectAdvanced(
        behavior.acceptFoundation(at("foundation"), { draft: replacement }),
      );
      expect(result.session.draft).toEqual(replacement);
    });
  });

  describe("stale revisions", () => {
    it("rejects a stale command and leaves the session and its revision untouched", () => {
      const session = at("offering", { revision: 3 });
      const before = structuredClone(session);
      const result = behavior.apply(
        session,
        command({ expectedRevision: 2, input: text("Herbal blends") }),
      );
      expect(result).toMatchObject({ outcome: "rejected", reason: "stale_revision" });
      expect(session).toEqual(before);
      expect(result.outcome === "rejected" && result.render).toEqual(behavior.render(before));
    });

    it("never changes the revision itself, leaving that to the store", () => {
      const session = at("offering", { revision: 5 });
      const advanced = expectAdvanced(
        behavior.apply(session, command({ expectedRevision: 5, input: text("Blends") })),
      );
      expect(advanced.session.revision).toBe(5);
      const withDraft = expectAdvanced(
        behavior.acceptFoundation(at("summary", { revision: 5 }), { draft: DRAFT }),
      );
      expect(withDraft.session.revision).toBe(5);
    });
  });

  describe("actions", () => {
    it("refuses an action the stage does not offer", () => {
      expect(behavior.apply(at("opening"), command({ action: "finish" }))).toMatchObject({
        outcome: "rejected",
        reason: "unsupported_action",
      });
      expect(behavior.apply(at("origin"), command({ action: "request_help" }))).toMatchObject({
        outcome: "rejected",
        reason: "unsupported_action",
      });
    });

    it("refuses a coming-soon action instead of pretending it worked", () => {
      const session = at("completion");
      for (const action of [
        "create_profile_image",
        "create_cover_image",
        "refine_profile",
      ] as const) {
        expect(behavior.apply(session, command({ action }))).toMatchObject({
          outcome: "rejected",
          reason: "unavailable_action",
        });
      }
    });

    it("records a name help request without inventing a name", () => {
      const help = expectAdvanced(
        behavior.apply(at("creator_name"), command({ action: "request_help" })),
      );
      expect(help.session.slots.creator_name).toEqual({
        status: "answered",
        answer: { kind: "choice", choiceId: "help_wanted" },
      });

      const provisional = expectAdvanced(
        behavior.apply(
          at("creator_name"),
          command({ action: "request_help", input: text("Lumen Herb Lab") }),
        ),
      );
      expect(provisional.session.slots.creator_name).toEqual({
        status: "answered",
        answer: { kind: "choice", choiceId: "help_wanted", customText: "Lumen Herb Lab" },
      });
    });

    it("records Choose for me as a delegation the generator resolves", () => {
      const result = expectAdvanced(
        behavior.apply(at("expression_style"), command({ action: "choose_for_me" })),
      );
      expect(result.session.slots.expression_style).toEqual({
        status: "answered",
        answer: { kind: "choice", choiceId: "weave_chooses" },
      });
    });

    it("refuses an answer sent with a control that carries none, rather than dropping it", () => {
      expect(
        behavior.apply(
          at("origin"),
          command({ action: "skip", input: text("typed then skipped") }),
        ),
      ).toMatchObject({ outcome: "rejected", reason: "invalid_input" });
      expect(
        behavior.apply(at("opening"), command({ action: "begin", input: text("hi") })),
      ).toMatchObject({ outcome: "rejected", reason: "invalid_input" });
    });
  });

  describe("input validation", () => {
    it("rejects an unknown choice id", () => {
      const result = behavior.apply(
        at("expression_style"),
        command({ input: { kind: "choice", choiceId: "not-an-option" } }),
      );
      expect(result).toMatchObject({ outcome: "rejected", reason: "invalid_input" });
    });

    it("rejects the wrong input kind for the stage", () => {
      const cases: [CreatorOnboardingStage, TransitionCommand["input"]][] = [
        ["offering", { kind: "choice", choiceId: "calm_clean" }],
        ["expression_style", text("Dreamy")],
        ["expression_style", undefined],
        ["foundation", text("looks good")],
        ["summary", { kind: "foundation", profile: PROFILE }],
      ];
      for (const [stage, input] of cases) {
        expect(behavior.apply(at(stage), command({ input }))).toMatchObject({
          outcome: "rejected",
          reason: "invalid_input",
        });
      }
    });

    it("refuses an empty submit on an optional stage, since Skip is the way to decline", () => {
      expect(behavior.apply(at("origin"), command())).toMatchObject({
        outcome: "rejected",
        reason: "invalid_input",
      });
    });

    it("refuses a name longer than the public display name allows", () => {
      const result = behavior.apply(at("creator_name"), command({ input: text("x".repeat(121)) }));
      expect(result).toMatchObject({ outcome: "rejected", reason: "invalid_input" });
    });

    it("requires a description with Custom direction and keeps nuance on other styles", () => {
      expect(
        behavior.apply(
          at("expression_style"),
          command({ input: { kind: "choice", choiceId: "custom_direction" } }),
        ),
      ).toMatchObject({ outcome: "rejected", reason: "required_input_missing" });

      const custom = expectAdvanced(
        behavior.apply(
          at("expression_style"),
          command({
            input: {
              kind: "choice",
              choiceId: "custom_direction",
              customText: " Moonlit, earthy ",
            },
          }),
        ),
      );
      expect(custom.session.slots.expression_style).toEqual({
        status: "answered",
        answer: { kind: "choice", choiceId: "custom_direction", customText: "Moonlit, earthy" },
      });
    });

    it("stores answers trimmed", () => {
      const result = expectAdvanced(
        behavior.apply(at("origin"), command({ input: text("  A walk  ") })),
      );
      expect(result.session.slots.origin).toEqual({ status: "answered", answer: text("A walk") });
    });
  });

  describe("rendering", () => {
    const everyStage = CREATOR_ONBOARDING_STAGES.map((stage) => at(stage));

    it("produces a schema-valid model for every stage and for a completed session", () => {
      for (const session of [...everyStage, COMPLETED]) {
        const render = behavior.render(session);
        expect(StageRenderModelSchema.parse(render)).toEqual(render);
      }
    });

    it("is pure: the same session renders the same model", () => {
      for (const session of [...everyStage, COMPLETED]) {
        expect(behavior.render(structuredClone(session))).toEqual(behavior.render(session));
      }
    });

    it("renders the progress of each stage against the fixed stage count", () => {
      expect(behavior.render(at("offering")).progress).toEqual({ stageNumber: 3, stageCount: 11 });
    });

    it("exposes the Figma expression-style set with stable ids and custom text", () => {
      expect(behavior.render(at("expression_style")).input).toEqual({
        kind: "choice",
        options: [
          { id: "calm_clean", label: "Calm & Clean" },
          { id: "dreamy_reflective", label: "Dreamy & Reflective" },
          { id: "bold_expressive", label: "Bold & Expressive" },
          { id: "custom_direction", label: "Custom direction" },
        ],
        customTextChoiceId: "custom_direction",
      });
    });

    it("reflects the creator's answers back at the summary", () => {
      const prompt = behavior.render(
        at("summary", {
          slots: {
            ...at("summary").slots,
            expression_style: {
              status: "answered",
              answer: { kind: "choice", choiceId: "dreamy_reflective" },
            },
          },
        }),
      ).prompt;
      expect(prompt).toContain("You want to share: Herbal blends and dream sessions");
      expect(prompt).toContain("The feeling you’re leaning toward: Dreamy & Reflective.");
    });

    it("offers no Revise with Weave at the foundation", () => {
      expect(behavior.render(at("foundation")).actions.map((a) => a.id)).toEqual(["submit"]);
    });

    it("refuses to render a foundation stage that has no draft", () => {
      expect(() => behavior.render(at("foundation", { draft: null }))).toThrow(
        CreatorOnboardingStateError,
      );
    });
  });

  describe("immutability", () => {
    it("never mutates the session it is given", () => {
      const commands: [CreatorOnboardingStage, Partial<TransitionCommand>][] = [
        ["opening", { action: "begin" }],
        ["opening", { action: "later" }],
        ["creator_name", { input: text("Moonroot") }],
        ["origin", { action: "skip" }],
        ["expression_style", { input: { kind: "choice", choiceId: "calm_clean" } }],
        ["summary", { input: text("Moonlight") }],
        ["foundation", { input: { kind: "foundation", profile: PROFILE } }],
      ];
      for (const [stage, over] of commands) {
        const session = deepFreeze(at(stage));
        const before = structuredClone(session);
        expect(() => behavior.apply(session, command(over))).not.toThrow();
        expect(session).toEqual(before);
      }
      const summary = deepFreeze(at("summary"));
      expect(() => behavior.acceptFoundation(summary, { draft: DRAFT })).not.toThrow();
    });
  });

  describe("a completed session", () => {
    it("renders the completion rail with only Finish for now available", () => {
      const rail = behavior.render(COMPLETED);
      expect(rail.stage).toBe("completion");
      expect(rail.input).toEqual({ kind: "none" });
      expect(rail.actions.map((a) => [a.id, a.availability])).toEqual([
        ["create_profile_image", "coming_soon"],
        ["create_cover_image", "coming_soon"],
        ["refine_profile", "coming_soon"],
        ["finish", "available"],
      ]);
    });

    it("rejects every action as already completed, whatever the revision", () => {
      for (const action of CREATOR_ONBOARDING_ACTIONS) {
        for (const expectedRevision of [0, 4]) {
          expect(behavior.apply(COMPLETED, command({ action, expectedRevision }))).toMatchObject({
            outcome: "rejected",
            reason: "already_completed",
          });
        }
      }
    });

    it("is not reopened by a late generation result", () => {
      const late = behavior.acceptFoundation(
        COMPLETED as unknown as ActiveCreatorOnboardingSession,
        { draft: DRAFT },
      );
      expect(late).toMatchObject({ outcome: "rejected", reason: "already_completed" });
    });
  });

  describe("version pinning", () => {
    // Only a widened version enum can produce such a session, so it is built by hand here.
    const foreign = (session: CreatorOnboardingSession) =>
      ({ ...session, behaviorVersion: "weave-os-v1" }) as unknown as ActiveCreatorOnboardingSession;

    it("pins new sessions to its own version", () => {
      expect(behavior.start({ sessionId: "s1" }).behaviorVersion).toBe(behavior.version);
    });

    it("throws rather than reinterpret a session from another behaviour", () => {
      const session = foreign(at("offering"));
      expect(() => behavior.render(session)).toThrow(UnsupportedBehaviorVersionError);
      expect(() => behavior.apply(session, command({ input: text("x") }))).toThrow(
        UnsupportedBehaviorVersionError,
      );
      expect(() => behavior.acceptFoundation(foreign(at("summary")), { draft: DRAFT })).toThrow(
        UnsupportedBehaviorVersionError,
      );
      expect(() => behavior.render(foreign(COMPLETED))).toThrow(UnsupportedBehaviorVersionError);
    });
  });
});

function indexOf(stage: CreatorOnboardingStage) {
  return CREATOR_ONBOARDING_STAGES.indexOf(stage);
}

function indexOfSummary() {
  return indexOf("summary");
}

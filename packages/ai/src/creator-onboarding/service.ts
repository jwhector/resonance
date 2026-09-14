import type {
  CommitProfileInput,
  CreatorOnboardingActor,
  CreatorOnboardingBehavior,
  CreatorOnboardingSession,
  CreatorOnboardingSessionStore,
  StageRenderModel,
  TransitionCommand,
  TransitionRejection,
} from "@resonance/core";
import type { FoundationGenerator } from "../agents/profile-gen/creator-foundation";
import { AgentError } from "../errors";

/**
 * The creator-onboarding use case: one request's worth of work across both seams (ADR-0022).
 *
 * The behaviour decides what an action means and the store decides what survives, but neither
 * performs the other's step, and a `generate` or `commit` outcome is a request back to whoever
 * called `apply`. Something has to run that loop — apply, save, generate, fold the draft in, save
 * again, or complete — and it cannot be the Next.js shell, which composes and renders and holds no
 * domain rules (ADR-0002). So it lives here, behind two methods, and a Server Action reduces to
 * "resolve the actor, parse the command, call `transition`".
 */

/**
 * Why a transition did not simply advance, for the renderer to explain.
 *
 * Every {@link TransitionRejection} can surface, plus `generation_failed` when the model could
 * not produce a valid foundation. `stale_revision` also covers a save that lost a race to another
 * tab: the creator is shown the state that won.
 */
export type CreatorOnboardingNotice = TransitionRejection | "generation_failed";

/**
 * Everything the browser needs to draw the interview and send the next command — and nothing it
 * could use to assert who the creator is or which behaviour runs. `revision` is the value the
 * next command must echo as `expectedRevision`.
 */
export type CreatorOnboardingView = {
  status: CreatorOnboardingSession["status"];
  render: StageRenderModel;
  revision: number;
  /** What was published, once the interview is complete. */
  committedProfile: CommitProfileInput | null;
  notice: CreatorOnboardingNotice | null;
};

export type CreatorOnboardingServiceDeps = {
  behavior: CreatorOnboardingBehavior;
  store: CreatorOnboardingSessionStore;
  generateFoundation: FoundationGenerator;
  /** Mints the id for a brand-new session. */
  newSessionId: () => string;
};

export type CreatorOnboardingService = {
  /** Resume the creator's interview, or start and persist one if they have none. */
  open(actor: CreatorOnboardingActor): Promise<CreatorOnboardingView>;
  /** Apply one command, running any generation or commit it asks for. */
  transition(
    actor: CreatorOnboardingActor,
    command: TransitionCommand,
  ): Promise<CreatorOnboardingView>;
};

export function createCreatorOnboardingService({
  behavior,
  store,
  generateFoundation,
  newSessionId,
}: CreatorOnboardingServiceDeps): CreatorOnboardingService {
  function view(
    session: CreatorOnboardingSession,
    notice: CreatorOnboardingNotice | null = null,
  ): CreatorOnboardingView {
    return {
      status: session.status,
      render: behavior.render(session),
      revision: session.revision,
      committedProfile: session.status === "completed" ? session.committedProfile : null,
      notice,
    };
  }

  async function open(actor: CreatorOnboardingActor): Promise<CreatorOnboardingSession> {
    const existing = await store.load(actor);
    if (existing) return existing;
    // A concurrent first visit can win the insert; `stale` then carries the session it created,
    // which is the one to resume.
    return (await store.save(actor, behavior.start({ sessionId: newSessionId() }))).session;
  }

  return {
    async open(actor) {
      return view(await open(actor));
    },

    async transition(actor, command) {
      const session = await open(actor);
      const result = behavior.apply(session, command);

      switch (result.outcome) {
        case "rejected":
          return view(session, result.reason);

        case "advanced": {
          const saved = await store.save(actor, result.session);
          return saved.outcome === "saved"
            ? view(saved.session)
            : view(saved.session, "stale_revision");
        }

        case "generate": {
          // Save the answer that triggered generation before calling the model, so a model
          // failure costs the creator a retry rather than what they just typed.
          const saved = await store.save(actor, result.session);
          if (saved.outcome === "stale" || saved.session.status !== "in_progress") {
            return view(saved.session, "stale_revision");
          }

          let foundation;
          try {
            foundation = await generateFoundation(result.request);
          } catch (error) {
            if (error instanceof AgentError) return view(saved.session, "generation_failed");
            throw error;
          }

          const accepted = behavior.acceptFoundation(saved.session, foundation);
          if (accepted.outcome === "rejected") return view(saved.session, accepted.reason);
          if (accepted.outcome !== "advanced") return view(saved.session);

          const withDraft = await store.save(actor, accepted.session);
          return withDraft.outcome === "saved"
            ? view(withDraft.session)
            : view(withDraft.session, "stale_revision");
        }

        case "commit": {
          const completion = await store.complete(actor, {
            sessionId: session.sessionId,
            profile: result.profile,
            idempotencyKey: command.idempotencyKey,
          });
          return view(completion.session, completion.alreadyCompleted ? "already_completed" : null);
        }
      }
    },
  };
}

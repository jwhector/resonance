import type { FollowState } from "@resonance/core";

/**
 * The return shapes of the follow mutations in `./actions`, in their own module because a
 * `"use server"` file may only export async functions — a type exported from there is erased,
 * but the client needs to import it, and keeping it here makes that legal by construction.
 */

/** Why a follow mutation did not happen. Both are expected outcomes, not crashes. */
export type FollowFailure =
  /**
   * No session. The design draws the Follow control for signed-out members too (their rows
   * carry `followState: "unknown"`), so the click is a real interaction with a real answer:
   * *sign in*. The action refuses the write and says so; the client turns this into a prompt.
   * Silently doing nothing is the one behaviour acceptance criterion 3 rules out.
   */
  | "unauthenticated"
  /**
   * `@resonance/db` threw `ResonanceError("follow_self")` — a creator tried to follow their own
   * row. Surfaced as a named reason rather than a driver error so the client can say something
   * true about it, and distinct from `unauthenticated` because the fix is different.
   */
  | "follow_self";

/**
 * Result of a follow/unfollow Server Action.
 *
 * A discriminated result rather than a thrown error for the two *expected* refusals above; any
 * other failure (DB down, bad cursor, misconfigured embedder) still throws and propagates, per
 * `docs/conventions.md` § Errors. `followState` is the state the row should now show, so the
 * caller never re-derives it from which button was pressed.
 */
export type FollowActionResult =
  | { ok: true; followState: FollowState }
  | { ok: false; reason: FollowFailure };

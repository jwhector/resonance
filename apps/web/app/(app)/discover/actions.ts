"use server";

import { headers } from "next/headers";
import { z } from "zod";
import {
  CreatorDiscoveryQuerySchema,
  ResonanceError,
  type CreatorResultPage,
  type DiscoveryViewer,
  type FollowState,
} from "@resonance/core";
import {
  createDb,
  createDiscoveryAdapter,
  followCreator as followCreatorEdge,
  unfollowCreator as unfollowCreatorEdge,
} from "@resonance/db";
import { getWebSession } from "../../../lib/auth";
import { discoveryEmbedder } from "../../../lib/e2e-harness";
import type { FollowActionResult } from "./contracts";

/**
 * Server Actions for member discovery: one ranked search and two follow mutations.
 *
 * Composition only (ADR-0002). Ranking, filtering, thresholds, pagination and the follow rules
 * all live behind `@resonance/core`'s `DiscoveryPort` and `@resonance/db`'s follow queries; what
 * this module owns is the three things only the app layer can do — parse untrusted input, resolve
 * the session, and join the two halves of the adapter (`ai`'s embedder, `db`'s SQL) that neither
 * package may import from the other (ADR-0003).
 *
 * `createDb()` and the embedder are resolved lazily *inside* each action, so importing this module
 * never needs `DATABASE_URL` or a provider key and `next build` never touches a live service.
 */

/**
 * Build the live `DiscoveryPort`.
 *
 * The `embed` half is **injected**, never imported by `@resonance/db`: the dependency runs
 * `ai → db`, so the app layer is the only place allowed to know both. Live-by-default (ADR-0018)
 * — the harness accessor returns the real `resolveEmbedder()` unless the isolated, production-
 * guarded E2E harness is active.
 */
async function discoveryPort() {
  const embedder = await discoveryEmbedder();
  return createDiscoveryAdapter({ db: createDb(), embed: (text) => embedder.embed(text) });
}

/** The signed-in member, or `null`. Read from the session — never from the caller's payload. */
async function currentViewer(): Promise<DiscoveryViewer> {
  const user = await getWebSession(await headers());
  return user ? { userId: user.id } : null;
}

/**
 * Search creators, **session-optional**.
 *
 * The viewer is a *separate* concern from the query, and deliberately not a parameter of this
 * action: `input` is whatever the client sent and is parsed by `CreatorDiscoveryQuerySchema`
 * (conventions.md § Validation — Zod at boundaries), while the viewer is derived server-side from the session cookie. There is no
 * identity field on the query for a caller to spoof, and adding one — even "for convenience" —
 * would make the search box an identity-assertion channel. `CreatorDiscoveryQuerySchema` also
 * strips unknown keys, so a payload carrying `userId` or `viewer` loses it at this line.
 *
 * Signed out is a first-class case, not an error: the port is called with `viewer: null` and every
 * row comes back `followState: "unknown"` (`DiscoveryPort` invariant 5), which is what lets the UI
 * draw the designed Follow control without claiming the member does not follow anyone.
 *
 * Failures propagate as `ResonanceError`s — an empty page always means "no matches", never
 * "something broke".
 */
export async function searchCreators(input: unknown): Promise<CreatorResultPage> {
  const query = CreatorDiscoveryQuerySchema.parse(input);
  const viewer = await currentViewer();
  const port = await discoveryPort();
  return port.searchCreators(query, viewer);
}

/**
 * The follow target: the creator's Better Auth **user id**, which is what the follow graph is keyed
 * on — not their profile uuid. `CreatorResult` carries both for exactly this reason, so the row can
 * address the profile and the follow edge without a second round trip.
 */
const FollowInputSchema = z.object({ creatorUserId: z.string().min(1) });

/**
 * Run one follow-graph mutation under a required session.
 *
 * Auth is REQUIRED here, unlike the search above, and a missing session returns
 * `{ ok: false, reason: "unauthenticated" }` rather than throwing or redirecting: the caller is a
 * button inside a results list, and the right response is a prompt in place, not a lost page of
 * results. `follow_self` is likewise translated from `@resonance/db`'s typed `ResonanceError` into
 * a named reason; every other error propagates untouched (conventions.md § Errors).
 */
type FollowMutation = (
  db: ReturnType<typeof createDb>,
  edge: { followerId: string; followingId: string },
) => Promise<void>;

async function mutateFollow(
  input: unknown,
  apply: FollowMutation,
  followState: FollowState,
): Promise<FollowActionResult> {
  const { creatorUserId } = FollowInputSchema.parse(input);

  const user = await getWebSession(await headers());
  if (!user) return { ok: false, reason: "unauthenticated" };

  try {
    await apply(createDb(), { followerId: user.id, followingId: creatorUserId });
  } catch (error) {
    if (error instanceof ResonanceError && error.code === "follow_self") {
      return { ok: false, reason: "follow_self" };
    }
    throw error;
  }
  return { ok: true, followState };
}

/** Follow a creator. Idempotent in `@resonance/db`, so a double-clicked button is not an error. */
export async function followCreator(input: unknown): Promise<FollowActionResult> {
  return mutateFollow(input, followCreatorEdge, "following");
}

/** Unfollow a creator. Idempotent in the other direction. */
export async function unfollowCreator(input: unknown): Promise<FollowActionResult> {
  return mutateFollow(input, unfollowCreatorEdge, "not_following");
}

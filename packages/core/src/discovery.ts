import { z } from "zod";

/**
 * The discovery contract — the **swappable ranking seam** (ADR-0017).
 *
 * ## The module
 *
 * `DiscoveryPort` is a one-method **interface** at the `@resonance/core` **seam**. Behind
 * it sits a large **implementation** owned by `@resonance/db`: resolve a query vector →
 * status-filtered pgvector ANN search → tag filter → similarity threshold → keyset
 * pagination → follow-state resolution for the viewer. None of that leaks through the
 * interface. Callers learn one method and two data shapes; they get the whole ranked
 * search pipeline. That ratio is the **depth**.
 *
 * The query vector has **two sources**, and which one is used is an implementation
 * detail: the embedded search text when the member typed something, or the member's
 * stored interest embedding when they did not (invariant 8). Personalized ranking is
 * therefore not a second method or a sibling port — it is another ranking strategy behind
 * the same seam, which is exactly what this seam exists to absorb. Future ranking work
 * (retuning thresholds, blending interest with query and follows) lands here too, without
 * `web` or `ui` changing.
 *
 * ## Why the contract lives here and not in `db`
 *
 * Three packages must agree on the same query and result shapes: `apps/web` parses an
 * untrusted query off the URL and hands it to a Server Action, `@resonance/ui` renders a
 * result row from it, and `@resonance/db` produces it. `core` is the only package all
 * three may depend on (ADR-0003), so the contract lives here — and `web`/`ui` can then
 * depend on the interface without ever seeing SQL, Drizzle, or an embedding client.
 *
 * ## Deletion test
 *
 * Delete this module and the complexity does not vanish — it reappears in two places at
 * once. `apps/web`'s Server Action would hand-roll a query shape and its validation;
 * `@resonance/ui`'s result-row props would hand-roll a matching result shape; the two
 * would drift, and every field added to a result row would be a three-package edit. Worse,
 * ranking would stop being swappable: ranking experiments (retuning the
 * threshold, changing the filter set, replacing ANN with a hybrid ranker) would have to
 * edit the Server Action and the UI to change scoring, because there would be no seam to
 * change behind. The module earns its keep on both counts — **leverage** for `web`/`ui`,
 * **locality** for whoever tunes ranking.
 *
 * ## Adapters at this seam
 *
 * Two, so the seam is real rather than hypothetical: the `@resonance/db` ANN adapter, and
 * the in-test fake in `discovery.test.ts` that drives the whole contract without a
 * database. A third — a hybrid/keyword ranker — is what the seam exists to allow.
 *
 * @see docs/adr/0017-design-deep-modules.md
 * @see docs/adr/0010-embeddings-and-vector-search.md
 */

/**
 * The four result tabs in the designed results screen. Only `creators` has a data source
 * today; `products`, `services`, and `posts` exist because the design's tab bar has
 * them and later work fills them (`Offering` carries no price/image/type yet, and
 * `@resonance/community` is a stub). Naming them now gives those slices an obvious socket
 * and keeps `web`'s route state validatable today.
 *
 * Declaration order is *not* presentation order — the tab bar's order is a design concern
 * owned by `@resonance/ui`.
 */
export const RESULT_KINDS = ["creators", "products", "services", "posts"] as const;
export const ResultKindSchema = z.enum(RESULT_KINDS);
export type ResultKind = z.infer<typeof ResultKindSchema>;

/**
 * Follow state of one result row **relative to the current viewer**.
 *
 * Three states, not a boolean, because the signed-out case is genuinely a third thing.
 * The design renders the Follow control for signed-out members too, but we cannot know
 * their state — reporting `not_following` there would be a lie the UI could not tell apart
 * from a signed-in non-follower, and the two need different click behaviour (prompt to
 * sign in vs. mutate). `unknown` therefore means "no viewer identity, or state not
 * resolved"; the UI renders the default affordance and defers.
 */
export const FOLLOW_STATES = ["following", "not_following", "unknown"] as const;
export const FollowStateSchema = z.enum(FOLLOW_STATES);
export type FollowState = z.infer<typeof FollowStateSchema>;

/** Page size defaults. Exported so `web` can build links without re-deriving the cap. */
export const DISCOVERY_DEFAULT_LIMIT = 20;
export const DISCOVERY_MAX_LIMIT = 50;

/**
 * A discovery query as it arrives from the client (search box + tab + URL params).
 *
 * This is the **validation boundary**: `apps/web` parses `searchParams`
 * and Server Action input through it before anything reaches the port. Everything in here
 * is client-supplied and therefore untrusted — which is exactly why the viewer identity is
 * *not* a field on it (see {@link DiscoveryViewer}).
 *
 * - `text` is trimmed then length-checked, so a whitespace-only search fails validation
 *   rather than reaching the embedder. It is **optional, and absent is not empty**: absent
 *   means "no query — rank for this viewer" (invariant 8), while `""` or `"   "` is a
 *   malformed search and still fails here. Keeping those two cases distinguishable is what
 *   stops a blank search box from being silently reinterpreted as a personalized browse.
 * - `threshold` is a *minimum similarity*; omitted means the implementation's default.
 *   Tuning it is the whole point of the seam — it must never require a UI change.
 * - `cursor` is opaque (see {@link CreatorResultPage}).
 */
export const DiscoveryQuerySchema = z.object({
  text: z.string().trim().min(1).max(200).optional(),
  kind: ResultKindSchema.default("creators"),
  tags: z.array(z.string().min(1).max(64)).max(10).default([]),
  threshold: z.number().min(0).max(1).optional(),
  limit: z.number().int().positive().max(DISCOVERY_MAX_LIMIT).default(DISCOVERY_DEFAULT_LIMIT),
  cursor: z.string().min(1).optional(),
});
export type DiscoveryQuery = z.infer<typeof DiscoveryQuerySchema>;

/**
 * A {@link DiscoveryQuery} narrowed to the one kind that has a data source. Derived from
 * `DiscoveryQuerySchema` rather than restated, so the two can never drift.
 *
 * Narrowing at the type level (instead of documenting "implementations should reject other
 * kinds") means the dispatch `web` has to do anyway — creators → the port, the other three
 * → designed empty states — is enforced by the compiler, and `searchPosts` can be added
 * later by exactly the same construction.
 */
export const CreatorDiscoveryQuerySchema = DiscoveryQuerySchema.extend({
  kind: z.literal("creators").default("creators"),
});
export type CreatorDiscoveryQuery = z.infer<typeof CreatorDiscoveryQuerySchema>;

/**
 * One creator in a ranked result page — everything the designed result row needs, and
 * nothing it doesn't.
 *
 * - `profileId` addresses the profile (`/creator/[id]`); `userId` is the follow target and
 *   the session-comparison key, so the row can tell "this is me" from "I follow them"
 *   without a second round trip.
 * - There is deliberately **no avatar/image field**: `creator_profiles` has no such column
 *   and the ratified decision is an initials placeholder derived from
 *   `displayName`, logged as an enumerated ADR-0019 parity delta. Real imagery is filed as
 *   follow-up work; inventing the field here would imply a data source that does not exist.
 * - `similarity` is `1 - cosineDistance`, so its true range is [-1, 1] even though embedded
 *   text almost always lands in [0, 1]. The schema admits the full range rather than
 *   rejecting legitimate output from the ranker; `threshold` stays [0, 1] because that is
 *   the band worth filtering in.
 */
export const CreatorResultSchema = z.object({
  profileId: z.string().uuid(),
  userId: z.string().min(1),
  displayName: z.string().min(1),
  headline: z.string(),
  tags: z.array(z.string()),
  similarity: z.number().min(-1).max(1),
  followState: FollowStateSchema,
});
export type CreatorResult = z.infer<typeof CreatorResultSchema>;

/**
 * A page of ranked creators.
 *
 * `nextCursor` is an **opaque** token. Callers must treat it as a string, pass it back
 * unmodified, and never parse it; implementations must encode enough state to resume
 * deterministically from the same ranking. `null` means the last page — it is not
 * interchangeable with `undefined`, so "no more results" is always explicit. There is no
 * total count: computing one costs a second full scan and the design never shows it.
 *
 * The page is self-describing (`kind`) so the sibling `products` / `services` / `posts`
 * pages can join it as a discriminated union in later slices without reshaping this one.
 */
export const CreatorResultPageSchema = z.object({
  kind: z.literal("creators"),
  results: z.array(CreatorResultSchema),
  nextCursor: z.string().min(1).nullable(),
});
export type CreatorResultPage = z.infer<typeof CreatorResultPageSchema>;

/**
 * Who is searching. `null` means signed out.
 *
 * A separate parameter rather than a field on {@link DiscoveryQuery} on purpose: the query
 * is parsed from client input, the viewer is derived server-side from the session. Keeping
 * them apart at the seam makes it structurally impossible to spoof an identity through the
 * search box — there is no field to spoof.
 */
export type DiscoveryViewer = { readonly userId: string } | null;

/**
 * The swappable ranking seam.
 *
 * One method, because one thing varies: how creators are ranked. Follow *mutation* is
 * deliberately not here — it is not ranking, and putting it here would force every
 * alternative ranker to reimplement it.
 *
 * Interface contract (the invariants an adapter must honour, not just the signature):
 *
 * 1. `query` is already validated — parse it with {@link CreatorDiscoveryQuerySchema} at
 *    the boundary; adapters trust it.
 * 2. Results are ordered by descending `similarity`.
 * 3. Every result satisfies `similarity >= threshold` when a threshold is supplied.
 * 4. At most `limit` results are returned. `nextCursor` is non-null iff more may follow.
 * 5. When `viewer` is `null`, every `followState` is `"unknown"`. When a viewer is present,
 *    no `followState` is `"unknown"` — an authenticated viewer's state is always knowable.
 * 6. Only publishable creators appear; draft-status profiles never do.
 * 7. Errors are thrown as `ResonanceError` subclasses, never returned as empty pages — an
 *    empty page means "no matches", never "something broke".
 * 8. When `query.text` is **absent**, the ranking signal is the viewer's stored interests
 *    instead of a query string, and every other invariant still holds unchanged. If the
 *    viewer is `null`, or has no interests, the result is an **empty page** — never an
 *    unranked or arbitrarily ordered dump of the corpus. "We have nothing to personalize
 *    on" and "here is everything" are different answers, and only the first is honest.
 */
export interface DiscoveryPort {
  searchCreators(query: CreatorDiscoveryQuery, viewer: DiscoveryViewer): Promise<CreatorResultPage>;
}

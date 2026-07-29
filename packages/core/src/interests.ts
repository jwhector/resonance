import { z } from "zod";

/**
 * Member interests — the member-side counterpart to the creator interview.
 *
 * A creator tells Weave what they offer and that becomes a profile embedding; a member
 * picks topics and that becomes an *interest* embedding in the same vector space. The two
 * can then be matched, which is what lets `/discover` rank creators for a member who has
 * typed nothing (see `discovery.ts`, invariant 8).
 *
 * This module owns the **vocabulary** only: what a topic is, and what a member's selection
 * looks like as it crosses a boundary. It deliberately does not own the topic *list* — that
 * is curated seed data for a table `@resonance/db` owns, and only that package needs it.
 * Nor does it own a port: writing interests is not ranking, so it follows the precedent
 * `DiscoveryPort` already sets for follow mutation and ships as a direct `db` export.
 */

/**
 * How a topic is named across packages.
 *
 * Topics are identified by **slug, not by database id**. Three packages have to agree on
 * the same topic across a network boundary — `@resonance/ui` renders the chip, `apps/web`
 * parses the submitted form, `@resonance/db` resolves the row — and a slug survives that
 * trip in a way a row id does not: it is stable across a reseed, readable in a payload, and
 * lets the curated list be authored declaratively. Keying on a uuid would force `ui` and
 * `web` to carry opaque identifiers they cannot check, and make reseeding a data migration.
 *
 * Lowercase kebab-case, so a slug is safe in a URL segment without escaping.
 */
export const TopicSlugSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "must be lowercase kebab-case");
export type TopicSlug = z.infer<typeof TopicSlugSchema>;

/**
 * One selectable topic, as the picker renders it. `label` is the designed chip text
 * ("Tea Culture"); `slug` is the identity that crosses the wire ("tea-culture").
 */
export const TopicSchema = z.object({
  slug: TopicSlugSchema,
  label: z.string().trim().min(1).max(64),
});
export type Topic = z.infer<typeof TopicSchema>;

/**
 * The count the design asks for — "Select 3 topics" (Figma `1554:79520`).
 *
 * This is **UI guidance, not a validation rule**. The picker is skippable by ratified
 * decision, so a member may submit zero topics and must not be blocked; the copy and any
 * "3 of 3 chosen" affordance read this constant so the design's number lives in one place
 * instead of being retyped in `ui` and `web`.
 */
export const MEMBER_INTEREST_TARGET = 3;

/**
 * Upper bound on a single selection. Mirrors the `tags` cap on `DiscoveryQuerySchema`: a
 * bound exists so an unbounded array cannot arrive from a client, not because the product
 * wants exactly this many.
 */
export const MEMBER_INTEREST_MAX = 10;

/**
 * A member's topic selection as it arrives from the client — the **validation boundary**
 * for the Server Action that persists it.
 *
 * - The minimum is **zero**, because skipping is a supported outcome. An empty selection
 *   means "this member has no interests", which is a real state the ranking path must
 *   handle, not a failed write.
 * - Duplicate slugs are **rejected rather than silently deduped**. A payload naming the
 *   same topic twice is malformed, and quietly repairing it would hide a broken caller
 *   while making the stored count disagree with what was sent.
 * - The member is deliberately **not** a field here. Identity comes from the session
 *   server-side, exactly as `DiscoveryViewer` is kept off `DiscoveryQuery`, so there is no
 *   field on the payload to spoof.
 */
export const MemberInterestsSchema = z.object({
  topicSlugs: z
    .array(TopicSlugSchema)
    .max(MEMBER_INTEREST_MAX)
    .default([])
    .refine((slugs) => new Set(slugs).size === slugs.length, {
      message: "topicSlugs must not contain duplicates",
    }),
});
export type MemberInterests = z.infer<typeof MemberInterestsSchema>;

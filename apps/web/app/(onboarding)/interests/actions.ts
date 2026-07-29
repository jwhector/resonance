"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { MemberInterestsSchema } from "@resonance/core";
import { createDb, setMemberInterests } from "@resonance/db";
import { getWebSession } from "../../../lib/auth";
import { interestsEmbedder } from "../../../lib/e2e-harness";

/**
 * The Server Action behind the interest picker.
 *
 * Composition only (ADR-0002): the taxonomy, the replace-not-merge write, the embedding and the
 * one-vector-per-member invariant all live in `@resonance/db`'s `setMemberInterests`. What this
 * module owns is the three things only the app layer can do — parse untrusted input, resolve the
 * member from the session, and hand `db` the embedder it may not import itself (`ai → db`,
 * ADR-0003).
 *
 * `createDb()` and the embedder are resolved lazily *inside* the action, so importing this module
 * never needs `DATABASE_URL` or a provider key and `next build` never touches a live service.
 */

/** What the action tells the caller. A rejected selection is a page state, not an exception. */
export type SaveInterestsResult =
  | { ok: true }
  | { ok: false; reason: "unauthenticated" | "invalid" };

/**
 * Persist a member's topic selection.
 *
 * **The member is never in the payload.** It comes from the session cookie, exactly as
 * `DiscoveryViewer` does for search: there is no field for a caller to spoof, and
 * `MemberInterestsSchema` strips unknown keys, so a payload carrying `memberId` loses it at the
 * parse. Being signed out is a refusal, not a crash — the picker is reachable straight after email
 * verification, and a session that has expired in between should send the member back to sign in
 * rather than 500.
 *
 * **An empty selection is a real outcome, not a no-op.** The picker is skippable by ratified
 * decision, so submitting nothing means "this member has no interests" and must clear any previous
 * selection *and* its vector. `setMemberInterests` records that faithfully; this action does not
 * special-case it, because an early return here would silently leave a stale vector ranking
 * `/discover` for a member who just cleared their topics.
 */
export async function saveInterests(input: unknown): Promise<SaveInterestsResult> {
  const parsed = MemberInterestsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid" };

  const user = await getWebSession(await headers());
  if (!user) return { ok: false, reason: "unauthenticated" };

  const embedder = await interestsEmbedder();
  await setMemberInterests(createDb(), {
    memberId: user.id,
    topicSlugs: parsed.data.topicSlugs,
    embedder,
  });
  return { ok: true };
}

/**
 * Where a member goes once their topics are recorded.
 *
 * Deliberately today's post-verification destination, unchanged. Sending members to `/discover`
 * instead would be truer to the design, but member and creator cannot be told apart at this point:
 * the only signal is the `/start` intent, and it is not carried through signup. Preserving the
 * existing destination keeps the creator onboarding flow working and confines this change to
 * *inserting* a step. Filed as follow-up rather than guessed at.
 */
const AFTER_INTERESTS = "/onboarding/creator";

/**
 * The **native** submission path — the form's `action`, so the step works with JavaScript disabled.
 *
 * This is why `TopicPicker` renders real checkboxes with `name="topicSlugs"`: without JS the
 * browser POSTs the checked values itself and this action reads them off `FormData`. The
 * client-side path calls {@link saveInterests} instead; both end in the same `setMemberInterests`.
 *
 * `getAll` returns `[]` when nothing is checked, which is exactly the skip case and a valid
 * selection — `MemberInterestsSchema` takes a minimum of zero.
 *
 * A refusal here cannot be rendered as state (there is no client to hand a result to), so an
 * unauthenticated or malformed submission redirects to the front door rather than throwing an
 * opaque 500 at a member who has just verified their email.
 */
export async function saveInterestsFromForm(formData: FormData): Promise<void> {
  const result = await saveInterests({ topicSlugs: formData.getAll("topicSlugs") });
  if (!result.ok) redirect(result.reason === "unauthenticated" ? "/signup" : "/interests");
  redirect(AFTER_INTERESTS);
}

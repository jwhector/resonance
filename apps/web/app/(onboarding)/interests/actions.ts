"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isCreatorIntent, MemberInterestsSchema } from "@resonance/core";
import { createDb, setMemberInterests, setOnboardingIntent } from "@resonance/db";
import { getWebSession } from "../../../lib/auth";
import { interestsEmbedder } from "../../../lib/e2e-harness";
import { interestsUrl, readIntent, signupUrl } from "../intent-routes";

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

/**
 * What the action tells the caller. A rejected selection is a page state, not an exception.
 *
 * Success names the member it acted for. The caller resolved no session of its own — this action
 * did — and the step has a second thing to record against that same person, so handing the id
 * back is what keeps both writes about one member without reading the session twice.
 */
export type SaveInterestsResult =
  | { ok: true; memberId: string }
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
  return { ok: true, memberId: user.id };
}

/**
 * Where interest selection continues — the point where the two ways through onboarding part.
 *
 * Someone who said they came here to create goes on to the interview; everyone else goes to the
 * member front door. **No stated answer is a member**, and not a guess: `/start` sends `explore`
 * straight to `/discover` without ever touching sign-up, so the only answers that reach this step
 * are creator ones. An account arriving here without one either came in through a bare sign-in
 * link or never answered the question, and neither is a claim to be creating.
 */
const AFTER_INTERESTS = {
  member: "/discover",
  creator: "/onboarding/creator",
} as const;

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
 * The `intent` is bound to the action by the page that rendered the form, from the URL that
 * carried it here. It is parsed again rather than trusted, because an argument to a Server Action
 * is its own boundary and because the value is about to be **stored**: `setOnboardingIntent`
 * rejects anything that is not an intent, and someone who typed nonsense into a URL should reach
 * the member front door, not a 500.
 *
 * A refusal here cannot be rendered as state (there is no client to hand a result to), so an
 * unauthenticated or malformed submission redirects to the front door rather than throwing an
 * opaque 500 at a member who has just verified their email. A retry keeps the intent, or the
 * second attempt would quietly land somewhere the first would not have. A lapsed session keeps
 * a **creator** intent for the same reason: whoever said they came to create should re-enter
 * sign-up on the path they chose, not silently as a member. Only the creator intents ride that
 * URL — `/start` never sends `explore` through sign-up, so neither does this bounce.
 */
export async function saveInterestsFromForm(intent: unknown, formData: FormData): Promise<void> {
  const stated = readIntent(intent);

  const result = await saveInterests({ topicSlugs: formData.getAll("topicSlugs") });
  if (!result.ok) {
    if (result.reason === "unauthenticated") {
      redirect(stated && isCreatorIntent(stated) ? signupUrl(stated) : "/signup");
    }
    redirect(interestsUrl(stated));
  }

  // Recorded against the member whose topics just landed, in the same submission that routed on
  // it: the URL value decides where this person goes now, and this is what makes their answer
  // outlive the request that carried it. Nothing is written when nothing was stated — a null
  // column means "never answered", and a fabricated answer would be indistinguishable from a real
  // one for anyone reading these later.
  if (stated) await setOnboardingIntent(createDb(), result.memberId, stated);

  redirect(stated && isCreatorIntent(stated) ? AFTER_INTERESTS.creator : AFTER_INTERESTS.member);
}

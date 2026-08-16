import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createDb, getMemberInterests, listTopics } from "@resonance/db";
import { getWebSession } from "../../../lib/auth";
import { readIntent } from "../intent-routes";
import { InterestsForm } from "./interests-form";

/**
 * The interest-selection step (Figma `1554:79520`, manifest screen `13-select-topics`).
 *
 * Reached straight after email verification, for every new account: roles are additive, so a
 * creator is also a member and gets a personalized `/discover` from the same selection.
 *
 * This is also where the answer given on `/start` is finally spent — it arrives on the URL,
 * whichever verification channel brought the person here, and the form hands it to the action
 * that stores it and chooses where they go next.
 *
 * Lives in the `(onboarding)` group because the frame draws its own full-page chrome — the
 * Resonance mark over content the `<main>` wrapper centres, with no `AppNav` rail. The
 * wrapper matches every sibling onboarding screen.
 *
 * `force-dynamic` + a lazy `createDb()` keep `next build` away from a live database, matching
 * `/discover` and `/creator/[id]`.
 */
export const dynamic = "force-dynamic";

export default async function InterestsPage({
  searchParams,
}: {
  searchParams: Promise<{ intent?: string }>;
}) {
  const { intent } = await searchParams;
  const user = await getWebSession(await headers());
  // Signing in is a prerequisite, not a page state: there is no member to attach a selection to,
  // and the Server Action would refuse anyway. Redirect rather than render a picker that cannot save.
  if (!user) redirect("/signup");

  const db = createDb();
  // The taxonomy comes from the database, not a constant, so a corrected or extended topic list is
  // a data edit rather than a deploy.
  const [topics, existing] = await Promise.all([listTopics(db), getMemberInterests(db, user.id)]);

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6">
      <InterestsForm
        topics={topics}
        initialSelection={existing.map((topic) => topic.slug)}
        intent={readIntent(intent)}
      />
    </main>
  );
}

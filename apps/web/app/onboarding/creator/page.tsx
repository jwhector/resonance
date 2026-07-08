import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getWebSession } from "../../../lib/auth";
import { InterviewClient } from "./interview-client";

/**
 * `/onboarding/creator` — the Weave interview → ProfileGen screen. Auth-gated RSC: it resolves
 * the session server-side and bounces anonymous visitors to `/signup`. All interactivity
 * (streaming chat, draft editing, commit) lives in the client wrapper it renders. Composition
 * only — every rule lives in the packages it wires (ADR-0002).
 */
export default async function CreatorInterviewPage() {
  const user = await getWebSession(await headers());
  if (!user) redirect("/signup");

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-6 py-10">
      <InterviewClient />
    </main>
  );
}

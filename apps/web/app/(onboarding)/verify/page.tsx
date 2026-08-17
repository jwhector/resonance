import { redirect } from "next/navigation";
import { isCreatorIntent } from "@resonance/core";
import { readIntent, signupUrl } from "../intent-routes";
import { VerifyForm } from "./verify-form";

/**
 * `/verify` — the "check your email" step. Server shell: reads the `email` query param
 * (set by `/signup`) and hands it to the client `VerifyForm`, which owns the OTP verify +
 * resend calls. If the email is missing the flow can't continue, so bounce back to signup —
 * still carrying a stated creator intent, so whoever said they came to create re-enters
 * sign-up on the path they chose rather than silently as a member.
 *
 * The `intent` param rides along from `/signup` so that entering the code reaches the same fork
 * the magic link would have. It is parsed here for the same reason it is parsed on `/signup`: a
 * resend puts a fresh magic link in the inbox, and its `callbackURL` must be a URL Better Auth
 * will accept. An absent or unrecognized answer is simply a member.
 */
export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; intent?: string }>;
}) {
  const { email, intent } = await searchParams;
  const stated = readIntent(intent);
  if (!email) redirect(stated && isCreatorIntent(stated) ? signupUrl(stated) : "/signup");

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6">
      <VerifyForm email={email} intent={stated} />
    </main>
  );
}

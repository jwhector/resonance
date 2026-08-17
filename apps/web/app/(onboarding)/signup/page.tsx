import { readIntent } from "../intent-routes";
import { SignupForm } from "./signup-form";

/**
 * `/signup` — the magic-link + emailOTP sign-up step. Server shell that centres the
 * client `SignupForm` (which owns the Better Auth client calls). Composition only.
 *
 * The `intent` parameter is what `/start` answered, on its way to the fork after email
 * verification. It is parsed here rather than passed through, because an unrecognized value would
 * otherwise reach the magic link's `callbackURL` — which Better Auth validates and rejects,
 * turning a typo in a URL into a sign-up that cannot send its email. Someone who arrives with no
 * intent, or a forged one, simply signs up as a member.
 */
export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ intent?: string }>;
}) {
  const { intent } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6">
      <SignupForm intent={readIntent(intent)} />
    </main>
  );
}

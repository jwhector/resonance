import { SignupForm } from "./signup-form";

/**
 * `/signup` — the magic-link + emailOTP sign-up step. Server shell that centres the
 * client `SignupForm` (which owns the Better Auth client calls). Composition only.
 */
export default function SignupPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6">
      <SignupForm />
    </main>
  );
}

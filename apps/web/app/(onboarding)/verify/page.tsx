import { redirect } from "next/navigation";
import { VerifyForm } from "./verify-form";

/**
 * `/verify` — the "check your email" step. Server shell: reads the `email` query param
 * (set by `/signup`) and hands it to the client `VerifyForm`, which owns the OTP verify +
 * resend calls. If the email is missing the flow can't continue, so bounce back to signup.
 */
export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;
  if (!email) redirect("/signup");

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6">
      <VerifyForm email={email} />
    </main>
  );
}

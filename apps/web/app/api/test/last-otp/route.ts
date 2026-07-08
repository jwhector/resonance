import { peekLoginCode } from "@resonance/auth";
import { E2E_HARNESS } from "../../../../lib/e2e-harness";

/**
 * TEST-ONLY back door for the E2E harness (`GET /api/test/last-otp?email=...`). Reads back the
 * most recent fake login code so a Playwright run can complete the passwordless front door
 * without a mailbox. It reads the SAME `@resonance/auth` fake-mail singleton the Better Auth
 * OTP send writes to (both routes share one transpiled module instance in the Next server; the
 * fake is the module-singleton `harnessMail()` in `lib/e2e-harness.ts`).
 *
 * Gated HARD on {@link E2E_HARNESS} (ADR-0018 §4): outside the isolated E2E harness — and always in
 * production — it 404s and returns nothing, and `peekLoginCode` is itself inert there (no fake is
 * ever constructed), so no real code can ever be exposed. This route is infra for tests only and
 * must never be relied on by product code (golden rule 4: it still validates its input at the
 * boundary).
 */
export const dynamic = "force-dynamic";

export function GET(request: Request): Response {
  if (!E2E_HARNESS) {
    return new Response("Not found", { status: 404 });
  }

  const email = new URL(request.url).searchParams.get("email");
  if (!email) {
    return Response.json({ error: "email query param required" }, { status: 400 });
  }

  return Response.json({ otp: peekLoginCode(email) ?? null });
}

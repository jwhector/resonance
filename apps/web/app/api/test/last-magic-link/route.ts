import { peekMagicLink } from "@resonance/auth";
import { E2E_HARNESS } from "../../../../lib/e2e-harness";

/**
 * TEST-ONLY back door for the E2E harness (`GET /api/test/last-magic-link?email=...`). Reads back
 * the most recent fake magic-link URL so a Playwright run can drive the **link** half of the
 * passwordless front door without a mailbox, the same way `/api/test/last-otp` drives the code
 * half. It reads the SAME `@resonance/auth` fake-mail singleton the Better Auth magic-link send
 * writes to (the fake is built by `harnessMailOverride()` in `lib/e2e-harness.ts`).
 *
 * Without this the two verification channels are not equally testable: a code can be typed, but a
 * link only ever arrives by email, and Better Auth stores a SHA-256 hash of its token rather than
 * the token, so the URL cannot be rebuilt from the database. A channel that cannot be driven is a
 * channel whose behaviour is asserted only in unit tests.
 *
 * Gated HARD on {@link E2E_HARNESS} (ADR-0018 §4): outside the isolated E2E harness — and always in
 * production — it 404s and returns nothing, and `peekMagicLink` is itself inert there (no fake is
 * ever constructed), so no real sign-in link can ever be exposed. This route is infra for tests
 * only and must never be relied on by product code.
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

  return Response.json({ url: peekMagicLink(email) ?? null });
}

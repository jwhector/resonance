import { peekMagicLink } from "@resonance/auth";
import { E2E_HARNESS } from "../../../../lib/e2e-harness";

/**
 * TEST-ONLY back door for the E2E harness (`GET /api/test/last-magic-link?email=...`). Reads back
 * the most recent fake sign-in link so a Playwright run can complete the passwordless front door
 * **through the magic-link channel**, without a mailbox.
 *
 * The sibling of `/api/test/last-otp`, and it exists because sign-up dispatches BOTH channels:
 * the code and the link land someone on the same screen by two different routes, and only the link
 * carries the `callbackURL` the sender chose. Without this seam the link's half of the flow can be
 * built wrong and every test still passes.
 *
 * Reads the SAME `@resonance/auth` fake-mail singleton Better Auth sent the link through (the fake
 * built by `harnessMailOverride()` in `lib/e2e-harness.ts`, which registers both channels for
 * read-back).
 *
 * Gated HARD on {@link E2E_HARNESS} (ADR-0018 §4): outside the isolated E2E harness — and always in
 * production — it 404s and returns nothing, and `peekMagicLink` is itself inert there (no fake is
 * ever constructed), so no real sign-in link can ever be exposed. This route is infra for tests
 * only and must never be relied on by product code — it still validates its query string, because
 * being test-only does not make it any less of a request boundary.
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

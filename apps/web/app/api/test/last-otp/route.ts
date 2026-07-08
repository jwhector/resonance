import { peekLoginCode } from "@resonance/auth";

/**
 * TEST-ONLY back door for the E2E harness (`GET /api/test/last-otp?email=...`). Reads back the
 * most recent fake login code so a Playwright run can complete the passwordless front door
 * without a mailbox. It reads the SAME `@resonance/auth` fake-mail singleton the Better Auth
 * OTP send writes to (both routes share one transpiled module instance in the Next server).
 *
 * Gated HARD on `RESONANCE_FAKES === "1"`: outside the fakes flag it 404s and returns nothing,
 * and `peekLoginCode` is itself inert there — so no real code can ever be exposed. This route is
 * infra for tests only and must never be relied on by product code (golden rule 4: it still
 * validates its input at the boundary).
 */
export const dynamic = "force-dynamic";

export function GET(request: Request): Response {
  if (process.env.RESONANCE_FAKES !== "1") {
    return new Response("Not found", { status: 404 });
  }

  const email = new URL(request.url).searchParams.get("email");
  if (!email) {
    return Response.json({ error: "email query param required" }, { status: 400 });
  }

  return Response.json({ otp: peekLoginCode(email) ?? null });
}

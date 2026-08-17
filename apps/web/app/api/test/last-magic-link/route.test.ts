import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type * as EHarness from "../../../../lib/e2e-harness";
import type * as RouteMod from "./route";

/**
 * The magic-link read-back chain, end to end in one process: `harnessMailOverride()` builds the
 * REAL `@resonance/auth` fake and observes it, the auth transport writes a link through the port
 * (what Better Auth's send hook does), and the route handler — a DIFFERENT module scope — reads it
 * back over HTTP semantics. Nothing in the seam is mocked, so this exercises the `globalThis`
 * pinning the whole design rests on: a plain module-level buffer would leave the route polling a
 * buffer nothing wrote to, and the link channel would be undrivable.
 *
 * The gate matters as much as the read-back: outside the harness the route must 404 and expose
 * nothing, even when a link HAS been captured (ADR-0018 §4). Playwright always runs with the
 * harness on, so that refusal is only ever exercised here.
 *
 * `@resonance/ai` is mocked only because `e2e-harness` imports `resolveEmbedder` at module scope;
 * no test here touches the embedder.
 */
vi.mock("@resonance/ai", () => ({ resolveEmbedder: vi.fn() }));

// The harness singleton is pinned to globalThis so it survives Next.js module scopes; clear it
// per case so each case builds (and observes) its own fake.
const HARNESS_MAIL_KEY = "__resonance_web_harness_mail__";
function clearHarnessMail() {
  delete (globalThis as Record<string, unknown>)[HARNESS_MAIL_KEY];
}

/**
 * `E2E_HARNESS` is read once at module scope, so the two states need two module registries. The
 * route and the harness are imported inside the SAME registry so the route's gate reflects the
 * state under test; a fresh registry also gives the route a fresh `@resonance/auth` instance,
 * which is exactly the cross-scope shape the seam exists to survive.
 */
let onRoute: typeof RouteMod;
let onHarness: typeof EHarness;
let offRoute: typeof RouteMod;

beforeAll(async () => {
  vi.stubEnv("E2E_HARNESS", "1");
  vi.resetModules();
  onHarness = await import("../../../../lib/e2e-harness");
  onRoute = await import("./route");

  vi.stubEnv("E2E_HARNESS", "0");
  vi.resetModules();
  offRoute = await import("./route");

  vi.unstubAllEnvs();
}, 30000);

beforeEach(clearHarnessMail);
afterEach(clearHarnessMail);

function get(route: typeof RouteMod, query: string): Response {
  return route.GET(new Request(`http://localhost:3000/api/test/last-magic-link${query}`));
}

describe("GET /api/test/last-magic-link — the seam that makes the link channel drivable", () => {
  it("round-trips the link the auth transport sent, across module scopes", async () => {
    const port = await onHarness.harnessMailOverride();
    expect(port).toBeDefined();
    await port?.sendMagicLink({
      email: "who@example.com",
      url: "http://localhost:3000/api/auth/magic-link/verify?token=t1&callbackURL=%2Finterests%3Fintent%3Dshare",
      token: "t1",
    });

    const res = get(onRoute, "?email=who%40example.com");
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      url: "http://localhost:3000/api/auth/magic-link/verify?token=t1&callbackURL=%2Finterests%3Fintent%3Dshare",
    });
  });

  it("answers null (not an error) for an address nothing was sent to, so a spec can poll", async () => {
    const port = await onHarness.harnessMailOverride();
    await port?.sendMagicLink({ email: "who@example.com", url: "/link", token: "t" });

    const res = get(onRoute, "?email=nobody%40example.com");
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ url: null });
  });

  it("rejects a request with no email param at the boundary", async () => {
    const res = get(onRoute, "");
    expect(res.status).toBe(400);
  });

  it("404s outside the harness even when a link HAS been captured", async () => {
    // Capture a link first: the refusal must hold not because there is nothing to leak, but
    // because the gate never reads at all.
    const port = await onHarness.harnessMailOverride();
    await port?.sendMagicLink({ email: "who@example.com", url: "/link", token: "t" });

    const res = get(offRoute, "?email=who%40example.com");
    expect(res.status).toBe(404);
    await expect(res.text()).resolves.not.toContain("/link");
  });
});

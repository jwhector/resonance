import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type * as EHarness from "./e2e-harness";

/**
 * `harnessMailOverride` must build its fake mail transport exactly once per process even when
 * several auth requests arrive at the same time on a cold server (seed resonance-86dd).
 *
 * This matters because the fake is really two coupled things: the transport the auth instance
 * sends through, and the buffers `observeMail` registers for the `/api/test/last-otp` and
 * `/api/test/last-magic-link` read-backs. Building two fakes lets those two roles land on
 * *different* objects — one wins the transport slot, the other wins the observation slot — and the
 * read-backs then poll buffers nothing ever writes to. The signup form fires two auth calls in
 * parallel, so this is the real request shape, not a hypothetical.
 *
 * `@resonance/ai` is mocked only because `e2e-harness` imports `resolveEmbedder` at module scope;
 * no test here exercises the embedder.
 */
const createFakeMail = vi.fn();
const observeMail = vi.fn();

vi.mock("@resonance/ai", () => ({ resolveEmbedder: vi.fn() }));
vi.mock("@resonance/auth/testing", () => ({
  createFakeMail: () => createFakeMail(),
  observeMail: (fake: unknown) => observeMail(fake),
}));

// The singleton is pinned to globalThis so it survives Next.js module scopes; clear it per case.
const HARNESS_MAIL_KEY = "__resonance_web_harness_mail__";
function clearHarnessMail() {
  delete (globalThis as Record<string, unknown>)[HARNESS_MAIL_KEY];
}

function fakeMail(id: number) {
  return { port: { id, sendMagicLink: vi.fn(), sendLoginCode: vi.fn() }, sent: [], codes: [] };
}

/**
 * `E2E_HARNESS` is read once at module scope, so the two states need two module instances. They are
 * loaded once here rather than per case: re-resolving the module graph is the slow part of this
 * file, and doing it per case pushed the suite past the default timeout when the whole monorepo's
 * tests run in parallel. Per-case isolation still holds — the only mutable state is the `globalThis`
 * slot, which `beforeEach` clears.
 */
let harnessOn: typeof EHarness;
let harnessOff: typeof EHarness;

// Generous hookTimeout: re-resolving the module graph twice is ~750ms in isolation but can exceed
// the 10s default under parallel test-suite CPU contention in CI.
beforeAll(async () => {
  vi.stubEnv("E2E_HARNESS", "1");
  vi.resetModules();
  harnessOn = await import("./e2e-harness");

  vi.stubEnv("E2E_HARNESS", "0");
  vi.resetModules();
  harnessOff = await import("./e2e-harness");

  vi.unstubAllEnvs();
}, 30000);

beforeEach(() => {
  vi.clearAllMocks();
  clearHarnessMail();
});
afterEach(clearHarnessMail);

describe("harnessMailOverride — one fake per process under concurrency (seed resonance-86dd)", () => {
  it("builds ONE fake when two cold callers race, and both get the observed transport", async () => {
    const fake = fakeMail(1);
    createFakeMail.mockReturnValue(fake);

    // Both calls start before either finishes — the parallel magic-link + OTP send from signup.
    const [first, second] = await Promise.all([
      harnessOn.harnessMailOverride(),
      harnessOn.harnessMailOverride(),
    ]);

    expect(createFakeMail).toHaveBeenCalledTimes(1);
    expect(observeMail).toHaveBeenCalledTimes(1);
    // The transport both callers send through is the same one whose codes feed peekLoginCode.
    expect(first).toBe(fake.port);
    expect(second).toBe(fake.port);
    expect(observeMail).toHaveBeenCalledWith(fake);
  });

  it("reuses the singleton across later sequential calls", async () => {
    const fake = fakeMail(1);
    createFakeMail.mockReturnValue(fake);

    await harnessOn.harnessMailOverride();
    await harnessOn.harnessMailOverride();

    expect(createFakeMail).toHaveBeenCalledTimes(1);
  });

  it("does not cache a failed construction, so a retry can still succeed", async () => {
    createFakeMail.mockImplementationOnce(() => {
      throw new Error("chunk load failed");
    });

    await expect(harnessOn.harnessMailOverride()).rejects.toThrow("chunk load failed");

    const fake = fakeMail(2);
    createFakeMail.mockReturnValue(fake);
    await expect(harnessOn.harnessMailOverride()).resolves.toBe(fake.port);
  });

  it("returns undefined and builds nothing when the harness is inactive", async () => {
    await expect(harnessOff.harnessMailOverride()).resolves.toBeUndefined();
    expect(createFakeMail).not.toHaveBeenCalled();
    expect(observeMail).not.toHaveBeenCalled();
  });
});

// Capture the app.png side of design/manifest by driving the real onboarding flow
// under the E2E fake harness (E2E_HARNESS=1). Reuses the exact roles/labels the
// Playwright E2E asserts on (apps/web/e2e/onboarding-creator.spec.ts) and the
// /api/test/last-otp read-back seam. Re-run anytime to refresh the captures.
//
//   E2E_HARNESS=1 pnpm --dir apps/web dev            # (already running on :3001)
//   node apps/web/scripts/capture-app-manifest.mjs   # writes screens/*/app.png
import { chromium } from "@playwright/test";
import { setTimeout as sleep } from "node:timers/promises";

const BASE = process.env.BASE_URL ?? "http://localhost:3001";
const OUT = "/Users/jared/Documents/Projects/resonance/design/manifest/screens";
const email = `e2e-manifest-${Date.now()}@example.com`;
const SERVER_LOG =
  process.env.SERVER_LOG ??
  "/private/tmp/claude-501/-Users-jared-Documents-Projects-resonance/d86b8016-eb2e-4579-bc3b-3376a015e28d/tasks/b3q01aq3a.output";
const done = [];
const log = (...a) => console.log("[capture]", ...a);

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1512, height: 982 },
  deviceScaleFactor: 2,
});
const page = await context.newPage();
const shot = async (rel, file = "app.png") => {
  const path = `${OUT}/${rel}/${file}`;
  await page.screenshot({ path });
  done.push(`${rel}/${file}`);
  log("saved", path);
};

try {
  // 1) Signup screen (public).
  await page.goto(`${BASE}/signup`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Welcome to Resonance" }).waitFor({ timeout: 30_000 });
  await shot("02-create-account");

  await page.getByLabel("Email").fill(email);
  await page.getByRole("checkbox").click();
  await page.getByRole("button", { name: "Create account" }).click();

  // 2) Verify screen.
  await page.waitForURL(/\/verify/, { timeout: 20_000 });
  await page
    .getByRole("heading", { name: "Check your email to continue" })
    .waitFor({ timeout: 20_000 });
  await shot("03-verify-email");

  // OTP: read straight from the server log where the fake mail prints it. The
  // /api/test/last-otp seam is unreliable under `next dev` — the readback route and the
  // auth mount get separate @resonance/auth/testing module instances, so the peek registry
  // the route reads isn't the one the mount's fake registered into (captured but unreadable).
  const { readFile } = await import("node:fs/promises");
  const esc = email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const otpRe = new RegExp(`login code for ${esc}: (\\d{6})`);
  let otp = "";
  for (let i = 0; i < 50 && !/^\d{6}$/.test(otp); i++) {
    try {
      const m = (await readFile(SERVER_LOG, "utf8")).match(otpRe);
      if (m) otp = m[1];
    } catch {
      /* log not flushed yet */
    }
    if (!/^\d{6}$/.test(otp)) await sleep(500);
  }
  if (!/^\d{6}$/.test(otp)) throw new Error(`no OTP found in server log (${SERVER_LOG})`);
  log("otp", otp);
  for (let i = 0; i < 6; i++) await page.getByLabel(`Digit ${i + 1} of 6`).fill(otp[i]);
  await page.getByRole("button", { name: "Continue" }).click();

  // 3) Interview screen — initial state (matches the Figma opening frame).
  await page.waitForURL(/\/onboarding\/creator/, { timeout: 25_000 });
  await page.getByRole("region", { name: "Weave interview" }).waitFor({ timeout: 25_000 });
  await sleep(1000);
  await shot("04-interview");

  // Populated state — one user turn + the canned assistant reply.
  await page
    .getByRole("textbox", { name: "Talk to Weave" })
    .fill("I hand-throw stoneware mugs and bowls for everyday use.");
  await page.getByRole("button", { name: "Send to Weave" }).click();
  await page
    .getByText("Thanks for sharing — what first drew you to this work?")
    .waitFor({ timeout: 25_000 });
  await sleep(600);
  await shot("04-interview", "app-populated.png");

  // 4) ProfileGen draft panels.
  const gen = page.getByRole("button", { name: "Weave, build my profile" });
  await gen.waitFor({ timeout: 25_000 });
  await gen.click();
  await page.getByRole("heading", { name: "Creator Name" }).waitFor({ timeout: 25_000 });
  await sleep(600);
  await shot("05-profile-draft");

  // 5) Published profile (bonus — no Figma frame captured for it yet).
  await page.getByRole("button", { name: "Good to go" }).click();
  await page.waitForURL(/\/creator\/[0-9a-f-]{36}/, { timeout: 30_000 });
  await page.getByText("Profile published").waitFor({ timeout: 20_000 });
  await sleep(600);
  await shot("05-profile-draft", "app-published.png");
} catch (e) {
  log("ERROR:", e.message);
} finally {
  log("captured:", done.length ? done.join(", ") : "(none)");
  await browser.close();
}

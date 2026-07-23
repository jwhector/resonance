// Capture the app.png side of design/manifest for the whole Creator Interview→ProfileGen
// slice by driving the real onboarding flow under the E2E fake harness (E2E_HARNESS=1). For a
// single route, prefer the general `capture-route.mjs`; this script adds the slice-specific
// interactions (send a turn, generate, commit) that a static route capture can't. ADR-0019.
//
//   E2E_HARNESS=1 pnpm --dir apps/web dev            # (already running on :3001)
//   node apps/web/scripts/capture-app-manifest.mjs   # writes screens/*/app.png
import { chromium } from "@playwright/test";
import { setTimeout as sleep } from "node:timers/promises";
import { authenticate } from "./lib/harness-session.mjs";

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
  // 1–2) Sign in through the harness, capturing the public signup + verify screens en route.
  await authenticate(page, {
    baseUrl: BASE,
    serverLog: SERVER_LOG,
    email,
    onScreen: async (name) => {
      if (name === "signup") await shot("02-create-account");
      if (name === "verify") await shot("03-verify-email");
    },
  });

  // 3) Interview screen — initial state (matches the Figma opening frame).
  await page.goto(`${BASE}/onboarding/creator`, { waitUntil: "networkidle" });
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

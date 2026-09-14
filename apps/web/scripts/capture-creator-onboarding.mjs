// Capture the app.png side of design/manifest for the staged creator onboarding (ADR-0019,
// ADR-0022): screens 14–23 and the Onboarded rail (06). Drives the real passwordless front door
// and every interview stage under the E2E harness, screenshotting each stage at the design
// frames' native 1512×982 so app.png and design.png diff with no rescaling.
//
//   E2E_HARNESS=1 BETTER_AUTH_SECRET=e2e-harness-insecure-secret pnpm --dir apps/web dev
//   node apps/web/scripts/capture-creator-onboarding.mjs
//
// BASE_URL overrides the server (default http://localhost:3000). The throwaway account is deleted
// at the end, including the embeddings no cascade reaches, exactly as the E2E teardown does.

// The page.evaluate callbacks run in the browser, where these globals exist.
/* global document, HTMLElement */

import { chromium } from "@playwright/test";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as sleep } from "node:timers/promises";

const here = dirname(fileURLToPath(import.meta.url));
const webDir = resolve(here, "..");
const repoRoot = resolve(webDir, "../..");
const screensDir = resolve(repoRoot, "design/manifest/screens");

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
// The design frames are exported at SCALE 1, so the capture is 1 CSS px per image px.
const VIEWPORT = { width: 1512, height: 982 };
const email = `e2e-manifest-creator-${Date.now()}@example.com`;

const log = (...args) => console.log("[capture]", ...args);
const saved = [];

/**
 * Delete the throwaway account. Mirrors `deleteUserByEmail` in `e2e/lib/db.ts`; it is restated
 * here because that module is TypeScript and this script runs under plain Node. The Neon driver
 * is resolved from `@resonance/db`, which owns it, and `DATABASE_URL` is read from the web app's
 * gitignored env file without ever being printed.
 */
async function deleteAccount(address) {
  if (!process.env.DATABASE_URL) process.loadEnvFile(resolve(webDir, ".env.local"));
  const require = createRequire(resolve(repoRoot, "packages/db/package.json"));
  const { neon } = require("@neondatabase/serverless");
  const sql = neon(process.env.DATABASE_URL);
  await sql`
    delete from embeddings
    where source_type = 'interest'
      and source_id in (select id from "user" where email = ${address})
  `;
  await sql`
    delete from embeddings
    where source_id in (
      select p.id::text from creator_profiles p join "user" u on u.id = p.user_id
      where u.email = ${address}
    )
  `;
  await sql`delete from "user" where email = ${address}`;
}

const browser = await chromium.launch();
const context = await browser.newContext({
  baseURL: BASE,
  viewport: VIEWPORT,
  deviceScaleFactor: 1,
});
const page = await context.newPage();

const stage = (name) => page.locator(`section[data-stage="${name}"]`);

/** Wait until a stage is rendered and settled (no transition in flight). */
async function reach(name) {
  await stage(name).waitFor({ state: "visible", timeout: 30_000 });
  await page.locator(`section[data-stage="${name}"]:not([aria-busy])`).waitFor({ timeout: 30_000 });
}

/** Screenshot the settled viewport into a screen's directory. */
async function shot(screen) {
  // No hover or focus ring the design does not draw.
  await page.mouse.move(VIEWPORT.width - 1, VIEWPORT.height - 1);
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  });
  await page.evaluate(() => document.fonts.ready);
  await sleep(500);
  const path = resolve(screensDir, screen, "app.png");
  await page.screenshot({ path });
  saved.push(screen);
  log("saved", screen);
}

async function answerInComposer(current, text) {
  await stage(current).getByRole("textbox", { name: "Talk to Weave" }).fill(text);
  await page.getByRole("button", { name: "Yes I’m ready" }).click();
}

try {
  // The front door: sign up with the "share" intent, verify by code, skip interests.
  await page.goto("/signup?intent=share");
  await page.getByRole("heading", { name: "Welcome to Resonance" }).waitFor({ timeout: 60_000 });
  await page.getByLabel("Email").fill(email);
  await page.getByRole("checkbox").click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForURL(/\/verify/, { timeout: 60_000 });

  let otp = null;
  for (let i = 0; i < 60 && !otp; i++) {
    const res = await context.request.get(`/api/test/last-otp?email=${encodeURIComponent(email)}`);
    if (res.ok()) otp = (await res.json()).otp ?? null;
    if (!otp) await sleep(500);
  }
  if (!/^\d{6}$/.test(otp ?? "")) throw new Error("no OTP from the harness seam");
  for (let i = 0; i < 6; i++) await page.getByLabel(`Digit ${i + 1} of 6`).fill(otp[i]);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForURL(/\/interests/, { timeout: 60_000 });
  await page.getByRole("heading", { name: /Select \d+ topics/ }).waitFor({ timeout: 30_000 });
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForURL(/\/onboarding\/creator/, { timeout: 60_000 });

  await reach("opening");
  await shot("14-creator-opening");
  await page.getByRole("button", { name: "Yes let’s begin" }).click();

  // The name frame draws the field empty, showing its placeholder.
  await reach("creator_name");
  await shot("15-creator-name");
  await page.getByRole("button", { name: "Skip" }).click();

  // The open-question frames draw the composer empty.
  await reach("offering");
  await shot("16-creator-offering");
  await answerInComposer("offering", "Herbal blends and small dreamwork circles");

  await reach("origin");
  await shot("17-creator-origin");
  await answerInComposer("origin", "My grandmother kept a night garden");

  await reach("intended_experience");
  await shot("18-creator-intended-experience");
  await answerInComposer("intended_experience", "Slower, calmer and more reflective");

  await reach("resonance_moment");
  await shot("19-creator-resonance-moment");
  await page.getByRole("button", { name: "Skip" }).click();

  await reach("resonant_people");
  await shot("20-creator-resonant-people");
  await page.getByRole("button", { name: "Skip" }).click();

  // The expression-style frame draws Dreamy & Reflective selected.
  await reach("expression_style");
  await page.getByRole("radio", { name: "Dreamy & Reflective" }).check();
  await shot("21-creator-expression-style");
  await page.getByRole("button", { name: "Good to go" }).click();

  await reach("summary");
  await shot("22-creator-summary");
  await page.getByRole("button", { name: "Yes I’m ready" }).click();

  // The foundation frame draws the first name candidate selected, scrolled to the top.
  await reach("foundation");
  await shot("23-creator-profile-foundation");
  await page.getByRole("button", { name: "Good to go" }).click();

  await reach("completion");
  await shot("06-onboarded");
} catch (error) {
  log("ERROR:", error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  await browser.close();
  try {
    await deleteAccount(email);
    log("deleted throwaway account");
  } catch (error) {
    // The driver's message can quote the connection; report only its class.
    log("could not delete the throwaway account:", error?.name ?? "Error");
    process.exitCode = 1;
  }
  log("captured:", saved.length ? saved.join(", ") : "(none)");
}

// Capture any app route (authenticated via the E2E harness) to a PNG — the general
// design-manifest capture primitive (ADR-0019). Use it to refresh a single screen's app.png
// during the verify pixel-diff loop, without re-running the whole slice capture.
//
//   E2E_HARNESS=1 pnpm --dir apps/web dev                 # (already running on :3001)
//   SERVER_LOG=<dev-server-log> \
//   node apps/web/scripts/capture-route.mjs /onboarding/creator \
//        design/manifest/screens/04-interview/app.png
//
// If the first authed nav times out, the target route is cold-compiling — warm it
// (`curl -s <route> -o /dev/null`) and re-run.
import { chromium } from "@playwright/test";
import { setTimeout as sleep } from "node:timers/promises";
import { authenticate } from "./lib/harness-session.mjs";

const [route, out] = process.argv.slice(2);
if (!route || !out) {
  console.error("usage: capture-route <route> <out.png>  (route starts with '/')");
  process.exit(1);
}

const BASE = process.env.BASE_URL ?? "http://localhost:3001";
const SERVER_LOG =
  process.env.SERVER_LOG ??
  "/private/tmp/claude-501/-Users-jared-Documents-Projects-resonance/d86b8016-eb2e-4579-bc3b-3376a015e28d/tasks/b3q01aq3a.output";
const email = `e2e-capture-${Date.now()}@example.com`;
const log = (...a) => console.log("[capture-route]", ...a);

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1512, height: 982 },
  deviceScaleFactor: 2,
});
const page = await context.newPage();

try {
  await authenticate(page, { baseUrl: BASE, serverLog: SERVER_LOG, email });
  await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
  await sleep(800); // let client hydration / first paint settle
  await page.screenshot({ path: out });
  log("saved", out);
} catch (e) {
  log("ERROR:", e.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}

# web (apps/web)

The Next.js App Router **shell**: UI composition, routing, and wiring only. It imports
the `@resonance/*` packages and renders them — it holds **no domain logic** (ADR-0002).
Logic that feels like it belongs here almost always belongs in a package, so it stays
extraction-ready.

## Status: three slices live

- **Creator Interview → ProfileGen** (ADR-0013) — the shell wires `ui` ↔ `ai` ↔ `db` behind
  creator auth: passwordless sign-in → Weave interview → ProfileGen draft → commit →
  published profile.
- **Member discovery core** (`pl-bbca`) — `/discover`: session-optional ranked creator search
  over `@resonance/core`'s `DiscoveryPort`, plus follow/unfollow. Creators is the only tab with
  a data source; the other three render designed empty states.
- **Member interests** (`pl-496f`) — `/interests` after email verification, for **every** newly
  verified account (roles are additive, so a creator is also a member). Submission is the form's
  **native `action`**, so the step works with JS disabled; `onSubmit` only marks it in flight.
  Pressing Continue with nothing selected is a **valid empty selection**, which is how "skip"
  works without inventing a control the design does not draw. The step is also where the
  `/start` answer is **spent**: it rides the URL through sign-up and **both** verification
  channels (every intent-carrying URL is built in `(onboarding)/intent-routes.ts`, so the
  channels cannot drift), is persisted via `setOnboardingIntent` against the same member in the
  same submission, and picks the exit — a creator intent (`share`/`business`) continues to
  `/onboarding/creator`; anything else, including no answer or a forged value, lands `/discover`
  with nothing written. On `/discover`, an **empty query
  plus a signed-in viewer** omits `text` so the port ranks on stored interests instead
  (`DiscoveryPort` invariant 8); signed out, it is not asked at all. `idle` therefore now means
  "nothing searched **and** nothing to suggest", still distinct from `no-results`.

Commerce/community routes are still unbuilt; the scaffold home page remains.

## What's here

```
app/
├── (onboarding)/start           intent fork ("What brought you?", IntentPickerCard) → /signup?intent=… or /discover
├── (onboarding)/intent-routes.ts every intent-carrying onboarding URL, built in one place so the
│                                 two verification channels cannot drift apart
├── (onboarding)/signup, verify   passwordless front door (form + Better Auth); both channels carry
│                                 the /start intent through to /interests
├── (onboarding)/interests/       interest selection (TopicPicker) — EVERY newly verified account
│                                 passes through here; stores the /start intent and forks the exit;
│                                 page.tsx · interests-form.tsx · actions.ts
├── (app)/layout.tsx              THE SHARED APP SHELL — the 80px `AppNav` rail, once, for
│                                 every in-app route. Adds no URL segment.
├── (app)/discover/               member discovery: page.tsx (RSC, URL state) ·
│                                 discover-client.tsx · actions.ts · contracts.ts
├── (app)/onboarding/creator/     Weave interview client + ProfileGen Server Actions
│                                 (page.tsx · interview-client.tsx · actions.ts)
├── (app)/creator/[id]/           published creator profile (name, headline, bio, offerings, tags)
├── api/onboarding/interview/     streaming interview route (live model, ADR-0009)
├── api/auth/[...all]/            Better Auth mount (via lib/auth.ts getWebAuth)
├── api/test/last-otp/            E2E-ONLY OTP read-back — gated on E2E_HARNESS
├── api/test/last-magic-link/     E2E-ONLY magic-link read-back — same gate, other channel
└── layout.tsx · page.tsx · globals.css
lib/
├── auth.ts            getWebAuth() (the one instance the mount serves) + getWebSession() — all
│                      apps/web session reads route through it, so ONE instance runs per process
├── e2e-harness.ts     the SINGLE, production-guarded E2E fake-selection seam (ADR-0018)
├── auth-client.ts · interview-messages.ts
e2e/
├── onboarding-creator.spec.ts    full-flow Playwright (runs under E2E_HARNESS)
├── discovery.spec.ts             member discovery front door + follow/unfollow (E2E_HARNESS)
├── interests.spec.ts             pick topics → interest-ranked /discover, and the skip path
├── home.spec.ts                  scaffold smoke test
└── lib/                          signup.ts — the shared passwordless front door, driven to
                                  /interests · db.ts — fixture DB plumbing · discovery-fixtures.ts
                                  — ready/draft creator profiles · interest-fixtures.ts — the
                                  creator seeded to match a member's interest text exactly
```

Fixture cleanup lives in `afterEach`, never a `finally` inside a test: Playwright aborts the test
body on a timeout, so a `finally` there silently leaks rows into the shared dev database — the
cause behind seed `resonance-1236`.

Depends on every `@resonance/*` package plus `next`, `react`, `@tanstack/react-query`,
and `zod`.

## Testing (ADR-0018)

- The shell consumes the `@resonance/*` **live-by-default** seams; there is **no
  `RESONANCE_FAKES` branch** in shipped code. Unit/RTL tests inject fakes via DI (mocking the
  `@resonance/ai` entrypoint, passing `ctx.embedder`), never an env flag.
- The full-flow Playwright E2E stays deterministic through ONE isolated seam —
  [`lib/e2e-harness.ts`](lib/e2e-harness.ts) (`E2E_HARNESS=1`, hard-guarded off in production) —
  which injects the test-only fakes (`@resonance/ai/testing`, `@resonance/auth/testing`) at the
  composition roots (interview stream, `generateDraft`, `commitProfile`, and the auth mount). It
  is **not** a general fakes flag threaded through the packages (ADR-0018 §4). The harness fake mail
  is a `globalThis` singleton and registers its OTP buffer for read-back with an **explicit**
  `observeLoginCodes(fake)` call (never a construction side-effect), so building a fake — or a
  session read via `getWebSession` — can't clobber the `/api/test/last-otp` read-back (seed
  resonance-5d4e). The slot holds the **in-flight promise**, not the resolved port, so the parallel
  auth requests the signup form fires share one construction instead of each building a fake on a
  cold server (seed resonance-86dd). Session reads go through `getWebSession` → `getWebAuth`, so the mount and the
  reads share ONE Better Auth instance per process (seed resonance-eb15).
- Live wiring is proven by the credential-gated **`verify:live`** smoke gate (`pnpm verify:live`,
  ADR-0018 §3): one real model call + embedding + email + DB write. It **skips** (exit 0) with no
  credentials, so the fast inner loop stays free and deterministic.

## Rules

- **Thin shell (ADR-0002).** Compose and render; never put domain rules here. If you
  reach for business logic, move it into the relevant package and import it.
- **Import from package public entrypoints only** (`@resonance/x`), never their `src/`
  internals — the boundary is enforced by lint.
- **Validate every boundary with Zod** — Server Action inputs, route handler payloads,
  external webhooks. Types are not validation (golden rule 3).
- **Secrets + AI orchestration stay server-side** — RSC, Server Actions, route handlers
  only. Never ship a provider key or run an agent on the client (golden rule 4).
- **RSC + Server Actions by default; TanStack Query only where interactive** (ADR-0008).
- New behavior ships with tests — RTL for components, Playwright for flows (ADR-0011).
- **Viewer identity comes from the session, never from the payload.** Server Actions that act
  for a user resolve them with `getWebSession` and keep them out of the Zod-parsed input — see
  `(app)/discover/actions.ts`, where `DiscoveryPort.searchCreators(query, viewer)` takes them as
  separate parameters so there is no identity field on the query to spoof.
- **A new in-app route goes under `app/(app)/`**, so it inherits the shared `AppNav` shell
  rather than re-composing it. Screens with their own full-page chrome (the `(onboarding)`
  group) stay outside. Any route that reads a live DB sets `force-dynamic` and calls
  `createDb()` lazily inside the handler.

## Working here (seeds + mulch)

Work in the web shell is tracked by a `web`-labelled seed — `sd ready` / `sd search web` to find it, then `sd update <id> --status in_progress` to claim it. Before closing, record any non-obvious learning to the **`web`** mulch domain: `ml record web --type <convention|pattern|failure|decision> --description "..." --evidence-seeds <id>`. Full loop: root CLAUDE.md → _Agentic workflow_ (ADR-0016).

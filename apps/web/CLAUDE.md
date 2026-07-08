# web (apps/web)

The Next.js App Router **shell**: UI composition, routing, and wiring only. It imports
the `@resonance/*` packages and renders them — it holds **no domain logic** (ADR-0002).
Logic that feels like it belongs here almost always belongs in a package, so it stays
extraction-ready.

## Status: reference slice live

The **Creator Interview → ProfileGen** slice (ADR-0013) is built — the shell wires
`ui` ↔ `ai` ↔ `db` behind creator auth: passwordless sign-in → Weave interview → ProfileGen
draft → commit → published profile. Commerce/community routes are still unbuilt; the scaffold
home page remains.

## What's here

```
app/
├── (onboarding)/signup, verify   passwordless front door (form + Better Auth)
├── onboarding/creator/           Weave interview client + ProfileGen Server Actions
│                                 (page.tsx · interview-client.tsx · actions.ts)
├── creator/[id]/                 published creator profile
├── api/onboarding/interview/     streaming interview route (live model, ADR-0009)
├── api/auth/[...all]/            Better Auth mount (via lib/auth.ts getWebAuth)
├── api/test/last-otp/            E2E-ONLY OTP read-back — gated on E2E_HARNESS
└── layout.tsx · page.tsx · globals.css
lib/
├── auth.ts            getWebAuth() — live getAuth(), or DI-injected fake mail under E2E_HARNESS
├── e2e-harness.ts     the SINGLE, production-guarded E2E fake-selection seam (ADR-0018)
├── auth-client.ts · interview-messages.ts
e2e/
├── onboarding-creator.spec.ts    full-flow Playwright (runs under E2E_HARNESS)
└── home.spec.ts                  scaffold smoke test
```

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
  is **not** a general fakes flag threaded through the packages (ADR-0018 §4).
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

## Working here (seeds + mulch)

Work in the web shell is tracked by a `web`-labelled seed — `sd ready` / `sd search web` to find it, then `sd update <id> --status in_progress` to claim it. Before closing, record any non-obvious learning to the **`web`** mulch domain: `ml record web --type <convention|pattern|failure|decision> --description "..." --evidence-seeds <id>`. Full loop: root CLAUDE.md → _Agentic workflow_ (ADR-0016).

---
name: module-design
description: Deep-module design vocabulary and principles for Resonance. Load whenever code is being designed or restructured — designing a package's public interface, a port/adapter, a query helper, a UI component's props, or deciding where a seam goes. Use the exact terms (module / interface / implementation / depth / seam / adapter / leverage / locality). Enforces small interfaces over deep implementations, the deletion test, interface-as-test-surface, and design-for-testability (accept deps, return results, small surface).
---

# Codebase Design — deep modules

Design deep modules: a lot of behaviour behind a small interface, placed at a clean
seam, testable through that interface. Use this language and these principles wherever
code is being designed or restructured. The aim is leverage for callers, locality for
maintainers, and testability for everyone.

## Glossary

Use these terms exactly — don't substitute "component," "service," "API," or "boundary."
Consistent language is the whole point.

- **Module** — anything with an interface and an implementation. Deliberately
  scale-agnostic: a function, class, package, or tier-spanning slice. Avoid: unit,
  component, service.
- **Interface** — everything a caller must know to use the module correctly: the type
  signature, but also invariants, ordering constraints, error modes, required
  configuration, and performance characteristics. Avoid: API, signature (too narrow —
  they refer only to the type-level surface).
- **Implementation** — what's inside a module, its body of code. Distinct from Adapter: a
  thing can be a small adapter with a large implementation (a Postgres repo) or a large
  adapter with a small implementation (an in-memory fake). Reach for "adapter" when the
  seam is the topic; "implementation" otherwise.
- **Depth** — leverage at the interface: the amount of behaviour a caller (or test) can
  exercise per unit of interface they have to learn. A module is deep when a large amount
  of behaviour sits behind a small interface, shallow when the interface is nearly as
  complex as the implementation.
- **Seam** (Michael Feathers) — a place where you can alter behaviour without editing in
  that place; the location at which a module's interface lives. Where to put the seam is
  its own design decision, distinct from what goes behind it. Avoid: boundary (overloaded
  with DDD's bounded context).
- **Adapter** — a concrete thing that satisfies an interface at a seam. Describes role
  (what slot it fills), not substance (what's inside).
- **Leverage** — what callers get from depth: more capability per unit of interface they
  learn. One implementation pays back across N call sites and M tests.
- **Locality** — what maintainers get from depth: change, bugs, knowledge, and
  verification concentrate in one place rather than spreading across callers. Fix once,
  fixed everywhere.

## Deep vs shallow

Deep module = **small interface + lots of implementation**. Shallow module = large
interface + little implementation (avoid — it's a pass-through that just adds surface).

When designing an interface, ask:

- Can I reduce the number of methods?
- Can I simplify the parameters?
- Can I hide more complexity inside?

## Principles

- **Depth is a property of the interface, not the implementation.** A deep module can be
  internally composed of small, mockable, swappable parts — they just aren't part of the
  interface. A module can have internal seams (private to its implementation, used by its
  own tests) as well as the external seam at its interface.
- **The deletion test.** Imagine deleting the module. If complexity vanishes, it was a
  pass-through. If complexity reappears across N callers, it was earning its keep.
- **The interface is the test surface.** Callers and tests cross the same seam. If you
  want to test past the interface, the module is probably the wrong shape.
- **One adapter means a hypothetical seam. Two adapters means a real one.** Don't
  introduce a seam unless something actually varies across it.

## Designing for testability

- **Accept dependencies, don't create them.** `processOrder(order, paymentGateway)`, not
  `processOrder(order)` that news up a `StripeGateway` inside.
- **Return results, don't produce side effects.** `calculateDiscount(cart): Discount`,
  not `applyDiscount(cart): void` that mutates `cart.total`.
- **Small surface area.** Fewer methods = fewer tests needed. Fewer params = simpler test
  setup.

## Relationships

- A **Module** has exactly one **Interface** (the surface it presents to callers and tests).
- **Depth** is a property of a Module, measured against its Interface.
- A **Seam** is where a Module's Interface lives.
- An **Adapter** sits at a Seam and satisfies the Interface.
- Depth produces **Leverage** for callers and **Locality** for maintainers.

---

## How this maps to Resonance _(ratified in [ADR-0017](../../../docs/adr/0017-design-deep-modules.md))_

- A `@resonance/*` **package is a Module**; its `src/index.ts` public entrypoint is its
  **Seam/Interface**; "import only from the public entrypoint" (ADR-0003) is "don't reach
  past the seam."
- A **port** (`MailPort`, `StoragePort`, `PaymentsPort`) is an **Interface at a Seam**;
  the stub/fake and the real client are its two **Adapters** (so these are _real_ seams,
  not hypothetical — the test fake is the second adapter, and the variance is known/imminent;
  see the model-ahead-ports resolution in ADR-0017).
- `@resonance/db` is a **deep module**: small interface (a few query helpers) over a large
  implementation (Drizzle + pgvector + Neon/PGlite duality). `Db`-as-first-arg is a seam
  for testability — tests exercise it through the same interface.
- "boundary" in Resonance means the **package/context** boundary (ADR-0003); "seam" is the
  finer-grained location of an interface. A package boundary _is_ one kind of seam.

See [module-design-integration-handoff.md](../../../docs/module-design-integration-handoff.md)
for how this tenet is being woven into every workflow juncture.

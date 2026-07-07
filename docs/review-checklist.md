# Resonance review checklist

Repo-owned review dimensions the gates point at. The gates themselves —
**no-mistakes** and **`/code-review`** — are external plugin skills, not editable in
this repo; they cite dimensions defined here. This file is the home of the
**module-depth** dimension so it can evolve with the codebase instead of drifting inside
a plugin.

## Module depth

Is each module (a `@resonance/*` package, a port, a query helper, a component's props)
**deep** — a lot of behaviour behind a small interface, at a clean seam, testable through
that interface? The _why_ is ratified in [ADR-0017](adr/0017-design-deep-modules.md); the
operative rule (vocabulary, deletion test, testability rules) lives in
[conventions.md § Module design — deep modules](conventions.md#module-design--deep-modules).
Use the exact vocabulary in review comments so findings stay searchable.

Flag these five smells. Each row: what it looks like, and what "good" is instead.

| Smell                                  | How to spot it                                                                                                                                                    | What good looks like                                                                                                                                                                    |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Shallow module**                     | Interface ≈ implementation — a pass-through that renames or forwards and adds only surface. Run the **deletion test**: would deleting it collapse any complexity? | Small interface over a large implementation. Deleting it would scatter complexity across N callers — so it earns its keep.                                                              |
| **Leaky interface**                    | A caller reaches _past_ the seam — imports a package's internals instead of its `src/index.ts`, or leans on an undocumented invariant.                            | Callers touch only the public entrypoint; every invariant they depend on is stated in the interface. "Don't reach past the seam" = ADR-0003's "import only from the public entrypoint." |
| **Test-past-the-interface**            | A test bypasses the public surface to poke internals (imports an internal module, asserts on private state).                                                      | The interface **is** the test surface — tests cross the same seam callers do. Wanting to reach around signals the module is the wrong shape; fix the shape, don't reach around it.      |
| **Dependencies created, not accepted** | The module news up its own client inside (`new StripeGateway()`, a bare `createDb()` with no injection point) — so a test can't substitute a fake.                | Dependencies are accepted as parameters — `createAuth({ db, mail })`, `Db`-as-first-arg — so callers and tests pass what they need.                                                     |
| **Side effects instead of results**    | Returns `void` and mutates its input or external state, leaving nothing to assert on.                                                                             | Returns a result the caller/test can inspect — `calculateDiscount(cart): Discount`, not `applyDiscount(cart): void` that mutates `cart.total`.                                          |

**Using this in review.** Name the smell using its term above, point at the line, and
say which "good" shape applies. A finding here is a design finding, not a nit — a shallow
or leaky module is worth reshaping before it sets. When in doubt about the rule behind a
smell, follow the links to conventions.md and ADR-0017.

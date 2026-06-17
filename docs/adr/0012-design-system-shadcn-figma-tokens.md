# ADR-0012: shadcn primitives (owned) + Figma tokens

- **Status:** Accepted
- **Date:** 2026-06-16

## Context

The Figma design has a strong bespoke identity (vivid purple/indigo brand, custom
`Post` cards, the `Weave` rail). We need full visual control and accessibility
without reinventing low-level primitives (menus, dialogs, comboboxes).

## Decision

In `@resonance/ui`:

1. Use **shadcn/ui** to scaffold accessible Radix + Tailwind primitives that are
   **copied into the repo and fully owned**.
2. **Restyle them entirely with design tokens generated from the Figma variables**
   (CSS variables + a Tailwind preset). This is not a "generic shadcn look" — the
   tokens make it Resonance.
3. Build **bespoke composite components** (Post card, Weave rail, etc.) on top.

Tokens are the single source of truth for color/type/spacing/radii/shadow; components
reference tokens, never hard-coded values.

## Consequences

- Accessible primitives for free, fully customizable, owned in-repo.
- A documented, copyable component pattern (the `add-ui-component-from-figma` recipe).
- Token fidelity depends on Figma extraction. The Professional-plan Figma quota
  limited deep variable reads during scaffolding, so some tokens are sensible
  defaults aligned to the extracted brand palette (primary `#A855F7`). **Refine
  tokens against Figma variables when quota allows** — see `packages/ui/CLAUDE.md`.

## Alternatives considered

- **Hand-built on Radix (no shadcn CLI):** more boilerplate for the same result.
- **Fully bespoke (no Radix):** re-implements focus/ARIA/keyboard — large a11y risk.

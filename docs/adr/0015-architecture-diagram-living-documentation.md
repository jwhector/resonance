# ADR-0015: Architecture diagram as living documentation

- **Status:** Accepted
- **Date:** 2026-06-17

## Context

The agentic context model (ADR-0014) gives agents textual context: CLAUDE.md, ADRs,
conventions, recipes. But a system's _shape_ — its tiers, components, dependencies,
and data flows — is grasped far faster from a diagram than from prose, by humans and
vision-capable agents alike. A diagram that drifts from reality is worse than none,
so it must be maintained with the same discipline as the rest of the documentation.

## Decision

Maintain a **single architecture diagram** in `docs/architecture/` as a first-class
source of documentation truth, alongside the ADRs.

- **Source of truth:** `resonance-architecture.drawio` (draw.io XML — diff-friendly,
  editable). Generated `.svg` (for Markdown embedding) and editable `.drawio.png`
  (for sharing) are committed alongside but never hand-edited.
- **Scope:** the full picture — runtime tiers (Clients → `apps/web` → `packages/*` →
  External services) **and** the Agentic Engineering Layer — so the diagram doubles
  as a visual index of the ADR set. Stubbed/deferred components are visually marked.
- **Update protocol (load-bearing):** an architectural change updates the diagram **in
  the same PR**, exactly like updating an ADR. Triggers and commands are documented in
  `docs/architecture/README.md`; the `update-architecture-diagram` recipe automates
  validate → regenerate. Enforced by the convention + code review for now; a CI job
  that regenerates and diffs the outputs is a deliberate **future enhancement** (it
  needs the draw.io desktop CLI / Electron in CI, which is heavy — not worth it yet).

## Consequences

- New contributors and agents get the system's shape at a glance, cross-linked to ADRs.
- Maintenance cost: the diagram is now part of the definition of "done" for
  architectural changes. Accepted — a stale diagram is a liability, so we enforce sync.
- Tooling dependency: regeneration needs the draw.io desktop CLI (via the `drawio`
  skill). The `.drawio`/`.svg`/`.png` remain viewable without it; only regeneration
  needs it.

## Alternatives considered

- **Mermaid (diagram-as-code in Markdown):** great for git/diffs and renders inline,
  but weaker for rich, styled, multi-tier architecture diagrams with swimlanes and
  branded shapes. Reconsider for small inline flow diagrams within specific docs.
- **No diagram / prose only:** loses the at-a-glance comprehension that's especially
  valuable for onboarding agents.
- **A diagram that's drawn once and left to rot:** explicitly rejected — the update
  protocol is the whole point.

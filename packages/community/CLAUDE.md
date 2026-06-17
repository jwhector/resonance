# @resonance/community

The social layer: posts, the feed, follows, likes & replies, topic selection. The
`Post` is the most-used component in the design, so this domain is central even though
it's built after the first slice.

## Status: STUBBED

Types only (`Post` + Zod schema). The feed/posting flows are a later vertical slice;
the reference slice is Creator Interview → ProfileGen (ADR-0013).

## Rules

- Depends on `@resonance/core`, `@resonance/db`. **Must not** depend on
  `@resonance/commerce` (sibling domain) — coordinate via the app or `core`.
- The interactive feed is where TanStack Query is sanctioned on the client (ADR-0008);
  data loading still defaults to RSC.

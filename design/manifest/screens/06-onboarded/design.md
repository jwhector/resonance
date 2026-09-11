# Onboarded — published creator profile

Trusted-snapshot completion state for creator onboarding. The 1512×982 frame composes the
80px app rail, a 333px open Weave sidebar, and the creator profile beneath it. The profile
uses a Resonance-indigo `#6034ff` hero placeholder and a white About surface.

## Provenance

```
fileKey:         A33kUDiRAatoMDx3L1m2Y4
snapshotDate:    2026-09-10
nodeId:          1443:78273
capturedAt:      2026-09-11T22:41:52Z
capturedVia:     Desktop Bridge plugin — figma_execute + node.exportAsync({PNG, SCALE 1})
designPngSha256: ddd873b62bd886b6869a42f1ec2cc69b66f61e11e25a1755f73bba42d23614d5
figmaVersionId:  UNAVAILABLE
provenance:      snapshot-derived
```

The previous artifact and spec came from a July copy. This re-export proves the node in the
dated snapshot and supersedes that stale copy-derived evidence.

## Profile content

- Hero: **Lumen Herb Lab**, the herbal-healing headline, and four outlined keyword tags.
- Profile actions: Share, Publish, Edit Profile, follower count, and cart.
- Tabs: Offerings, Receivings, Following, and active/underlined About.
- About: two paragraphs grounded in the generated profile, followed by Contact/Add Contact.

The hero’s flat indigo fill represents a future background-image slot; retain it as a
fallback, not as a permanent hard-coded cover.

## Weave completion rail

The open sidebar overlays the left of the profile. It confirms **“Your profile is now live on
Resonance”**, explains that the creator’s story/atmosphere/language informed the result, and
offers:

1. **Create profile image**
2. **Create cover image**
3. **Refine profile**
4. **Finish for now**

These are the trusted-snapshot labels; they replace the older “Create visual asset / Shape
offering / Refine your profile” record. For the first usable onboarding release, only Finish
for now is in scope. Hide or clearly mark the other capabilities unavailable—never make them
no-op. Finish closes the rail and leaves the creator on their committed profile.

The composer is 253×96 near the bottom of the sidebar. Its add and microphone controls are
also future capabilities and must not ship as inert affordances.

## Known design scaffolding

A detached Contact label/add control exists outside the main composition. It is leftover
artboard scaffolding and is not part of this build. The screenshot remains the visual
contract; no parity claim exists until a corresponding `app.png` and explicit delta list are
present.

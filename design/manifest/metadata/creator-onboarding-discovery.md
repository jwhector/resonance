# Creator onboarding discovery — emerging-creator MVP

Read-only discovery of creator onboarding in the trusted dated snapshot, completed after
product approval narrowed the first usable release to the emerging-creator path.

## Provenance and approved boundary

- **fileKey:** `A33kUDiRAatoMDx3L1m2Y4`
- **fileName:** `Resonance 9/10/26`
- **snapshotDate:** `2026-09-10`
- **page:** `MVP` (`1413:46640`)
- **readAt:** `2026-09-11T22:24:17Z`–`2026-09-11T22:41:52Z`
- **capturedVia:** Desktop Bridge plugin — probed status, read-only tree walks, and
  `node.exportAsync({ PNG, SCALE 1 })`
- **provenance:** `snapshot-derived`

The bridge reported the expected file name and key and successfully resolved every id
below. The initial pass stopped because `ProfileGen/Interview` was a mixed naming bucket,
not a second coherent flow. The user then approved this explicit boundary:

- include emerging creators, expression style, first profile foundation, direct editing,
  structured session persistence, and the Onboarded completion state;
- exclude the established-creator row, profile-image and cover-image interviews, Resonance
  Signal/evolution prototypes, full transcript persistence, and field-by-field “Revise with
  Weave” for the first release;
- keep onboarding behind a replaceable behavior-provider seam so a later Weave OS adapter
  can conform without rewriting the UI or persistence contract.

This is a product scope decision, not the final consume/retranscribe/hand-build decision for
the Weave OS corpus. That implementation fork belongs in the build sub-plan.

## Topology and classification

There are 68 `Onboarding/Creator/Interview*` frames: 26 at `y=3352` for an established
creator and 42 at `y=64950` for the emerging-creator path. There are 51 frames named
`ProfileGen/Interview`, but only the three expression-style frames at `y=64950` belong to
this path. The others are profile/cover imagery or Signal/evolution prototypes.

### Emerging path — every ruled-in-row frame

“Variant” means a different rendering moment of the same product state; it is documented
but deliberately not promoted to another manifest screen. “Deferred” means the design is
valid evidence but outside the approved first release.

| Node | Classification | Distinguishing evidence |
| --- | --- | --- |
| `1474:84342` | transition variant | intent handoff: “I have offerings, no business yet” |
| `1473:81547` | **distinct: opening** | emerging framing, 5–10 minutes, begin/later actions |
| `1473:81550` | opening response variant | submitted “Yes Let’s begin” appended to the earlier generic opening |
| `1473:81553` | **distinct: creator/project name** | name input plus Good to go / I’d like help / Skip |
| `1473:81619` | name response variant | input filled “Lumen Herb Lab”; creator says “I’m still exploring” |
| `1473:81556` | **distinct: what to share** | products/services/sessions/experiences prompt |
| `1473:81559` | what-to-share response variant | drafted dreamwork/herbal/session response shown above prompt |
| `1473:81562` | what-to-share submitted variant | answer appended; alternate “what do you currently share” copy |
| `1473:81565` | **distinct: origin** | moment or experience that shaped the work |
| `1473:81580` | origin response variant | filled personal disconnection/herbalism answer |
| `1473:81595` | origin submitted variant | answer appended; next-turn placeholder copy |
| `1473:81568` | **distinct: intended experience** | asks what recipients should experience |
| `1473:81583` | intended-experience response variant | filled calmer/reflective/inner-guidance answer |
| `1473:81598` | intended-experience submitted variant | answer appended; next-turn placeholder copy |
| `1473:81571` | **distinct: resonance moment** | “Yes… this is why I do this” memory/response prompt |
| `1473:81586` | resonance response variant | filled friend/dream-reflection story |
| `1473:81601` | resonance submitted variant | answer appended; next-turn placeholder copy |
| `1473:81574` | **distinct: resonant people** | “Who do you want to connect with?” |
| `1473:81589` | resonant-people response variant | filled people/context answer |
| `1473:81604` | resonant-people submitted variant | answer appended; next-turn placeholder copy |
| `1485:48994` | **distinct: pre-generation summary** | reflective summary plus final optional inclusion |
| `1485:48997` | summary response variant | filled atmosphere/direction answer |
| `1485:49000` | summary submitted variant | answer appended; next-turn placeholder copy |
| `2065:58399` | **distinct: profile foundation** | 3 names, editable headline/About/tags, Good to go / Revise |
| `2065:68958` | deferred refinement target | target-selection baseline |
| `2065:69231` | deferred refinement variant | same text, creator-name selection styling differs |
| `2065:69329` | deferred refinement variant | same text, headline selection styling differs |
| `2065:69427` | deferred refinement variant | same text, About selection styling differs |
| `2065:69528` | deferred refinement variant | same text, keyword selection styling differs |
| `2065:69676` | deferred refinement: name direction | six direction choices |
| `2067:60016` | deferred refinement: name candidates | three explained names plus regenerate |
| `2067:60631` | deferred name-candidate variant | same copy; selection/rendering variant |
| `2065:69924` | deferred refinement: headline direction | six direction choices |
| `2067:60734` | deferred refinement: headline candidates | options A–C plus regenerate |
| `2065:70506` | deferred refinement: About direction | transition says current headline is retained |
| `2065:70661` | deferred About-direction variant | transition says a clearer headline will be explored |
| `2067:60835` | deferred refinement: About candidates | three voice variants plus regenerate |
| `2067:60940` | deferred About-candidate variant | same content; minor whitespace/rendering variant |
| `2065:70771` | deferred refinement: tag direction | long preference-learning transition |
| `2065:70918` | deferred tag-direction variant | shorter transition; same direction controls |
| `2067:61396` | deferred refinement: tag candidates | three keyword sets plus regenerate |
| `2068:61645` | deferred refined foundation | assembled result after target-by-target refinement |

### Expression style and completion

| Node | Classification | Distinguishing evidence |
| --- | --- | --- |
| `1485:48421` | expression-style variant | three fixed styles plus “Not sure — show me options” |
| `1556:79716` | **distinct: expression style** | three styles plus Custom direction; choose-for-me and skip |
| `1485:48584` | expression response variant | Dreamy & Reflective selected/submitted |
| `1443:78273` | **distinct: Onboarded** | live profile plus Weave next-step rail |

The Onboarded frame is 1512×982 in the trusted snapshot. Its Weave actions are **Create
profile image**, **Create cover image**, **Refine profile**, and **Finish for now**. These
replace the stale July-copy labels previously recorded in the manifest. Only Finish for now
is part of this MVP; the other buttons are visible boundaries to later flows and must not
route to dead experiences.

## Captured distinct states

Native 1512×982 captures are in `screens/14-*` through `screens/23-*`; Onboarded was
re-verified in its existing `screens/06-onboarded` slot. Each `design.md` pins the PNG hash.
The response-only and deferred-refinement frames above were not captured because they do not
add a product state to the approved MVP.

## Figma versus active corpus

The active corpus is
`packages/weave-os/corpus/active/emerging_creator_onboarding.yaml` v1.1. Its stage order
matches the broad Figma story, but it is intentionally inert and contains documented source
defects. It is evidence for future conformance, not a safe runtime dependency today.

| Corpus stage | Figma evidence | MVP decision / divergence |
| --- | --- | --- |
| `opening` | `1473:81547` | Aligns on framing/time/begin; Figma has no quick/guided/reflective depth selector. |
| `creator_or_project_name` | `1473:81553`, `1473:81619` | Aligns on provisional name/help/skip. Persist value plus status, not rendered chat. |
| `what_they_want_to_share` | `1473:81556` | Aligns; corpus also models certainty and one conditional follow-up. MVP needs deterministic skip/continue behavior. |
| `origin` | `1473:81565` | Aligns and optional. Figma does not expose corpus’s softer alternative. |
| `intended_experience` | `1473:81568` | Aligns; corpus guardrails distinguish intention from guaranteed outcome. |
| `resonance_moment` | `1473:81571` | Aligns and optional; corpus adds source weighting. |
| `resonant_people` | `1473:81574` | Aligns; avoid target-market language per corpus. |
| `expression_style` | `1556:79716` | Figma uses 3 fixed options + custom/choose/skip; corpus expects 5 adaptive options, up to 2 combined, creator-defined/recommended/skip. Ship the Figma control contract first and keep provider output typed. |
| `foundation_generation` | `2065:58399` | Public fields align. Figma shows three name candidates but one headline/About set and 4 tags; corpus asks three headline/About candidates, 5–10 tags, supporting summaries, foundability feedback, regenerate, and save-later. MVP uses the Figma foundation plus direct editing and structured resume. |
| `collaborative_refinement` | `2065:68958`–`2068:61645` | Rich Figma and corpus support exists, but explicitly deferred. `Revise with Weave` must be hidden/disabled with honest copy, not wired to a partial flow. |
| `completion` | `1443:78273` | Aligns exactly on four next actions. MVP implements Finish for now; image/cover/refine remain later capability boundaries. |

Minimum generation inputs should follow the corpus: offering expression and intended
experience are required; origin, resonance moment, resonant people, and expression style
improve output but do not block it; creator name is optional.

## Current implementation coverage

The current `/onboarding/creator` route is a free-form `useChat` transcript with a manual
“Weave, build my profile” action. It keeps transcript and draft state in the browser, calls
ProfileGen once, renders controlled draft panels, commits the selected name/headline/bio/tags,
and redirects to the creator profile.

It does **not** implement a stage machine, named slots, deterministic transitions, option
controls, structured persistence/resume, explicit skip semantics, generation eligibility,
an Onboarded completion rail, or capability-aware next actions. Full transcripts are not
persisted today. Existing `CreatorProfileDraft` and commit contracts cover the final public
fields and are useful, but do not represent the interview session.

## Product inputs resolved and remaining build constraints

Resolved by the approved boundary:

- The first release is emerging-creator only.
- Structured stage/slot/draft state resumes across sessions; full chat transcripts do not.
- Direct field editing is in; field-by-field Weave refinement is out.
- Onboarded is in; profile image, cover image, established-creator, and Signal/evolution are out.
- The runtime is product-owned behind a versioned behavior interface; the request path must
  not depend on corpus parsing, self-improvement, or the Evolution Engine.

Build-plan constraints that follow from the designs:

- Do not ship dead `+`, microphone, image, cover, or refinement affordances. Hide them or
  render an explicit unavailable state until their capabilities exist.
- Treat “I want to do it later,” Skip, and Finish for now as real resumable transitions.
- Persist structured answers, statuses, selections, draft edits, current stage, flow version,
  and completion status. Do not persist assistant/user prose as a transcript.
- Pin each session to a behavior version. A later Weave OS adapter must be able to read old
  sessions or migrate them explicitly; silent reinterpretation is not acceptable.
- Keep generation behind a typed provider request/result contract and validate all generated
  profile fields before persistence.
- On completion, show the actual committed creator profile and a usable Finish action. Later
  capability buttons should be absent or honestly unavailable, never no-op.

## Weave OS architecture relevance

The snapshot’s `Weave OS Architecture` page (`2580:57143`) separates data, root, Weave OS,
Evolution Engine, runtime, interview flows, shared modules, model provider, and persistence /
confirmation gating. `Interview Stage Rendering` (`3035:14176`) separates `StageExecutor`,
`StageUpdater`, `DataExtractor`, `StageEvaluator`, `ConversationRuntime`, and frontend
contracts such as `StageState`, `ConversationRequest`, and `RenderPayload`.

That architecture remains a useful target boundary. It does not require building Weave OS to
ship onboarding. The first implementation should own a small stable contract—session state,
stage render model, transition command, generation request/result, and completion result—then
provide the Figma-derived behavior behind it. Step 3 should decide whether the later adapter
consumes, retranscribes, or replaces parts of the current corpus only after the MVP contract
and conformance tests are specified.

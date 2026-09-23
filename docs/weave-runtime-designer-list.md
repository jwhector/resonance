# Weave OS — the designer's list

**What this is.** The blanks in the Weave OS Architecture page and the onboarding flow that block
building creator onboarding and profile generation on your stage runtime, each with a proposed
answer. We built nothing on these answers as settled: every proposed value is marked
**PROVISIONAL** and stays marked in the code and tests until you approve it.

**How to answer.** For each item, mark one: **Approve** (we use the proposal as written),
**Strike** (we leave it blank and you supply the answer later), or **Replace with …** (your
wording wins, verbatim). Partial answers are fine; whatever is still marked PROVISIONAL after your
pass stays visible as such.

**Sources.** Figma file "Resonance 9-21-26", page _Weave OS Architecture_ (`2580:57143`): the
row-1 cards, the DataContract Library (`3029:13977`), Completion (`3317:27846`), SessionStore
(`3163:79858`), DataGate (`3188:17144`) and Database Related (`3212:12294`). The flow is your
_Emerging Creator Onboarding Interview Flow_ v1.1 as transcribed into
`emerging_creator_onboarding.yaml`; screen node ids are from the _Resonance 9/10/26_ file. The
defect ids (D-xx) refer to `packages/weave-os/DEFECTS.md`, the list of open questions from the
July documents. How the runtime is built: ADR-0023.

Where the runtime departs from the page on purpose (one package, per-turn context slice,
Frequency written at completion only, streaming inside chat stages, one runtime for flow and
chat), ADR-0023 § 3 records why; those are not on this list.

---

## 1. Creator-facing labels for every action (D-13)

**What we found.** The flow writes labels only on the `opening` stage; every other action is a
bare id. Your 9/10/26 screens draw buttons for most stages, and those labels were transcribed into
the current product on 2026-09-13. Where a screen exists we propose its label; where the corpus
has an action no screen draws, the label is blank and we ask.

| Stage                     | Action id (flow)             | Screen label found (node)                             | PROVISIONAL label                                      | Note                                                                     |
| ------------------------- | ---------------------------- | ----------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------ |
| `opening`                 | `begin`                      | "Yes let's begin" (`1473:81547`)                      | **Yes let's begin**                                    | The flow says "Yes, I'm ready". The screen wins unless you say otherwise. |
| `opening`                 | `skip`                       | "I want to do it later" (`1473:81547`)                | **I want to do it later**                              | The flow says "Skip for now".                                            |
| `creator_or_project_name` | `continue_with_this_name`    | "Good to go" (`1473:81553`)                           | **Good to go**                                         |                                                                          |
| `creator_or_project_name` | `help_me_explore_later`      | "I'd like help" (`1473:81553`)                        | **I'd like help**                                      | Sets `creator_name_status = wants_support`.                              |
| `creator_or_project_name` | `skip`                       | "Skip" (`1473:81553`)                                 | **Skip**                                               |                                                                          |
| `what_they_want_to_share` | _(submit — no id in flow)_   | "Yes I'm ready" (`1473:81556`)                        | **Yes I'm ready**; no Skip                             | Required for generation, so Skip is not offered.                         |
| `origin`                  | _(submit)_ / `skip`          | "Yes I'm ready" / "Skip" (`1473:81565`)               | **Yes I'm ready** / **Skip**                           |                                                                          |
| `intended_experience`     | _(submit)_                   | "Yes I'm ready" (`1473:81568`)                        | **Yes I'm ready**; no Skip                             | Required for generation.                                                 |
| `resonance_moment`        | _(submit)_ / `skip`          | "Yes I'm ready" / "Skip" (`1473:81571`)               | **Yes I'm ready** / **Skip**                           |                                                                          |
| `resonant_people`         | _(submit)_ / `skip`          | "Yes I'm ready" / "Skip" (`1473:81574`)               | **Yes I'm ready** / **Skip**                           |                                                                          |
| `expression_style`        | `select_one`                 | "Good to go" after a pick (`1556:79716`)              | **Good to go**                                         |                                                                          |
| `expression_style`        | `combine_up_to_two`          | — (screen is single-select)                           | _not offered this slice_                               | Say if the screen should allow two.                                      |
| `expression_style`        | `describe_my_own`            | "Custom direction" option (`1556:79716`)              | **Custom direction** (an option, not a button)         |                                                                          |
| `expression_style`        | `let_weave_recommend`        | "Choose for me" (`1556:79716`)                        | **Choose for me**                                      |                                                                          |
| `expression_style`        | `skip`                       | "Skip" (`1556:79716`)                                 | **Skip**                                               |                                                                          |
| _summary_ (see item 12)   | _(submit)_ / `skip`          | "Yes I'm ready" / "Skip" (`1485:48994`)               | **Yes I'm ready** / **Skip**                           | Not a flow stage.                                                        |
| `foundation_generation`   | `put_on_my_profile`          | "Good to go" (`2065:58399`)                           | **Good to go**                                         |                                                                          |
| `foundation_generation`   | `revise_with_weave`          | "Revise with Weave" (`2065:58399`)                    | _absent this slice_                                    | Refinement is deferred (item 9); the button is not drawn rather than dead. |
| `foundation_generation`   | `edit_directly`              | — (inline editing)                                    | _no button — fields are editable in place_             |                                                                          |
| `foundation_generation`   | `generate_another_direction` | —                                                     | **?**                                                  | No screen. Offer it? With what label?                                    |
| `foundation_generation`   | `save_and_finish_later`      | —                                                     | **?**                                                  | No screen. Offer it? With what label?                                    |
| `completion`              | `create_profile_image`       | "Create profile image" (`1443:78273`)                 | **Create profile image** (shown, "coming soon")        |                                                                          |
| `completion`              | `create_cover_image`         | "Create cover image" (`1443:78273`)                   | **Create cover image** (shown, "coming soon")          |                                                                          |
| `completion`              | `refine_profile`             | "Refine profile" (`1443:78273`)                       | **Refine profile** (shown, "coming soon")              |                                                                          |
| `completion`              | `finish_for_now`             | "Finish for now" (`1443:78273`)                       | **Finish for now**                                     |                                                                          |

**Your call:** Approve / Strike / Replace — per row, or "approve all screen labels" plus answers
for the two `?` rows.

## 2. The six branch targets that have no definition (D-07)

**What we found.** `flow_map.optional_branches` sends the conversation to
`deferred_naming_support`, `softer_question`, `grounded_examples`, `skip_option`, `quick_path` and
`reflective_follow_up`. None is a stage and none is defined anywhere. On the runtime, a branch is
a `stage_decision` the StageEvaluator makes from what the DataExtractor found in the creator's
answer; each target needs to say what Weave does and which stage the conversation returns to.

| Branch (trigger)                                  | Target                    | PROVISIONAL definition                                                                                                                                                                                                                  | Returns to                                        |
| ------------------------------------------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `name_uncertainty`                                | `deferred_naming_support` | Weave acknowledges with the `creator_is_unsure` response, records `creator_name_status = wants_support`, and continues; at `foundation_generation` the three name candidates are generated.                                             | The next stage (`what_they_want_to_share`).       |
| `difficulty_answering`                            | `softer_question`         | Weave re-asks the current stage using its authored `softer_alternative` where one exists (`origin`, `intended_experience`, `resonant_people`), otherwise a gentler paraphrase generated within the stage's `rules` and `avoid` lists.  | The same stage; counts as one follow-up.          |
| `difficulty_answering`                            | `grounded_examples`       | Weave offers two or three concrete examples drawn from the stage's authored `support` copy and, for `expression_style`, its `example_options`.                                                                                          | The same stage; counts as one follow-up.          |
| `difficulty_answering`                            | `skip_option`             | Weave names Skip explicitly ("we can come back to this"). On the two stages generation needs (`what_they_want_to_share`, `intended_experience`) Weave instead invites a one-line answer, because a skip would block generation.        | The next stage on skip.                           |
| `creator_wants_less_depth`                        | `quick_path`              | `depth_mode = quick`: the optional stages (`origin`, `resonance_moment`, `resonant_people`) are skipped unless already answered; no follow-ups anywhere.                                                                                  | The next required stage.                          |
| `creator_wants_more_depth`                        | `reflective_follow_up`    | One extra open follow-up on the current stage ("Is there more you'd like to say about that?"), allowed even when the stage's follow-up maximum is reached.                                                                              | The same stage, then the flow continues.          |
| `creator_dislikes_generated_output`               | `collaborative_refinement` | Defined by the flow; **deferred this slice** (item 9).                                                                                                                                                                                  | —                                                 |

How the triggers are detected (PROVISIONAL): the DataExtractor returns four flags with every
answer — `uncertain`, `difficulty`, `wants_less_depth`, `wants_more_depth` — from the creator's
words ("I'm not sure", "can we go faster", "actually, there's more…"), and the StageEvaluator turns a
flag into the branch. Nothing else reads the flags.

**Your call:** Approve / Strike / Replace — per target.

## 3. A `stage_type` for each of the 11 stages

**What we found.** Your `ConversationContext.stage` carries a `stage_type` but the page gives no
values. The runtime renders every stage with one renderer that switches on the type, so the type
decides what the creator sees: `chat` (Weave's words + a text composer), `options` (Weave's words
+ selectable options), `profile_foundation` (the editable foundation with candidates),
`completion` (the published profile + next steps).

| Stage                      | PROVISIONAL `stage_type` | Why                                                                        |
| -------------------------- | ------------------------ | -------------------------------------------------------------------------- |
| `opening`                  | `options`                | Two actions, no typing.                                                    |
| `creator_or_project_name`  | `chat`                   | A single-line name field plus actions.                                     |
| `what_they_want_to_share`  | `chat`                   |                                                                            |
| `origin`                   | `chat`                   |                                                                            |
| `intended_experience`      | `chat`                   |                                                                            |
| `resonance_moment`         | `chat`                   |                                                                            |
| `resonant_people`          | `chat`                   |                                                                            |
| `expression_style`         | `options`                | Three fixed styles + Custom direction on the screen; five adaptive options in the flow (item 14). |
| `foundation_generation`    | `profile_foundation`     |                                                                            |
| `collaborative_refinement` | —                        | Deferred.                                                                  |
| `completion`               | `completion`             |                                                                            |

Streaming: on for `chat` stages, off for the rest — a per-stage-type switch in the definition you
can flip without code.

**Your call:** Approve / Strike / Replace — per stage. Also: are four types enough, or is there a
type you had in mind that these collapse?

## 4. A follow-up policy and a completion rule per stage

**What we found.** The flow gives `maximum_follow_ups: 1` on `what_they_want_to_share` (when the
answer is "too broad for generation") and a `minimum_information` block for generation. Nothing
says when a stage is _done_. The StageEvaluator needs, per stage: which captures must be filled to
advance, and how many follow-ups it may ask before advancing anyway.

| Stage                     | Must be filled to advance (PROVISIONAL)                          | Max follow-ups (PROVISIONAL) | Follow-up when                                              |
| ------------------------- | ---------------------------------------------------------------- | ---------------------------- | ----------------------------------------------------------- |
| `opening`                 | an action (`begin`)                                              | 0                            | —                                                           |
| `creator_or_project_name` | `creator_name.status` (any value; value may be empty)            | 0                            | —                                                           |
| `what_they_want_to_share` | `offering_expression.raw_response` non-empty                     | 1 (as authored)              | `response_is_too_broad_for_generation` (as authored)        |
| `origin`                  | nothing (optional stage)                                         | 0                            | —                                                           |
| `intended_experience`     | `intended_experience.raw_response` non-empty                     | 1                            | the answer states an outcome rather than a hope (guardrail) |
| `resonance_moment`        | nothing (optional stage)                                         | 0                            | —                                                           |
| `resonant_people`         | nothing                                                          | 0                            | —                                                           |
| `expression_style`        | `expression_style.source` (any of its five values)               | 0                            | —                                                           |
| `foundation_generation`   | the creator accepted (`put_on_my_profile`) after generation ran  | 0                            | —                                                           |
| `completion`              | an action                                                        | 0                            | —                                                           |

Generation itself keeps your `minimum_information` rule: it runs only when
`offering_expression` and `intended_experience` are present; everything else improves the result
without blocking it.

**Your call:** Approve / Strike / Replace — per row.

## 5. The garbled belief in the philosophy (D-02)

**What we found.** Under `expression_philosophy.beliefs`: "Stories carry emotions, clarify emotions
serve creators." It reaches Weave's prompt as written. We did not guess.

**PROVISIONAL restatements, pick one or write yours:**

- (a) "Stories carry emotions; clarifying those emotions serves creators."
- (b) "Stories carry emotion, and clarity about that emotion serves creators."

**Your call:** (a) / (b) / Replace with: ________

## 6. The seven `applied_principles` that do not exist (D-06)

**What we found.** The flow declares seven principle ids — `expression_before_positioning`,
`creator_sovereignty`, `discovery_over_directive`, `low_cognitive_load`,
`reflection_not_interpretation`, `provisional_identity`, `relational_not_marketing_language` — and
the principles document defines seven others: Support Heart, Support Becoming, Support Discovery,
Support Safety, Support Clarity, Support Experiment, Support Intuition. None of the flow's names
resolves; the validator reports all seven on every build, by design.

Three ways to answer: (1) map each flow id to one or more authored principles; (2) add the seven as
new principles; (3) tell us `applied_principles` means something other than principle ids. If (1),
here is our best reading, **PROVISIONAL and not applied anywhere**:

| Flow id                            | Our reading                          | Confidence                          |
| ---------------------------------- | ------------------------------------ | ----------------------------------- |
| `expression_before_positioning`    | Support Heart                        | medium                              |
| `creator_sovereignty`              | Support Becoming                     | medium                              |
| `discovery_over_directive`         | Support Discovery                    | high                                |
| `low_cognitive_load`               | Support Clarity                      | medium                              |
| `reflection_not_interpretation`    | Support Intuition ("hear themselves") | medium                             |
| `provisional_identity`             | Support Experiment                   | medium                              |
| `relational_not_marketing_language` | —                                   | no clear match — yours to place     |

**Your call:** (1) with corrections / (2) / (3).

## 7. Which onboarding captures feed which Frequency dimension

**What we found.** The FrequencyDatabase has ten dimensions: `identity`, `knowing`, `value`,
`intention`, `theme`, `experience`, `practice`, `preference`, `need`, `context`. The Database
Related frame (`3212:12312`) maps some interview captures to some of them. Your mapping is marked
**yours**; the rest is our PROVISIONAL completion so every onboarding capture has a destination or
is deliberately withheld.

| Dimension    | Your gloss                                        | From onboarding (yours)                                | Added (PROVISIONAL)                                                          |
| ------------ | ------------------------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------- |
| `identity`   | How I understand and express myself               | resonance moment, origin                               | creator name (confirmed) — or should the name live only in the Creator Database? |
| `knowing`    | —                                                 | —                                                      | nothing. **This dimension is on the database box but absent from your mapping frame — what is it?** |
| `value`      | What matters to me                                | creator direction, creator vision                      | nothing this slice (neither is collected in emerging onboarding — item 13)  |
| `intention`  | What I want to create, experience, or move toward | natural audiences (resonant people), intended experience | —                                                                          |
| `theme`      | Repeating words, tags                             | profile discovery tags, offering discovery tags        | `creator_language` recurring words and phrases (passively collected)         |
| `experience` | What I have lived through or encountered          | —                                                      | `origin.usable_elements` when the element is `experience` or `challenge`     |
| `practice`   | What I actually do or engage in                   | —                                                      | `offering_expression` (what they create, offer or share)                     |
| `preference` | What feels right to me                            | expression style                                       | —                                                                            |
| `need`       | What I currently need or am looking for           | —                                                      | nothing this slice                                                           |
| `context`    | Current circumstances that affect relevance       | —                                                      | `creator_stage_signal` if it is collected (item 13); otherwise nothing       |

Everything written to Frequency is the classified, confirmed value with a pointer to the stage it
came from; the creator's raw sentences are not stored there (item 8).

**Your call:** Approve / Strike / Replace — per row; and the `knowing` question.

## 8. Decision rules for the DataGate's five questions

**What we found.** The DataGate (`3188:17144`) asks five questions of every candidate before it
persists or records it as a signal, and names a `FrequencyDefinition` that classifies candidates.
No rules are written. These are ours, PROVISIONAL:

1. **Confirmed by creator?** — A capture counts as confirmed when the creator typed or selected it
   and pressed the stage's continue action (not Skip). Generated outputs count only after the
   creator accepted the foundation ("Good to go"), and then only the values they kept or edited.
   Values the DataExtractor inferred (certainty, usable elements, claim strength, the four branch
   flags) are **never** confirmed — they may only become signals.
2. **Correct scope?** — Only facts about the creator and their own work. People named in a story
   (a friend in a resonance moment, a recipient) stay in the session and never persist as Frequency.
3. **Eligible to persist?** — Only fields in the item-7 mapping. What persists is the classified
   value and a stage pointer, never the raw answer text; the raw text is erased with the session.
4. **Permission/policy?** — Completing onboarding is the creator's permission for their confirmed
   context to be kept. A paused or abandoned session persists nothing to Frequency. Nothing beyond
   what the published profile already shows is written to the Creator Database.
5. **Record as signal?** — Everything the gate withholds, plus the interaction signals (time on
   stage, skips, follow-ups, regenerations, abandonment, completion), is recorded to the
   EvaluationMetricsDatabase under one of its ten dimensions. Signals never carry answer text.

Two questions on top: **(a)** your page runs the DataGate on pause as well as on completion; this
slice runs it on completion only (pause is a checkpoint) — confirm, or say pause should persist
too. **(b)** The flow's evaluation signals are grouped `completion`, `friction`, `alignment`,
`pacing`, `output_quality`; the database's dimensions have no `pacing` — is `pacing`
`conversation_efficiency`?

**Your call:** Approve / Strike / Replace — per rule; answers for (a) and (b).

## 9. Completion lands on the profile page; refinement is edit-directly only

**What we found.** Your Completion frame resolves the next experience to `weave_quick_chat`
(`3317:28807`), and the flow's `foundation_generation` offers `revise_with_weave` into
`collaborative_refinement`. Chat and refinement are outside this slice.

**PROVISIONAL:** after "Good to go" the profile is published and the creator lands on the published
profile page with the four next-step actions (item 1) — the "Finish for now" screen (`1443:78273`).
The foundation stage is editable in place with no Revise with Weave; the three name candidates,
three headlines, three Abouts and 5–10 tags are shown as choices the creator picks from and edits.

**Your call:** Confirm both, or say what should happen instead until chat and refinement exist.

## 10. Weave Presence and the Companion Model

**What we found.** `WeavePresenceResolver` "resolves how Weave should be present for the current
creator and interaction" by querying the Weave OS definitions
(`weave_os_definition_query → weave_presence`). The philosophy says "Weave is a creative
companion". We found no authored content anywhere — in the Figma frames we read or in the five
documents — that says what a _presence_ is made of, nor a definition of a "Companion Model".

**PROVISIONAL:** `weave_presence` = the composed philosophy + principles (what the corpus already
produces as Weave's system prompt), identical on every stage and every experience.

**Your call:** Is Weave Presence meant to change what Weave says _during onboarding_ (per stage,
per creator)? Is the Companion Model a thing that exists somewhere we should read? If neither
changes onboarding, approve the default.

## 11. Does the "business" intent on `/start` mean an existing creator?

**What we found.** `/start` records one of three intents: `explore`, `share` ("I have offerings, no
business yet"), `business`. Both creator intents run the same emerging-creator interview today. The
Database Related frame lists an **Existing Creator** interview with its own collected fields, but
no stage definition exists for it anywhere.

**PROVISIONAL:** `business` runs the emerging-creator interview too, and the intent is recorded as
`creator_stage_signal` (a field your Emerging Creator list collects) so a later existing-creator
experience can find those creators.

**Your call:** Confirm, or say that `business` should wait for the existing-creator interview.

## 12. The pre-generation summary screen is not a flow stage

**What we found.** Your screens (`1485:48994`) and the current product have a stage between
`expression_style` and the foundation where Weave reflects what it understood and asks "Is there
anything else you want included?". The flow has no such stage; it goes straight to
`foundation_generation`, whose `transition` copy plays a similar role.

**PROVISIONAL:** add a `summary` stage to the flow definition (`stage_type: chat`, optional,
capturing `additional_context`), between `expression_style` and `foundation_generation`. Until you
do, the runtime renders the foundation's `transition` copy at that moment and offers the same
"anything else?" composer.

**Your call:** Add the stage (we will draft the YAML for your review) / it is not a stage, keep the
transition copy / Replace.

## 13. Fields your lists collect that no stage asks for

**What we found.** The Database Related frame's Emerging Creator list collects `offering_types`,
`creator_stage_signal`, `audience_response` (optional), `creator_direction` (optional),
`creator_vision` (optional), `profile_direction_confirmation`, and passively collects
`creator_language`. No stage in the flow captures any of them.

**PROVISIONAL:** `creator_language` is collected passively by the DataExtractor from every answer
(recurring words and phrases, words for offerings, for the intended experience, materials and
methods, audience language); `creator_stage_signal` comes from the `/start` intent (item 11);
`profile_direction_confirmation` is the "Good to go" on the foundation. The other four are **not
collected** this slice because no stage asks for them.

**Your call:** Approve, or tell us which stage should ask for `offering_types`,
`audience_response`, `creator_direction` and `creator_vision` (and with what words).

## 14. Generation shape: the flow vs. the screens

**What we found.** The flow's `foundation_generation` asks for three headline candidates (50–100
characters, first recommended), three About candidates (≤ 500), five to ten discovery tags, three
name candidates when wanted, plus `foundability_feedback`. The 9/10/26 foundation screen
(`2065:58399`) draws three names, one headline, one About and four tags. The flow wins (the Figma
runtime page is newer than the screens and executes the flow), so the runtime generates what the
flow says.

**PROVISIONAL presentation:** each field shows its recommended candidate, with the other two a
click away; tags show all 5–10 and the creator removes or adds. `expression_style` on the
screen is three fixed styles + Custom direction; the flow generates five adaptive options and
allows combining two — this slice shows the three fixed styles + Custom direction (item 1) and
records the choice in the flow's `expression_style` capture.

**Your call:** Confirm the flow's counts and the presentation, and say whether the five adaptive
expression-style options should replace the three fixed ones.

## 15. Small confirmations from the July defect list that affect this slice

- **D-09** — `creator_name_status` starts at `unknown`, which is not one of its four declared
  values. PROVISIONAL: the initial value is `provisional` until the creator acts.
- **D-10** — session state names `origin_story`; the stage and capture are `origin`. PROVISIONAL:
  `origin` everywhere.
- **D-14** — `recommended_length_characters` on the headline is enforced as a hard bound (50–100).
  PROVISIONAL: hard bound; a 110-character headline fails validation and generation retries once.
- **D-19** — `creator_name_recommendations` is declared but never produced; `creator_name` with
  three candidates is. PROVISIONAL: they are the same output.
- **D-12** — under a capture, a key can mean a sub-field, a type, or an initial value. PROVISIONAL:
  a key is a sub-field; `values` closes its set; `shape` is a free-form note.

**Your call:** Approve / Replace — per line.

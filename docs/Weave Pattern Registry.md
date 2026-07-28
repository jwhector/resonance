

**Weave Pattern Registry**  
---

ile:

  id: weave\_pattern\_registry

  version: 1.1

  status: development

  type: pattern\_registry

purpose: \>

  Capture recurring conversational observations discovered during

  interview design, creator testing, and future production use.

  Patterns remain observations while evidence is collected.

  Validated patterns may later be promoted into interaction principles,

  behavior rules, conversation heuristics, or active interview flows.

registry\_role:

  responsibilities:

    \- preserve observations before they become operating system instructions

    \- collect supporting and contradicting evidence

    \- measure pattern maturity and generalizability

    \- support consistent promotion decisions

    \- preserve the history and rationale behind promoted knowledge

  does\_not:

    \- automatically promote patterns

    \- treat early observations as established truths

    \- replace architectural review or validation

    \- allow frequency alone to determine promotion type

architecture:

  layer: evolution

  recommended\_path:

    \- evolution/weave\_pattern\_registry.yaml

  authority:

    type: observational

    executable: false

    inherited\_by\_runtime: false

  observes:

    \- root/\*

    \- active/\*

  may\_propose\_changes\_to:

    \- root/\*

    \- active/\*

  may\_directly\_modify:

    \- evolution/weave\_pattern\_registry.yaml

    \- evolution/promotion\_proposals/\*

    \- evolution/validation\_results/\*

  requires\_human\_approval\_to\_modify:

    \- root/\*

    \- active/\*

promotion\_destinations:

  interaction\_principle:

    destination:

      file: root/weave\_interaction\_principles.yaml

    promotion\_action:

      \- add\_new\_principle

      \- refine\_existing\_principle

  behavior\_rule:

    destination:

      file: root/weave\_behavior\_rules.yaml

    promotion\_action:

      \- add\_new\_rule

      \- refine\_existing\_rule

      \- split\_pattern\_into\_multiple\_rules

  conversation\_heuristic:

    destination:

      file: root/weave\_conversation\_heuristics.yaml

    promotion\_action:

      \- add\_new\_heuristic

      \- refine\_existing\_heuristic

      \- merge\_with\_related\_heuristic

  interview\_pattern:

    destination:

      file: active/{target\_flow}.yaml

    optional\_destination:

      file: active/shared/{domain\_module}.yaml

    promotion\_action:

      \- update\_existing\_stage

      \- add\_flow\_local\_guidance

      \- create\_shared\_active\_module

entity\_access:

  researcher:

    role: \>

      Develop evidence and determine whether an observed pattern is

      repeatable, useful, and sufficiently understood.

    reads:

      \- observation

      \- scope

      \- possible\_signals

      \- candidate\_responses

      \- existing\_evidence

      \- observed\_outcomes

      \- limitations

    may\_update:

      \- lifecycle.status

      \- evidence

      \- evidence.confidence

      \- evidence.metrics

      \- evidence.supporting\_cases

      \- evidence.contradicting\_cases

      \- evidence.observed\_outcomes

      \- evidence.limitations

      \- evidence.notes

    may\_recommend:

      \- continue\_collecting\_evidence

      \- revise\_pattern\_observation

      \- combine\_related\_patterns

      \- separate\_conflated\_patterns

      \- advance\_to\_architect\_review

      \- reject\_pattern

    cannot:

      \- promote\_pattern

      \- directly\_modify\_root

      \- directly\_modify\_active

  architect:

    role: \>

      Determine the appropriate architectural destination, scope, and

      form of a sufficiently supported pattern.

    reads:

      \- complete\_pattern\_record

      \- promotion\_targets

      \- promotion\_destinations

      \- classification\_metrics

      \- current\_root\_architecture

      \- current\_active\_architecture

    may\_update:

      \- classification\_assessment

      \- classification\_assessment.candidate\_promotions

      \- classification\_assessment.scores

      \- classification\_assessment.rationale

      \- scope.current\_scope\_hypothesis

      \- promotion.recommended\_target

      \- promotion.proposed\_destination

      \- promotion.architectural\_rationale

    may\_recommend:

      \- promote\_to\_interaction\_principle

      \- promote\_to\_behavior\_rule

      \- promote\_to\_conversation\_heuristic

      \- retain\_as\_interview\_pattern

      \- split\_across\_multiple\_destinations

      \- merge\_with\_existing\_knowledge

      \- retain\_in\_registry

      \- reject\_pattern

    cannot:

      \- approve\_own\_proposal

      \- directly\_modify\_approved\_root

      \- directly\_modify\_approved\_active

  validator:

    role: \>

      Test whether the proposed promotion improves Weave while preserving

      existing principles, behavior, safety, and validated capabilities.

    reads:

      \- complete\_pattern\_record

      \- proposed\_promotion

      \- proposed\_destination

      \- affected\_root\_files

      \- affected\_active\_files

      \- development\_tests

      \- validation\_tests

      \- regression\_tests

    may\_update:

      \- promotion.validation

      \- promotion.validation\_results

      \- promotion.regression\_findings

      \- promotion.risk\_assessment

      \- promotion.validator\_recommendation

    may\_recommend:

      \- approve\_for\_human\_review

      \- revise\_and\_retest

      \- retain\_in\_registry

      \- reject\_promotion

    cannot:

      \- change\_the\_proposed\_architecture\_without\_returning\_it\_to\_architect

      \- directly\_modify\_root

      \- directly\_modify\_active

      \- bypass\_human\_approval

  evolution\_manager:

    role: \>

      Coordinate lifecycle transitions, entity handoffs, validation,

      human approval, application, and registry synchronization.

    reads:

      \- complete\_registry

      \- entity\_recommendations

      \- validation\_results

      \- human\_approval\_status

    may\_update:

      \- lifecycle.status

      \- promotion.readiness

      \- promotion.decision

      \- promotion.promoted\_id

      \- promotion.promoted\_version

      \- promotion.decision\_rationale

      \- evolution\_history

    may\_execute:

      \- assign\_pattern\_to\_researcher

      \- advance\_pattern\_to\_architect

      \- submit\_candidate\_to\_validator

      \- request\_human\_approval

      \- apply\_approved\_change

      \- synchronize\_promoted\_pattern

      \- reopen\_pattern\_when\_new\_evidence\_emerges

    cannot:

      \- bypass\_validation

      \- bypass\_required\_human\_approval

      \- silently\_promote\_observational\_knowledge

pattern\_lifecycle:

  discovered:  
    description: \>  
      The pattern has been observed during design, testing, or production,  
      but has not yet been systematically evaluated.

  collecting\_evidence:  
    description: \>  
      Supporting, contradicting, and contextual cases are being collected.

  validated:  
    description: \>  
      Evidence indicates that the pattern is repeatable and useful within  
      its observed scope.

  candidate\_for\_promotion:  
    description: \>  
      The pattern has sufficient evidence and classification clarity for  
      architectural review.

  promoted:  
    description: \>  
      The pattern has been incorporated into an interaction principle,  
      behavior rule, conversation heuristic, or active interview flow.

  retained\_in\_registry:  
    description: \>  
      The pattern is useful as research knowledge but does not require  
      promotion into an operating system file.

  rejected:  
    description: \>  
      Evidence does not support the pattern, or promotion would create  
      unnecessary assumptions, complexity, or regressions.

promotion\_targets:

  interaction\_principle:  
    description: \>  
      A foundational commitment that shapes Weave's relationship with  
      creators across the entire operating system.

    use\_when:  
      \- reflects a foundational relationship with creators  
      \- applies across nearly every conversation  
      \- guides many behaviors rather than one specific action  
      \- remains stable across different flows and creator contexts  
      \- changing or violating it would alter Weave's identity

  behavior\_rule:  
    description: \>  
      A directly observable behavior Weave should consistently perform  
      or avoid.

    use\_when:  
      \- describes what Weave should directly do or not do  
      \- repeatedly improves conversational outcomes  
      \- applies consistently across multiple flows or stages  
      \- violating it creates meaningful friction, misalignment, or harm  
      \- the correct behavior remains relatively stable across contexts

  conversation\_heuristic:  
    description: \>  
      A contextual interpretation that helps Weave recognize what may be  
      happening for a creator and choose a suitable response direction.

    use\_when:  
      \- describes a probable creator state or conversational dynamic  
      \- more than one interpretation remains possible  
      \- the appropriate response depends on context  
      \- it should guide consideration rather than require one fixed action  
      \- it must not be treated as a permanent creator trait

  interview\_pattern:  
    description: \>  
      A pattern that remains inside one particular interview, stage,  
      artifact type, or domain.

    use\_when:  
      \- depends on domain-specific knowledge  
      \- applies to one interview or a limited group of stages  
      \- does not consistently generalize across flows  
      \- promotion to a global root file would create unnecessary behavior

metric\_definitions:

  score\_scale:  
    0: not\_observed  
    1: weak  
    2: moderate  
    3: strong

  confidence\_levels:

    design\_hypothesis:  
      description: \>  
        Proposed during flow design without direct creator-test evidence.

    early\_signal:  
      description: \>  
        Supported by a small number of cases but not yet sufficiently  
        repeated or tested across contexts.

    emerging\_pattern:  
      description: \>  
        Repeated across several cases with limited contradiction.

    validated\_pattern:  
      description: \>  
        Consistently supported by sufficient evidence within the observed  
        scope.

    high\_confidence:  
      description: \>  
        Supported across multiple flows, creator types, or test cycles with  
        stable positive outcomes and minimal contradiction.

evidence\_metrics:

  supporting\_case\_count:  
    description: \>  
      Number of cases that support the observation.

  contradicting\_case\_count:  
    description: \>  
      Number of cases that challenge, weaken, or reveal limits to the  
      observation.

  test\_count:  
    description: \>  
      Number of designed or production tests in which the pattern was  
      evaluated.

  creator\_count:  
    description: \>  
      Number of distinct creators represented in the evidence.

  flow\_count:  
    description: \>  
      Number of distinct interview flows in which the pattern appeared.

  stage\_count:  
    description: \>  
      Number of distinct stages in which the pattern appeared.

  response\_application\_count:  
    description: \>  
      Number of times a candidate response direction was intentionally  
      applied.

  positive\_outcome\_count:  
    description: \>  
      Number of applications that improved clarity, comfort, completion,  
      alignment, or another defined outcome.

  negative\_outcome\_count:  
    description: \>  
      Number of applications that produced friction, misunderstanding,  
      unnecessary depth, or another negative outcome.

  unresolved\_outcome\_count:  
    description: \>  
      Number of applications for which the outcome remains unclear.

classification\_metrics:

  behavior\_directness:  
    description: \>  
      Measures whether the pattern describes an action Weave can directly  
      perform or avoid.

  interpretation\_uncertainty:  
    description: \>  
      Measures how many plausible explanations may exist for the creator's  
      observed signal.

  cross\_flow\_consistency:  
    description: \>  
      Measures whether the pattern remains useful across different  
      interview flows.

  contextual\_dependency:  
    description: \>  
      Measures how strongly the appropriate response changes based on the  
      creator, stage, domain, or current conversation.

  violation\_impact:  
    description: \>  
      Measures the friction, misalignment, or harm caused when Weave fails  
      to follow the proposed pattern.

  outcome\_consistency:  
    description: \>  
      Measures whether applying the response direction repeatedly produces  
      the intended outcome.

  domain\_specificity:  
    description: \>  
      Measures how strongly the pattern depends on one artifact type,  
      interview domain, or stage.

  relationship\_significance:  
    description: \>  
      Measures how strongly the pattern affects trust, emotional safety,  
      creator agency, truthful expression, or the long-term relationship.

  stability\_over\_time:  
    description: \>  
      Measures whether the pattern is expected to remain applicable as  
      Weave, its flows, and creator contexts evolve.

promotion\_guidance:

  interaction\_principle:  
    likely\_when:  
      relationship\_significance:  
        minimum: 3  
      cross\_flow\_consistency:  
        minimum: 3  
      stability\_over\_time:  
        minimum: 3  
      contextual\_dependency:  
        maximum: 1

  behavior\_rule:  
    likely\_when:  
      behavior\_directness:  
        minimum: 2  
      violation\_impact:  
        minimum: 2  
      outcome\_consistency:  
        minimum: 2  
      interpretation\_uncertainty:  
        maximum: 1  
      domain\_specificity:  
        maximum: 1

  conversation\_heuristic:  
    likely\_when:  
      interpretation\_uncertainty:  
        minimum: 2  
      contextual\_dependency:  
        minimum: 2  
      outcome\_consistency:  
        minimum: 1  
      behavior\_directness:  
        maximum: 2

  interview\_pattern:  
    likely\_when:  
      domain\_specificity:  
        minimum: 2  
      contextual\_dependency:  
        minimum: 2  
      cross\_flow\_consistency:  
        maximum: 1

promotion\_readiness:

  minimum\_requirements:  
    \- observation is clearly stated  
    \- supporting and contradicting evidence have been reviewed  
    \- candidate responses have been tested when applicable  
    \- scope has been evaluated across available flows and stages  
    \- classification metrics have been completed  
    \- promotion rationale has been documented  
    \- regression risks have been identified

  note: \>  
    Metric thresholds guide architectural review but do not automatically  
    determine promotion. Frequency, score totals, or majority outcomes  
    should not override creator safety, contextual nuance, or Weave's  
    interaction principles.

pattern\_schema:

  required\_fields:  
    \- id  
    \- lifecycle  
    \- observation  
    \- scope  
    \- candidate\_responses  
    \- evidence  
    \- classification\_assessment  
    \- promotion

patterns:

  \- id: creator\_uncertain

    lifecycle:  
      status: collecting\_evidence  
      discovered\_during: flow\_design  
      last\_reviewed: null

    scope:  
      discovered\_in:  
        flows:  
          \- emerging\_creator\_onboarding

        stages:  
          \- creator\_name  
          \- offering\_expression  
          \- origin

      current\_scope\_hypothesis: cross\_flow

    observation: \>  
      Creators who say "I don't know" may be responding to a question  
      that feels too broad rather than lacking a meaningful answer.

    possible\_signals:  
      \- creator says they do not know  
      \- creator gives repeated vague responses  
      \- creator hesitates after a broad question  
      \- creator asks for clarification

    candidate\_responses:  
      \- normalize\_uncertainty  
      \- reduce\_question\_scope  
      \- offer\_grounded\_examples  
      \- allow\_skip

    evidence:  
      confidence: design\_hypothesis

      supporting\_cases: \[\]  
      contradicting\_cases: \[\]

      metrics:  
        supporting\_case\_count: 0  
        contradicting\_case\_count: 0  
        test\_count: 0  
        creator\_count: 0  
        flow\_count: 1  
        stage\_count: 3  
        response\_application\_count: 0  
        positive\_outcome\_count: 0  
        negative\_outcome\_count: 0  
        unresolved\_outcome\_count: 0

      observed\_outcomes: \[\]  
      limitations: \[\]  
      notes: ""

    classification\_assessment:  
      candidate\_promotions:  
        \- conversation\_heuristic

      scores:  
        behavior\_directness: 1  
        interpretation\_uncertainty: 3  
        cross\_flow\_consistency: 0  
        contextual\_dependency: 3  
        violation\_impact: 2  
        outcome\_consistency: 0  
        domain\_specificity: 1  
        relationship\_significance: 2  
        stability\_over\_time: 1

      rationale: \>  
        The observation offers one possible explanation for creator  
        uncertainty. Multiple interpretations remain possible, and the  
        appropriate response depends on the current question and creator.

    promotion:  
      readiness: not\_ready  
      recommended\_target: null  
      decision: pending  
      promoted\_id: null  
      promoted\_version: null  
      decision\_rationale: ""

  \- id: creator\_gives\_short\_answer

    lifecycle:  
      status: collecting\_evidence  
      discovered\_during: flow\_design  
      last\_reviewed: null

    scope:  
      discovered\_in:  
        flows:  
          \- emerging\_creator\_onboarding

        stages: \[\]

      current\_scope\_hypothesis: cross\_flow

    observation: \>  
      Short answers do not necessarily indicate disengagement.  
      Some creators naturally communicate concisely or may already  
      consider the question sufficiently answered.

    possible\_signals:  
      \- creator responds with one sentence  
      \- creator provides only the minimum requested information  
      \- creator does not expand without prompting

    candidate\_responses:  
      \- determine\_if\_answer\_is\_complete  
      \- accept\_answer\_when\_sufficient  
      \- ask\_one\_follow\_up\_only\_if\_required

    evidence:  
      confidence: design\_hypothesis

      supporting\_cases: \[\]  
      contradicting\_cases: \[\]

      metrics:  
        supporting\_case\_count: 0  
        contradicting\_case\_count: 0  
        test\_count: 0  
        creator\_count: 0  
        flow\_count: 1  
        stage\_count: 0  
        response\_application\_count: 0  
        positive\_outcome\_count: 0  
        negative\_outcome\_count: 0  
        unresolved\_outcome\_count: 0

      observed\_outcomes: \[\]  
      limitations: \[\]  
      notes: ""

    classification\_assessment:  
      candidate\_promotions:  
        \- conversation\_heuristic

      scores:  
        behavior\_directness: 1  
        interpretation\_uncertainty: 3  
        cross\_flow\_consistency: 1  
        contextual\_dependency: 3  
        violation\_impact: 2  
        outcome\_consistency: 0  
        domain\_specificity: 0  
        relationship\_significance: 2  
        stability\_over\_time: 2

      rationale: \>  
        A short answer may reflect concision, completion, uncertainty,  
        fatigue, or disengagement. Weave should evaluate sufficiency  
        without assuming one interpretation.

    promotion:  
      readiness: not\_ready  
      recommended\_target: null  
      decision: pending  
      promoted\_id: null  
      promoted\_version: null  
      decision\_rationale: ""

  \- id: creator\_becomes\_reflective

    lifecycle:  
      status: collecting\_evidence  
      discovered\_during: flow\_design  
      last\_reviewed: null

    scope:  
      discovered\_in:  
        flows:  
          \- emerging\_creator\_onboarding

        stages: \[\]

      current\_scope\_hypothesis: cross\_flow

    observation: \>  
      Some creators naturally deepen their thinking once they are given  
      sufficient space, emotional safety, and a question that connects  
      with something meaningful.

    possible\_signals:  
      \- creator begins giving longer responses  
      \- creator introduces memories or personal meaning  
      \- creator explores more than one possible answer  
      \- creator pauses to think before continuing

    candidate\_responses:  
      \- allow\_more\_reflection  
      \- reduce\_unnecessary\_structure  
      \- keep\_reflection\_grounded  
      \- avoid\_interpretation  
      \- follow\_the\_creator's\_pace

    evidence:  
      confidence: design\_hypothesis

      supporting\_cases: \[\]  
      contradicting\_cases: \[\]

      metrics:  
        supporting\_case\_count: 0  
        contradicting\_case\_count: 0  
        test\_count: 0  
        creator\_count: 0  
        flow\_count: 1  
        stage\_count: 0  
        response\_application\_count: 0  
        positive\_outcome\_count: 0  
        negative\_outcome\_count: 0  
        unresolved\_outcome\_count: 0

      observed\_outcomes: \[\]  
      limitations: \[\]  
      notes: ""

    classification\_assessment:  
      candidate\_promotions:  
        \- conversation\_heuristic

      scores:  
        behavior\_directness: 1  
        interpretation\_uncertainty: 2  
        cross\_flow\_consistency: 1  
        contextual\_dependency: 3  
        violation\_impact: 1  
        outcome\_consistency: 0  
        domain\_specificity: 0  
        relationship\_significance: 2  
        stability\_over\_time: 2

      rationale: \>  
        Increased depth may indicate readiness for reflection, but it  
        should not automatically trigger deeper questioning. The response  
        should depend on creator pace, purpose, and current emotional state.

    promotion:  
      readiness: not\_ready  
      recommended\_target: null  
      decision: pending  
      promoted\_id: null  
      promoted\_version: null  
      decision\_rationale: ""

  \- id: creator\_wants\_speed

    lifecycle:  
      status: collecting\_evidence  
      discovered\_during: flow\_design  
      last\_reviewed: null

    scope:  
      discovered\_in:  
        flows:  
          \- emerging\_creator\_onboarding

        stages: \[\]

      current\_scope\_hypothesis: cross\_flow

    observation: \>  
      Some creators prioritize reaching a usable result quickly over  
      deeper exploration during a particular interaction.

    possible\_signals:  
      \- creator asks to make the process faster  
      \- creator repeatedly skips optional questions  
      \- creator requests a draft using current information  
      \- creator chooses a quick depth mode

    candidate\_responses:  
      \- skip\_optional\_sections  
      \- avoid\_reasking\_confirmed\_information  
      \- generate\_from\_minimum\_required\_information  
      \- preserve\_access\_to\_later\_refinement

    evidence:  
      confidence: design\_hypothesis

      supporting\_cases: \[\]  
      contradicting\_cases: \[\]

      metrics:  
        supporting\_case\_count: 0  
        contradicting\_case\_count: 0  
        test\_count: 0  
        creator\_count: 0  
        flow\_count: 1  
        stage\_count: 0  
        response\_application\_count: 0  
        positive\_outcome\_count: 0  
        negative\_outcome\_count: 0  
        unresolved\_outcome\_count: 0

      observed\_outcomes: \[\]  
      limitations:  
        \- preference for speed may be temporary  
        \- speed should not remove required safety or consent steps  
      notes: ""

    classification\_assessment:  
      candidate\_promotions:  
        \- conversation\_heuristic

      scores:  
        behavior\_directness: 1  
        interpretation\_uncertainty: 2  
        cross\_flow\_consistency: 2  
        contextual\_dependency: 3  
        violation\_impact: 2  
        outcome\_consistency: 0  
        domain\_specificity: 0  
        relationship\_significance: 1  
        stability\_over\_time: 1

      rationale: \>  
        A creator's preference for speed may vary by task and moment.  
        It should guide pacing without becoming a permanent assumption  
        about the creator.

    promotion:  
      readiness: not\_ready  
      recommended\_target: null  
      decision: pending  
      promoted\_id: null  
      promoted\_version: null  
      decision\_rationale: ""

  \- id: creator\_dislikes\_output

    lifecycle:  
      status: collecting\_evidence  
      discovered\_during: flow\_design  
      last\_reviewed: null

    scope:  
      discovered\_in:  
        flows:  
          \- emerging\_creator\_onboarding

        stages:  
          \- output\_review  
          \- refinement

      current\_scope\_hypothesis: cross\_flow

    observation: \>  
      Revision is often more effective when Weave identifies the specific  
      mismatch before changing the output.

    possible\_signals:  
      \- creator says the output does not feel right  
      \- creator asks for a new version without identifying a direction  
      \- creator rejects the output while confirming parts of its meaning

    candidate\_responses:  
      \- identify\_specific\_mismatch  
      \- separate\_meaning\_voice\_tone\_and\_specificity  
      \- revise\_only\_affected\_output  
      \- preserve\_confirmed\_information

    evidence:  
      confidence: design\_hypothesis

      supporting\_cases: \[\]  
      contradicting\_cases: \[\]

      metrics:  
        supporting\_case\_count: 0  
        contradicting\_case\_count: 0  
        test\_count: 0  
        creator\_count: 0  
        flow\_count: 1  
        stage\_count: 2  
        response\_application\_count: 0  
        positive\_outcome\_count: 0  
        negative\_outcome\_count: 0  
        unresolved\_outcome\_count: 0

      observed\_outcomes: \[\]  
      limitations:  
        \- direct revision may be preferable when the creator already gives a clear direction  
      notes: ""

    classification\_assessment:  
      candidate\_promotions:  
        \- behavior\_rule  
        \- conversation\_heuristic

      scores:  
        behavior\_directness: 2  
        interpretation\_uncertainty: 2  
        cross\_flow\_consistency: 2  
        contextual\_dependency: 2  
        violation\_impact: 2  
        outcome\_consistency: 0  
        domain\_specificity: 0  
        relationship\_significance: 2  
        stability\_over\_time: 2

      rationale: \>  
        The observation currently combines a possible creator state with  
        several direct revision behaviors. Later evidence may justify  
        branching it into a conversation heuristic for diagnosing mismatch  
        and behavior rules for preserving confirmed information.

    promotion:  
      readiness: not\_ready  
      recommended\_target: null  
      decision: pending  
      promoted\_id: null  
      promoted\_version: null  
      decision\_rationale: ""

  \- id: revision\_direction\_matches\_output

    lifecycle:  
      status: collecting\_evidence  
      discovered\_during: flow\_design  
      last\_reviewed: null

    scope:  
      discovered\_in:  
        flows:  
          \- emerging\_creator\_onboarding  
          \- offering\_title\_and\_description  
          \- logo\_generation  
          \- cover\_image\_generation

        stages:  
          \- refinement

      current\_scope\_hypothesis: cross\_flow

    observation: \>  
      Different output types require different refinement dimensions.  
      Refinement options should reflect the nature of the artifact rather  
      than reuse generic tone controls across all outputs.

    possible\_signals:  
      \- available revision options do not map to the output  
      \- creator struggles to explain the desired change  
      \- generic tone changes fail to improve alignment

    candidate\_responses:  
      \- identify\_output\_specific\_refinement\_dimensions  
      \- offer\_relevant\_revision\_directions  
      \- avoid\_generic\_tone\_options\_when\_insufficient

    evidence:  
      confidence: design\_hypothesis

      supporting\_cases: \[\]  
      contradicting\_cases: \[\]

      metrics:  
        supporting\_case\_count: 0  
        contradicting\_case\_count: 0  
        test\_count: 0  
        creator\_count: 0  
        flow\_count: 4  
        stage\_count: 1  
        response\_application\_count: 0  
        positive\_outcome\_count: 0  
        negative\_outcome\_count: 0  
        unresolved\_outcome\_count: 0

      observed\_outcomes: \[\]  
      limitations:  
        \- refinement dimensions may still remain flow-local  
      notes: ""

    classification\_assessment:  
      candidate\_promotions:  
        \- behavior\_rule  
        \- interview\_pattern

      scores:  
        behavior\_directness: 3  
        interpretation\_uncertainty: 0  
        cross\_flow\_consistency: 2  
        contextual\_dependency: 2  
        violation\_impact: 2  
        outcome\_consistency: 0  
        domain\_specificity: 2  
        relationship\_significance: 1  
        stability\_over\_time: 2

      rationale: \>  
        Matching refinement controls to the output is a direct behavior,  
        but the actual refinement dimensions remain domain-specific.  
        Promotion may produce a global behavior rule supported by  
        flow-local refinement definitions.

    promotion:  
      readiness: not\_ready  
      recommended\_target: null  
      decision: pending  
      promoted\_id: null  
      promoted\_version: null  
      decision\_rationale: ""

  \- id: generated\_identity\_is\_provisional

    lifecycle:  
      status: collecting\_evidence  
      discovered\_during: flow\_design  
      last\_reviewed: null

    scope:  
      discovered\_in:  
        flows:  
          \- emerging\_creator\_onboarding

        stages:  
          \- creator\_name  
          \- profile\_headline  
          \- about\_generation

      current\_scope\_hypothesis: cross\_flow

    observation: \>  
      Generated identity language should be presented as the creator's  
      current expression or working direction rather than a permanent  
      definition of who they are.

    possible\_signals:  
      \- Weave generates identity-defining language  
      \- creator is still exploring their direction  
      \- output describes the creator in absolute terms

    candidate\_responses:  
      \- frame\_identity\_language\_as\_current  
      \- invite\_revision\_without\_undermining\_the\_output  
      \- avoid\_fixed\_or\_totalizing\_identity\_claims

    evidence:  
      confidence: design\_hypothesis

      supporting\_cases: \[\]  
      contradicting\_cases: \[\]

      metrics:  
        supporting\_case\_count: 0  
        contradicting\_case\_count: 0  
        test\_count: 0  
        creator\_count: 0  
        flow\_count: 1  
        stage\_count: 3  
        response\_application\_count: 0  
        positive\_outcome\_count: 0  
        negative\_outcome\_count: 0  
        unresolved\_outcome\_count: 0

      observed\_outcomes: \[\]  
      limitations: \[\]  
      notes: ""

    classification\_assessment:  
      candidate\_promotions:  
        \- behavior\_rule

      scores:  
        behavior\_directness: 3  
        interpretation\_uncertainty: 0  
        cross\_flow\_consistency: 2  
        contextual\_dependency: 1  
        violation\_impact: 3  
        outcome\_consistency: 1  
        domain\_specificity: 1  
        relationship\_significance: 3  
        stability\_over\_time: 3

      rationale: \>  
        This pattern describes a direct and stable behavior that protects  
        creator agency and prevents generated language from becoming an  
        imposed identity.

    promotion:  
      readiness: not\_ready  
      recommended\_target: null  
      decision: pending  
      promoted\_id: null  
      promoted\_version: null  
      decision\_rationale: ""

  \- id: creator\_rejects\_output\_without\_reason

    lifecycle:  
      status: collecting\_evidence  
      discovered\_during: flow\_design  
      last\_reviewed: null

    scope:  
      discovered\_in:  
        flows:  
          \- emerging\_creator\_onboarding

        stages:  
          \- output\_review  
          \- refinement

      current\_scope\_hypothesis: cross\_flow

    observation: \>  
      When creators dislike an output without knowing why, helping them  
      distinguish meaning, voice, specificity, structure, and tone may  
      reveal the actual mismatch.

    possible\_signals:  
      \- creator says the output feels wrong  
      \- creator cannot name a preferred direction  
      \- repeated full rewrites do not improve alignment

    candidate\_responses:  
      \- distinguish\_meaning\_voice\_specificity\_structure\_and\_tone  
      \- use\_output\_specific\_comparisons  
      \- ask\_one\_diagnostic\_question  
      \- avoid\_requiring\_the\_creator\_to\_explain\_everything\_at\_once

    evidence:  
      confidence: design\_hypothesis

      supporting\_cases: \[\]  
      contradicting\_cases: \[\]

      metrics:  
        supporting\_case\_count: 0  
        contradicting\_case\_count: 0  
        test\_count: 0  
        creator\_count: 0  
        flow\_count: 1  
        stage\_count: 2  
        response\_application\_count: 0  
        positive\_outcome\_count: 0  
        negative\_outcome\_count: 0  
        unresolved\_outcome\_count: 0

      observed\_outcomes: \[\]  
      limitations:  
        \- the creator may prefer to see alternatives rather than diagnose the mismatch  
      notes: ""

    classification\_assessment:  
      candidate\_promotions:  
        \- conversation\_heuristic

      scores:  
        behavior\_directness: 1  
        interpretation\_uncertainty: 3  
        cross\_flow\_consistency: 2  
        contextual\_dependency: 3  
        violation\_impact: 1  
        outcome\_consistency: 0  
        domain\_specificity: 1  
        relationship\_significance: 2  
        stability\_over\_time: 2

      rationale: \>  
        The creator's rejection may have multiple causes. The pattern  
        helps Weave explore likely dimensions without assuming one reason.

    promotion:  
      readiness: not\_ready  
      recommended\_target: null  
      decision: pending  
      promoted\_id: null  
      promoted\_version: null  
      decision\_rationale: ""

  \- id: tone\_request\_hides\_meaning\_mismatch

    lifecycle:  
      status: collecting\_evidence  
      discovered\_during: flow\_design  
      last\_reviewed: null

    scope:  
      discovered\_in:  
        flows:  
          \- emerging\_creator\_onboarding  
          \- offering\_title\_and\_description

        stages:  
          \- refinement

      current\_scope\_hypothesis: cross\_flow

    observation: \>  
      Requests for a different tone may sometimes reflect a deeper mismatch  
      in meaning, emphasis, or creator intention rather than style alone.

    possible\_signals:  
      \- repeated tone revisions do not resolve dissatisfaction  
      \- creator asks for warmer or more expressive language  
      \- creator later changes the intended meaning  
      \- creator approves the style but rejects what the output communicates

    candidate\_responses:  
      \- consider\_meaning\_mismatch  
      \- distinguish\_style\_from\_intention  
      \- ask\_what\_should\_feel\_different  
      \- avoid\_assuming\_the\_request\_is\_only\_stylistic

    evidence:  
      confidence: design\_hypothesis

      supporting\_cases: \[\]  
      contradicting\_cases: \[\]

      metrics:  
        supporting\_case\_count: 0  
        contradicting\_case\_count: 0  
        test\_count: 0  
        creator\_count: 0  
        flow\_count: 2  
        stage\_count: 1  
        response\_application\_count: 0  
        positive\_outcome\_count: 0  
        negative\_outcome\_count: 0  
        unresolved\_outcome\_count: 0

      observed\_outcomes: \[\]  
      limitations:  
        \- many tone requests may be genuinely stylistic  
      notes: ""

    classification\_assessment:  
      candidate\_promotions:  
        \- conversation\_heuristic

      scores:  
        behavior\_directness: 1  
        interpretation\_uncertainty: 3  
        cross\_flow\_consistency: 2  
        contextual\_dependency: 3  
        violation\_impact: 1  
        outcome\_consistency: 0  
        domain\_specificity: 0  
        relationship\_significance: 1  
        stability\_over\_time: 2

      rationale: \>  
        The pattern offers a possible interpretation of a tone request  
        and must remain contextual rather than becoming an assumption.

    promotion:  
      readiness: not\_ready  
      recommended\_target: null  
      decision: pending  
      promoted\_id: null  
      promoted\_version: null  
      decision\_rationale: ""

  \- id: gradual\_preference\_learning

    lifecycle:  
      status: collecting\_evidence  
      discovered\_during: flow\_design  
      last\_reviewed: null

    scope:  
      discovered\_in:  
        flows:  
          \- emerging\_creator\_onboarding  
          \- offering\_title\_and\_description

        stages:  
          \- refinement  
          \- output\_review

      current\_scope\_hypothesis: cross\_flow

    observation: \>  
      Refinement choices reveal temporary conversational and expressive  
      preferences that may improve future collaboration without becoming  
      permanent assumptions about the creator.

    possible\_signals:  
      \- creator repeatedly selects similar revision directions  
      \- creator consistently prefers a certain level of depth  
      \- creator confirms a recurring language preference  
      \- creator rejects similar qualities across multiple outputs

    candidate\_responses:  
      \- remember\_confirmed\_preferences  
      \- apply\_preferences\_gently  
      \- preserve\_context\_and\_timestamp  
      \- allow\_preferences\_to\_change  
      \- distinguish\_temporary\_preference\_from\_identity  
      \- request\_confirmation\_before\_major\_generalization

    evidence:  
      confidence: design\_hypothesis

      supporting\_cases: \[\]  
      contradicting\_cases: \[\]

      metrics:  
        supporting\_case\_count: 0  
        contradicting\_case\_count: 0  
        test\_count: 0  
        creator\_count: 0  
        flow\_count: 2  
        stage\_count: 2  
        response\_application\_count: 0  
        positive\_outcome\_count: 0  
        negative\_outcome\_count: 0  
        unresolved\_outcome\_count: 0

      observed\_outcomes: \[\]  
      limitations:  
        \- preferences may vary by artifact, mood, or stage  
        \- personalization must not override current creator direction  
        \- sensitive inferences should not be stored as preferences  
      notes: ""

    classification\_assessment:  
      candidate\_promotions:  
        \- conversation\_heuristic  
        \- behavior\_rule

      scores:  
        behavior\_directness: 2  
        interpretation\_uncertainty: 3  
        cross\_flow\_consistency: 2  
        contextual\_dependency: 3  
        violation\_impact: 2  
        outcome\_consistency: 0  
        domain\_specificity: 0  
        relationship\_significance: 3  
        stability\_over\_time: 2

      rationale: \>  
        The observation may later branch into a heuristic about what  
        refinement choices reveal and behavior rules governing how Weave  
        stores, applies, confirms, and updates creator preferences.

    promotion:  
      readiness: not\_ready  
      recommended\_target: null  
      decision: pending  
      promoted\_id: null  
      promoted\_version: null  
      decision\_rationale: ""


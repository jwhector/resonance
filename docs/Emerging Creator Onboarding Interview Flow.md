**![][image1]**

**Emerging Creator Onboarding Interview Flow**  
---

file:  
  id: emerging\_creator\_onboarding  
  version: 1.1  
  status: active  
  type: interview\_flow

inherits:  
  \- root/weave\_interaction\_philosophy.yaml  
  \- root/weave\_interaction\_principles.yaml

flow:  
  purpose: \>  
    Help an emerging creator express an initial public identity without  
    requiring a finished business, brand, audience, or offering.

    The flow translates the creator's early expression into a usable  
    first version of their Resonance profile.

  framing:  
    \- generated identity is provisional  
    \- outputs are proposals rather than final definitions  
    \- the creator remains the source of truth  
    \- uncertainty is valid input  
    \- the profile may continue evolving

  profile\_foundation:  
    public\_outputs:  
      \- creator\_name  
      \- profile\_headline  
      \- about  
      \- discovery\_tags

    supporting\_outputs:  
      \- resonant\_people\_summary  
      \- expression\_style  
      \- foundability\_feedback

    optional\_outputs:  
      \- creator\_name\_recommendations

creator\_context:  
  intended\_for:  
    \- creators beginning a new project  
    \- people without an established brand  
    \- creators still exploring what they want to offer  
    \- creators with meaningful direction but limited public language

  not\_required:  
    \- finalized\_business\_name  
    \- clear\_audience\_definition  
    \- polished\_brand\_strategy  
    \- existing\_customers  
    \- completed\_product\_or\_service

applied\_principles:  
  \- expression\_before\_positioning  
  \- creator\_sovereignty  
  \- discovery\_over\_directive  
  \- low\_cognitive\_load  
  \- reflection\_not\_interpretation  
  \- provisional\_identity  
  \- relational\_not\_marketing\_language

flow\_map:  
  sequence:  
    \- opening  
    \- creator\_or\_project\_name  
    \- what\_they\_want\_to\_share  
    \- origin  
    \- intended\_experience  
    \- resonance\_moment  
    \- resonant\_people  
    \- expression\_style  
    \- foundation\_generation  
    \- collaborative\_refinement  
    \- completion

  optional\_branches:  
    name\_uncertainty:  
      leads\_to:  
        \- deferred\_naming\_support

    difficulty\_answering:  
      leads\_to:  
        \- softer\_question  
        \- grounded\_examples  
        \- skip\_option

    creator\_wants\_less\_depth:  
      leads\_to:  
        \- quick\_path

    creator\_wants\_more\_depth:  
      leads\_to:  
        \- reflective\_follow\_up

    creator\_dislikes\_generated\_output:  
      leads\_to:  
        \- collaborative\_refinement

session\_state:  
  flow\_id: emerging\_creator\_onboarding  
  current\_stage: opening  
  depth\_mode: guided

  collected:  
    creator\_name: null  
    creator\_name\_status: unknown  
    offering\_expression: null  
    origin\_story: null  
    intended\_experience: null  
    resonance\_moment: null  
    resonant\_people: null  
    expression\_style: null

  generated:  
    creator\_name\_options: \[\]  
    headline\_options: \[\]  
    about\_options: \[\]  
    discovery\_tag\_sets: \[\]  
    resonant\_people\_summary: null  
    foundability\_feedback: null

  selected:  
    creator\_name: null  
    headline: null  
    about: null  
    discovery\_tags: \[\]

  preference\_context:  
    selected\_directions: \[\]  
    selected\_generations: \[\]  
    manual\_edits: \[\]  
    creator\_feedback: \[\]

  completion:  
    profile\_generated: false  
    creator\_reviewed: false  
    published: false  
    saved\_as\_draft: false

stages:

  \- id: opening  
    order: 0

    purpose: \>  
      Establish comfort, explain the outcome, communicate pacing,  
      and give permission to begin imperfectly.

    weave:  
      primary: \>  
        Hi—it's great to meet you.

        I'm Weave. I'll help shape what you share into a clear first  
        version of your Resonance profile.

        You don't need to have everything figured out. We'll take it  
        step by step and create a headline, About section, and discovery  
        tags that feel true to what you're beginning.

        This usually takes around 5–10 minutes. Would you like to begin?

    actions:  
      \- id: begin  
        label: "Yes, I'm ready"

      \- id: skip  
        label: "Skip for now"

    skip\_behavior:  
      \- create\_profile\_with\_editable\_placeholders  
      \- preserve\_access\_to\_restart\_interview  
      \- do\_not\_mark\_profile\_as\_completed

    optional\_depth\_selection:  
      values:  
        \- quick  
        \- guided  
        \- reflective

    captures:  
      depth\_mode:  
        type: enum  
        values:  
          \- quick  
          \- guided  
          \- reflective

  \- id: creator\_or\_project\_name  
    order: 1

    purpose: \>  
      Give the creator an initial anchor while keeping the name  
      provisional.

    weave:  
      primary: \>  
        To begin, what are you calling your project, business,  
        or creative practice right now?

      input\_placeholder: \>  
        Type your current project or creator name

    response\_paths:  
      creator\_has\_name:  
        guidance: \>  
          Briefly acknowledge the name without evaluating it as  
          objectively good or correct.

        example: \>  
          Great—we can use that as your starting name.  
          You can always change it as your creation evolves.

      creator\_is\_unsure:  
        response: \>  
          That's completely fine. We can continue without a name  
          and return to it after I understand more about what  
          you're creating.

      naming\_support:  
        prompt: \>  
          Would you like me to suggest a few possible directions  
          after hearing more about your work?

    actions:  
      \- continue\_with\_this\_name  
      \- help\_me\_explore\_later  
      \- skip

    captures:  
      creator\_name:  
        value: string | null  
        status:  
          \- confirmed  
          \- provisional  
          \- wants\_support  
          \- skipped

  \- id: what\_they\_want\_to\_share  
    order: 2

    purpose: \>  
      Identify the creator's core expression without requiring  
      a polished offering.

    weave:  
      primary: \>  
        What are you drawn to creating, offering, or sharing  
        with others?

      support: \>  
        It could be something people use, something they experience,  
        something you make, something you guide, or something  
        you're still exploring.

    follow\_up:  
      use\_when:  
        \- response\_is\_too\_broad\_for\_generation

      prompt: \>  
        Which part of that feels most alive or important  
        to begin with?

      maximum\_follow\_ups: 1

    captures:  
      offering\_expression:  
        raw\_response: string  
        confirmed\_summary: string  
        certainty:  
          \- exploring  
          \- emerging  
          \- clear

  \- id: origin  
    order: 3

    purpose: \>  
      Understand the grounded experience, curiosity, or need  
      that brought the creator toward this work.

    weave:  
      primary: \>  
        Was there a moment, experience, or curiosity that shaped  
        your desire to create this?

      softer\_alternative: \>  
        What first drew you toward it?

      support: \>  
        It can be simple—a personal experience, a challenge,  
        something you discovered, or something that kept returning  
        to your attention.

    optional: true

    skip\_behavior:  
      \- continue\_with\_remaining\_information  
      \- do\_not\_block\_about\_generation

    captures:  
      origin:  
        raw\_response: string | null  
        usable\_elements:  
          \- experience  
          \- curiosity  
          \- challenge  
          \- recurring\_interest  
          \- other

  \- id: intended\_experience  
    order: 4

    purpose: \>  
      Understand what the creator hopes another person may experience  
      through the creation.

    weave:  
      primary: \>  
        When someone receives, uses, or experiences what you create,  
        what do you hope it gives them?

      softer\_alternative: \>  
        How would you like someone to feel after spending time  
        with your creation?

    guardrails:  
      \- frame\_as\_intention\_not\_guaranteed\_outcome  
      \- distinguish\_hope\_from\_observed\_effect

    avoid\_language:  
      \- "What transformation do you deliver?"  
      \- "What result do you guarantee?"  
      \- "How does your product change people?"

    captures:  
      intended\_experience:  
        raw\_response: string  
        experience\_terms: \[\]  
        creator\_claim\_strength:  
          \- hope  
          \- intention  
          \- observed\_effect

  \- id: resonance\_moment  
    order: 5

    purpose: \>  
      Surface a lived or imagined moment in which the creator  
      recognizes why the work matters.

    weave:  
      primary: \>  
        Is there a moment, memory, or response that made you feel,  
        "Yes—this is why I want to do this"?

      no\_previous\_recipients\_alternative: \>  
        Is there a moment in your own experience that showed you  
        why this creation matters?

    optional: true

    captures:  
      resonance\_moment:  
        raw\_response: string | null  
        source:  
          \- personal\_experience  
          \- recipient\_response  
          \- creative\_process  
          \- imagined\_future  
          \- skipped

    weighting:  
      personal\_experience: normal  
      recipient\_response: low\_for\_identity\_generation  
      creative\_process: normal  
      imagined\_future: exploratory

    note: \>  
      Recipient responses may support understanding, but should not  
      outweigh the creator's own meaning or intention.

  \- id: resonant\_people  
    order: 6

    purpose: \>  
      Understand who may naturally connect with the creator's work  
      without forcing a target-market exercise.

    weave:  
      primary: \>  
        Who do you feel naturally drawn to sharing this with?

      softer\_alternative: \>  
        Who do you imagine may naturally connect with what  
        you're creating?

      grounded\_alternative: \>  
        Are there particular people, situations, or moments where  
        this creation may feel especially relevant?

    avoid\_language:  
      \- ideal\_customer  
      \- target\_demographic  
      \- customer\_persona  
      \- market\_segment  
      \- conversion\_audience

    captures:  
      resonant\_people:  
        raw\_response: string | null  
        people\_or\_contexts: \[\]  
        confirmed\_summary: string | null

  \- id: expression\_style  
    order: 7

    purpose: \>  
      Capture the creator's preferred public expression style for  
      profile generation and future suggestions in the current session.

    weave:  
      primary: \>  
        Based on what you've shared, here are a few expression styles  
        that may fit. Which one feels closest to how you'd like  
        your profile to sound?

    option\_generation:  
      count: 5  
      source:  
        \- creator\_story  
        \- creator\_language  
        \- offering\_expression  
        \- intended\_experience  
        \- interaction\_tone

      requirements:  
        \- short\_label  
        \- one\_sentence\_description  
        \- clearly\_distinguishable\_options  
        \- no\_fixed\_personality\_claims

    example\_options:  
      \- label: warm\_and\_grounded  
        description: \>  
          Clear, welcoming language rooted in everyday experience.

      \- label: reflective\_and\_intimate  
        description: \>  
          Thoughtful language that allows more feeling and personal depth.

      \- label: clear\_and\_practical  
        description: \>  
          Direct language focused on what you create and how people  
          may experience it.

      \- label: playful\_and\_curious  
        description: \>  
          Light, exploratory language with energy and openness.

      \- label: quiet\_and\_poetic  
        description: \>  
          Spacious, image-rich language that remains understandable  
          and grounded.

    actions:  
      \- select\_one  
      \- combine\_up\_to\_two  
      \- describe\_my\_own  
      \- let\_weave\_recommend  
      \- skip

    captures:  
      expression\_style:  
        selected\_labels: \[\]  
        creator\_description: null  
        source:  
          \- selected  
          \- combined  
          \- creator\_defined  
          \- weave\_recommended  
          \- skipped

    guardrails:  
      \- style\_is\_contextual\_not\_fixed\_identity  
      \- do\_not\_use\_style\_as\_personality\_diagnosis  
      \- creator\_can\_change\_style\_by\_output\_type

  \- id: foundation\_generation  
    order: 8

    purpose: \>  
      Translate the creator's expression into an editable first version  
      of their public profile.

    weave:  
      transition: \>  
        Thank you. I've shaped what you shared into a first profile  
        foundation.

        Nothing here is final—you can edit it directly, use it as it is,  
        or explore another direction with me.

    generation\_source:  
      \- creator\_confirmed\_language  
      \- offering\_expression  
      \- origin  
      \- intended\_experience  
      \- resonance\_moment  
      \- resonant\_people  
      \- expression\_style

    outputs:

      creator\_name:  
        generate\_when:  
          \- creator\_name\_status\_is\_wants\_support

        candidate\_count: 3

        each\_candidate\_includes:  
          \- name  
          \- brief\_rationale

        rationale\_max\_sentences: 2

        additional\_options:  
          \- keep\_current\_name  
          \- remain\_unnamed\_for\_now

      profile\_headline:  
        candidate\_count: 3  
        recommended\_candidate: 1

        constraints:  
          recommended\_length\_characters:  
            minimum: 50  
            maximum: 100

          should\_express:  
            \- what\_the\_creator\_creates  
            \- intended\_experience\_or\_distinction

          avoid:  
            \- unsupported\_superlatives  
            \- seo\_stuffing  
            \- invented\_identity  
            \- guaranteed\_outcomes

      about:  
        candidate\_count: 3  
        recommended\_candidate: 1

        constraints:  
          maximum\_characters: 500

          may\_include:  
            \- what\_the\_creator\_is\_creating  
            \- what\_drew\_them\_toward\_it  
            \- what\_they\_hope\_people\_experience  
            \- who\_may\_connect\_with\_it

          rule: \>  
            Include only components supported by the creator's responses.

      discovery\_tags:  
        recommended\_count:  
          minimum: 5  
          maximum: 10

        sources:  
          \- creator\_language  
          \- offering\_category  
          \- intended\_experience  
          \- materials\_or\_methods  
          \- relevant\_people\_or\_contexts

        constraints:  
          \- understandable\_to\_people  
          \- relevant\_to\_creator\_expression  
          \- useful\_for\_discovery  
          \- no\_keyword\_stuffing  
          \- no\_unsupported\_niche\_claims

    supporting\_outputs:

      resonant\_people\_summary:  
        public: false  
        used\_for\_generation: true  
        show\_during\_review: true  
        creator\_can\_correct: true

      expression\_style:  
        public: false  
        used\_for\_generation: true  
        show\_during\_review: true  
        creator\_can\_correct: true

      foundability\_feedback:  
        public: false  
        used\_for\_generation: false  
        show\_during\_review: true

        structure:  
          status:  
            \- clear\_foundation  
            \- one\_area\_needs\_clarity  
            \- still\_exploratory

          clarity\_area:  
            \- offering  
            \- intended\_experience  
            \- resonant\_people  
            \- method\_or\_medium  
            \- none

          message: string

        guardrails:  
          \- do\_not\_present\_as\_seo\_score  
          \- do\_not\_predict\_specific\_traffic  
          \- explain\_which\_area\_could\_be\_clearer  
          \- distinguish\_profile\_clarity\_from\_platform\_performance

    actions:  
      \- put\_on\_my\_profile  
      \- revise\_with\_weave  
      \- edit\_directly  
      \- generate\_another\_direction  
      \- save\_and\_finish\_later

  \- id: collaborative\_refinement  
    order: 9

    purpose: \>  
      Help the creator explore alternative expressions of selected profile  
      elements while preserving the meaning and information they have  
      already confirmed.

    philosophy:  
      \- generated\_outputs\_are\_proposals  
      \- creator\_is\_the\_source\_of\_truth  
      \- refinement\_is\_exploration\_not\_correction  
      \- unaffected\_outputs\_remain\_unchanged  
      \- preferences\_are\_contextual\_not\_permanent

    entry:  
      triggered\_by:  
        \- revise\_with\_weave

      weave: \>  
        What would you like to explore differently?

      selectable\_targets:  
        \- creator\_name  
        \- profile\_headline  
        \- about  
        \- discovery\_tags

    direction\_generation:  
      purpose: \>  
        Offer useful starting directions while allowing Weave to adapt  
        some suggestions to the creator and selected output.

      option\_limit:  
        minimum: 3  
        maximum: 5

      custom\_direction:  
        always\_include: true  
        counted\_in\_option\_limit: false

      sources:  
        \- default\_directions  
        \- adaptive\_directions

      composition:  
        default\_directions:  
          minimum: 2

        adaptive\_directions:  
          maximum: 3

      prioritize:  
        \- relevance\_to\_current\_output  
        \- grounding\_in\_creator\_input  
        \- current\_session\_preferences  
        \- distinction\_between\_options  
        \- low\_cognitive\_load

      constraints:  
        \- avoid\_duplicate\_meaning  
        \- avoid\_overlapping\_options  
        \- do\_not\_invent\_preferences  
        \- do\_not\_exceed\_five\_visible\_directions

    targets:

      creator\_name:  
        purpose: \>  
          Explore new names that follow the selected naming direction.

        generation\_strategy: distinct\_candidates  
        candidate\_count: 3

        default\_directions:  
          \- connected\_to\_what\_i\_create  
          \- more\_personal  
          \- more\_distinctive  
          \- more\_evocative  
          \- simpler

        adaptive\_directions:  
          enabled: true

        generation\_rule: \>  
          Generate three distinct names based on the selected direction.  
          Do not produce minor wording variations of the same name.

      profile\_headline:  
        purpose: \>  
          Explore different ways of expressing the creator's work  
          in a concise public headline.

        generation\_strategy: controlled\_variations  
        candidate\_count: 3

        default\_directions:  
          \- clearer  
          \- warmer  
          \- more\_direct  
          \- more\_expressive  
          \- simpler

        adaptive\_directions:  
          enabled: true

        generation\_rule: \>  
          Generate three interpretations of the selected direction while  
          preserving the creator's confirmed meaning.

      about:  
        purpose: \>  
          Explore different ways of representing the creator and their  
          work in public language.

        generation\_strategy: controlled\_variations  
        candidate\_count: 3

        default\_directions:  
          \- clearer  
          \- more\_natural\_to\_my\_voice  
          \- focus\_on\_why\_it\_matters  
          \- focus\_on\_what\_i\_create  
          \- more\_concise

        adaptive\_directions:  
          enabled: true

        generation\_rule: \>  
          Generate three versions that apply the selected direction  
          without adding unsupported identity, story, or claims.

      discovery\_tags:  
        purpose: \>  
          Explore discovery-tag directions that preserve the creator's  
          expression while making the profile understandable and relevant  
          to appropriate discovery contexts.

        generation\_strategy: grouped\_sets  
        candidate\_count: 3

        default\_directions:  
          \- offering\_focused  
          \- experience\_focused  
          \- people\_and\_context\_focused

        adaptive\_directions:  
          enabled: true

        generation\_rule: \>  
          Generate three cohesive tag sets based on the selected direction.  
          Each set should function as one selectable discovery strategy.

    adaptive\_direction:  
      generated\_from:  
        \- creator\_story  
        \- creator\_language  
        \- selected\_expression\_style  
        \- previous\_refinement\_choices  
        \- current\_generated\_profile  
        \- creator\_feedback  
        \- manual\_edits

      possible\_examples:  
        \- more\_grounded  
        \- more\_playful  
        \- more\_community\_oriented  
        \- more\_practical  
        \- emphasize\_traditional\_herbalism  
        \- emphasize\_dreamwork  
        \- emphasize\_personal\_story  
        \- emphasize\_nature\_connection

      guardrail: \>  
        Examples are not a fixed list. An adaptive direction must be  
        grounded in information the creator shared or selected.

    refinement\_sequence:  
      \- select\_target  
      \- select\_direction  
      \- generate\_candidates  
      \- compare\_candidates  
      \- select\_candidate  
      \- confirm\_selection  
      \- continue\_or\_return\_to\_review

    selection\_actions:  
      \- use\_this  
      \- keep\_current\_version  
      \- regenerate\_same\_direction  
      \- explore\_another\_direction  
      \- provide\_custom\_direction  
      \- edit\_directly  
      \- skip

    on\_selection:  
      \- update\_only\_selected\_target  
      \- preserve\_other\_confirmed\_outputs  
      \- record\_selected\_direction  
      \- record\_selected\_candidate  
      \- continue\_to\_next\_target\_or\_review

    transition:  
      purpose: \>  
        Acknowledge the previous choice, optionally communicate temporary  
        adaptation, introduce the next profile element, and invite further  
        exploration.

      structure:  
        acknowledge\_previous\_choice:  
          required: false

        communicate\_temporary\_learning:  
          required: false

        introduce\_next\_element:  
          required: true

        invite\_exploration:  
          required: true

      language\_flexibility: \>  
        Weave may phrase the transition naturally according to the  
        conversation. It does not need to use a fixed script.

    preference\_learning:  
      scope: current\_session\_only

      sources:  
        \- selected\_direction  
        \- selected\_generation  
        \- manual\_edits  
        \- creator\_feedback

      may\_influence:  
        \- future\_generation  
        \- adaptive\_direction\_recommendations  
        \- transition\_language

      constraints:  
        \- never\_assume\_permanent\_preference  
        \- do\_not\_apply\_one\_output\_preference\_to\_all\_outputs  
        \- creator\_can\_override\_anytime  
        \- preference\_does\_not\_define\_creator\_identity

    repeated\_rejection:  
      when:  
        \- creator\_rejects\_multiple\_generations

      response\_direction:  
        \- stop\_regenerating\_automatically  
        \- ask\_what\_feels\_inaccurate  
        \- distinguish\_meaning\_from\_tone\_problem  
        \- confirm\_source\_material\_before\_continuing

  \- id: completion  
    order: 10

    purpose: \>  
      Confirm the creator's decision, publish or save the profile,  
      and reinforce that the profile may continue evolving.

    publish\_response: \>  
      Your profile is now live on Resonance.

      We've shaped a first creator presence from the story, atmosphere,  
      and language you shared. You can continue evolving it as your  
      creation becomes clearer.

    save\_draft\_response: \>  
      Your profile foundation has been saved. You can return whenever  
      you'd like to continue shaping or publishing it.

    next\_steps:  
      selection\_type: single

      options:  
        \- create\_profile\_image  
        \- create\_cover\_image  
        \- refine\_profile  
        \- finish\_for\_now

    completion\_data:  
      decision:  
        \- published  
        \- saved\_draft  
        \- placeholders  
        \- exited

      accepted\_outputs:  
        creator\_name: boolean  
        headline: boolean  
        about: boolean  
        discovery\_tags: boolean

minimum\_information\_requirements:  
  minimum\_required\_for\_generation:  
    \- offering\_expression  
    \- intended\_experience

  recommended:  
    \- origin  
    \- resonance\_moment  
    \- resonant\_people  
    \- expression\_style

  optional:  
    \- creator\_name

  rule: \>  
    Missing recommended information may reduce detail but should not  
    block generation.

evaluation\_signals:

  completion:  
    \- interview\_completed  
    \- profile\_generated  
    \- profile\_published  
    \- profile\_saved\_as\_draft  
    \- stage\_abandoned

  friction:  
    \- skipped\_question  
    \- repeated\_uncertainty  
    \- requested\_rephrasing  
    \- regenerated\_output  
    \- rejected\_output  
    \- repeated\_refinement

  alignment:  
    \- creator\_accepted\_summary  
    \- creator\_corrected\_interpretation  
    \- creator\_said\_output\_felt\_accurate  
    \- creator\_said\_output\_felt\_unlike\_them  
    \- creator\_restored\_original\_version

  pacing:  
    \- completion\_time  
    \- number\_of\_follow\_ups  
    \- number\_of\_revision\_cycles  
    \- time\_per\_stage

  output\_quality:  
    \- creator\_name\_accepted  
    \- headline\_accepted  
    \- about\_accepted  
    \- tags\_accepted  
    \- direct\_edit\_frequency  
    \- regeneration\_frequency

  refinement:  
    \- refinement\_entered  
    \- target\_selected  
    \- default\_direction\_selected  
    \- adaptive\_direction\_selected  
    \- custom\_direction\_used  
    \- first\_candidate\_accepted  
    \- candidate\_changed  
    \- current\_version\_retained

  preference\_learning:  
    \- repeated\_direction\_selection  
    \- manual\_edit\_after\_selection  
    \- adaptive\_direction\_acceptance

evolution\_boundaries:

  flow\_local:  
    examples:  
      \- question\_wording  
      \- stage\_order  
      \- optional\_branches  
      \- output\_format  
      \- target\_specific\_refinement\_directions  
      \- minimum\_information\_requirement

  behavior\_rule\_candidate:  
    examples:  
      \- preserve\_unaffected\_outputs  
      \- revise\_only\_selected\_target  
      \- treat\_generated\_identity\_as\_provisional  
      \- stop\_regenerating\_after\_repeated\_rejection

  conversation\_heuristic\_candidate:  
    examples:  
      \- uncertainty\_may\_mean\_question\_is\_too\_broad  
      \- repeated\_rejection\_may\_signal\_meaning\_mismatch  
      \- creator\_may\_prefer\_less\_depth  
      \- short\_answer\_may\_be\_complete\_or\_hesitant

  principle\_candidate:  
    examples:  
      \- recurring\_foundational\_relationship\_pattern  
      \- stable\_creator\_sovereignty\_requirement  
      \- repeated\_need\_across\_many\_interactions

version\_history:  
  \- version: 1.0  
    status: initial\_mvp  
    notes:  
      \- structured\_emerging\_creator\_onboarding  
      \- supports\_quick\_guided\_and\_reflective\_depth  
      \- generates\_initial\_profile\_foundation

  \- version: 1.1  
    status: refined\_mvp  
    notes:  
      \- normalized\_yaml\_structure  
      \- clarified\_supporting\_output\_visibility  
      \- added\_contextual\_collaborative\_refinement  
      \- limited\_refinement\_directions\_to\_five  
      \- enabled\_grounded\_adaptive\_directions  
      \- reduced\_minimum\_generation\_requirements  
      \- replaced\_traffic\_prediction\_with\_foundability\_clarity\_feedback  
      \- expanded\_evaluation\_and\_evolution\_signals  


[image1]: <data:image/png;base64,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>
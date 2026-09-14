import type {
  CreatorOnboardingActionModel,
  CreatorOnboardingChoice,
  CreatorOnboardingStage,
} from "@resonance/core";

/**
 * Weave's words for the `snapshot-v1` creator interview, kept apart from the stage rules so
 * copy can change without touching a transition.
 *
 * Prose, placeholders, labels and options are transcribed from the captured design states
 * (opening `1473:81547`, name `1473:81553`, offering `1473:81556`, origin `1473:81565`,
 * intended experience `1473:81568`, resonance moment `1473:81571`, resonant people
 * `1473:81574`, expression style `1556:79716`, summary `1485:48994`, foundation `2065:58399`,
 * completion `1443:78273`). Where a design is silent or draws a capability that does not exist
 * yet, the copy is kept minimal and the departure is noted beside it.
 */

/** The composer placeholder every free-text stage shares in the designs. */
export const COMPOSER_PLACEHOLDER = "Talk to Weave";

export const OPENING_PROMPT = [
  "Beautiful — we can start gently.",
  "You don’t need a finished business to begin. I’ll help shape what you want to create into a clear first version of your creator profile.",
  "We’ll turn what you share into a creator name, headline, About section, and search keywords.",
  "This usually takes about 5–10 minutes.",
  "Would you like to begin?",
];

export const CREATOR_NAME_PROMPT = [
  "Perfect.",
  "To start — what’s the name of your project, business, or creative practice?",
];
export const CREATOR_NAME_PLACEHOLDER = "Type your business or project name";

export const OFFERING_PROMPT = [
  "Let me understand more about what you’re drawn to creating.",
  "What do you want to offer or share?",
  "Products, services, sessions, experiences — anything you might share with others.",
];

export const ORIGIN_PROMPT = [
  "That gives me a clearer sense of your direction.",
  "This next question helps me understand why this matters to you right now.",
  "Was there a moment or experience that shaped how you started creating this?",
];

export const INTENDED_EXPERIENCE_PROMPT = [
  "That feels like a grounded place to begin.",
  "When someone receives your offering or joins one of your sessions, what do you hope they experience?",
];

export const RESONANCE_MOMENT_PROMPT = [
  "This helps me understand when your work has already felt meaningful in real life.",
  "Is there a moment, memory, or response that made you think:",
  "“Yes… this is why I do this”?",
];

export const RESONANT_PEOPLE_PROMPT = [
  "Your stories help the right people find you.",
  "Who do you want to connect with?",
];

export const EXPRESSION_STYLE_PROMPT = [
  "What overall expression style feels closest to what you’re creating?",
  "This helps me shape your profile atmosphere, visual direction, future offerings, and the overall feeling people may experience when they encounter your work.",
];

/**
 * The option id that means "the creator wants their own direction". Picking it without
 * describing that direction is refused, because an empty custom style tells a generator nothing.
 */
export const CUSTOM_DIRECTION_CHOICE_ID = "custom_direction";

/**
 * Stable ids for the Figma expression-style set. Ids are stored; labels are only rendered, so a
 * restyled or translated label never orphans a stored answer.
 */
export const EXPRESSION_STYLE_OPTIONS: readonly CreatorOnboardingChoice[] = [
  { id: "calm_clean", label: "Calm & Clean" },
  { id: "dreamy_reflective", label: "Dreamy & Reflective" },
  { id: "bold_expressive", label: "Bold & Expressive" },
  { id: CUSTOM_DIRECTION_CHOICE_ID, label: "Custom direction" },
];

/**
 * Recorded when the creator presses Choose for me. The behaviour cannot pick a style itself —
 * it makes no model call — so it records the delegation and the generator makes the choice.
 */
export const WEAVE_CHOOSES_CHOICE_ID = "weave_chooses";

/**
 * Recorded when the creator presses I'd like help on the name stage. Any name they typed rides
 * along as `customText`, marking it provisional; nothing is invented to advance.
 */
export const NAME_HELP_WANTED_CHOICE_ID = "help_wanted";

export const SUMMARY_OPENING = [
  "That gives me a much clearer sense of the atmosphere surrounding your work already.",
  "Here’s what I’m beginning to understand from what you shared.",
];
export const SUMMARY_CLOSING = [
  "Before I create the first version:",
  "Is there anything else you want included?",
  "A feeling, direction, or simple word is enough.",
];

/**
 * The design's second line reads "Keep what already feels like you, or explore another
 * direction together." — an invitation to the Revise with Weave refinement that is not built
 * (ADR-0022), so it is replaced with one that points at the direct editing that is.
 */
export const FOUNDATION_PROMPT = [
  "Here is your first profile foundation.",
  "Keep what already feels like you, and edit anything that doesn’t.",
  "Nothing here is permanent.",
];

export const COMPLETION_PROMPT = [
  "Your profile is now live on Resonance.",
  "I applied the story, atmosphere, and language you shared to build your first creator presence.",
  "From here, I can also help you:",
];

/**
 * The one question each answer stage asks, handed to the foundation generator beside the answer
 * so it drafts from what was actually asked rather than from a stage id alone.
 */
export const STAGE_QUESTIONS: Partial<Record<CreatorOnboardingStage, string>> = {
  creator_name: "What’s the name of your project, business, or creative practice?",
  offering: "What do you want to offer or share?",
  origin: "Was there a moment or experience that shaped how you started creating this?",
  intended_experience:
    "When someone receives your offering or joins one of your sessions, what do you hope they experience?",
  resonance_moment:
    "Is there a moment, memory, or response that made you think: “Yes… this is why I do this”?",
  resonant_people: "Who do you want to connect with?",
  expression_style: "What overall expression style feels closest to what you’re creating?",
  summary: "Is there anything else you want included?",
};

const available = (
  id: CreatorOnboardingActionModel["id"],
  label: string,
  emphasis: CreatorOnboardingActionModel["emphasis"],
): CreatorOnboardingActionModel => ({ id, label, emphasis, availability: "available" });

// Emphasis follows the drawn treatment: filled buttons are primary, outlined ones secondary,
// bare links text.
export const BEGIN = available("begin", "Yes let’s begin", "secondary");
export const LATER = available("later", "I want to do it later", "text");
export const GOOD_TO_GO = available("submit", "Good to go", "primary");
export const READY = available("submit", "Yes I’m ready", "primary");
export const REQUEST_HELP = available("request_help", "I’d like help", "secondary");
export const CHOOSE_FOR_ME = available("choose_for_me", "Choose for me", "secondary");
export const SKIP = available("skip", "Skip", "text");

/**
 * The Onboarded rail, in the order drawn (`1443:78273`). Only Finish for now exists; the other
 * three are real future flows, so they are offered as `coming_soon` rather than hidden.
 */
export const COMPLETION_ACTIONS: readonly CreatorOnboardingActionModel[] = [
  {
    id: "create_profile_image",
    label: "Create profile image",
    emphasis: "secondary",
    availability: "coming_soon",
  },
  {
    id: "create_cover_image",
    label: "Create cover image",
    emphasis: "secondary",
    availability: "coming_soon",
  },
  {
    id: "refine_profile",
    label: "Refine profile",
    emphasis: "secondary",
    availability: "coming_soon",
  },
  available("finish", "Finish for now", "text"),
];

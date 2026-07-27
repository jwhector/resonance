// @resonance/ui — the Resonance design system (ADR-0012).
// Public surface only; internals live under src/ and are not exported.

export { cn } from "./lib/cn";
export * as tokens from "./tokens";

// Primitives
export { Button, buttonVariants, type ButtonProps } from "./primitives/button";
export { TextInput, type TextInputProps } from "./primitives/text-input";
export { Checkbox, type CheckboxProps } from "./primitives/checkbox";
export { Radio, RadioGroup, type RadioProps, type RadioGroupProps } from "./primitives/radio";
export { OtpInput, type OtpInputProps } from "./primitives/otp-input";
export { MailIcon, type MailIconProps } from "./primitives/mail-icon";
export { Textarea, type TextareaProps } from "./primitives/textarea";
export { Tag, TagGroup, type TagProps, type TagGroupProps } from "./primitives/tag";

// Composites
export { AppNav, type AppNavProps } from "./components/app-nav";
export {
  CreateAccountCard,
  type CreateAccountCardProps,
  type CreateAccountValues,
} from "./components/create-account-card";
export { EmailVerifyCard, type EmailVerifyCardProps } from "./components/email-verify-card";
export {
  IntentPickerCard,
  INTENT_OPTIONS,
  type IntentPickerCardProps,
  type OnboardingIntent,
} from "./components/intent-picker-card";
export {
  WeaveInterviewRail,
  type WeaveInterviewRailProps,
} from "./components/weave-interview-rail";
export {
  ProfileDraftPanels,
  type ProfileDraftPanelsProps,
} from "./components/profile-draft-panels";

// Member discovery — the `Member/Search/Result/*` chrome (design/manifest/screens/12-search-creators)
export { SearchBar, type SearchBarProps } from "./components/search-bar";
export { ResultTabs, RESULT_TAB_ORDER, type ResultTabsProps } from "./components/result-tabs";
export {
  CreatorResultRow,
  initialsFor,
  type CreatorResultRowProps,
} from "./components/creator-result-row";
export { CreatorResultList, type CreatorResultListProps } from "./components/creator-result-list";
export {
  ComingSoonState,
  NoResultsState,
  type ComingSoonKind,
  type ComingSoonStateProps,
  type NoResultsStateProps,
} from "./components/discovery-empty-states";

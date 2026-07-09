/**
 * Onboarding route-group layout. The sign-up + verify screens are cardless on a white
 * page (Figma `CreateAccount` / `EmailVerication`), so the group sits on `bg-surface`
 * (white) rather than the gray app background. Composition only.
 */
export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen w-full bg-surface">{children}</div>;
}

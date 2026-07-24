import { IntentForm } from "./intent-form";

/**
 * `/start` — the pre-onboarding intent fork ("What brought you?", Figma `1519:78312`).
 * The true front door: it forks creators into `/signup` and members toward discovery.
 * Server shell that centres the client `IntentForm`; composition only.
 */
export default function StartPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6">
      <IntentForm />
    </main>
  );
}

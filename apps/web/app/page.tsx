import { Button } from "@resonance/ui";

/**
 * Foundation landing page — exists to prove the scaffold boots and the design system
 * (tokens + Button primitive + brand gradient) renders. The real onboarding flow
 * (Creator Interview → ProfileGen, ADR-0013) replaces this in the slice phase.
 */
export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-8 px-6 text-center">
      <span className="rounded-pill bg-primary-100 px-4 py-1 text-sm font-medium text-primary-800">
        Scaffold · foundation phase
      </span>
      <h1 className="text-5xl font-bold tracking-tight">
        <span className="bg-brand-gradient bg-clip-text text-transparent">Resonance</span>
      </h1>
      <p className="max-w-xl text-lg text-muted">
        An AI-centric e-commerce and community platform. It interviews you about your passions and
        offerings, builds your profile, and connects you to people who resonate with what you make.
      </p>
      <div className="flex gap-3">
        <Button size="lg">Get started</Button>
        <Button size="lg" variant="outline">
          Explore creators
        </Button>
      </div>
      <p className="text-sm text-subtle">Reference slice next: the Weave onboarding interview.</p>
    </main>
  );
}

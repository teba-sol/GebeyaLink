import { OnboardingFlow } from '@/features/onboarding/components/onboarding-flow';
import { requireOnboardingSession } from '@/lib/session';

export default async function OnboardingPage() {
  const session = await requireOnboardingSession();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="font-mono text-[0.6875rem] font-semibold tracking-[0.18em] text-ink-faint uppercase">
          Onboarding
        </p>
        <h1 className="font-display text-3xl font-semibold">
          Register your organization
        </h1>
        <p className="max-w-[56ch] text-sm text-ink-soft">
          Welcome, {session.user.name}. Tell us which organization you represent
          and submit it for verification. An administrator approves it before you
          can trade on GebeyaLink.
        </p>
      </div>
      <OnboardingFlow />
    </div>
  );
}

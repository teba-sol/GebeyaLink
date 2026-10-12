import { SignUpForm } from '@/features/auth/components/sign-up-form';
import { Eyebrow } from '@/features/ui';

export default function SignUpPage() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Eyebrow>Create account</Eyebrow>
        <h1 className="font-display text-2xl font-semibold">
          Join GebeyaLink
        </h1>
        <p className="text-sm text-ink-soft">
          One account for buying, selling and field operations.
        </p>
      </div>

      <SignUpForm />
    </div>
  );
}
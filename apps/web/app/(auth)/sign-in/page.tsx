import { SignInForm } from '@/features/auth/components/sign-in-form';
import { Eyebrow } from '@/features/ui';

export default function SignInPage() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Eyebrow>Sign in</Eyebrow>
        <h1 className="font-display text-2xl font-semibold">Welcome back</h1>
        <p className="text-sm text-ink-soft">
          Sign in to order, list stock or run field operations.
        </p>
      </div>

      <SignInForm />
    </div>
  );
}
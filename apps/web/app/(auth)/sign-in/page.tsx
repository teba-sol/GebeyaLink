import Link from 'next/link';

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

      <form className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Email
          <input
            className="ds-search h-10"
            type="email"
            name="email"
            autoComplete="email"
            placeholder="you@cooperative.et"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Password
          <input
            className="ds-search h-10"
            type="password"
            name="password"
            autoComplete="current-password"
            placeholder="••••••••"
          />
        </label>
        <button
          type="submit"
          className="mt-1 h-10 rounded-btn border border-accent bg-accent text-sm font-medium text-white hover:opacity-90"
        >
          Sign in
        </button>
      </form>

      <p className="text-sm text-ink-soft">
        No account yet?{' '}
        <Link href="/sign-up" className="font-medium text-accent">
          Create one
        </Link>
      </p>
    </div>
  );
}

import Link from 'next/link';

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

      <form className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Name
          <input
            className="ds-search h-10"
            type="text"
            name="name"
            autoComplete="name"
            placeholder="Your full name"
          />
        </label>
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
            autoComplete="new-password"
            placeholder="At least 8 characters"
          />
        </label>
        <button
          type="submit"
          className="mt-1 h-10 rounded-btn border border-accent bg-accent text-sm font-medium text-white hover:opacity-90"
        >
          Create account
        </button>
      </form>

      <p className="text-sm text-ink-soft">
        Already registered?{' '}
        <Link href="/sign-in" className="font-medium text-accent">
          Sign in
        </Link>
      </p>
    </div>
  );
}

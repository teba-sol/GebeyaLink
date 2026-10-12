'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { authClient } from '@/lib/api/auth-client';

export function SignUpForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get('name') ?? '');
    const email = String(form.get('email') ?? '');
    const password = String(form.get('password') ?? '');
    setError(null);

    startTransition(async () => {
      const res = await authClient.signUp.email({ name, email, password });
      if (res.error) {
        setError(res.error.message ?? 'Account creation failed.');
        return;
      }
      router.push('/');
      router.refresh();
    });
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {error ? (
        <p
          className="rounded-btn border border-danger/40 bg-danger-soft px-3 py-2 text-xs font-medium text-danger"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Name
        <input
          className="ds-search h-10"
          type="text"
          name="name"
          required
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
          required
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
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="At least 8 characters"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="mt-1 h-10 rounded-btn border border-accent bg-accent text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
      >
        {pending ? 'Creating account…' : 'Create account'}
      </button>
      <p className="text-sm text-ink-soft">
        Already registered?{' '}
        <Link href="/sign-in" className="font-medium text-accent">
          Sign in
        </Link>
      </p>
    </form>
  );
}
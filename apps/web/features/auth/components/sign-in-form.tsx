'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { authClient } from '@/lib/api/auth-client';
import { roleHomeFromString } from '@/lib/session/role-home';

export function SignInForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') ?? '');
    const password = String(form.get('password') ?? '');
    setError(null);

    startTransition(async () => {
      const res = await authClient.signIn.email({ email, password });
      if (res.error) {
        setError(res.error.message ?? 'Sign-in failed. Check your details.');
        return;
      }
      let destination = roleHomeFromString(null);
      try {
        const me = await fetch('/api/v1/me', {
          headers: { accept: 'application/json' },
        });
        const body = (await me.json().catch(() => null)) as
          | { data: { role: string | null } }
          | null;
        destination = roleHomeFromString(body?.data?.role ?? null);
      } catch {
        destination = roleHomeFromString(null);
      }
      router.push(destination);
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
          autoComplete="current-password"
          placeholder="••••••••"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="mt-1 h-10 rounded-btn border border-accent bg-accent text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
      >
        {pending ? 'Signing in…' : 'Sign in'}
      </button>
      <p className="text-sm text-ink-soft">
        No account yet?{' '}
        <Link href="/sign-up" className="font-medium text-accent">
          Create one
        </Link>
      </p>
    </form>
  );
}
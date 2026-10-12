import Link from 'next/link';
import type { ReactNode } from 'react';

import { SignOutButton } from '@/features/auth/components/sign-out-button';

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[var(--container-page)] flex-col px-6 py-10 lg:px-10">
      <header className="flex items-center justify-between">
        <Link href="/" className="font-display text-lg font-semibold">
          GebeyaLink
        </Link>
        <SignOutButton className="rounded-btn border border-line-strong bg-surface px-4 py-2 text-sm font-medium text-ink hover:bg-surface-2" />
      </header>
      <main className="mx-auto mt-12 w-full max-w-3xl">{children}</main>
    </div>
  );
}

'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

import { authClient } from '@/lib/api/auth-client';

export function SignOutButton({ className = '' }: { className?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      className={className}
      onClick={() =>
        startTransition(async () => {
          await authClient.signOut();
          router.push('/');
          router.refresh();
        })
      }
    >
      Sign out
    </button>
  );
}
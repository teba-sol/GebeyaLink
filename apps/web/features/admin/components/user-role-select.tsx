'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { ApiError, api } from '@/lib/api/client';
import type { PlatformRole } from '@gebeyalink/types';

const ROLES: { value: PlatformRole | ''; label: string }[] = [
  { value: '', label: 'No role' },
  { value: 'admin', label: 'Admin' },
  { value: 'cooperative_staff', label: 'Cooperative staff' },
  { value: 'collection_agent', label: 'Collection agent' },
  { value: 'buyer', label: 'Buyer' },
  { value: 'transporter', label: 'Transporter' },
];

const LABELS: Record<PlatformRole, string> = {
  admin: 'Admin',
  cooperative_staff: 'Cooperative staff',
  collection_agent: 'Collection agent',
  buyer: 'Buyer',
  transporter: 'Transporter',
};

export function UserRoleSelect({
  userId,
  role,
}: {
  userId: string;
  role: PlatformRole | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const change = (next: string) => {
    setError(null);
    startTransition(async () => {
      try {
        await api.updateUserRole(userId, next === '' ? null : (next as PlatformRole));
        router.refresh();
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'That could not be completed.');
      }
    });
  };

  return (
    <div className="flex flex-col gap-1">
      <label className="sr-only" htmlFor={`role-${userId}`}>
        Platform role
      </label>
      <select
        id={`role-${userId}`}
        className="ds-search h-9 w-52"
        value={role ?? ''}
        disabled={pending}
        onChange={(event) => change(event.target.value)}
      >
        {ROLES.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {role ? (
        <span className="text-[0.6875rem] text-ink-faint">Currently {LABELS[role]}</span>
      ) : null}
      {error ? (
        <p className="text-xs text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
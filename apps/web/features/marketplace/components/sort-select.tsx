'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
] as const;

export function SortSelect({ sort }: { sort: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const onChange = (value: string) => {
    const next = new URLSearchParams(searchParams.toString());
    if (value === 'newest') next.delete('sort');
    else next.set('sort', value);
    next.delete('page');
    const query = next.toString();
    startTransition(() => router.push(query ? `${pathname}?${query}` : pathname));
  };

  return (
    <label className="flex items-center gap-2 text-sm text-ink-soft">
      <span className="hidden sm:inline">Sort</span>
      <select
        className="h-9 rounded-btn border border-line-strong bg-surface px-3 text-sm font-medium text-ink disabled:opacity-40"
        value={sort}
        disabled={pending}
        onChange={(event) => onChange(event.target.value)}
        aria-label="Sort commodities"
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
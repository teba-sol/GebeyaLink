import Link from 'next/link';

import { Card, Eyebrow } from '@/features/ui';
import { requirePageRole } from '@/lib/session';

export default async function AdminOverviewPage() {
  await requirePageRole('admin');

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Eyebrow>Platform · oversight</Eyebrow>
        <h1 className="font-display text-4xl font-semibold">Administration</h1>
      </div>

      <Card padding="lg" className="flex flex-col items-start gap-3">
        <p className="text-ink-soft">
          Platform health — cooperatives, product categories and moderation
          queues — arrives in F1.
        </p>
        <Link
          href="/design-system"
          className="rounded-btn border border-line-strong bg-surface px-4 py-2 text-sm font-medium hover:bg-surface-2"
        >
          View design system
        </Link>
      </Card>
    </div>
  );
}

import Link from 'next/link';

import { Card, Eyebrow } from '@/features/ui';

export default function MarketplacePage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Eyebrow>Buyer · discovery</Eyebrow>
        <h1 className="font-display text-4xl font-semibold">Marketplace</h1>
      </div>

      <Card padding="lg" className="flex flex-col items-start gap-3">
        <p className="text-ink-soft">
          Live listings, filters and ordering arrive in F1. The composition is
          locked in the design system.
        </p>
        <Link
          href="/design-system"
          className="rounded-btn border border-line-strong bg-surface px-4 py-2 text-sm font-medium hover:bg-surface-2"
        >
          View reference composition
        </Link>
      </Card>
    </div>
  );
}

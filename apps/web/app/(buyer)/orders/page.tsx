import Link from 'next/link';

import { Card, Eyebrow } from '@/features/ui';
import { requirePageRole } from '@/lib/session';

export default async function BuyerOrdersPage() {
  const session = await requirePageRole('buyer');

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Eyebrow>{`Buyer · ${session.user.email}`}</Eyebrow>
        <h1 className="font-display text-4xl font-semibold">Your orders</h1>
      </div>

      <Card padding="lg" className="flex flex-col items-start gap-3">
        <p className="text-ink-soft">
          The order journey — pending through delivered — renders here once
          F1 wires live order data.
        </p>
        <Link
          href="/design-system"
          className="rounded-btn border border-line-strong bg-surface px-4 py-2 text-sm font-medium hover:bg-surface-2"
        >
          View journey reference
        </Link>
      </Card>
    </div>
  );
}

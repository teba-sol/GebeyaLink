import Link from 'next/link';

import { Card, Eyebrow } from '@/features/ui';
import { requirePageRole } from '@/lib/session';

export default async function InventoryPage() {
  await requirePageRole('cooperative_staff');

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Eyebrow>Cooperative · stock</Eyebrow>
        <h1 className="font-display text-4xl font-semibold">Inventory</h1>
      </div>

      <Card padding="lg" className="flex flex-col items-start gap-3">
        <p className="text-ink-soft">
          Lots with lifecycle status (available → reserved → committed →
          dispatched → sold) render here from live data in F1.
        </p>
        <Link
          href="/design-system"
          className="rounded-btn border border-line-strong bg-surface px-4 py-2 text-sm font-medium hover:bg-surface-2"
        >
          View operations reference
        </Link>
      </Card>
    </div>
  );
}

import { Card, Eyebrow } from '@/features/ui';
import { requirePageRole } from '@/lib/session';

export default async function OpsOverviewPage() {
  await requirePageRole('cooperative_staff');

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Eyebrow>Cooperative · overview</Eyebrow>
        <h1 className="font-display text-4xl font-semibold">Operations</h1>
      </div>

      <Card padding="lg" className="flex flex-col gap-2">
        <p className="text-ink-soft">
          Stock health, incoming orders and dispatch work land here in F1 —
          composed from the same primitives as the reference operations screen.
        </p>
      </Card>
    </div>
  );
}

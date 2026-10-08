import { Card, Eyebrow } from '@/features/ui';
import { requirePageRole } from '@/lib/session';

export default async function CooperativesPage() {
  await requirePageRole('admin');

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Eyebrow>Platform · cooperatives</Eyebrow>
        <h1 className="font-display text-4xl font-semibold">Cooperatives</h1>
      </div>

      <Card padding="lg" className="flex flex-col gap-2">
        <p className="text-ink-soft">
          Cooperative registration, membership review and soft-delete oversight
          render here in F1.
        </p>
      </Card>
    </div>
  );
}

import { Card, Eyebrow } from '@/features/ui';
import { requirePageRole } from '@/lib/session';

export default async function AgentTodayPage() {
  await requirePageRole('collection_agent');

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Eyebrow>Collection agent · today</Eyebrow>
        <h1 className="font-display text-4xl font-semibold">Pick-ups</h1>
      </div>

      <Card padding="lg" className="flex flex-col gap-2">
        <p className="text-ink-soft">
          Assigned pick-ups, quantity capture and handoff confirmation render
          here on live data in F1.
        </p>
      </Card>
    </div>
  );
}

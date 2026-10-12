import { RecordDelivery } from '@/features/agent/components/record-delivery';
import {
  getAgentProductCatalog,
  listAgentCenters,
  listAgentFarmers,
} from '@/features/agent/queries';
import { Eyebrow } from '@/features/ui';
import { requirePageRole } from '@/lib/session';

export default async function AgentNewRecordingPage(props: {
  searchParams: Promise<{ center?: string }>;
}) {
  const session = await requirePageRole('collection_agent');
  const { center } = await props.searchParams;

  const [centers, farmers, products] = await Promise.all([
    listAgentCenters(session),
    listAgentFarmers(session, { page: 1, limit: 100 }),
    getAgentProductCatalog(session),
  ]);

  const centerId = centers.some((c) => c.id === center) ? center : undefined;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Eyebrow>Collection agent · pick-up</Eyebrow>
        <h1 className="font-display text-3xl font-semibold">Record delivery</h1>
      </div>

      <RecordDelivery
        centers={centers}
        farmers={farmers}
        products={products}
        initialCenterId={centerId}
      />
    </div>
  );
}
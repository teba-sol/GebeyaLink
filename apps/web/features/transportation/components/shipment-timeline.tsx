import type { OrderStatus, ShipmentDto } from '@gebeyalink/types';

import { buildTransportSteps } from '@/features/orders/components/journey';
import { JourneyStepper } from '@/features/ui';

/** The shipment's own progression — same rail as the order journey. */
export function ShipmentTimeline({
  orderStatus,
  shipment,
}: {
  orderStatus: OrderStatus;
  shipment: ShipmentDto;
}) {
  return (
    <JourneyStepper
      label="Shipment journey"
      steps={buildTransportSteps(orderStatus, shipment)}
    />
  );
}

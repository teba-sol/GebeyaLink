import { notFound } from 'next/navigation';

import { OrderActions } from '@/features/orders/components/order-actions';
import { OrderJourney } from '@/features/orders/components/journey';
import { OrderSummary } from '@/features/orders/components/order-summary';
import { ResponseCountdown } from '@/features/orders/components/response-countdown';
import { PaymentAttempts } from '@/features/orders/components/payment-attempts';
import { getOrder, getPayments } from '@/features/orders/queries';
import { getProductCatalog, productName } from '@/features/marketplace/queries';
import { DeliveryConfirm } from '@/features/transportation/components/delivery-confirm';
import { ShipmentSummary } from '@/features/transportation/components/shipment-summary';
import { getOrderShipment } from '@/features/transportation/queries';
import { Card, StatusMark } from '@/features/ui';
import { requirePageRole } from '@/lib/session';

export default async function OrderPage(props: { params: Promise<{ id: string }> }) {
  const session = await requirePageRole('buyer');
  const { id } = await props.params;

  const [catalog, order, attempts, shipment] = await Promise.all([
    getProductCatalog(session),
    getOrder(session, id).catch(() => null),
    getPayments(session, id).catch(() => []),
    getOrderShipment(session, id).catch(() => null),
  ]);
  if (!order) notFound();

  const name = productName(catalog, order.productId);

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,4fr)]">
      <Card padding="lg" className="flex flex-col gap-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[0.6875rem] font-semibold tracking-[0.18em] text-ink-faint uppercase">
              Order details
            </p>
            <h3 className="mt-1 font-display text-2xl font-semibold">{name}</h3>
            <p className="mt-1 text-sm text-ink-soft">
              Grade {order.qualityGrade} · {new Intl.NumberFormat('en-US').format(order.quantity)} kg
            </p>
          </div>
          <div className="flex flex-col items-end gap-3">
            <StatusMark status={order.status} />
            {order.status === 'PENDING' ? (
              <ResponseCountdown expiresAt={order.expiresAt} />
            ) : null}
          </div>
        </div>

        <OrderJourney order={order} attempts={attempts} shipment={shipment} />
      </Card>

      <div className="flex flex-col gap-6">
        <OrderSummary order={order} productName={name} />

        {shipment ? (
          <div className="flex flex-col gap-4">
            <ShipmentSummary shipment={shipment} />
            {shipment.status === 'DELIVERED' ? <DeliveryConfirm shipmentId={shipment.id} /> : null}
          </div>
        ) : null}

        <div className="flex flex-col gap-4">
          <p className="font-mono text-[0.6875rem] font-semibold tracking-[0.18em] text-ink-faint uppercase">
            Payment attempts
          </p>
          <PaymentAttempts attempts={attempts} />
        </div>

        <OrderActions
          orderId={order.id}
          status={order.status}
          productTotal={order.productTotal}
          paymentStatus={order.paymentStatus}
        />
      </div>
    </div>
  );
}

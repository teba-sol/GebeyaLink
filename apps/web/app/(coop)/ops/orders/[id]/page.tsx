import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getCoopOrder } from '@/features/coop/queries';
import { AcceptReject } from '@/features/coop/components/accept-reject';
import { VerifyPayment } from '@/features/coop/components/payment-verify';
import { ResponseDeadline } from '@/features/coop/components/response-deadline';
import { getProductCatalog, productName } from '@/features/marketplace/queries';
import { OrderJourney } from '@/features/orders/components/journey';
import { OrderSummary } from '@/features/orders/components/order-summary';
import { PaymentAttempts } from '@/features/orders/components/payment-attempts';
import { ArrangeTransport } from '@/features/transportation/components/arrange-transport';
import { PickupConfirm } from '@/features/transportation/components/pickup-confirm';
import { ShipmentSummary } from '@/features/transportation/components/shipment-summary';
import { getOrderShipment, listApprovedTransporters } from '@/features/transportation/queries';
import { Card, StatusMark } from '@/features/ui';
import { requirePageRole } from '@/lib/session';

export default async function CoopOrderPage(props: { params: Promise<{ id: string }> }) {
  const session = await requirePageRole('cooperative_staff');
  const { id } = await props.params;

  const [catalog, data, shipment, transporters] = await Promise.all([
    getProductCatalog(session),
    getCoopOrder(session, id).catch(() => null),
    getOrderShipment(session, id).catch(() => null),
    listApprovedTransporters(),
  ]);
  if (!data) notFound();

  const { order, attempts } = data;
  const pendingPayment = attempts.find((a) => a.status === 'PENDING');
  const canConfirmPickup =
    shipment !== null &&
    !shipment.coopPickupConfirmedAt &&
    (shipment.status === 'PICKUP_PENDING' || shipment.status === 'PICKUP_CONFIRMED');

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[0.6875rem] font-semibold tracking-[0.18em] text-ink-faint uppercase">
            Order details
          </p>
          <h3 className="mt-1 font-display text-2xl font-semibold">
            {productName(catalog, order.productId)}
          </h3>
          <p className="mt-1 text-sm text-ink-soft">
            {order.buyerName ?? 'Buyer'} · grade {order.qualityGrade} ·{' '}
            {new Intl.NumberFormat('en-US').format(order.quantity)} kg
          </p>
        </div>
        <div className="flex flex-col items-end gap-3">
          <StatusMark status={order.status} />
          {order.status === 'PENDING' ? <ResponseDeadline expiresAt={order.expiresAt} /> : null}
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,4fr)]">
        <Card padding="lg" className="flex flex-col gap-8">
          <OrderJourney order={order} attempts={attempts} shipment={shipment} />
        </Card>

        <div className="flex flex-col gap-6">
          <OrderSummary order={order} productName={productName(catalog, order.productId)} />

          <div className="flex flex-col gap-4">
            <p className="font-mono text-[0.6875rem] font-semibold tracking-[0.18em] text-ink-faint uppercase">
              Payment attempts
            </p>
            <PaymentAttempts attempts={attempts} />
          </div>

          {order.status === 'PENDING' ? (
            <AcceptReject orderId={order.id} />
          ) : pendingPayment ? (
            <VerifyPayment payment={pendingPayment} />
          ) : order.status === 'ACCEPTED' ? (
            <p className="rounded-btn border border-line bg-surface-2 px-4 py-3 text-xs text-ink-soft">
              This order is accepted. When the buyer records their payment, it will appear here for
              you to verify.
            </p>
          ) : null}

          {shipment ? (
            <div className="flex flex-col gap-4">
              <p className="font-mono text-[0.6875rem] font-semibold tracking-[0.18em] text-ink-faint uppercase">
                Transport
              </p>
              <ShipmentSummary shipment={shipment} />
              {canConfirmPickup ? (
                <PickupConfirm shipmentId={shipment.id} side="cooperative" />
              ) : null}
            </div>
          ) : order.status === 'PAYMENT_CONFIRMED' ? (
            <div className="flex flex-col gap-4">
              <p className="font-mono text-[0.6875rem] font-semibold tracking-[0.18em] text-ink-faint uppercase">
                Transport
              </p>
              <ArrangeTransport
                orderId={order.id}
                transporters={transporters}
                defaultPickup={order.cooperativeName}
                defaultDestination={order.buyerName ?? 'Buyer destination'}
              />
            </div>
          ) : null}

          <Link
            href="/ops/orders"
            className="text-xs font-medium text-ink-soft hover:text-ink"
          >
            ← All orders
          </Link>
        </div>
      </div>
    </div>
  );
}

import type {
  OrderDto,
  OrderStatus,
  PaymentDto,
  RejectionReason,
  ShipmentCondition,
  ShipmentDto,
} from '@gebeyalink/types';

import { JourneyStepper, type JourneyStep } from '@/features/ui';
import { formatDateTime, formatKg } from '@/lib/format';

const REJECTION_LABELS: Record<RejectionReason, string> = {
  insufficient_stock: 'Insufficient stock',
  quality_issue: 'Quality issue',
  already_committed: 'Already committed',
  operational_issue: 'Operational issue',
  incorrect_order: 'Incorrect order',
  other: 'Other reason',
};

const CONDITIONS: Record<ShipmentCondition, string> = {
  good: 'Good condition',
  minor_damage: 'Minor damage',
  damaged: 'Damaged',
  spoiled: 'Spoiled',
};

export function rejectionLabel(reason: RejectionReason | null): string {
  return reason ? REJECTION_LABELS[reason] : 'Rejected';
}

export function conditionLabel(condition: ShipmentCondition | null): string {
  return condition ? CONDITIONS[condition] : 'Not recorded';
}

export function methodLabel(method: string | null): string {
  if (!method) return 'Payment';
  const known: Record<string, string> = {
    bank_transfer: 'Bank transfer',
    bank_deposit: 'Bank deposit',
    mobile_money: 'Mobile money',
    cash: 'Cash',
  };
  return known[method] ?? method;
}

/**
 * The live order journey — prose/manual deadlines, never a status table.
 * Composition matches the locked reference (docs/design 「order journey」)
 * but every node is derived from the order DTO and its payment attempts.
 */
export function buildJourneySteps(
  order: OrderDto,
  attempts: PaymentDto[],
  shipment: ShipmentDto | null = null,
): JourneyStep[] {
  const latest = attempts[0] ?? null;

  const placed: JourneyStep = {
    label: 'Order placed',
    state: 'done',
    description: `${formatKg(order.quantity)} kg reserved · grade ${order.qualityGrade}`,
    timestamp: formatDateTime(order.createdAt),
  };

  // Terminal before cooperation: the journey ends with the released stock.
  if (order.status === 'CANCELLED' || order.status === 'REJECTED' || order.status === 'EXPIRED') {
    const label =
      order.status === 'CANCELLED'
        ? 'Cancelled by buyer'
        : order.status === 'REJECTED'
          ? rejectionLabel(order.rejectionReason)
          : 'Response window elapsed';
    const detail =
      order.status === 'REJECTED' && order.rejectionExplanation
        ? ` — ${order.rejectionExplanation}`
        : ' — reserved stock released back to available';
    return [
      placed,
      { label: 'Cooperative acceptance', state: 'error', description: `${label}${detail}` },
      {
        label: 'Stock released',
        state: 'done',
        description: `${formatKg(order.quantity)} kg returned to available`,
        timestamp: formatDateTime(order.rejectedAt ?? order.updatedAt),
      },
    ];
  }

  const accepted = order.status === 'ACCEPTED' || order.status === 'PAYMENT_CONFIRMED';

  const acceptance: JourneyStep = accepted
    ? {
        label: 'Cooperative acceptance',
        state: 'done',
        description: order.qualityGrade
          ? `Order committed at ${formatKg(order.quantity)} kg`
          : undefined,
        timestamp: order.acceptedAt ? formatDateTime(order.acceptedAt) : undefined,
      }
    : {
        label: 'Cooperative acceptance',
        state: 'current',
        description: 'Awaiting cooperative response — stock is reserved',
      };

  const submitted: JourneyStep = latest
    ? latest.status === 'FAILED'
      ? { label: 'Payment submitted', state: 'error', description: 'Payment attempt failed — resubmit below' }
      : {
          label: 'Payment submitted',
          state: 'done',
          description: `${methodLabel(latest.method)}${latest.reference ? ` · ${latest.reference}` : ''}`,
          timestamp: formatDateTime(latest.createdAt),
        }
    : {
        label: 'Payment submitted',
        state: accepted ? 'todo' : 'todo',
        description: accepted
          ? 'Awaiting your payment once the cooperative accepts'
          : 'Available once the cooperative accepts',
      };

  const confirmed: JourneyStep = (() => {
    if (order.status === 'PAYMENT_CONFIRMED') {
      return {
        label: 'Payment confirmed',
        state: 'done',
        description: 'Confirmed by cooperative staff',
        timestamp: formatDateTime(order.updatedAt),
      };
    }
    if (latest?.status === 'PENDING') {
      return {
        label: 'Payment confirmed',
        state: 'current',
        description: 'Awaiting cooperative verification of receipt',
      };
    }
    return {
      label: 'Payment confirmed',
      state: 'todo',
      description: accepted ? 'Awaiting payment submission' : 'Available once the cooperative accepts',
    };
  })();

  return [
    placed,
    acceptance,
    submitted,
    confirmed,
    ...buildTransportSteps(order.status, shipment),
  ];
}

/**
 * The fulfilment leg of the journey, derived from the shipment DTO
 * (docs/prd.md §26–§30). Shown as progression, never a status table.
 */
export function buildTransportSteps(
  orderStatus: OrderStatus,
  shipment: ShipmentDto | null,
): JourneyStep[] {
  if (!shipment) {
    if (orderStatus === 'COMPLETED') {
      return [{ label: 'Completed', state: 'done', description: 'Order completed' }];
    }
    return [
      {
        label: 'Transport arrangement',
        state: orderStatus === 'PAYMENT_CONFIRMED' ? 'current' : 'todo',
        description:
          orderStatus === 'PAYMENT_CONFIRMED'
            ? 'Choose a transporter to dispatch the goods'
            : 'Arranged once payment is confirmed',
      },
    ];
  }

  if (shipment.status === 'CANCELLED') {
    return [
      {
        label: 'Transport arranged',
        state: 'done',
        description: `${shipment.transporterName} · to ${shipment.destination}`,
        timestamp: formatDateTime(shipment.createdAt),
      },
      {
        label: 'Transport cancelled',
        state: 'error',
        description: shipment.cancelReason ?? 'Cancelled before delivery',
        timestamp: formatDateTime(shipment.updatedAt),
      },
    ];
  }

  const arranged: JourneyStep = {
    label: 'Transport arranged',
    state: 'done',
    description: `${shipment.transporterName}${shipment.vehiclePlate ? ` · ${shipment.vehiclePlate}` : ''} · to ${shipment.destination}`,
    timestamp: formatDateTime(shipment.createdAt),
  };

  const pickup: JourneyStep = shipment.dispatchedAt
    ? {
        label: 'Pickup confirmed',
        state: 'done',
        description: 'Handed over by the cooperative and received by the transporter',
        timestamp: formatDateTime(shipment.dispatchedAt),
      }
    : {
        label: 'Pickup',
        state: 'current',
        description: `Cooperative ${shipment.coopPickupConfirmedAt ? 'confirmed' : 'pending'} · transporter ${shipment.transporterPickupConfirmedAt ? 'confirmed' : 'pending'}`,
      };

  const transit: JourneyStep = shipment.dispatchedAt
    ? {
        label: 'In transit',
        state: 'done',
        description: `En route to ${shipment.destination}`,
        timestamp: formatDateTime(shipment.dispatchedAt),
      }
    : {
        label: 'In transit',
        state: 'todo',
        description: 'Begins once both parties confirm pickup',
      };

  const delivered: JourneyStep = shipment.deliveredAt
    ? {
        label: 'Delivered',
        state: 'done',
        description: conditionLabel(shipment.deliveryCondition),
        timestamp: formatDateTime(shipment.deliveredAt),
      }
    : {
        label: 'Delivered',
        state: 'todo',
        description: 'The transporter marks arrival at the destination',
      };

  const completed: JourneyStep = shipment.deliveryConfirmedAt
    ? {
        label: 'Completed',
        state: 'done',
        description: 'Delivery confirmed by the buyer — ownership transferred',
        timestamp: formatDateTime(shipment.deliveryConfirmedAt),
      }
    : {
        label: 'Delivery confirmed',
        state: shipment.deliveredAt ? 'current' : 'todo',
        description: shipment.deliveredAt
          ? 'Awaiting buyer confirmation'
          : 'After the goods are delivered',
      };

  const steps: JourneyStep[] = [arranged, pickup, transit, delivered, completed];
  if (orderStatus === 'DISPUTED') {
    steps.push({
      label: 'Dispute opened',
      state: 'error',
      description: 'The buyer raised a dispute on this delivery',
    });
  }
  return steps;
}

export function OrderJourney({
  order,
  attempts,
  shipment = null,
}: {
  order: OrderDto;
  attempts: PaymentDto[];
  shipment?: ShipmentDto | null;
}) {
  return (
    <JourneyStepper
      label="Order journey"
      steps={buildJourneySteps(order, attempts, shipment)}
    />
  );
}
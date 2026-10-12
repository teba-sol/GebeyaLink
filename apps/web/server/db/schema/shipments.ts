import { relations } from 'drizzle-orm';
import {
  decimal,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import type {
  ShipmentCondition,
  ShipmentStatus,
  ShipmentTransporterKind,
} from '@gebeyalink/types';

import { user } from './auth';
import { cooperatives } from './cooperatives';
import { orders } from './orders';
import { transporters } from './transporters';

/**
 * Shipments — C6 transport + delivery (docs/prd.md §15–§18, §29;
 * docs/business-domain-model.md §26–§28).
 *
 * One shipment per order (unique). The order holds the commercial status;
 * the shipment holds the fulfilment journey the buyer tracks. The transporter
 * details are snapshotted so an external or renamed transporter still reads
 * correctly in history. `transporter_user_id` lets a platform transporter see
 * their own assignments without a join through `transporters`.
 */
export const shipments = pgTable(
  'shipments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .unique()
      .references(() => orders.id, { onDelete: 'cascade' }),
    cooperativeId: uuid('cooperative_id')
      .notNull()
      .references(() => cooperatives.id, { onDelete: 'restrict' }),
    transporterId: uuid('transporter_id').references(() => transporters.id, {
      onDelete: 'set null',
    }),
    transporterUserId: text('transporter_user_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    transporterKind: text('transporter_kind')
      .$type<ShipmentTransporterKind>()
      .notNull()
      .default('external'),
    transporterName: text('transporter_name').notNull(),
    transporterPhone: text('transporter_phone'),
    vehicleType: text('vehicle_type'),
    vehiclePlate: text('vehicle_plate'),
    driverName: text('driver_name'),
    pickupLocation: text('pickup_location').notNull(),
    destination: text('destination').notNull(),
    transportCost: decimal('transport_cost', { precision: 14, scale: 3, mode: 'number' }),
    status: text('status').$type<ShipmentStatus>().notNull().default('TRANSPORT_PENDING'),
    scheduledPickupAt: timestamp('scheduled_pickup_at', { withTimezone: true }),
    expectedDeliveryAt: timestamp('expected_delivery_at', { withTimezone: true }),
    coopPickupConfirmedAt: timestamp('coop_pickup_confirmed_at', { withTimezone: true }),
    transporterPickupConfirmedAt: timestamp('transporter_pickup_confirmed_at', {
      withTimezone: true,
    }),
    dispatchedAt: timestamp('dispatched_at', { withTimezone: true }),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
    deliveryConfirmedAt: timestamp('delivery_confirmed_at', { withTimezone: true }),
    deliveryReceivedQuantity: decimal('delivery_received_quantity', {
      precision: 14,
      scale: 3,
      mode: 'number',
    }),
    deliveryCondition: text('delivery_condition').$type<ShipmentCondition>(),
    deliveryNotes: text('delivery_notes'),
    cancelReason: text('cancel_reason'),
    createdByUserId: text('created_by_user_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('shipments_cooperative_idx').on(table.cooperativeId),
    index('shipments_transporter_user_idx').on(table.transporterUserId),
    index('shipments_status_idx').on(table.status),
  ],
);

export const shipmentsRelations = relations(shipments, ({ one }) => ({
  order: one(orders, { fields: [shipments.orderId], references: [orders.id] }),
  cooperative: one(cooperatives, {
    fields: [shipments.cooperativeId],
    references: [cooperatives.id],
  }),
  transporter: one(transporters, {
    fields: [shipments.transporterId],
    references: [transporters.id],
  }),
}));

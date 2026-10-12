import type { ReactNode } from 'react';

import {
  getAdminCooperative,
  listAdminMembers,
} from '@/features/admin/queries';
import { CooperativeStatusAction } from '@/features/admin/components/cooperative-status-action';
import { CreateCenterForm } from '@/features/admin/components/create-center-form';
import { Eyebrow, GradeMark, Quantity, StatusMark } from '@/features/ui';
import { formatBirr, formatDate, formatDateTime, formatPricePerKg } from '@/lib/format';
import { requirePageRole } from '@/lib/session';

function ActiveMark({ status }: { status: 'active' | 'inactive' }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium">
      <span
        aria-hidden="true"
        className={`size-2 shrink-0 rounded-full ${
          status === 'active' ? 'bg-st-available' : 'border border-ink-faint bg-transparent'
        }`}
      />
      <span className={status === 'active' ? 'text-ink' : 'text-ink-faint'}>
        {status === 'active' ? 'Active' : 'Inactive'}
      </span>
    </span>
  );
}

function RoleChip({ role }: { role: string | null }) {
  const label = role?.replace(/_/g, ' ') ?? 'no role';
  return (
    <span className="rounded-pill border border-line bg-paper px-2 py-0.5 font-mono text-[0.625rem] font-semibold tracking-[0.12em] text-ink-soft uppercase">
      {label}
    </span>
  );
}

function Tally({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-32 flex-col gap-1 rounded-card border border-line bg-surface px-4 py-3">
      <span className="font-mono text-xl font-semibold tabular-nums">{children}</span>
      <span className="text-xs text-ink-soft">{label}</span>
    </div>
  );
}

export default async function AdminCooperativeDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const session = await requirePageRole('admin');
  const { id } = await props.params;

  const [detail, members] = await Promise.all([
    getAdminCooperative(session, id),
    listAdminMembers(id),
  ]);

  const { cooperative, centers, orders } = detail;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Eyebrow>Platform · cooperative</Eyebrow>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-4xl font-semibold">{cooperative.name}</h1>
            <ActiveMark status={cooperative.status} />
          </div>
          <p className="font-mono text-xs text-ink-soft">
            /{cooperative.slug} · registered {formatDate(cooperative.createdAt)}
          </p>
        </div>
        <CooperativeStatusAction cooperativeId={cooperative.id} status={cooperative.status} />
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-xl font-semibold">Contacts</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <div className="flex flex-col gap-1 rounded-card border border-line bg-surface p-4 text-sm">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">
              Email
            </span>
            <span className={cooperative.email ? '' : 'text-ink-faint'}>
              {cooperative.email ?? 'Not set'}
            </span>
          </div>
          <div className="flex flex-col gap-1 rounded-card border border-line bg-surface p-4 text-sm">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">
              Phone
            </span>
            <span className={cooperative.phone ? '' : 'text-ink-faint'}>
              {cooperative.phone ?? 'Not set'}
            </span>
          </div>
          <div className="flex flex-col gap-1 rounded-card border border-line bg-surface p-4 text-sm">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">
              Location
            </span>
            <span className={cooperative.region ? '' : 'text-ink-faint'}>
              {[cooperative.region, cooperative.zone, cooperative.district].filter(Boolean).join(', ') ||
                cooperative.address ||
                'Not set'}
            </span>
          </div>
        </div>
      </section>

      <section className="flex flex-wrap gap-2">
        <Tally label="Active members">{detail.memberCount}</Tally>
        <Tally label="Collection centers">{centers.length}</Tally>
        <Tally label="Farmers">{detail.farmerTotal.toLocaleString('en-US')}</Tally>
        <Tally label="Deliveries recorded">{detail.deliveryTotal}</Tally>
        <Tally label="Active listings">{detail.activeListingCount}</Tally>
        <Tally label="Confirmed revenue">{formatBirr(detail.confirmedRevenue)}</Tally>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-xl font-semibold">Participants</h2>
        {members.length === 0 ? (
          <div className="rounded-card border border-dashed border-line-strong px-4 py-8 text-center text-sm text-ink-faint">
            No cooperative members yet — staff and agents join when their roles are assigned.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {members.map((member) => (
              <div
                key={member.userId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-surface px-4 py-3"
              >
                <div className="flex flex-col gap-0.5">
                  <p className="text-sm font-semibold">{member.name || 'Unnamed user'}</p>
                  <p className="font-mono text-xs text-ink-soft">{member.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <ActiveMark status={member.active ? 'active' : 'inactive'} />
                  <RoleChip role={member.role} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="font-display text-xl font-semibold">Collection centers</h2>
          <CreateCenterForm cooperativeId={cooperative.id} />
        </div>
        {centers.length === 0 ? (
          <div className="rounded-card border border-dashed border-line-strong px-4 py-6 text-center text-sm text-ink-faint">
            No collection centers registered.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {centers.map((center) => (
              <div
                key={center.id}
                className="flex flex-col gap-1 rounded-card border border-line bg-surface p-4"
              >
                <p className="text-sm font-semibold">{center.name}</p>
                <p className="text-xs text-ink-soft">{center.location ?? 'Location not set'}</p>
                <ActiveMark status={center.active ? 'active' : 'inactive'} />
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-semibold">Recent orders</h2>
            <p className="text-sm text-ink-soft">
              {detail.orderTotal.toLocaleString('en-US')} orders · latest {orders.length} shown
            </p>
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="rounded-card border border-dashed border-line-strong px-4 py-6 text-center text-sm text-ink-faint">
            No orders yet.
          </div>
        ) : (
          <div className="ops-wrap overflow-x-auto rounded-card border border-line bg-surface shadow-card">
            <table className="ops-table">
              <thead>
                <tr>
                  <th scope="col">Order</th>
                  <th scope="col">Buyer</th>
                  <th scope="col">Product</th>
                  <th scope="col">Grade</th>
                  <th scope="col" className="text-right">Quantity</th>
                  <th scope="col" className="text-right">Unit price</th>
                  <th scope="col" className="text-right">Total</th>
                  <th scope="col">Status</th>
                  <th scope="col">Payment</th>
                  <th scope="col">Placed</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td className="font-mono text-xs font-semibold">{order.id.slice(0, 8)}</td>
                    <td className="min-w-32">{order.buyerName ?? 'Buyer'}</td>
                    <td className="font-medium">{order.productName}</td>
                    <td>
                      <GradeMark grade={order.qualityGrade} size="sm" />
                    </td>
                    <td className="text-right font-mono tabular-nums">
                      <Quantity value={order.quantity} unit="kg" size="sm" />
                    </td>
                    <td className="text-right font-mono tabular-nums text-ink-soft">
                      {formatPricePerKg(order.unitPrice)}
                    </td>
                    <td className="text-right font-mono tabular-nums">
                      {formatBirr(order.productTotal)}
                    </td>
                    <td>
                      <StatusMark status={order.status} />
                    </td>
                    <td className="font-mono text-xs text-ink-soft">
                      {order.paymentStatus ?? '—'}
                    </td>
                    <td className="font-mono text-xs text-ink-soft">
                      {formatDateTime(order.createdAt.toISOString())}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="text-xs text-ink-faint">
        Full order journeys and payment history belong to the cooperative ops console; this is the
        platform oversight read view.
      </p>
    </div>
  );
}
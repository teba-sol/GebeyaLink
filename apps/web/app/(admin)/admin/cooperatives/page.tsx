import Link from 'next/link';

import { listAdminCooperatives } from '@/features/admin/queries';
import { CooperativeStatusAction } from '@/features/admin/components/cooperative-status-action';
import { Eyebrow, VerificationMark } from '@/features/ui';
import { formatDate } from '@/lib/format';
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

function shortId(id: string): string {
  return id.slice(0, 8);
}

const PAGE_SIZE = 25;

export default async function AdminCooperativesPage(props: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await requirePageRole('admin');
  const { page } = await props.searchParams;
  const activePage = Math.max(1, Number.parseInt(page ?? '1', 10) || 1);

  const result = await listAdminCooperatives(session, activePage, PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Eyebrow>Platform · cooperatives</Eyebrow>
          <h1 className="font-display text-4xl font-semibold">Cooperatives</h1>
          <p className="text-sm text-ink-soft">
            {result.total.toLocaleString('en-US')} registered cooperatives — activation and
            suspension happen here; cooperative staff manage their own details.
          </p>
        </div>
        <Link
          href="/admin/cooperatives/new"
          className="inline-flex h-10 items-center gap-2 rounded-btn bg-accent px-4 text-sm font-medium text-white whitespace-nowrap border border-accent transition-opacity hover:opacity-90 active:opacity-80"
        >
          New cooperative
        </Link>
      </div>

      {result.items.length === 0 ? (
        <div className="rounded-card border border-dashed border-line-strong px-4 py-10 text-center text-sm text-ink-faint">
          No cooperatives registered yet.
        </div>
      ) : (
        <div className="ops-wrap overflow-x-auto rounded-card border border-line bg-surface shadow-card">
          <table className="ops-table">
            <thead>
              <tr>
                <th scope="col">Cooperative</th>
                <th scope="col">Region</th>
                <th scope="col">Status</th>
                <th scope="col">Verification</th>
                <th scope="col" className="text-right">Members</th>
                <th scope="col" className="text-right">Centers</th>
                <th scope="col" className="text-right">Farmers</th>
                <th scope="col" className="text-right">Deliveries</th>
                <th scope="col" className="text-right">Pending</th>
                <th scope="col" className="text-right">Listings</th>
                <th scope="col">Updated</th>
                <th scope="col">
                  <span className="sr-only">Status action</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((coop) => (
                <tr key={coop.id}>
                  <td className="min-w-48">
                    <Link
                      href={`/admin/cooperatives/${coop.id}`}
                      className="group flex flex-col gap-0.5"
                    >
                      <span className="font-medium text-ink group-hover:underline">{coop.name}</span>
                      <span className="font-mono text-xs text-ink-faint">ID {shortId(coop.id)}</span>
                    </Link>
                  </td>
                  <td className="text-ink-soft">
                    {[coop.region, coop.district].filter(Boolean).join(', ') || '—'}
                  </td>
                  <td>
                    <ActiveMark status={coop.status} />
                  </td>
                  <td>
                    <VerificationMark status={coop.verificationStatus} />
                  </td>
                  <td className="text-right font-mono tabular-nums">{coop.memberCount}</td>
                  <td className="text-right font-mono tabular-nums">{coop.centerCount}</td>
                  <td className="text-right font-mono tabular-nums">{coop.farmerCount}</td>
                  <td className="text-right font-mono tabular-nums text-ink-soft">
                    {coop.deliveryCount}
                  </td>
                  <td className="text-right font-mono tabular-nums">
                    {coop.pendingOrderCount > 0 ? (
                      <span className="font-semibold text-ink">{coop.pendingOrderCount}</span>
                    ) : (
                      <span className="text-ink-faint">0</span>
                    )}
                  </td>
                  <td className="text-right font-mono tabular-nums text-ink-soft">
                    {coop.activeListingCount}
                  </td>
                  <td className="font-mono text-xs text-ink-soft">{formatDate(coop.updatedAt)}</td>
                  <td className="text-right">
                    <CooperativeStatusAction
                      cooperativeId={coop.id}
                      status={coop.status}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 ? (
        <div className="flex items-center justify-between gap-3 text-sm">
          <Link
            href={`/admin/cooperatives?page=${Math.max(1, activePage - 1)}`}
            aria-disabled={activePage <= 1}
            className={`rounded-btn border border-line-strong bg-surface px-4 py-2 font-medium ${
              activePage <= 1 ? 'pointer-events-none opacity-40' : 'hover:bg-surface-2'
            }`}
          >
            Previous
          </Link>
          <span className="font-mono text-xs text-ink-soft">
            Page {activePage} of {totalPages}
          </span>
          <Link
            href={`/admin/cooperatives?page=${Math.min(totalPages, activePage + 1)}`}
            aria-disabled={activePage >= totalPages}
            className={`rounded-btn border border-line-strong bg-surface px-4 py-2 font-medium ${
              activePage >= totalPages ? 'pointer-events-none opacity-40' : 'hover:bg-surface-2'
            }`}
          >
            Next
          </Link>
        </div>
      ) : null}
    </div>
  );
}
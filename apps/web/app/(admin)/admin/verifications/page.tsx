import Link from 'next/link';

import { listAdminVerificationQueue } from '@/features/admin/queries';
import { VerificationQueue } from '@/features/admin/components/verification-queue';
import { Eyebrow } from '@/features/ui';
import { requirePageRole } from '@/lib/session';

const STATUS_FILTERS = [
  { value: null, label: 'All' },
  { value: 'pending' as const, label: 'Pending' },
  { value: 'under_review' as const, label: 'Under review' },
  { value: 'approved' as const, label: 'Approved' },
  { value: 'rejected' as const, label: 'Rejected' },
  { value: 'suspended' as const, label: 'Suspended' },
];

const TYPE_FILTERS = [
  { value: null, label: 'All types' },
  { value: 'cooperative' as const, label: 'Cooperatives' },
  { value: 'buyer' as const, label: 'Buyers' },
  { value: 'transporter' as const, label: 'Transporters' },
];

const PAGE_SIZE = 25;

export default async function AdminVerificationsPage(props: {
  searchParams: Promise<{ status?: string; type?: string; page?: string }>;
}) {
  const session = await requirePageRole('admin');
  const { status, type, page } = await props.searchParams;

  const activeStatus = STATUS_FILTERS.some((f) => f.value === status) ? status : null;
  const activeType = TYPE_FILTERS.some((f) => f.value === type) ? type : null;
  const activePage = Math.max(1, Number.parseInt(page ?? '1', 10) || 1);

  const result = await listAdminVerificationQueue(session, {
    status: (activeStatus as (typeof STATUS_FILTERS)[number]['value']) ?? undefined,
    type: (activeType as (typeof TYPE_FILTERS)[number]['value']) ?? undefined,
    page: activePage,
    limit: PAGE_SIZE,
  });

  const totalPages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));
  const hrefFor = (patch: { status?: string | null; type?: string | null; page?: number }) => {
    const params = new URLSearchParams();
    const nextStatus = patch.status === undefined ? activeStatus : patch.status;
    const nextType = patch.type === undefined ? activeType : patch.type;
    if (nextStatus) params.set('status', nextStatus);
    if (nextType) params.set('type', nextType);
    if (patch.page && patch.page > 1) params.set('page', String(patch.page));
    const qs = params.toString();
    return qs ? `/admin/verifications?${qs}` : '/admin/verifications';
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Eyebrow>Platform · trust</Eyebrow>
        <h1 className="font-display text-4xl font-semibold">Verification queue</h1>
        <p className="text-sm text-ink-soft">
          {result.total.toLocaleString('en-US')} organization
          {result.total === 1 ? '' : 's'} — approve to grant access, reject with a reason.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by status">
          {STATUS_FILTERS.map((filter) => {
            const active = activeStatus === filter.value || (filter.value === null && !activeStatus);
            return (
              <Link
                key={filter.label}
                href={hrefFor({ status: filter.value, page: 1 })}
                aria-current={active ? 'page' : undefined}
                className={`rounded-pill border px-3 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? 'border-accent bg-accent-soft text-accent'
                    : 'border-line-strong bg-surface text-ink-soft hover:border-ink-faint hover:text-ink'
                }`}
              >
                {filter.label}
              </Link>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by type">
          {TYPE_FILTERS.map((filter) => {
            const active = activeType === filter.value || (filter.value === null && !activeType);
            return (
              <Link
                key={filter.label}
                href={hrefFor({ type: filter.value, page: 1 })}
                aria-current={active ? 'page' : undefined}
                className={`rounded-pill border px-3 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? 'border-accent bg-accent-soft text-accent'
                    : 'border-line-strong bg-surface text-ink-soft hover:border-ink-faint hover:text-ink'
                }`}
              >
                {filter.label}
              </Link>
            );
          })}
        </div>
      </div>

      <VerificationQueue items={result.items} />

      {totalPages > 1 ? (
        <div className="flex items-center justify-between gap-3 text-sm">
          <Link
            href={hrefFor({ page: Math.max(1, activePage - 1) })}
            aria-disabled={activePage <= 1}
            className={`rounded-btn border border-line-strong bg-surface px-4 py-2 ${
              activePage <= 1 ? 'pointer-events-none opacity-40' : 'hover:bg-surface-2'
            }`}
          >
            Previous
          </Link>
          <span className="font-mono text-xs text-ink-soft">
            Page {activePage} of {totalPages}
          </span>
          <Link
            href={hrefFor({ page: Math.min(totalPages, activePage + 1) })}
            aria-disabled={activePage >= totalPages}
            className={`rounded-btn border border-line-strong bg-surface px-4 py-2 ${
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

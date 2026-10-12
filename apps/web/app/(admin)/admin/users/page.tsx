import { listAdminUsers, listCooperativeOptions } from '@/features/admin/queries';
import { UserRoleSelect } from '@/features/admin/components/user-role-select';
import { UserMembershipControl } from '@/features/admin/components/user-membership-control';
import { Eyebrow } from '@/features/ui';
import { formatDate } from '@/lib/format';
import { requirePageRole } from '@/lib/session';

const PAGE_SIZE = 25;

const ROLE_FILTERS = [
  { value: '', label: 'All roles' },
  { value: 'admin', label: 'Admin' },
  { value: 'cooperative_staff', label: 'Cooperative staff' },
  { value: 'collection_agent', label: 'Collection agent' },
  { value: 'buyer', label: 'Buyer' },
  { value: 'transporter', label: 'Transporter' },
  { value: 'none', label: 'No role' },
] as const;

export default async function AdminUsersPage(props: {
  searchParams: Promise<{ q?: string; role?: string; page?: string }>;
}) {
  const session = await requirePageRole('admin');
  const { q, role, page } = await props.searchParams;
  const search = q?.trim() || undefined;
  const roleFilter = role?.trim() || undefined;
  const currentPage = Math.max(1, Number.parseInt(page ?? '1', 10) || 1);

  const [users, cooperatives] = await Promise.all([
    listAdminUsers(session, {
      q: search ?? null,
      role: (roleFilter as 'admin' | 'cooperative_staff' | 'collection_agent' | 'buyer' | 'transporter' | 'none' | undefined) ?? undefined,
      page: currentPage,
      limit: PAGE_SIZE,
    }),
    listCooperativeOptions(session),
  ]);

  const totalPages = Math.max(1, Math.ceil(users.total / PAGE_SIZE));
  const withRole = users.items.filter((u) => u.role).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Eyebrow>Platform · access</Eyebrow>
        <h1 className="font-display text-4xl font-semibold">Users</h1>
        <p className="text-sm text-ink-soft">
          {users.total} accounts · {withRole} with a platform role — assign roles and cooperative
          memberships here. Accounts sign themselves up; you grant access.
        </p>
      </div>

      <form action="/admin/users" method="get" className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1.5 text-xs font-medium text-ink-soft">
          Search
          <input
            name="q"
            type="search"
            defaultValue={search ?? ''}
            placeholder="Name or email"
            className="ds-search h-9 w-64"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-xs font-medium text-ink-soft">
          Role
          <select name="role" defaultValue={roleFilter ?? ''} className="ds-search h-9 w-52">
            {ROLE_FILTERS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="rounded-btn border border-line-strong bg-surface px-4 py-2 text-xs font-medium hover:bg-surface-2"
        >
          Filter
        </button>
      </form>

      {users.items.length === 0 ? (
        <div className="rounded-card border border-dashed border-line-strong px-4 py-10 text-center text-sm text-ink-faint">
          {search || roleFilter ? 'No accounts match these filters.' : 'No accounts yet.'}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {users.items.map((account) => (
            <div
              key={account.id}
              className="flex flex-col gap-4 rounded-card border border-line bg-surface p-4 lg:flex-row lg:items-start lg:justify-between"
            >
              <div className="flex min-w-56 flex-col gap-1">
                <p className="text-sm font-semibold">{account.name}</p>
                <p className="font-mono text-xs text-ink-soft">{account.email}</p>
                <p className="text-[0.6875rem] text-ink-faint">
                  Joined {formatDate(account.createdAt)}
                  {account.emailVerified ? '' : ' · email unverified'}
                </p>
              </div>

              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-8">
                <UserRoleSelect userId={account.id} role={account.role} />
                <div className="flex flex-col gap-1.5">
                  <p className="text-[0.6875rem] font-semibold tracking-[0.14em] text-ink-faint uppercase">
                    Cooperative memberships
                  </p>
                  <UserMembershipControl
                    userId={account.id}
                    memberships={account.memberships}
                    cooperatives={cooperatives}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 ? (
        <div className="flex items-center justify-between gap-3 text-sm">
          <a
            href={`/admin/users?page=${Math.max(1, currentPage - 1)}${search ? `&q=${encodeURIComponent(search)}` : ''}${roleFilter ? `&role=${roleFilter}` : ''}`}
            aria-disabled={currentPage <= 1}
            className={`rounded-btn border border-line-strong bg-surface px-4 py-2 font-medium ${
              currentPage <= 1 ? 'pointer-events-none opacity-40' : 'hover:bg-surface-2'
            }`}
          >
            Previous
          </a>
          <span className="font-mono text-xs text-ink-soft">
            Page {currentPage} of {totalPages}
          </span>
          <a
            href={`/admin/users?page=${Math.min(totalPages, currentPage + 1)}${search ? `&q=${encodeURIComponent(search)}` : ''}${roleFilter ? `&role=${roleFilter}` : ''}`}
            aria-disabled={currentPage >= totalPages}
            className={`rounded-btn border border-line-strong bg-surface px-4 py-2 font-medium ${
              currentPage >= totalPages ? 'pointer-events-none opacity-40' : 'hover:bg-surface-2'
            }`}
          >
            Next
          </a>
        </div>
      ) : null}
    </div>
  );
}
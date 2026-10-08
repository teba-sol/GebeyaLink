import { Card, Eyebrow } from '@/features/ui';
import { requirePageRole } from '@/lib/session';

export default async function AccountPage() {
  const session = await requirePageRole('buyer');

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Eyebrow>Buyer · account</Eyebrow>
        <h1 className="font-display text-4xl font-semibold">Account</h1>
      </div>

      <Card padding="lg" className="flex flex-col gap-4">
        <dl className="flex flex-col gap-3 text-sm">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-ink-soft">Email</dt>
            <dd className="font-mono text-xs">{session.user.email}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-ink-soft">Role</dt>
            <dd>
              <span className="rounded-pill border border-line bg-surface px-3 py-1 font-mono text-xs">
                {session.role ?? 'unassigned'}
              </span>
            </dd>
          </div>
        </dl>
        <p className="text-sm text-ink-soft">
          Profile, saved addresses and notification preferences arrive in F1.
        </p>
      </Card>
    </div>
  );
}

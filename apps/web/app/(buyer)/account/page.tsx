import { SignOutButton } from '@/features/auth/components/sign-out-button';
import { Card } from '@/features/ui';
import { requirePageRole } from '@/lib/session';

const ROLE_LABELS: Record<string, string> = {
  buyer: 'Verified buyer',
  cooperative_staff: 'Cooperative staff',
  collection_agent: 'Field agent',
  transporter: 'Transporter',
  admin: 'Administrator',
};

export default async function BuyerAccountPage() {
  const session = await requirePageRole('buyer');
  const email = session.user.email ?? '';
  const roleLabel = ROLE_LABELS[session.role ?? 'buyer'];

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="font-mono text-[0.6875rem] font-semibold tracking-[0.18em] text-ink-faint uppercase">
          Buyer · account
        </p>
        <h1 className="font-display text-4xl font-semibold">Account</h1>
      </header>

      <Card padding="lg" className="flex flex-col gap-5">
        <div className="flex items-center justify-between gap-4 border-b border-line pb-4">
          <span className="font-display text-lg font-semibold">{email}</span>
          <span className="status-mark" data-status="confirmed">
            <span className="status-mark__swatch" aria-hidden="true" />
            <span>{roleLabel}</span>
          </span>
        </div>
        <p className="text-sm text-ink-soft">
          Your account is verified for ordering. Orders are placed against
          platform-verified cooperatives and reviewed within their response
          window.
        </p>
        <SignOutButton className="self-start rounded-btn border border-line-strong bg-surface px-4 py-2 text-sm font-medium text-ink hover:bg-surface-2" />
      </Card>
    </div>
  );
}
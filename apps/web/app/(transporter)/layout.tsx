import { TransporterNav } from '@/app/(transporter)/transporter-nav';
import { requirePageRole } from '@/lib/session';

export default async function TransporterLayout({
  children,
}: LayoutProps<'/'>) {
  const session = await requirePageRole('transporter');

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-16 items-center justify-between border-b border-line bg-surface px-4">
        <div className="flex flex-col">
          <span className="font-mono text-[0.6875rem] font-semibold tracking-[0.18em] text-ink-faint uppercase">
            GebeyaLink
          </span>
          <span className="font-display text-lg font-semibold text-ink">Transporter</span>
        </div>
        <span className="rounded-pill border border-line bg-surface-2 px-3 py-1 text-xs font-medium text-ink-soft">
          {session.user.name}
        </span>
      </header>
      <main className="flex-1 px-4 pb-24 pt-5 sm:px-6">
        <div className="mx-auto w-full max-w-3xl">{children}</div>
      </main>
      <TransporterNav />
    </div>
  );
}

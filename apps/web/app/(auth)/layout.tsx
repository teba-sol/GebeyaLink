import Link from 'next/link';

export default function AuthLayout({ children }: LayoutProps<'/'>) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 py-12">
      <Link
        href="/"
        className="font-display text-xl font-bold tracking-tight text-ink"
      >
        GebeyaLink
      </Link>
      <div className="w-full max-w-sm rounded-card border border-line bg-surface p-7 shadow-card">
        {children}
      </div>
      <p className="max-w-sm text-center text-xs text-ink-faint">
        B2B agricultural commerce — buyers, cooperatives, field agents and
        logistics on one platform.
      </p>
    </div>
  );
}

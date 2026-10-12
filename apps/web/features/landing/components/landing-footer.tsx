import Link from 'next/link';

const COLUMNS: { heading: string; links: { label: string; href: string }[] }[] = [
  {
    heading: 'Roles',
    links: [
      { label: 'Buyers', href: '/sign-up' },
      { label: 'Cooperatives', href: '/sign-up' },
      { label: 'Field agents', href: '/sign-up' },
      { label: 'Transporters', href: '/sign-up' },
    ],
  },
  {
    heading: 'Platform',
    links: [
      { label: 'How it works', href: '#how-it-works' },
      { label: 'Commodities', href: '#commodities' },
      { label: 'Why GebeyaLink', href: '#why' },
      { label: 'Design system', href: '/design-system' },
    ],
  },
  {
    heading: 'Account',
    links: [
      { label: 'Sign in', href: '/sign-in' },
      { label: 'Create account', href: '/sign-up' },
    ],
  },
];

export function LandingFooter() {
  return (
    <footer className="full-bleed border-t border-[#E3DCC8] bg-[#FBF7EE]">
      <div className="mx-auto w-full max-w-[var(--container-page)] px-6 py-14 lg:px-10">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div className="flex max-w-xs flex-col gap-3">
            <Link
              href="/"
              className="flex items-center gap-2 font-display text-xl font-bold tracking-tight !text-[#0F3A2C]"
            >
              <svg className="h-6 w-6 text-[#0F4D3A]" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M3 20c0-9 5-16 18-16 0 11-6 17-14 17-1.5 0-3-.3-4-1zm2.2-1.2C7 12 11 9 15 7.5 11.5 10 8.5 13.5 7 19c-.6 0-1.2-.1-1.8-.2z" />
              </svg>
              GebeyaLink
            </Link>
            <p className="text-sm leading-relaxed text-[#5F6B63]">
              Ethiopian agricultural commerce — verified cooperatives, graded
              commodities and a tracked journey from farm gate to delivery.
            </p>
          </div>

          {COLUMNS.map((column) => (
            <nav key={column.heading} aria-label={column.heading} className="flex flex-col gap-3">
              <p className="font-mono text-[0.6875rem] font-semibold tracking-[0.18em] text-[#9B978A] uppercase">
                {column.heading}
              </p>
              <ul className="flex flex-col gap-2">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-[#4A554E] transition-colors hover:text-[#0F3A2C]"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-[#E3DCC8] pt-6 text-xs text-[#8A8577] sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} GebeyaLink. Agricultural supply, moved like a marketplace.</p>
          <p>Made for Ethiopian cooperatives and the buyers who source from them.</p>
        </div>
      </div>
    </footer>
  );
}

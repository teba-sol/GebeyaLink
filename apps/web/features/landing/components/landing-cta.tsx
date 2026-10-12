import Link from 'next/link';

/** Closing call to action — forest band, two clear entries. */
export function LandingCta({ home }: { home: string | null }) {
  return (
    <section className="full-bleed bg-[#0F3A2C]">
      <div className="mx-auto flex w-full max-w-[var(--container-page)] flex-col items-start gap-7 px-6 py-16 sm:py-20 lg:px-10">
        <div className="flex max-w-[42ch] flex-col gap-4">
          <p className="font-mono text-[0.6875rem] font-semibold tracking-[0.18em] text-[#9CC3A6] uppercase">
            Ready when you are
          </p>
          <h2 className="font-display text-3xl leading-[1.08] font-semibold tracking-[-0.02em] text-[#F3E9CE] sm:text-4xl">
            Join the market from the farm gate up.
          </h2>
          <p className="text-[1.02rem] leading-7 text-[#BFD3C4]">
            Create one account to buy, sell, record intake or deliver — and get
            the workspace that fits your role.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
          <Link
            href={home ?? '/sign-up'}
            className="inline-flex min-h-12 items-center gap-3 rounded-lg bg-[#F3E9CE] px-6 py-3.5 text-sm font-semibold !text-[#0F3A2C] transition-colors duration-200 hover:bg-white"
          >
            {home ? 'Open your workspace' : 'Create your account'}
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-7-7 7 7-7 7" />
            </svg>
          </Link>
          {home ? null : (
            <Link
              href="/sign-in"
              className="text-sm font-semibold text-[#F3E9CE] underline decoration-[#F3E9CE]/40 underline-offset-4 transition-colors hover:decoration-[#F3E9CE]"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

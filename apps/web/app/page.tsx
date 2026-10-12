import type { Metadata } from 'next';
import Link from 'next/link';

import { SignOutButton } from '@/features/auth/components/sign-out-button';
import { LandingCommodities } from '@/features/landing/components/landing-commodities';
import { LandingCta } from '@/features/landing/components/landing-cta';
import { LandingFooter } from '@/features/landing/components/landing-footer';
import { LandingHeader } from '@/features/landing/components/landing-header';
import { LandingHero } from '@/features/landing/components/landing-hero';
import { LandingHowItWorks } from '@/features/landing/components/landing-how-it-works';
import { LandingRoleExperiences } from '@/features/landing/components/landing-role-experiences';
import { LandingStatsBand } from '@/features/landing/components/landing-stats-band';
import { LandingWhy } from '@/features/landing/components/landing-why';
import { getPageSession } from '@/lib/session';
import { ROLE_HOME } from '@/lib/session/role-home';

export const metadata: Metadata = {
  title: 'GebeyaLink — Ethiopian agricultural marketplace',
  description:
    'Source verified Ethiopian commodities from cooperatives, or run operations as a cooperative, field agent or transporter. One connected supply chain from farm gate to delivery.',
};

export default async function Home() {
  const session = await getPageSession();
  const home = session?.role ? ROLE_HOME[session.role] : null;
  const awaitingRole = Boolean(session) && !session?.role;

  return (
    <>
      <LandingHeader home={home} />

      <main>
        <LandingHero />

        {awaitingRole ? (
          <div className="full-bleed border-b border-[#E3DCC8] bg-[#FBF0D4]">
            <div className="mx-auto flex w-full max-w-[var(--container-page)] flex-col gap-4 px-6 py-4 sm:flex-row sm:items-center sm:justify-between lg:px-10">
              <p className="text-sm text-[#1F2A24]">
                <span className="font-semibold">Finish setting up.</span> Register
                the organization you represent and submit it for verification.
              </p>
              <div className="flex shrink-0 items-center gap-2">
                <Link
                  href="/onboarding"
                  className="rounded-btn border border-accent bg-accent px-4 py-2.5 text-sm font-medium text-white hover:opacity-90"
                >
                  Register organization
                </Link>
                <SignOutButton className="rounded-btn border border-line-strong bg-surface px-4 py-2.5 text-sm font-medium text-ink hover:bg-surface-2" />
              </div>
            </div>
          </div>
        ) : null}

        <LandingStatsBand />
        <LandingRoleExperiences />
        <LandingHowItWorks />
        <LandingCommodities />
        <LandingWhy />
        <LandingCta home={home} />
      </main>

      <LandingFooter />
    </>
  );
}

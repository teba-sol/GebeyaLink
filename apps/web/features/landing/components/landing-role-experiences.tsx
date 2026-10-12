import Link from 'next/link';

import { ROLE_EXPERIENCES } from '../lib/content';
import { LandingSection } from './section';

export function LandingRoleExperiences() {
  return (
    <LandingSection id="roles">
      <div className="flex flex-col gap-4 border-t border-[#E3DCC8] pt-6">
        <p className="font-mono text-[0.6875rem] font-semibold tracking-[0.18em] text-[#174F3D] uppercase">
          One platform, four roles
        </p>
        <h2 className="max-w-[24ch] font-display text-3xl font-semibold tracking-[-0.02em] text-[#103D30] sm:text-4xl">
          Who GebeyaLink is for
        </h2>
        <p className="max-w-[60ch] text-[1.02rem] leading-7 text-[#43564B]">
          Every account maps to a role, and each role gets the workspace it
          needs — from sourcing commodities to running the field.
        </p>
      </div>

      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        {ROLE_EXPERIENCES.map((role, index) => (
          <article
            key={role.id}
            className="flex flex-col gap-4 rounded-card border border-[#E9E4D4] bg-[#FEFCF6] p-6 shadow-[0_1px_2px_rgba(35,30,20,0.04)] transition-colors hover:border-[#D9CCB2] sm:p-7"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-semibold text-[#9B978A]">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className="rounded-pill bg-[#E2F3E4] px-3 py-1 text-[0.7rem] font-semibold tracking-wide text-[#174F3D] uppercase">
                {role.eyebrow}
              </span>
            </div>
            <h3 className="font-display text-xl font-semibold text-[#103D30]">
              {role.title}
            </h3>
            <p className="text-sm leading-relaxed text-[#5F6B63]">{role.copy}</p>
            <ul className="mt-1 flex flex-col gap-2">
              {role.points.map((point) => (
                <li key={point} className="flex items-start gap-2 text-sm text-[#3F5147]">
                  <svg className="mt-0.5 h-4 w-4 flex-none text-[#0F5942]" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                    <path
                      fillRule="evenodd"
                      d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0l-3.5-3.5a1 1 0 1 1 1.4-1.4l2.8 2.8 6.8-6.8a1 1 0 0 1 1.4 0Z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {point}
                </li>
              ))}
            </ul>
            <Link
              href="/sign-up"
              className="mt-auto inline-flex w-fit items-center gap-2 pt-2 text-sm font-semibold text-[#0F5942] transition-colors hover:text-[#0B4232]"
            >
              Get started
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-7-7 7 7-7 7" />
              </svg>
            </Link>
          </article>
        ))}
      </div>
    </LandingSection>
  );
}

import Image from 'next/image';
import Link from 'next/link';

import { HERO_TRUST } from '../lib/content';

/**
 * Immersive full-bleed hero. The farmland photograph fills the viewport and
 * slides under the transparent header; layered forest gradients keep the copy
 * legible and blend into the dark stats band below. No opaque panel — the
 * image is the experience.
 */
export function LandingHero() {
  return (
    <section
      aria-labelledby="landing-hero-heading"
      className="full-bleed relative isolate -mt-16 flex min-h-[92vh] items-center overflow-hidden bg-[#0B2A1F]"
    >
      {/* Background photograph */}
      <Image
        src="/back-gebya.png"
        alt="Highland farmland in Ethiopia at golden hour"
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
      />

      {/* Layered light control — vignette, side scrim for the copy, top scrim
          for the transparent header, bottom blend into the stats band. */}
      <div aria-hidden className="absolute inset-0 bg-[#08231A]/45" />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-b from-[#08231A]/80 via-[#08231A]/25 to-[#0F3A2C]"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-r from-[#08231A]/80 via-[#08231A]/30 to-transparent"
      />

      <div className="relative z-10 mx-auto flex w-full max-w-[var(--container-page)] flex-col items-start gap-6 px-6 pt-28 pb-24 sm:pb-28 lg:px-10 lg:pt-32">
        <span className="inline-flex items-center gap-2 rounded-pill border border-white/20 bg-white/10 px-3.5 py-1.5 font-mono text-[0.68rem] font-semibold tracking-[0.2em] text-[#DCEBDD] uppercase backdrop-blur-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-[#7FD196]" />
          Ethiopian agricultural supply chain
        </span>

        <h1
          id="landing-hero-heading"
          className="max-w-[17ch] font-display text-[2.9rem] leading-[1.02] font-semibold tracking-[-0.045em] text-white drop-shadow-[0_2px_24px_rgba(0,0,0,0.35)] sm:text-6xl lg:text-[4.6rem]"
        >
          Agriculture, moved as one connected market.
        </h1>

        <p className="max-w-[50ch] text-[1.05rem] leading-8 text-white/80 sm:text-lg">
          GebeyaLink brings buyers, cooperatives, field agents and transporters
          onto a single platform — sourcing verified commodities from the farm
          gate to final delivery.
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-4">
          <Link
            href="/sign-up"
            className="inline-flex min-h-12 items-center gap-3 rounded-lg bg-white px-6 py-3.5 text-sm font-semibold !text-[#0F3A2C] shadow-lg shadow-black/20 transition-colors duration-200 hover:bg-[#F3E9CE] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-white"
          >
            Create your account
            <svg
              aria-hidden="true"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-7-7 7 7-7 7" />
            </svg>
          </Link>

          <Link
            href="/sign-in"
            className="inline-flex min-h-12 items-center rounded-lg border border-white/35 px-6 py-3.5 text-sm font-semibold !text-white backdrop-blur-sm transition-colors hover:bg-white/10"
          >
            Sign in
          </Link>
        </div>

        <ul className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-3 border-t border-white/15 pt-6">
          {HERO_TRUST.map((item) => (
            <li key={item} className="flex items-center gap-2 text-sm text-white/85">
              <svg className="h-4 w-4 flex-none text-[#7FD196]" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                <path
                  fillRule="evenodd"
                  d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0l-3.5-3.5a1 1 0 1 1 1.4-1.4l2.8 2.8 6.8-6.8a1 1 0 0 1 1.4 0Z"
                  clipRule="evenodd"
                />
              </svg>
              {item}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

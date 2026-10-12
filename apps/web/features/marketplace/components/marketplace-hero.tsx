import Image from 'next/image';

import { heroImagePath } from '../lib/commodity-images';
import { CommodityPanel } from './commodity-visuals';

const STEPS = [
  {
    title: 'Browse',
    text: 'Explore verified cooperative inventory by commodity, grade, origin and price.',
  },
  {
    title: 'Reserve',
    text: 'Place an order to reserve available stock while the cooperative reviews it.',
  },
  {
    title: 'Pay & track',
    text: 'Pay the cooperative directly after acceptance and follow your order through delivery.',
  },
] as const;

export function MarketplaceHero() {
  const src = heroImagePath();

  return (
    <section
      aria-labelledby="commerce-hero-heading"
      className="full-bleed relative isolate -mt-8 overflow-hidden border-b border-[#E9E4D4] bg-[#F8F3E7]"
    >
      {/* Editorial text panel */}
      <div className="relative z-10 mx-auto flex min-h-[420px] w-full max-w-[var(--container-page)] items-center sm:min-h-[470px]">
        <div className="flex w-full flex-col items-start gap-5 px-6 py-14 sm:py-16 lg:px-10 lg:py-20">
          <div className="flex max-w-[540px] flex-col items-start gap-5">
            <p className="text-[0.68rem] font-semibold tracking-[0.2em] text-[#174F3D] uppercase">
              Ethiopian commodity marketplace
            </p>

            <h1
              id="commerce-hero-heading"
              className="font-display text-[2.65rem] leading-[1.04] font-semibold tracking-[-0.045em] text-[#103D30] sm:text-5xl lg:text-[3.65rem]"
            >
              Source Ethiopia’s finest commodities.
            </h1>

            <p className="max-w-[43ch] text-[0.95rem] leading-7 text-[#43564B] sm:text-base">
              Buy directly from verified cooperatives. Explore graded, weighed
              inventory with transparent pricing and availability.
            </p>

            <div className="mt-1 flex flex-wrap items-center gap-x-7 gap-y-4">
              <a
                href="#commodities"
                className="inline-flex min-h-11 items-center gap-3 rounded-lg bg-[#0F5942] px-5 py-3 text-sm font-semibold !text-white shadow-sm transition-colors duration-200 hover:bg-[#0B4232] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#0F5942]"
              >
                Explore commodities
                <svg
                  aria-hidden="true"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 12h14m-7-7 7 7-7 7"
                  />
                </svg>
              </a>

              <a
                href="#how-it-works"
                className="text-sm font-semibold text-[#174F3D] underline decoration-[#174F3D]/40 underline-offset-4 transition-colors hover:decoration-[#174F3D]"
              >
                How it works
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Hero photography — right column only, bleeds to the viewport edge.
          Never sits behind the text panel. */}
      <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[56%] lg:block">
        {src ? (
          <Image
            src={src}
            alt="Fresh red and green coffee cherries in a woven basket"
            fill
            priority
            sizes="56vw"
            className="object-cover object-center"
          />
        ) : (
          <div className="h-full w-full">
            <CommodityPanel name="Coffee" hero />
          </div>
        )}

        {/* Seam fade where the photo meets the cream panel */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#F8F3E7] via-[#F8F3E7]/40 to-transparent" />
        {/* Gentle bottom fade into the page */}
        <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#F8F3E7]/30 to-transparent" />
      </div>

      {/* Below lg: text first, photograph stacked underneath */}
      <div className="relative h-[230px] w-full lg:hidden">
        {src ? (
          <Image
            src={src}
            alt="Fresh coffee cherries in a woven basket"
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
        ) : (
          <div className="h-full w-full">
            <CommodityPanel name="Coffee" hero />
          </div>
        )}
      </div>
    </section>
  );
}

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="flex w-full scroll-mt-24 flex-col gap-6 pb-16"
    >
      <div className="flex items-baseline gap-4 border-t border-[#E3DCC8] pt-6">
        <h2 className="font-display text-2xl font-semibold text-[#0F4D3A]">
          How it works: from cooperative to you
        </h2>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        {STEPS.map((step, index) => (
          <div
            key={step.title}
            className="flex flex-col gap-3 rounded-xl border border-[#E9E4D4] bg-[#FEFCF6] p-6"
          >
            <span className="font-display text-3xl font-bold text-[#0F4D3A]">
              {String(index + 1).padStart(2, '0')}
            </span>
            <h3 className="font-display text-lg font-semibold text-[#1F2A24]">
              {step.title}
            </h3>
            <p className="text-sm leading-relaxed text-[#5F6B63]">
              {step.text}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}


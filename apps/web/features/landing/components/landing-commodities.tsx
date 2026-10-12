import Link from 'next/link';

import { CommodityPhoto } from '@/features/marketplace/components/commodity-visuals';
import { COMMODITIES } from '../lib/content';
import { LandingSection, LandingSectionHeading } from './section';

/** Commodity showcase — visual entry point into the verified marketplace. */
export function LandingCommodities() {
  return (
    <LandingSection id="commodities">
      <LandingSectionHeading
        index="03"
        eyebrow="Commodities"
        title="Verified Ethiopian commodities"
        description="Graded, weighed and sourced from cooperatives across Ethiopia — with transparent pricing and live availability on the marketplace."
      />

      <div className="commodity-grid">
        {COMMODITIES.map((commodity) => (
          <Link
            key={commodity.id}
            href="/sign-up"
            className="group relative flex h-60 flex-col justify-end overflow-hidden rounded-card border border-[#E9E4D4] shadow-[0_1px_2px_rgba(35,30,20,0.04)] transition-[border-color,transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-[#0F4D3A]/40 hover:shadow-md sm:h-64"
          >
            <div className="absolute inset-0">
              <CommodityPhoto
                productId={commodity.id}
                name={commodity.name}
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                className="transition-transform duration-300 group-hover:scale-[1.04]"
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-[#0C2E23]/80 via-[#0C2E23]/25 to-transparent" />
            <div className="relative z-10 flex flex-col gap-1 p-5">
              <h3 className="font-display text-2xl font-semibold text-white">
                {commodity.name}
              </h3>
              <p className="text-sm text-white/75">{commodity.note}</p>
              <span className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-[#C9E7CE]">
                Browse on GebeyaLink
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-7-7 7 7-7 7" />
                </svg>
              </span>
            </div>
          </Link>
        ))}
      </div>
    </LandingSection>
  );
}

import Link from 'next/link';

import type { MarketplaceListingDto } from '@gebeyalink/types';

import { formatKg, formatPricePerKg } from '@/lib/format';
import { CommodityPhoto } from './commodity-visuals';

const GRADE_STYLES: Record<string, string> = {
  A: 'bg-[#E4ECDD] text-[#2F4A38]',
  B: 'bg-[#D9EBD2] text-[#2F5A2E]',
  C: 'bg-[#F8E3C9] text-[#7A4A1A]',
};

/**
 * Marketplace card — compact "price list" density: small photo band with an
 * overlaid grade pill, then name / source and a single price + availability
 * row. The whole card links to the listing.
 */
export function ListingCard({
  listing,
  name,
}: {
  listing: MarketplaceListingDto;
  name: string;
}) {
  return (
    <article className="group overflow-hidden rounded-xl border border-[#E9E4D4] bg-[#FEFCF6] shadow-[0_1px_2px_rgba(15,58,44,0.04)] transition-[border-color,transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:border-[#0F4D3A]/35 hover:shadow-md">
      <Link href={`/marketplace/${listing.id}`} className="flex flex-col">
        {/* Photo band + overlaid grade */}
        <div className="relative h-16 w-full overflow-hidden bg-[#EFE9D8] sm:h-20">
          <CommodityPhoto
            productId={listing.productId}
            name={name}
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
            className="transition-transform duration-300 group-hover:scale-[1.03]"
          />
          <span
            className={`absolute bottom-1.5 left-1.5 rounded px-1.5 py-0.5 text-[0.6rem] font-semibold tracking-wide uppercase shadow-sm ${
              GRADE_STYLES[listing.qualityGrade] ?? 'bg-gray-100 text-gray-700'
            }`}
          >
            Grade {listing.qualityGrade}
          </span>
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col gap-2.5 p-3.5">
          <div className="min-w-0">
            <h3 className="truncate font-display text-[0.95rem] font-semibold text-[#0F3A2C] group-hover:underline">
              {name}
            </h3>
            <p className="mt-0.5 truncate text-xs text-[#4A554E]">
              {listing.cooperativeName}
              {listing.location ? ` — ${listing.location}` : ''}
            </p>
          </div>

          {/* Price + live availability */}
          <div className="flex items-end justify-between gap-3 border-t border-[#EFEBDD] pt-2.5">
            <p className="flex items-baseline gap-1">
              <span className="font-display text-xl leading-none font-bold text-[#0F4D3A]">
                {formatPricePerKg(listing.pricePerUnit)}
              </span>
              <span className="text-[0.65rem] font-semibold text-[#6B756E]">/ kg</span>
            </p>
            <p className="flex flex-col items-end gap-0.5 text-right">
              <span className="font-mono text-sm leading-none font-semibold text-[#0F3A2C]">
                {formatKg(listing.availableQuantity)} kg
              </span>
              <span className="text-[0.65rem] text-[#6B756E]">
                available · min {formatKg(listing.minOrderQuantity)} kg
              </span>
            </p>
          </div>
        </div>
      </Link>
    </article>
  );
}
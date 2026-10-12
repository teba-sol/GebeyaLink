import Link from 'next/link';

import { listMarketplaceQuerySchema } from '@gebeyalink/validation';
import type { ProductDto } from '@gebeyalink/types';

import { MarketplaceFilters, type ActiveMarketplaceFilters } from '@/features/marketplace/components/filter-sidebar';
import { ListingCard } from '@/features/marketplace/components/listing-card';
import { Pagination } from '@/features/marketplace/components/pagination';
import { MarketplaceHero, HowItWorks } from '@/features/marketplace/components/marketplace-hero';
import { SortSelect } from '@/features/marketplace/components/sort-select';
import { browseListings, getProductCatalog, productName } from '@/features/marketplace/queries';
import { requirePageRole } from '@/lib/session';

const PAGE_LIMIT = 12;

function toParams(raw: Record<string, string | string[] | undefined>) {
  return Object.fromEntries(
    Object.entries(raw).map(([key, value]) => [
      key,
      Array.isArray(value) ? (value[0] ?? '') : (value ?? ''),
    ]),
  );
}

export default async function MarketplacePage(props: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await requirePageRole('buyer');
  const rawParams = await props.searchParams;

  const query = listMarketplaceQuerySchema.safeParse(toParams(rawParams));
  const parsed = query.success
    ? query.data
    : { page: 1, limit: PAGE_LIMIT, sort: 'newest' as const };

  const [catalog, result] = await Promise.all([
    getProductCatalog(session).catch(() => [] as ProductDto[]),
    browseListings(session, { ...parsed, page: parsed.page, limit: PAGE_LIMIT }).catch(() => null),
  ]);

  const active: ActiveMarketplaceFilters = {
    product: parsed.productId ?? null,
    grade:
      parsed.qualityGrade === 'A' || parsed.qualityGrade === 'B' || parsed.qualityGrade === 'C'
        ? parsed.qualityGrade
        : null,
    location: parsed.location ?? null,
    maxPrice: parsed.maxPrice != null ? String(parsed.maxPrice) : null,
  };

  const failed = result === null || catalog.length === 0;
  const total = result?.total ?? 0;

  return (
    <div className="flex min-h-screen flex-col bg-[#FBF7EE]">
      <MarketplaceHero />

      <section
        id="commodities"
        className="mx-auto w-full max-w-[1180px] scroll-mt-24 px-6 pt-10 pb-16"
      >
        {/* Section header */}
        <div className="mb-6 flex flex-col gap-1">
          <h2 className="font-display text-[1.75rem] font-semibold leading-tight text-[#0F4D3A]">
            Available commodities
          </h2>
          <p className="text-sm text-[#5F6B63]">
            Browse verified cooperative inventory available to order.
          </p>
        </div>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[220px_1fr]">
          {/* Sidebar */}
          <aside className="w-full">
            <MarketplaceFilters products={catalog} active={active} />
          </aside>

          {/* Results */}
          <div className="flex w-full flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <p className="text-xs text-[#5F6B63]">
                Showing {total === 1 ? '1 commodity' : `${total.toLocaleString('en-US')} commodities`}
              </p>
              <SortSelect sort={parsed.sort} />
            </div>

            {failed ? (
              <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-red-300 bg-red-50 px-6 py-16 text-center">
                <p className="font-display text-xl font-semibold text-red-800">
                  We couldn&rsquo;t load the marketplace
                </p>
                <p className="max-w-[44ch] text-sm text-red-600">
                  Something went wrong on our side. Try again in a moment.
                </p>
                <Link href="/marketplace" className="mt-2 rounded-lg bg-red-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-900">
                  Try again
                </Link>
              </div>
            ) : result.items.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-[#DDD6C3] bg-[#FEFCF6] px-6 py-16 text-center">
                <p className="font-display text-xl font-semibold text-[#0F4D3A]">
                  No commodities match your filters
                </p>
                <p className="max-w-[44ch] text-sm text-[#5F6B63]">
                  Try reducing the filters, or clear them to return to the full inventory.
                </p>
                <Link href="/marketplace" className="mt-2 rounded-lg bg-[#0F4D3A] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0B3D2E]">
                  Clear filters
                </Link>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                  {result.items.map((listing) => (
                    <ListingCard
                      key={listing.id}
                      listing={listing}
                      name={productName(catalog, listing.productId)}
                    />
                  ))}
                </div>

                <div className="mt-6 flex justify-center">
                  <Pagination
                    page={result.page}
                    total={result.total}
                    limit={result.limit}
                    searchParams={new URLSearchParams(toParams(rawParams))}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Kept for the "How it works" anchor in the hero; sits below the grid */}
      <HowItWorks />
    </div>
  );
}
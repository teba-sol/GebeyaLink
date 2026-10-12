import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getListing, getProductCatalog, productName } from '@/features/marketplace/queries';
import { OrderForm } from '@/features/marketplace/components/order-form';
import { CommodityPhoto } from '@/features/marketplace/components/commodity-visuals';
import { AvailabilityMeter, Eyebrow, GradeMark, StatusMark } from '@/features/ui';
import { requirePageRole } from '@/lib/session';
import { formatDate, formatKg, formatPricePerKg } from '@/lib/format';
import { responseWindowHours } from '@/server/config/business';

const GRADE_BANDS = [
  {
    grade: 'A',
    title: 'Premium',
    note: 'The cleanest, most uniform output from the lot — minimal defects, sized consistently.',
  },
  {
    grade: 'B',
    title: 'Good commercial',
    note: 'Consistent commercial quality with a slightly wider tolerance than A.',
  },
  {
    grade: 'C',
    title: 'Standard',
    note: 'Acceptable commercial quality for broad use.',
  },
] as const;

const JOURNEY = [
  {
    step: '1',
    title: 'Reserve stock',
    text: 'Place an order at or above the minimum. Stock is reserved the moment you confirm.',
  },
  {
    step: '2',
    title: 'Cooperative reviews',
    text: `The cooperative responds within its ${responseWindowHours()}-hour response window.`,
  },
  {
    step: '3',
    title: 'Pay on acceptance',
    text: 'Once accepted, pay the cooperative directly and follow the order to delivery.',
  },
] as const;

export default async function ListingPage(props: { params: Promise<{ id: string }> }) {
  const session = await requirePageRole('buyer');
  const { id } = await props.params;

  const [catalog, listing] = await Promise.all([
    getProductCatalog(session),
    getListing(session, id).catch(() => null),
  ]);
  if (!listing) notFound();

  const name = productName(catalog, listing.productId);
  const total = listing.availableQuantity + listing.reservedQuantity;

  const specs: Array<[string, string]> = [
    ['Product', name],
    ['Official grade', `Grade ${listing.qualityGrade}`],
    ['Cooperative', listing.cooperativeName],
    ['Origin', listing.location ?? 'Collection center (location not set)'],
    ['Unit price', `${formatPricePerKg(listing.pricePerUnit)} / kg`],
    ['Minimum order', `${formatKg(listing.minOrderQuantity)} kg`],
    ['Response window', `${responseWindowHours()} hours`],
    ['Listed', formatDate(listing.createdAt)],
  ];

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,4fr)]">
      {/* Left: product story */}
      <div className="flex flex-col gap-10">
        <div className="flex flex-col gap-4">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[#6B756E]">
            <Link href="/marketplace" className="font-medium text-[#0F4D3A] hover:underline">
              Marketplace
            </Link>
            <span aria-hidden="true">/</span>
            <span className="truncate">{name}</span>
          </nav>

          <div className="flex flex-wrap items-center gap-3">
            <GradeMark grade={listing.qualityGrade} />
            <StatusMark status="AVAILABLE" label="Active listing" />
          </div>

          <h1 className="font-display text-4xl leading-tight font-semibold text-[#0F3A2C]">
            {name} · Grade {listing.qualityGrade}
          </h1>
          <p className="max-w-[62ch] text-[0.95rem] leading-7 text-[#43564B]">
            Graded {listing.qualityGrade} at intake and weighed per lot, this stock is published
            by <strong className="font-semibold text-[#103D30]">{listing.cooperativeName}</strong>
            {listing.location ? (
              <>
                {' '}from <strong className="font-semibold text-[#103D30]">{listing.location}</strong>
              </>
            ) : null}
            . The quantities below are read live from cooperative inventory — what you see is what
            can actually be reserved.
          </p>
        </div>

        {/* Photography */}
        <div className="relative aspect-[21/9] w-full overflow-hidden rounded-xl border border-[#E9E4D4] bg-[#EFE9D8]">
          <CommodityPhoto
            productId={listing.productId}
            name={name}
            priority
            sizes="(min-width: 1024px) 60vw, 100vw"
          />
        </div>

        {/* Availability */}
        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Eyebrow>Live lot availability</Eyebrow>
            <h2 className="font-display text-2xl font-semibold text-[#0F3A2C]">
              {formatKg(total)} kg graded and on the floor
            </h2>
            <p className="text-sm text-[#5F6B63]">
              Stock that other buyers have reserved is held and shown here until the reservation
              expires or the order resolves.
            </p>
          </div>
          <AvailabilityMeter
            totalKg={total}
            segments={[
              { token: 'available', label: 'Available', kg: listing.availableQuantity },
              { token: 'reserved', label: 'Reserved', kg: listing.reservedQuantity },
            ]}
          />
          <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
            <p className="flex items-baseline gap-1.5">
              <span className="font-mono text-base font-bold text-[#0F4D3A]">
                {formatKg(listing.availableQuantity)} kg
              </span>
              <span className="text-xs text-[#6B756E]">available now</span>
            </p>
            <p className="flex items-baseline gap-1.5">
              <span className="font-mono text-base font-semibold text-[#43564B]">
                {formatKg(listing.reservedQuantity)} kg
              </span>
              <span className="text-xs text-[#6B756E]">currently reserved</span>
            </p>
          </div>
        </section>

        {/* About this lot */}
        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Eyebrow>About this lot</Eyebrow>
            <h2 className="font-display text-2xl font-semibold text-[#0F3A2C]">
              From intake to listing
            </h2>
          </div>
          <p className="max-w-[62ch] text-[0.95rem] leading-7 text-[#43564B]">
            Every lot on GebeyaLink is received at a cooperative collection center, weighed and
            quality-graded by a collection agent at intake. The grade is the lot’s quality band —
            set from size, moisture and visible defects on that day of intake — and it stays
            attached to everything you order from this stock. Accepted weight is added straight to
            cooperative inventory, and the listing above is its published for-sale face.
          </p>

          <ul className="grid gap-3 sm:grid-cols-2">
            {[
              ['Verified cooperative', 'Active on the platform; the lot is published by the cooperative itself.'],
              ['Official grading', 'Grade set by a collection agent at intake, not by the seller at sale time.'],
              ['Live availability', 'Reserved stock leaves this number the moment an order is placed.'],
              ['Direct settlement', 'You pay the cooperative for accepted goods — no middleman.'],
            ].map(([title, note]) => (
              <li
                key={title}
                className="flex gap-3 rounded-xl border border-[#E9E4D4] bg-[#FBF7EE] p-4"
              >
                <svg
                  aria-hidden="true"
                  className="mt-0.5 h-4 w-4 shrink-0 text-[#0F5942]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-semibold text-[#103D30]">{title}</p>
                  <p className="text-xs leading-relaxed text-[#5F6B63]">{note}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Spec table */}
        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Eyebrow>Lot facts</Eyebrow>
            <h2 className="font-display text-2xl font-semibold text-[#0F3A2C]">Specifications</h2>
          </div>
          <dl className="grid grid-cols-2 gap-x-8 gap-y-5 rounded-xl border border-[#E9E4D4] bg-[#FEFCF6] p-6 sm:grid-cols-4">
            {specs.map(([label, value]) => (
              <div key={label} className="flex flex-col gap-1">
                <dt className="text-xs font-medium text-[#6B756E]">{label}</dt>
                <dd className="text-sm font-semibold break-words text-[#103D30]">{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Grade bands */}
        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Eyebrow>Quality bands</Eyebrow>
            <h2 className="font-display text-2xl font-semibold text-[#0F3A2C]">
              What these grades mean
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {GRADE_BANDS.map((band) => {
              const current = band.grade === listing.qualityGrade;
              return (
                <div
                  key={band.grade}
                  className={`flex flex-col gap-2 rounded-xl border p-4 ${
                    current
                      ? 'border-[#0F4D3A]/40 bg-[#E4ECDD]'
                      : 'border-[#E9E4D4] bg-[#FEFCF6]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <GradeMark grade={band.grade} />
                    {current ? (
                      <span className="rounded-pill bg-[#0F4D3A] px-2 py-0.5 text-[0.6rem] font-bold tracking-wide text-white uppercase">
                        This lot
                      </span>
                    ) : null}
                  </div>
                  <p className="text-sm font-semibold text-[#103D30]">{band.title}</p>
                  <p className="text-xs leading-relaxed text-[#5F6B63]">{band.note}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Journey */}
        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Eyebrow>How ordering works</Eyebrow>
            <h2 className="font-display text-2xl font-semibold text-[#0F3A2C]">
              Reserve, review, pay
            </h2>
          </div>
          <ol className="grid gap-3 sm:grid-cols-3">
            {JOURNEY.map((item) => (
              <li
                key={item.step}
                className="flex flex-col gap-2 rounded-xl border border-[#E9E4D4] bg-[#FEFCF6] p-4"
              >
                <span className="font-display text-2xl font-bold text-[#0F4D3A]">
                  {item.step}
                </span>
                <p className="text-sm font-semibold text-[#103D30]">{item.title}</p>
                <p className="text-xs leading-relaxed text-[#5F6B63]">{item.text}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>

      {/* Right: order surface */}
      <OrderForm
        listingId={listing.id}
        minOrderKg={listing.minOrderQuantity}
        availableKg={listing.availableQuantity}
        pricePerUnit={listing.pricePerUnit}
      />
    </div>
  );
}
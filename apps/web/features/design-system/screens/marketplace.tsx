import { Chip, GradeMark, Quantity } from '@/features/ui';
import { LISTINGS } from '../data';

const FILTERS = ['All commodities', 'Teff', 'Wheat', 'Maize', 'Coffee', 'Sesame'];
const REGIONS = ['Oromia', 'Amhara', 'SNNPR'];

/** Section 1 — buyer discovery: composition, cards, quantity language. */
export function MarketplaceScreen() {
  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-line bg-surface px-5 py-4">
        <div className="flex items-baseline gap-1.5">
          <span className="font-display text-lg font-bold">GebeyaLink</span>
          <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
        </div>
        <nav className="flex gap-5 text-sm font-medium text-ink-soft">
          <span className="text-ink">Marketplace</span>
          <span>Orders</span>
          <span>Sell</span>
        </nav>
        <input
          className="ds-search max-w-xs"
          type="search"
          placeholder="Search commodities, co-ops…"
          aria-label="Search the marketplace"
          readOnly
        />
      </header>

      <div className="ds-hero">
        <div className="ds-hero__main flex flex-col gap-5">
          <p className="font-mono text-[0.6875rem] font-semibold tracking-[0.18em] text-ink-faint uppercase">
            Ethiopian commodity marketplace · 42 active lots
          </p>
          <h1 className="font-display font-semibold">
            Buy directly from verified cooperatives
          </h1>
          <p className="max-w-[54ch] text-ink-soft">
            Live availability from cooperative inventory — graded, weighed and
            ready for dispatch. Orders reserve stock the moment they are placed.
          </p>
          <input
            className="ds-search max-w-xl"
            type="search"
            placeholder="Try “white teff, grade A, Oromia”"
            aria-label="Search commodities"
            readOnly
          />
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((filter, index) => (
              <Chip key={filter} selected={index === 0}>
                {filter}
              </Chip>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-ink-faint">Region</span>
            {REGIONS.map((region) => (
              <Chip key={region}>{region}</Chip>
            ))}
          </div>
        </div>
        <aside className="ds-hero__aside">
          <dl className="ds-stats">
            <div className="ds-stats__row">
              <dt>Active cooperatives</dt>
              <dd>18</dd>
            </div>
            <div className="ds-stats__row">
              <dt>Volume listed</dt>
              <dd>1,248 t</dd>
            </div>
            <div className="ds-stats__row">
              <dt>Avg. response time</dt>
              <dd>6.4 h</dd>
            </div>
            <div className="ds-stats__row">
              <dt>Min. order</dt>
              <dd>1,000 kg</dd>
            </div>
          </dl>
        </aside>
      </div>

      <div className="listing-grid">
        {LISTINGS.map((listing) => (
          <article key={listing.id} className="listing-card flex flex-col gap-3 rounded-card border border-line bg-surface p-5 shadow-card">
            <div className="lc-head flex items-center justify-between">
              <GradeMark grade={listing.grade} size="sm" />
              <span className="font-mono text-[0.625rem] text-ink-faint">
                {listing.id}
              </span>
            </div>
            <h3 className="lc-title font-display text-xl font-semibold">
              {listing.product}
            </h3>
            <p className="lc-origin text-sm text-ink-soft">
              {listing.origin} · {listing.cooperative}
            </p>
            <div className="lc-qty flex flex-col gap-1.5">
              <div className="meter__track" style={{ height: '4px' }} aria-hidden="true">
                <span
                  className="meter__seg"
                  data-status="available"
                  style={{ width: `${(listing.availableKg / listing.totalKg) * 100}%` }}
                />
              </div>
              <span className="text-xs text-ink-soft">
                <Quantity value={listing.availableKg} unit="kg" size="sm" /> of{' '}
                <Quantity value={listing.totalKg} unit="kg" size="sm" /> available
              </span>
            </div>
            <p className="lc-price font-mono text-lg font-semibold">
              {new Intl.NumberFormat('en-US').format(listing.pricePerQt)}{' '}
              <span className="text-xs font-normal text-ink-faint">ETB/quintal</span>
            </p>
            <div className="lc-foot flex items-center justify-between border-t border-line pt-3 text-xs text-ink-faint">
              <span>MOQ 1,000 kg</span>
              <span className="font-semibold text-ink-soft">View lot →</span>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

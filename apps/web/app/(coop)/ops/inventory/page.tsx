import type { ListingStatus } from '@gebeyalink/types';

import { getCoopContext, listCoopInventory } from '@/features/coop/queries';
import type { CoopInventoryLot } from '@/features/coop/queries';
import { ListingControl } from '@/features/coop/components/manage-listing';
import { Eyebrow, GradeMark, Quantity, StatusMark } from '@/features/ui';
import { formatPricePerKg } from '@/lib/format';
import { requirePageRole } from '@/lib/session';

const LISTING_MARKS: Record<ListingStatus, { label: string; swatch: string; textClasses: string }> = {
  active: { label: 'Active', swatch: 'bg-st-available', textClasses: 'text-ink' },
  paused: { label: 'Paused', swatch: 'border border-ink-faint bg-transparent', textClasses: 'text-ink-soft' },
  closed: { label: 'Closed', swatch: 'bg-ink-faint', textClasses: 'text-ink-faint line-through' },
};

function ListingStatusMark({ status }: { status: ListingStatus }) {
  const mark = LISTING_MARKS[status];
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium">
      <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${mark.swatch}`} />
      <span className={mark.textClasses}>{mark.label}</span>
    </span>
  );
}

function shortId(id: string): string {
  return id.slice(0, 8);
}

export default async function InventoryPage() {
  const session = await requirePageRole('cooperative_staff');

  const [coops, inventory] = await Promise.all([
    getCoopContext(session),
    listCoopInventory(session, { page: 1, limit: 200 }),
  ]);

  const lots = inventory.items;
  const totalKg = lots.reduce((sum, lot) => sum + lot.totalQuantity, 0);
  const availableKg = lots.reduce((sum, lot) => sum + lot.availableQuantity, 0);
  const activeListings = lots.filter((lot) => lot.listing?.status === 'active').length;
  const sellable = lots.filter((lot) => lot.availableQuantity >= 0.001);

  const coopName = coops.map((c) => c.name).join(', ') || 'Your cooperative';

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Eyebrow>Cooperative · stock</Eyebrow>
          <h1 className="font-display text-4xl font-semibold">Inventory</h1>
          <p className="text-sm text-ink-soft">
            {coopName} — {lots.length} lots · <Quantity value={totalKg} unit="kg" size="sm" />{' '}
            tracked · <Quantity value={availableKg} unit="kg" size="sm" /> available to sell
          </p>
        </div>
        <p className="rounded-btn border border-line bg-surface px-3 py-2 text-xs font-medium text-ink-soft">
          {activeListings} active listing{activeListings === 1 ? '' : 's'} ·{' '}
          {sellable.length} sellable lot{sellable.length === 1 ? '' : 's'}
        </p>
      </div>

      {lots.length === 0 ? (
        <div className="rounded-card border border-dashed border-line-strong px-4 py-10 text-center text-sm text-ink-faint">
          No inventory lots yet. Accepted farmer deliveries land here.
        </div>
      ) : (
        <div className="ops-wrap overflow-x-auto rounded-card border border-line bg-surface shadow-card">
          <table className="ops-table">
            <thead>
              <tr>
                <th scope="col">Lot</th>
                <th scope="col">Product</th>
                <th scope="col">Grade</th>
                <th scope="col">Origin</th>
                <th scope="col" className="text-right">Available</th>
                <th scope="col" className="text-right">Reserved</th>
                <th scope="col" className="text-right">Total</th>
                <th scope="col">Listing</th>
                <th scope="col">Status</th>
                <th scope="col">
                  <span className="sr-only">Manage listing</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {lots.map((lot) => (
                <InventoryRow key={lot.id} lot={lot} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function InventoryRow({ lot }: { lot: CoopInventoryLot }) {
  return (
    <tr>
      <td className="font-mono text-xs font-semibold">{shortId(lot.id)}</td>
      <td className="font-medium">{lot.productName}</td>
      <td>
        <GradeMark grade={lot.qualityGrade} size="sm" />
      </td>
      <td className="text-ink-soft">
        {lot.collectionCenterName}
        {lot.collectionCenterLocation ? ` · ${lot.collectionCenterLocation}` : ''}
      </td>
      <td className="text-right font-mono tabular-nums">
        <Quantity value={lot.availableQuantity} unit="kg" size="sm" />
      </td>
      <td className="text-right font-mono tabular-nums text-ink-soft">
        {lot.reservedQuantity.toLocaleString('en-US')}
      </td>
      <td className="text-right font-mono tabular-nums text-ink-soft">
        {lot.totalQuantity.toLocaleString('en-US')}
      </td>
      <td className="min-w-36">
        {lot.listing ? (
          <div className="flex flex-col gap-1">
            <span className="font-mono text-xs font-semibold">
              {formatPricePerKg(lot.listing.pricePerUnit)}
            </span>
            <ListingStatusMark status={lot.listing.status} />
          </div>
        ) : (
          <span className="text-xs text-ink-faint">Not listed</span>
        )}
      </td>
      <td>
        <StatusMark status={lot.status} />
      </td>
      <td>
        <ListingControl lot={lot} />
      </td>
    </tr>
  );
}
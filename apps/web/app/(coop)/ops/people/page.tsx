import { getCoopContext, listCoopCenters, listCoopFarmers } from '@/features/coop/queries';
import { CenterStatusAction } from '@/features/coop/components/center-status-action';
import { CreateCenterForm } from '@/features/coop/components/create-center-form';
import { FarmerStatusAction } from '@/features/coop/components/farmer-status-action';
import { RegisterFarmerForm } from '@/features/coop/components/register-farmer-form';
import { Eyebrow } from '@/features/ui';
import { formatDate } from '@/lib/format';
import { requirePageRole } from '@/lib/session';

function ActiveMark({ active }: { active: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium">
      <span
        aria-hidden="true"
        className={`size-2 shrink-0 rounded-full ${
          active ? 'bg-st-available' : 'border border-ink-faint bg-transparent'
        }`}
      />
      <span className={active ? 'text-ink' : 'text-ink-faint'}>{active ? 'Active' : 'Inactive'}</span>
    </span>
  );
}

export default async function PeoplePage(props: { searchParams: Promise<{ q?: string }> }) {
  const session = await requirePageRole('cooperative_staff');
  const { q } = await props.searchParams;
  const search = q?.trim() || undefined;

  const [coops, centers, farmers] = await Promise.all([
    getCoopContext(session),
    listCoopCenters(session, { page: 1, limit: 100 }),
    listCoopFarmers(session, {
      search: search ?? null,
      page: 1,
      limit: 200,
    }),
  ]);

  const coopName = coops.map((c) => c.name).join(', ') || 'Your cooperative';
  const farmersTotal = farmers.total;
  const cooperativeOptions = coops.map((coop) => ({ id: coop.id, name: coop.name }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Eyebrow>Cooperative · network</Eyebrow>
        <h1 className="font-display text-4xl font-semibold">Centers & farmers</h1>
        <p className="text-sm text-ink-soft">
          {coopName} — {centers.items.length} collection centers ·{' '}
          {farmersTotal.toLocaleString('en-US')} registered farmers
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="font-display text-xl font-semibold">Collection centers</h2>
          {cooperativeOptions.length > 0 ? (
            <CreateCenterForm cooperatives={cooperativeOptions} />
          ) : null}
        </div>
        {centers.items.length === 0 ? (
          <div className="rounded-card border border-dashed border-line-strong px-4 py-8 text-center text-sm text-ink-faint">
            No collection centers registered yet.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {centers.items.map((center) => (
              <div
                key={center.id}
                className="flex flex-col gap-2 rounded-card border border-line bg-surface p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold">{center.name}</p>
                  <ActiveMark active={center.active} />
                </div>
                <p className="text-xs text-ink-soft">
                  {center.location ?? 'Location not set'}
                </p>
                <div className="mt-1">
                  <CenterStatusAction centerId={center.id} active={center.active} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="font-display text-xl font-semibold">Farmers</h2>
          <form action="/ops/people" method="get" className="flex items-center gap-2">
            <label className="sr-only" htmlFor="farmer-search">
              Search farmers
            </label>
            <input
              id="farmer-search"
              name="q"
              type="search"
              defaultValue={search ?? ''}
              placeholder="Search by name or phone"
              className="ds-search h-9 w-56"
            />
            <button
              type="submit"
              className="rounded-btn border border-line-strong bg-surface px-3 py-1.5 text-xs font-medium hover:bg-surface-2"
            >
              Search
            </button>
          </form>
        </div>

        {cooperativeOptions.length > 0 ? (
          <RegisterFarmerForm cooperatives={cooperativeOptions} />
        ) : null}

        {farmers.items.length === 0 ? (
          <div className="rounded-card border border-dashed border-line-strong px-4 py-8 text-center text-sm text-ink-faint">
            {search ? `No farmers match “${search}”.` : 'No farmers registered yet.'}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {farmers.items.map((farmer) => (
              <div
                key={farmer.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-surface px-4 py-3"
              >
                <div className="flex flex-col gap-0.5">
                  <p className="text-sm font-semibold">{farmer.name}</p>
                  <p className="text-xs text-ink-soft">{farmer.location ?? 'Location not set'}</p>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  {farmer.phone ? (
                    <span className="font-mono text-xs text-ink-soft">{farmer.phone}</span>
                  ) : null}
                  <span className="font-mono text-xs text-ink-faint">
                    Reg. {formatDate(farmer.registeredAt)}
                  </span>
                  <ActiveMark active={farmer.active} />
                  <FarmerStatusAction farmerId={farmer.id} active={farmer.active} />
                </div>
              </div>
            ))}
            {search && farmers.items.length < farmersTotal ? (
              <p className="text-xs text-ink-faint">
                Showing {farmers.items.length} of {farmersTotal} matches.
              </p>
            ) : null}
          </div>
        )}

        <p className="text-xs text-ink-faint">
          Farmer deliveries and intake are recorded at the collection center by collection agents —
          those records land in this cooperative&apos;s inventory.
        </p>
      </section>
    </div>
  );
}
import { Button, GradeMark, Quantity, StatusMark } from '@/features/ui';
import { INVENTORY_ROWS } from '../data';

/** Section 4 — cooperative inventory: dense operational table. */
export function InventoryScreen() {
  const totalKg = INVENTORY_ROWS.reduce(
    (sum, row) => sum + row.availableKg + row.reservedKg + row.committedKg,
    0,
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[0.6875rem] font-semibold tracking-[0.18em] text-ink-faint uppercase">
            Besheno Farmers Co-op · inventory
          </p>
          <p className="mt-1 font-display text-2xl font-semibold">
            {INVENTORY_ROWS.length} lots ·{' '}
            <span className="font-mono">{totalKg.toLocaleString('en-US')} kg</span>{' '}
            tracked
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary">Export</Button>
          <Button>New lot</Button>
        </div>
      </div>

      <div className="ops-wrap overflow-x-auto rounded-card border border-line bg-surface shadow-card">
        <table className="ops-table">
          <thead>
            <tr>
              <th scope="col">Lot</th>
              <th scope="col">Product</th>
              <th scope="col">Grade</th>
              <th scope="col">Origin</th>
              <th scope="col" className="text-right">
                Available
              </th>
              <th scope="col" className="text-right">
                Reserved
              </th>
              <th scope="col" className="text-right">
                Committed
              </th>
              <th scope="col">Composition</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {INVENTORY_ROWS.map((row) => {
              const total =
                row.availableKg + row.reservedKg + row.committedKg || 1;
              return (
                <tr key={row.lot}>
                  <td className="font-mono text-xs font-semibold">{row.lot}</td>
                  <td className="font-medium">{row.product}</td>
                  <td>
                    <GradeMark grade={row.grade} size="sm" />
                  </td>
                  <td className="text-ink-soft">{row.origin}</td>
                  <td className="text-right font-mono tabular-nums">
                    <Quantity value={row.availableKg} unit="kg" size="sm" />
                  </td>
                  <td className="text-right font-mono tabular-nums text-ink-soft">
                    {row.reservedKg.toLocaleString('en-US')}
                  </td>
                  <td className="text-right font-mono tabular-nums text-ink-soft">
                    {row.committedKg.toLocaleString('en-US')}
                  </td>
                  <td className="min-w-36">
                    <div
                      className="meter__track"
                      style={{ height: '4px' }}
                      role="img"
                      aria-label={`${row.lot} composition`}
                    >
                      <span
                        className="meter__seg"
                        data-status="available"
                        style={{ width: `${(row.availableKg / total) * 100}%` }}
                      />
                      <span
                        className="meter__seg"
                        data-status="reserved"
                        style={{ width: `${(row.reservedKg / total) * 100}%` }}
                      />
                      <span
                        className="meter__seg"
                        data-status="committed"
                        style={{ width: `${(row.committedKg / total) * 100}%` }}
                      />
                    </div>
                  </td>
                  <td>
                    <StatusMark status={row.status} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

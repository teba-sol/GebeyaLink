import { listAdminProducts } from '@/features/admin/queries';
import { CreateProductForm } from '@/features/admin/components/create-product-form';
import { ProductStatusAction } from '@/features/admin/components/product-status-action';
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
      <span className={active ? 'text-ink' : 'text-ink-faint'}>
        {active ? 'Active' : 'Inactive'}
      </span>
    </span>
  );
}

export default async function AdminProductsPage() {
  const session = await requirePageRole('admin');
  const products = await listAdminProducts(session);
  const activeCount = products.filter((product) => product.active).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Eyebrow>Platform · catalog</Eyebrow>
        <h1 className="font-display text-4xl font-semibold">Products</h1>
        <p className="text-sm text-ink-soft">
          {products.length} products · {activeCount} active — the global reference catalog cooperatives
          and buyers trade in.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
        <CreateProductForm />

        <section className="flex flex-col gap-3">
          {products.length === 0 ? (
            <div className="rounded-card border border-dashed border-line-strong px-4 py-10 text-center text-sm text-ink-faint">
              No products in the catalog yet. Add the first one.
            </div>
          ) : (
            products.map((product) => (
              <div
                key={product.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-card border border-line bg-surface px-4 py-3"
              >
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-semibold">{product.name}</p>
                    <ActiveMark active={product.active} />
                  </div>
                  <p className="font-mono text-xs text-ink-faint">
                    {product.slug} · added {formatDate(product.createdAt)}
                  </p>
                </div>
                <ProductStatusAction productId={product.id} active={product.active} />
              </div>
            ))
          )}
        </section>
      </div>
    </div>
  );
}
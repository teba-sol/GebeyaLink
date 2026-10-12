'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';

import type { ProductDto } from '@gebeyalink/types';

const GRADES = ['A', 'B', 'C'] as const;
type GradeFilter = (typeof GRADES)[number];

export type ActiveMarketplaceFilters = {
  product: string | null;
  grade: GradeFilter | null;
  location: string | null;
  maxPrice: string | null;
};

type FormState = ActiveMarketplaceFilters & { query: string };

function countActive(f: ActiveMarketplaceFilters): number {
  return [f.product, f.grade, f.location ?? '', f.maxPrice ?? ''].filter(Boolean).length;
}

const INPUT =
  'w-full rounded-md border border-[#E3DCC8] bg-[#FEFCF6] py-2 text-xs text-[#1F2A24] placeholder-[#8A9189] focus:border-[#0F4D3A] focus:outline-none focus:ring-1 focus:ring-[#0F4D3A]';

function CheckboxItem({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <label className="group flex cursor-pointer items-center gap-2.5 py-1">
      <span className="relative flex h-3.5 w-3.5 items-center justify-center">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="peer h-3.5 w-3.5 appearance-none rounded-[3px] border border-[#BDB7A3] bg-white transition-colors checked:border-[#0F4D3A] checked:bg-[#0F4D3A] focus:outline-none focus-visible:ring-1 focus-visible:ring-[#0F4D3A] focus-visible:ring-offset-1"
        />
        <svg
          className="pointer-events-none absolute h-2.5 w-2.5 text-white opacity-0 peer-checked:opacity-100"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </span>
      <span className="text-xs text-[#3F4A43] transition-colors group-hover:text-[#0F3A2C]">
        {label}
      </span>
    </label>
  );
}

function SearchIcon() {
  return (
    <svg className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-[#6B756E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function FilterForm({
  products,
  form,
  pending,
  onQuery,
  onProduct,
  onGrade,
  onLocation,
  onMaxPrice,
  onApply,
  onClear,
}: {
  products: ProductDto[];
  form: FormState;
  pending: boolean;
  onQuery: (value: string) => void;
  onProduct: (id: string | null) => void;
  onGrade: (grade: GradeFilter | null) => void;
  onLocation: (value: string) => void;
  onMaxPrice: (value: string) => void;
  onApply: () => void;
  onClear: () => void;
}) {
  const query = form.query.trim().toLowerCase();
  const visibleProducts = query
    ? products.filter((p) => p.name.toLowerCase().includes(query))
    : products;

  const divider = 'border-t border-[#E9E4D4] pt-4';

  return (
    <div className="flex flex-col gap-4">
      {/* Search */}
      <div className="relative">
        <SearchIcon />
        <input
          className={`${INPUT} pr-3 pl-8`}
          type="search"
          value={form.query}
          onChange={(event) => onQuery(event.target.value)}
          placeholder="Search coffee, maize, sesame..."
          aria-label="Search products"
        />
      </div>

      {/* Commodity */}
      <div className="flex flex-col">
        <p className="mb-1 text-xs font-semibold text-[#1F2A24]">Commodity</p>
        <CheckboxItem checked={form.product === null} onChange={() => onProduct(null)} label="All commodities" />
        {visibleProducts.length === 0 ? (
          <p className="py-2 text-xs text-[#8A9189]">No commodities match &ldquo;{form.query}&rdquo;</p>
        ) : (
          visibleProducts.map((product) => (
            <CheckboxItem
              key={product.id}
              checked={form.product === product.id}
              onChange={() => onProduct(form.product === product.id ? null : product.id)}
              label={product.name}
            />
          ))
        )}
      </div>

      {/* Quality grade */}
      <div className={`flex flex-col ${divider}`}>
        <p className="mb-1 text-xs font-semibold text-[#1F2A24]">Quality grade</p>
        <CheckboxItem checked={form.grade === null} onChange={() => onGrade(null)} label="All grades" />
        {GRADES.map((grade) => (
          <CheckboxItem
            key={grade}
            checked={form.grade === grade}
            onChange={() => onGrade(form.grade === grade ? null : grade)}
            label={`Grade ${grade}`}
          />
        ))}
      </div>

      {/* Region */}
      <div className={`flex flex-col gap-2 ${divider}`}>
        <p className="text-xs font-semibold text-[#1F2A24]">Region / location</p>
        <div className="relative">
          <SearchIcon />
          <input
            className={`${INPUT} pr-3 pl-8`}
            type="search"
            value={form.location ?? ''}
            onChange={(event) => onLocation(event.target.value)}
            placeholder="e.g. Sidama, Oromia"
            aria-label="Region or location"
          />
        </div>
      </div>

      {/* Max price */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold text-[#1F2A24]">Max price (ETB/kg)</p>
        <input
          className={`${INPUT} px-3`}
          type="number"
          min="0"
          step="0.001"
          value={form.maxPrice ?? ''}
          onChange={(event) => onMaxPrice(event.target.value)}
          placeholder="e.g. 120"
          aria-label="Max price in ETB per kilogram"
        />
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2 pt-1">
        <button
          type="button"
          className="w-full rounded-md bg-[#0F4D3A] py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#0B3D2E] disabled:opacity-70"
          disabled={pending}
          onClick={onApply}
        >
          {pending ? 'Applying...' : 'Apply filters'}
        </button>
        <button
          type="button"
          className="w-full py-1 text-center text-xs font-medium text-[#4A554E] transition-colors hover:text-[#0F3A2C]"
          onClick={onClear}
        >
          Clear all
        </button>
      </div>
    </div>
  );
}

/**
 * Marketplace filters: desktop sidebar card + mobile drawer.
 */
export function MarketplaceFilters({
  products,
  active,
}: {
  products: ProductDto[];
  active: ActiveMarketplaceFilters;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>({ ...active, query: '' });
  const [priorActive, setPriorActive] = useState(active);

  if (
    priorActive.product !== active.product ||
    priorActive.grade !== active.grade ||
    priorActive.location !== active.location ||
    priorActive.maxPrice !== active.maxPrice
  ) {
    setPriorActive(active);
    setForm((prev) => ({ ...active, query: prev.query }));
  }

  const navigate = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    next.delete('page');
    const query = next.toString();
    startTransition(() => router.push(query ? `${pathname}?${query}` : pathname));
  };

  const apply = () => {
    const location = form.location?.trim() || null;
    const maxPrice = form.maxPrice?.trim() || null;
    navigate({ productId: form.product, qualityGrade: form.grade, location, maxPrice });
    setOpen(false);
  };

  const clear = () => {
    setForm({ product: null, grade: null, location: null, maxPrice: null, query: '' });
    navigate({ productId: null, qualityGrade: null, location: null, maxPrice: null });
    setOpen(false);
  };

  const activeCount = countActive(active);

  const formProps = {
    products,
    form,
    pending,
    onQuery: (value: string) => setForm((f) => ({ ...f, query: value })),
    onProduct: (value: string | null) => setForm((f) => ({ ...f, product: value })),
    onGrade: (value: GradeFilter | null) => setForm((f) => ({ ...f, grade: value })),
    onLocation: (value: string) => setForm((f) => ({ ...f, location: value })),
    onMaxPrice: (value: string) => setForm((f) => ({ ...f, maxPrice: value })),
    onApply: apply,
    onClear: clear,
  };

  return (
    <>
      {/* Desktop sidebar card */}
      <div className="hidden lg:block">
        <div className="rounded-xl border border-[#E9E4D4] bg-[#FEFCF6] p-4 shadow-[0_1px_2px_rgba(15,58,44,0.04)]">
          <h3 className="mb-4 text-sm font-semibold text-[#1F2A24]">Filters</h3>
          <FilterForm {...formProps} />
        </div>
      </div>

      {/* Mobile trigger */}
      <div className="lg:hidden">
        <button
          type="button"
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#E3DCC8] bg-[#FEFCF6] py-3 text-sm font-medium text-[#3F4A43] hover:bg-white"
          onClick={() => setOpen(true)}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <span>Filters</span>
          {activeCount > 0 ? (
            <span className="ml-1 rounded-full bg-[#0F4D3A] px-2 py-0.5 text-xs text-white">{activeCount}</span>
          ) : null}
        </button>
      </div>

      {/* Mobile drawer */}
      {open ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Filters">
          <div className="flex h-full w-full max-w-sm flex-col bg-[#FBF7EE] shadow-xl">
            <div className="flex items-center justify-between border-b border-[#E9E4D4] px-5 py-4">
              <p className="text-base font-semibold text-[#1F2A24]">Filters</p>
              <button
                type="button"
                className="rounded-md px-3 py-1.5 text-sm font-medium text-[#4A554E] hover:bg-[#EFE9D8]"
                onClick={() => setOpen(false)}
              >
                Close
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <FilterForm {...formProps} />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
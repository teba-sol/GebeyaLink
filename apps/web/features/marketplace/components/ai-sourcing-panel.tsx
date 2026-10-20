'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';

import type { AiSourcingResult } from '@gebeyalink/types';

import { api, ApiError } from '@/lib/api/client';

/**
 * AI-assisted sourcing search (docs/frontend-architecture.md). The assistant
 * extracts structured criteria, which are applied through URL parameters so the
 * existing server-side marketplace search renders the results — there is no
 * second grid and no duplicated search logic. Editing the criteria (in the
 * filters) never calls the AI again.
 */

export function AiSourcingPanel({
  minOrderQuantityKg,
  products,
}: {
  minOrderQuantityKg: number;
  products: { id: string; name: string }[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<AiSourcingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pending, startTransition] = useTransition();

  const chips = (result?.criteria
    ? [
        result.criteria.productId
          ? { label: 'Commodity', value: products.find((p) => p.id === result.criteria.productId)?.name ?? result.criteria.productId }
          : null,
        result.criteria.qualityGrade ? { label: 'Grade', value: `Grade ${result.criteria.qualityGrade}` } : null,
        result.criteria.location ? { label: 'Origin', value: result.criteria.location } : null,
        result.criteria.maxPrice != null
          ? { label: 'Max price', value: `${result.criteria.maxPrice} ETB/kg` }
          : null,
        result.criteria.minAvailable != null
          ? { label: 'Min quantity', value: `${result.criteria.minAvailable.toLocaleString('en-US')} kg` }
          : null,
      ].filter((chip): chip is { label: string; value: string } => chip !== null)
    : []);

  const submit = async () => {
    const trimmed = query.trim();
    if (trimmed.length < 3 || isLoading) return;

    setResult(null);
    setError(null);
    setIsLoading(true);
    try {
      const data = await api.parseAiSourcing(trimmed);
      setResult(data);
      const next = new URLSearchParams();
      const sort = searchParams.get('sort');
      if (sort) next.set('sort', sort);
      const c = data.criteria;
      if (c.productId) next.set('productId', c.productId);
      if (c.qualityGrade) next.set('qualityGrade', c.qualityGrade);
      if (c.location) next.set('location', c.location);
      if (c.maxPrice != null) next.set('maxPrice', String(c.maxPrice));
      if (c.minAvailable != null) next.set('minAvailable', String(c.minAvailable));
      startTransition(() =>
        router.push(next.toString() ? `/marketplace?${next.toString()}` : '/marketplace'),
      );
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'The sourcing assistant is unavailable right now. Use the filters to search manually.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section
      aria-labelledby="ai-sourcing-heading"
      className="mb-6 rounded-xl border border-[#D9E4DA] bg-[#F3F8F2] p-5"
    >
      <div className="flex flex-col gap-1">
        <p className="text-[0.68rem] font-semibold tracking-[0.18em] text-[#174F3D] uppercase">
          AI sourcing assistant
        </p>
        <h2 id="ai-sourcing-heading" className="font-display text-lg font-semibold text-[#0F4D3A]">
          Describe what you need in plain language
        </h2>
        <p className="text-xs text-[#5F6B63]">
          We turn your request into filters and search the real cooperative inventory. Minimum order
          quantity: {minOrderQuantityKg.toLocaleString('en-US')} kg.
        </p>
      </div>

      <label htmlFor="ai-sourcing-query" className="sr-only">
        Describe the commodity you are sourcing
      </label>
      <textarea
        id="ai-sourcing-query"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        rows={2}
        maxLength={300}
        placeholder="e.g. 5 tonnes of grade A coffee from Sidama under 300 ETB per kg"
        className="mt-3 w-full resize-none rounded-md border border-[#E3DCC8] bg-[#FEFCF6] px-3 py-2 text-sm text-[#1F2A24] placeholder-[#8A9189] focus:border-[#0F4D3A] focus:outline-none focus:ring-1 focus:ring-[#0F4D3A]"
      />

      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={isLoading || pending || query.trim().length < 3}
          className="rounded-md bg-[#0F4D3A] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0B3D2E] disabled:opacity-60"
        >
          {isLoading ? 'Finding matches…' : 'Find matches'}
        </button>
        {result && result.warnings.length === 0 ? (
          <span className="text-xs text-[#4A554E]">
            {chips.length > 0 ? 'Filters applied — adjust them any time.' : 'No filters detected.'}
          </span>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      ) : null}

      {chips.length > 0 ? (
        <div className="mt-3 flex flex-wrap items-center gap-2" aria-label="Extracted search criteria">
          {chips.map((chip) => (
            <span
              key={chip.label}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#CFE0D3] bg-[#FEFCF6] px-3 py-1 text-xs text-[#1F2A24]"
            >
              <span className="font-semibold text-[#0F4D3A]">{chip.label}</span>
              <span>{chip.value}</span>
            </span>
          ))}
        </div>
      ) : null}

      {result && result.warnings.length > 0 ? (
        <ul className="mt-3 flex flex-col gap-1">
          {result.warnings.map((warning) => (
            <li key={warning.code} className="text-xs text-[#8A6D1F]">
              {warning.message}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

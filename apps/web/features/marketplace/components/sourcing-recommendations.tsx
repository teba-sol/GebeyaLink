'use client';

import Link from 'next/link';
import { useState } from 'react';

import type {
  AiRecommendationResult,
  EvidenceRef,
  SupplierRecommendation,
} from '@gebeyalink/types';

import { api, ApiError } from '@/lib/api/client';

/**
 * Sourcing recommendations (docs/ai-sourcing-solution-design.md,
 * docs/frontend-architecture.md §Sourcing recommendations).
 *
 * Distinct from the parse panel: this calls the recommendation engine, which
 * scores *real* eligible suppliers and returns evidence for every claim. The
 * AI only explains the computed result — the score bars, eligibility and
 * evidence come from deterministic server code and are never model-authored.
 *
 * UI authz mirrors the server: the panel is only mounted for buyers, and the
 * API re-checks the role regardless.
 */

const COMPONENT_LABELS: Record<string, string> = {
  quantity: 'Quantity coverage',
  price: 'Price fit',
  grade: 'Grade match',
  location: 'Proximity',
  completeness: 'Record completeness',
};

function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function ScoreBar({ recommendation }: { recommendation: SupplierRecommendation }) {
  return (
    <div className="mt-3 flex flex-col gap-1.5" aria-label="Score breakdown">
      {recommendation.score.components.map((component) => (
        <div key={component.key} className="grid grid-cols-[7.5rem_1fr_2.5rem] items-center gap-2">
          <span className="text-[0.7rem] text-[#5F6B63]">{COMPONENT_LABELS[component.key] ?? component.key}</span>
          <span className="relative block h-1.5 overflow-hidden rounded-full bg-[#E7E1D2]">
            <span
              aria-hidden
              className="absolute inset-y-0 left-0 rounded-full"
              style={{
                width: `${Math.round(component.score * 100)}%`,
                backgroundColor: component.status === 'unknown' ? '#C9CFC8' : '#0F4D3A',
              }}
            />
          </span>
          <span className="text-right text-[0.7rem] tabular-nums text-[#4A554E]">
            {component.status === 'unknown' ? '—' : pct(component.score)}
          </span>
        </div>
      ))}
    </div>
  );
}

function EvidenceList({ evidence }: { evidence: EvidenceRef[] }) {
  const [open, setOpen] = useState(false);
  const shown = open ? evidence : evidence.slice(0, 3);
  return (
    <div className="mt-3">
      <p className="text-[0.68rem] font-semibold tracking-[0.14em] text-[#7A857C] uppercase">
        Evidence
      </p>
      <ul className="mt-1.5 flex flex-col gap-1">
        {shown.map((item) => (
          <li key={item.id} className="text-[0.72rem] leading-snug text-[#4A554E]">
            <span
              className={
                item.kind === 'calculation'
                  ? 'font-semibold text-[#174F3D]'
                  : item.kind === 'rule'
                    ? 'font-semibold text-[#8A6D1F]'
                    : 'font-semibold text-[#1F2A24]'
              }
            >
              {item.claim}:
            </span>{' '}
            {item.detail ?? String(item.value ?? '—')}
            {item.field ? <span className="ml-1 text-[#9AA39B]">({item.field})</span> : null}
          </li>
        ))}
      </ul>
      {evidence.length > 3 ? (
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="mt-1 text-[0.72rem] font-semibold text-[#0F4D3A] underline-offset-2 hover:underline"
        >
          {open ? 'Show less' : `Show all ${evidence.length} evidence points`}
        </button>
      ) : null}
    </div>
  );
}

function SupplierCard({
  recommendation,
  ineligible,
}: {
  recommendation: SupplierRecommendation;
  ineligible?: boolean;
}) {
  return (
    <article
      className={`rounded-xl border bg-[#FEFCF6] p-4 ${
        ineligible ? 'border-[#E7E1D2]' : 'border-[#CFE0D3]'
      }`}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            {!ineligible ? (
              <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-[#0F4D3A] px-1.5 text-[0.72rem] font-semibold text-white">
                #{recommendation.rank}
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full border border-[#D9BFA0] bg-[#FBF1E3] px-2 py-0.5 text-[0.68rem] font-semibold text-[#8A6D1F]">
                Did not qualify
              </span>
            )}
            <h3 className="font-display text-base font-semibold text-[#0F4D3A]">
              {recommendation.cooperativeName}
            </h3>
          </div>
          <p className="mt-0.5 text-xs text-[#5F6B63]">
            {recommendation.productName} · Grade {recommendation.qualityGrade}
            {recommendation.location ? ` · ${recommendation.location}` : ''}
          </p>
        </div>
        <div className="flex flex-col items-end">
          <span className="font-display text-lg font-semibold text-[#0F4D3A]">
            {recommendation.pricePerKg}
          </span>
          <span className="text-[0.68rem] text-[#7A857C]">ETB / kg</span>
        </div>
      </header>

      <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-[#F3F8F2] px-2 py-1.5">
          <dt className="text-[0.62rem] tracking-wide text-[#7A857C] uppercase">Available</dt>
          <dd className="text-sm font-semibold text-[#1F2A24]">
            {recommendation.availableQuantityKg.toLocaleString('en-US')} kg
          </dd>
        </div>
        <div className="rounded-lg bg-[#F3F8F2] px-2 py-1.5">
          <dt className="text-[0.62rem] tracking-wide text-[#7A857C] uppercase">Fulfillment</dt>
          <dd className="text-sm font-semibold text-[#1F2A24]">
            {recommendation.fulfillment === 'full' ? 'Covers request' : 'Partial'}
          </dd>
        </div>
        <div className="rounded-lg bg-[#F3F8F2] px-2 py-1.5">
          <dt className="text-[0.62rem] tracking-wide text-[#7A857C] uppercase">
            {recommendation.estimatedTotal != null ? 'Est. total' : 'Score'}
          </dt>
          <dd className="text-sm font-semibold text-[#1F2A24]">
            {recommendation.estimatedTotal != null
              ? `${recommendation.estimatedTotal.toLocaleString('en-US')} ETB`
              : pct(recommendation.score.total)}
          </dd>
        </div>
      </dl>

      {!ineligible ? <ScoreBar recommendation={recommendation} /> : null}

      {ineligible ? (
        <ul className="mt-3 flex flex-col gap-1">
          {recommendation.evidence
            .filter((item) => item.id.includes(':failure:'))
            .map((item) => (
              <li key={item.id} className="text-[0.72rem] text-[#8A6D1F]">
                {item.detail}
              </li>
            ))}
        </ul>
      ) : (
        <>
          {recommendation.reasons.length > 0 ? (
            <ul className="mt-3 flex flex-col gap-1">
              {recommendation.reasons.map((reason) => (
                <li key={reason} className="flex gap-1.5 text-[0.75rem] text-[#2C4A3C]">
                  <span aria-hidden className="text-[#4F9A6E]">
                    ▲
                  </span>
                  {reason}
                </li>
              ))}
            </ul>
          ) : null}

          {recommendation.tradeoffs.length > 0 ? (
            <ul className="mt-2 flex flex-col gap-1">
              {recommendation.tradeoffs.map((tradeoff) => (
                <li key={tradeoff} className="flex gap-1.5 text-[0.75rem] text-[#8A6D1F]">
                  <span aria-hidden>◆</span>
                  {tradeoff}
                </li>
              ))}
            </ul>
          ) : null}

          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href={`/marketplace/listings/${recommendation.listingId}`}
              className="rounded-md bg-[#0F4D3A] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#0B3D2E]"
            >
              View listing
            </Link>
          </div>

          <EvidenceList evidence={recommendation.evidence} />
        </>
      )}
    </article>
  );
}

export function SourcingRecommendations() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<AiRecommendationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const submit = async () => {
    const trimmed = query.trim();
    if (trimmed.length < 3 || isLoading) return;
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      setResult(await api.recommendSuppliers({ query: trimmed }));
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
      aria-labelledby="sourcing-recommendations-heading"
      className="mb-6 rounded-xl border border-[#E3DCC8] bg-[#FBF7EE] p-5"
    >
      <div className="flex flex-col gap-1">
        <p className="text-[0.68rem] font-semibold tracking-[0.18em] text-[#174F3D] uppercase">
          Supplier recommendations
        </p>
        <h2
          id="sourcing-recommendations-heading"
          className="font-display text-lg font-semibold text-[#0F4D3A]"
        >
          Ranked, evidence-backed supplier matches
        </h2>
        <p className="text-xs text-[#5F6B63]">
          Every recommendation is checked against real inventory and scored by a documented,
          deterministic method. The assistant explains the result — it never invents it.
        </p>
      </div>

      <label htmlFor="sourcing-recommendations-query" className="sr-only">
        Describe what you are sourcing
      </label>
      <textarea
        id="sourcing-recommendations-query"
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
          disabled={isLoading || query.trim().length < 3}
          className="rounded-md bg-[#174F3D] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0B3D2E] disabled:opacity-60"
        >
          {isLoading ? 'Scoring suppliers…' : 'Recommend suppliers'}
        </button>
      </div>

      {error ? (
        <p role="alert" className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      ) : null}

      {result ? (
        <div className="mt-4 flex flex-col gap-4">
          {result.clarifications.length > 0 ? (
            <ul className="flex flex-col gap-1 rounded-lg border border-[#E7E1D2] bg-[#FEFCF6] p-3">
              {result.clarifications.map((clarification) => (
                <li key={clarification.code} className="text-xs text-[#4A554E]">
                  {clarification.message}
                </li>
              ))}
            </ul>
          ) : null}

          {result.explanation ? (
            <div className="rounded-lg border border-[#CFE0D3] bg-[#F3F8F2] p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[0.68rem] font-semibold tracking-[0.14em] text-[#174F3D] uppercase">
                  Assistant summary
                </p>
                <span className="rounded-full border border-[#CFE0D3] bg-[#FEFCF6] px-2 py-0.5 text-[0.62rem] text-[#5F6B63]">
                  {result.explanation.source === 'gemini' ? 'AI explanation' : 'Deterministic summary'}
                </span>
              </div>
              <p className="mt-1.5 text-sm text-[#1F2A24]">{result.explanation.summary}</p>
              {result.explanation.risks.length > 0 ? (
                <ul className="mt-2 flex flex-col gap-1">
                  {result.explanation.risks.map((risk) => (
                    <li key={risk} className="text-xs text-[#8A6D1F]">
                      {risk}
                    </li>
                  ))}
                </ul>
              ) : null}
              {result.explanation.questionsToAsk.length > 0 ? (
                <div className="mt-2">
                  <p className="text-[0.68rem] font-semibold tracking-[0.14em] text-[#7A857C] uppercase">
                    Ask the supplier
                  </p>
                  <ul className="mt-1 flex flex-col gap-1">
                    {result.explanation.questionsToAsk.map((question) => (
                      <li key={question} className="text-xs text-[#4A554E]">
                        {question}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {result.explanation.note ? (
                <p className="mt-2 text-[0.68rem] text-[#7A857C]">{result.explanation.note}</p>
              ) : null}
            </div>
          ) : null}

          {result.recommendations.length === 0 ? (
            <p className="rounded-lg border border-dashed border-[#DDD6C3] bg-[#FEFCF6] px-4 py-6 text-center text-sm text-[#5F6B63]">
              No supplier passed every requirement. Widen the grade, origin, price or quantity, or
              review the closest matches below.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {result.recommendations.map((recommendation) => (
                <li key={recommendation.listingId}>
                  <SupplierCard recommendation={recommendation} />
                </li>
              ))}
            </ul>
          )}

          {result.split ? (
            <div className="rounded-lg border border-[#E3DCC8] bg-[#FEFCF6] p-4">
              <p className="text-[0.68rem] font-semibold tracking-[0.14em] text-[#8A6D1F] uppercase">
                Combination option
              </p>
              <p className="mt-1 text-sm text-[#1F2A24]">
                No single supplier covers your request. These {result.split.lines.length} listings,
                ordered separately, would cover{' '}
                {result.split.coveredQuantityKg.toLocaleString('en-US')} kg of{' '}
                {result.split.requestedQuantityKg.toLocaleString('en-US')} kg (
                {result.split.shortfallKg.toLocaleString('en-US')} kg short) for an estimated{' '}
                {result.split.estimatedTotalCost.toLocaleString('en-US')} {result.split.currency}.
              </p>
              <ul className="mt-2 flex flex-col gap-1">
                {result.split.lines.map((line) => (
                  <li key={line.listingId} className="text-xs text-[#4A554E]">
                    {line.cooperativeName} — {line.quantityKg.toLocaleString('en-US')} kg at{' '}
                    {line.pricePerKg} ETB/kg ({line.estimatedCost.toLocaleString('en-US')} ETB)
                  </li>
                ))}
              </ul>
              <ul className="mt-2 flex flex-col gap-1">
                {result.split.assumptions.map((assumption) => (
                  <li key={assumption} className="text-[0.68rem] text-[#7A857C]">
                    {assumption}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {result.partialMatches.length > 0 ? (
            <div className="flex flex-col gap-3">
              <h3 className="text-xs font-semibold tracking-[0.14em] text-[#7A857C] uppercase">
                Closest matches that did not qualify
              </h3>
              <ul className="flex flex-col gap-3">
                {result.partialMatches.map((recommendation) => (
                  <li key={recommendation.listingId}>
                    <SupplierCard recommendation={recommendation} ineligible />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <p className="text-[0.68rem] text-[#9AA39B]">
            Ranking algorithm v{result.meta.algorithmVersion} · {result.meta.eligibleCount} of{' '}
            {result.meta.candidateCount} candidates eligible · provider {result.meta.provider}
            {result.meta.geocoderUsed ? ' · proximity via geocoding' : ''}. This is a read-only
            recommendation — no stock is reserved until you place an order.
          </p>
        </div>
      ) : null}
    </section>
  );
}

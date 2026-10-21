import 'server-only';

import type {
  AiExplanation,
  AiExplanationReference,
  SupplierRecommendation,
} from '@gebeyalink/types';
import { aiExplanationModelOutputSchema } from '@gebeyalink/validation';

import { AiProviderError, jsonCompletion } from './provider';

/**
 * AI-assisted risk and trade-off explanation
 * (docs/ai-sourcing-solution-design.md §Explanation).
 *
 * Gemini receives only the *already computed* facts the server is willing to
 * show the buyer: grade, availability, listed price, distance band, score
 * components and the eligibility failures. It never receives buyer identity,
 * supplier contact details, or any value it could use to invent inventory.
 *
 * The output is Zod-validated and every evidence reference is checked against
 * the server-generated evidence set; unknown ids are dropped, and if the model
 * cannot be reached or returns unsusable shape, a deterministic explanation is
 * returned instead. A provider failure never erases the ranking.
 */

/** Deterministic fallback: built from the same facts, no model involved. */
export function deterministicExplanation(input: {
  recommendations: SupplierRecommendation[];
  partialMatches: SupplierRecommendation[];
  splitCoveredKg: number | null;
  requestedQuantityKg: number | null;
  note?: string;
}): AiExplanation {
  const { recommendations, partialMatches, requestedQuantityKg } = input;
  const questionsToAsk =
    recommendations.length > 0
      ? [
          'When could you deliver, and from which collection center?',
          'Is the listed grade the lot average, and how was it assessed?',
          'Can you hold this quantity for the 24-hour response window while we confirm?',
        ]
      : ['Which grades do you expect from the next harvest, and when?'];

  const risks: string[] = [];
  if (input.requestedQuantityKg == null) {
    risks.push('No quantity was requested, so availability could not be matched to a specific need.');
  }
  if (input.splitCoveredKg != null && requestedQuantityKg != null && input.splitCoveredKg < requestedQuantityKg) {
    risks.push('Even combined, the matching suppliers cannot cover the full requested quantity.');
  }
  if (partialMatches.length > 0 && recommendations.length === 0) {
    risks.push('No supplier passed every hard rule; the closest options are shown for context only.');
  }

  let summary: string;
  if (recommendations.length === 0) {
    summary =
      partialMatches.length > 0
        ? `No listing from a visible cooperative met every requirement. ${partialMatches.length} listing(s) are close enough to review, but each fails at least one rule.`
        : 'No listing from a visible cooperative matched this request. Try widening the grade, origin, price ceiling or quantity.';
  } else {
    const top = recommendations[0];
    summary = `${recommendations.length} eligible supplier(s). Best match: ${top.cooperativeName} (${top.productName}, grade ${top.qualityGrade}) at ${top.pricePerKg} ETB/kg with ${top.availableQuantityKg} kg available.`;
  }

  return {
    source: 'deterministic',
    summary,
    highlights: recommendations.slice(0, 3).map((recommendation) => ({
      recommendationId: recommendation.listingId,
      points: [
        recommendation.score.components
          .filter((component) => component.status === 'scored')
          .map((component) => component.reason)
          .slice(0, 3)
          .join(' '),
      ].filter(Boolean),
    })),
    questionsToAsk,
    risks,
    references: [],
    note:
      input.note ??
      'Explanations are generated from the computed ranking. No language model was used for this response.',
  };
}

function buildExplainPrompt(input: {
  criteria: Record<string, unknown>;
  recommendations: SupplierRecommendation[];
  partialMatches: SupplierRecommendation[];
  split: { coveredQuantityKg: number; requestedQuantityKg: number; lineCount: number } | null;
}): { system: string; user: string } {
  const system = [
    'You explain an agricultural sourcing recommendation to a wholesale buyer.',
    'You are given ONLY facts computed by the platform. Never invent suppliers, prices,',
    'quantities, certifications, delivery dates or reputation, and never change a score.',
    'If information is missing, say it is missing. Do not claim to have contacted anyone.',
    'Return ONLY a JSON object with EXACTLY this shape (no extra keys, no prose):',
    '{',
    '  "summary": "string",',
    '  "highlights": [{ "recommendationId": "string", "points": ["string"] }],',
    '  "questionsToAsk": ["string"],',
    '  "risks": ["string"],',
    '  "evidenceRefs": [{ "recommendationId": "string", "evidenceId": "string" }]',
    '}',
    '"evidenceRefs" MUST be an array of objects with those two string fields,',
    'never an array of plain strings. Use ONLY recommendationId/evidenceId values that',
    'appear in the input; if you cannot cite any, use an empty array. "highlights" and',
    '"evidenceRefs" may be omitted entirely if not needed.',
  ].join(' ');

  const user = JSON.stringify({
    criteria: input.criteria,
    eligibleSuppliers: input.recommendations.map((recommendation) => ({
      recommendationId: recommendation.listingId,
      cooperative: recommendation.cooperativeName,
      product: recommendation.productName,
      grade: recommendation.qualityGrade,
      availableQuantityKg: recommendation.availableQuantityKg,
      pricePerKg: recommendation.pricePerKg,
      estimatedTotal: recommendation.estimatedTotal,
      fulfillment: recommendation.fulfillment,
      score: recommendation.score.total,
      components: recommendation.score.components.map((component) => ({
        key: component.key,
        score: component.score,
        status: component.status,
        reason: component.reason,
      })),
      reasons: recommendation.reasons,
      tradeoffs: recommendation.tradeoffs,
      missing: recommendation.missing,
      evidence: recommendation.evidence.map((evidence) => ({
        id: evidence.id,
        claim: evidence.claim,
      })),
    })),
    ineligibleButClose: input.partialMatches.map((recommendation) => ({
      recommendationId: recommendation.listingId,
      cooperative: recommendation.cooperativeName,
      reasons: recommendation.evidence
        .filter((evidence) => evidence.id.includes(':failure:'))
        .map((evidence) => evidence.detail),
    })),
    splitOption: input.split,
  });

  return { system, user };
}

/** Validates model output and drops any reference not in the evidence set. */
function verifyReferences(
  modelled: AiExplanationReference[],
  recommendations: SupplierRecommendation[],
): AiExplanationReference[] {
  const allowed = new Map(
    recommendations.map((recommendation) => [
      recommendation.listingId,
      new Set(recommendation.evidence.map((evidence) => evidence.id)),
    ]),
  );
  const seen = new Set<string>();
  const verified: AiExplanationReference[] = [];
  for (const reference of modelled) {
    const evidenceIds = allowed.get(reference.recommendationId);
    if (!evidenceIds || !evidenceIds.has(reference.evidenceId)) continue;
    const key = `${reference.recommendationId}:${reference.evidenceId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    verified.push(reference);
  }
  return verified;
}

export async function explainRecommendations(input: {
  criteria: Record<string, unknown>;
  recommendations: SupplierRecommendation[];
  partialMatches: SupplierRecommendation[];
  split: { coveredQuantityKg: number; requestedQuantityKg: number; lineCount: number } | null;
  requestedQuantityKg: number | null;
}): Promise<AiExplanation> {
  const fallbackNote =
    'No language model explanation was available; this summary is generated deterministically from the ranking.';

  if (input.recommendations.length === 0) {
    return deterministicExplanation({
      recommendations: input.recommendations,
      partialMatches: input.partialMatches,
      splitCoveredKg: input.split?.coveredQuantityKg ?? null,
      requestedQuantityKg: input.requestedQuantityKg,
      note: 'No eligible suppliers were found, so no model explanation was requested.',
    });
  }

  try {
    const prompt = buildExplainPrompt(input);
    const raw = await jsonCompletion({ ...prompt, label: 'Recommendation explanation' });
    const parsed = aiExplanationModelOutputSchema.safeParse(raw);
    if (!parsed.success) {
      return deterministicExplanation({
        recommendations: input.recommendations,
        partialMatches: input.partialMatches,
        splitCoveredKg: input.split?.coveredQuantityKg ?? null,
        requestedQuantityKg: input.requestedQuantityKg,
        note: 'The explanation could not be verified, so the deterministic summary is shown.',
      });
    }

    const output = parsed.data;
    const modelledRefs: AiExplanationReference[] = (output.evidenceRefs ?? []).map((reference) => ({
      recommendationId: reference.recommendationId,
      evidenceId: reference.evidenceId,
    }));

    return {
      source: 'gemini',
      summary: output.summary,
      highlights: (output.highlights ?? []).map((highlight) => ({
        recommendationId: highlight.recommendationId,
        points: highlight.points,
      })),
      questionsToAsk: output.questionsToAsk ?? [],
      risks: output.risks ?? [],
      references: verifyReferences(modelledRefs, input.recommendations),
    };
  } catch (error) {
    const note =
      error instanceof AiProviderError && error.code === 'not_configured'
        ? 'No AI provider is configured, so this summary is generated deterministically from the ranking.'
        : 'The explanation service was unavailable, so this summary is generated deterministically from the ranking.';
    if (process.env.NODE_ENV !== 'test') {
      console.warn(`[explain] falling back: ${(error as Error).message}`);
    }
    return deterministicExplanation({
      recommendations: input.recommendations,
      partialMatches: input.partialMatches,
      splitCoveredKg: input.split?.coveredQuantityKg ?? null,
      requestedQuantityKg: input.requestedQuantityKg,
      note: note ?? fallbackNote,
    });
  }
}

import 'server-only';

import { DELIVERY_QUALITY_GRADES } from '@gebeyalink/types';

/**
 * AI sourcing provider abstraction (docs/frontend-architecture.md, AI note).
 *
 * The model only turns a buyer's natural-language request into a JSON search
 * filter. It never sees buyer identity, never touches the database, and never
 * performs a business action. Any OpenAI-compatible `/chat/completions`
 * endpoint works (OpenAI, OpenRouter, Groq, Gemini's compat endpoint, ...),
 * configured through the environment:
 *
 *   AI_API_KEY   — required for the live provider (absent → graceful 503)
 *   AI_MODEL     — model id (default `gpt-4o-mini`)
 *   AI_BASE_URL  — API base URL (default `https://api.openai.com/v1`)
 *   AI_PROVIDER  — `openai` (default) or `mock` (tests only)
 */

export type SourcingProviderInput = {
  query: string;
  catalog: { id: string; name: string }[];
  minOrderQuantityKg: number;
};

export interface SourcingProvider {
  readonly name: string;
  /** Raw, unvalidated model output — the parser validates it independently. */
  extract(input: SourcingProviderInput): Promise<unknown>;
}

export type AiProviderErrorCode = 'not_configured' | 'timeout' | 'request_failed';

export class AiProviderError extends Error {
  readonly code: AiProviderErrorCode;

  constructor(code: AiProviderErrorCode, message: string) {
    super(message);
    this.name = 'AiProviderError';
    this.code = code;
  }
}

const DEFAULT_BASE_URL = 'https://api.openai.com/v1';
const DEFAULT_MODEL = 'gpt-4o-mini';
const REQUEST_TIMEOUT_MS = 20_000;

/** System prompt: extract a JSON filter using only real catalog values. */
export function buildSourcingPrompt(input: SourcingProviderInput): string {
  const commodities = input.catalog.map((p) => `${p.id} (${p.name})`).join(', ');
  return [
    "You convert a wholesale buyer's natural-language request into a JSON search filter.",
    'Return ONLY a JSON object, no prose, using exactly these keys:',
    '"commodity" (string catalog id or null), "qualityGrade" ("A"|"B"|"C" or null),',
    '"region" (origin/region text or null), "maxPricePerKg" (number ETB/kg or null),',
    '"quantityKg" (number kg or null), "quantityValue" (number or null),',
    '"quantityUnit" ("kg"|"tonne"|"ton"|"quintal"|"gram" or null), "notes" (short string or null).',
    `Allowed commodity ids: ${commodities}.`,
    `Allowed grades: ${DELIVERY_QUALITY_GRADES.join(', ')}.`,
    `The platform minimum order quantity is ${input.minOrderQuantityKg} kg.`,
    'Never invent values that are not present in the request; use null when unknown.',
    'Prefer normalizing quantity to kg; otherwise set quantityValue and quantityUnit.',
  ].join('\n');
}

const MOCK_REGION_STOPWORDS = new Set([
  'under',
  'below',
  'over',
  'max',
  'maximum',
  'with',
  'for',
  'at',
  'around',
  'per',
  'and',
]);

function openAiCompatibleProvider(): SourcingProvider {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) {
    throw new AiProviderError('not_configured', 'AI_API_KEY is not configured');
  }
  const baseUrl = (process.env.AI_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');
  const model = process.env.AI_MODEL || DEFAULT_MODEL;

  return {
    name: `openai-compatible:${model}`,
    async extract(input) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      try {
        const res = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            temperature: 0,
            response_format: { type: 'json_object' },
            messages: [
              { role: 'system', content: buildSourcingPrompt(input) },
              { role: 'user', content: input.query },
            ],
          }),
          signal: controller.signal,
        });
        if (!res.ok) {
          throw new AiProviderError('request_failed', `AI provider responded ${res.status}`);
        }
        const body = (await res.json().catch(() => null)) as
          | { choices?: { message?: { content?: string } }[] }
          | null;
        const content = body?.choices?.[0]?.message?.content;
        if (typeof content !== 'string') {
          throw new AiProviderError('request_failed', 'AI provider returned no content');
        }
        try {
          return JSON.parse(content);
        } catch {
          throw new AiProviderError('request_failed', 'AI provider returned malformed JSON');
        }
      } catch (error) {
        if (error instanceof AiProviderError) throw error;
        if (error instanceof Error && error.name === 'AbortError') {
          throw new AiProviderError('timeout', 'AI provider timed out');
        }
        throw new AiProviderError('request_failed', 'AI provider request failed');
      } finally {
        clearTimeout(timer);
      }
    },
  };
}

/**
 * Deterministic, offline provider used by unit tests and Playwright e2e
 * (`AI_PROVIDER=mock`). It emits the same shape a real model would, leaving
 * quantity normalization to the parser so that logic stays covered.
 */
function mockProvider(): SourcingProvider {
  return {
    name: 'mock',
    async extract(input) {
      const q = input.query.toLowerCase();
      const commodity =
        input.catalog.find(
          (p) => q.includes(p.id.toLowerCase()) || q.includes(p.name.toLowerCase()),
        )?.id ?? null;

      const gradeMatch = q.match(/grade\s*([abc])\b/);
      const quantityMatch = q.match(
        /(\d+(?:\.\d+)?)\s*(kilograms?|kgs?|kg|tonnes?|tons?|ton|quintals?|grams?|g)\b/,
      );
      const priceMatch = q.match(
        /(?:under|below|less than|max(?:imum)?|up to|cheaper than)\s*(\d+(?:\.\d+)?)/,
      );
      const regionMatch = input.query.match(
        /(?:from|in|around|near|origin)\s+([a-z\u1200-\u137f]+(?:\s+[a-z\u1200-\u137f]+)?)/i,
      );
      const region = regionMatch
        ? regionMatch[1]
            .split(/\s+/)
            .filter((word) => !MOCK_REGION_STOPWORDS.has(word.toLowerCase()))
            .join(' ') || null
        : null;

      return {
        commodity,
        qualityGrade: gradeMatch ? gradeMatch[1].toUpperCase() : null,
        region,
        maxPricePerKg: priceMatch ? Number(priceMatch[1]) : null,
        quantityKg: null,
        quantityValue: quantityMatch ? Number(quantityMatch[1]) : null,
        quantityUnit: quantityMatch ? normalizeUnitWord(quantityMatch[2]) : null,
        notes: null,
      };
    },
  };
}

function normalizeUnitWord(word: string): 'kg' | 'tonne' | 'quintal' | 'gram' {
  const lower = word.toLowerCase();
  if (lower.startsWith('ton')) return 'tonne';
  if (lower.startsWith('quintal')) return 'quintal';
  if (lower === 'g' || lower.startsWith('gram')) return 'gram';
  return 'kg';
}

/** Provider selected by `AI_PROVIDER` (defaults to the live provider). */
export function getSourcingProvider(): SourcingProvider {
  if ((process.env.AI_PROVIDER || 'openai').toLowerCase() === 'mock') {
    return mockProvider();
  }
  return openAiCompatibleProvider();
}

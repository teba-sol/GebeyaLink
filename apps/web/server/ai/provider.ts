import 'server-only';

import { DELIVERY_QUALITY_GRADES } from '@gebeyalink/types';

/**
 * AI sourcing provider abstraction (docs/frontend-architecture.md,
 * docs/ai-sourcing-solution-design.md).
 *
 * The model only turns a buyer's natural-language request into a JSON search
 * filter, or explains already-computed recommendation results. It never sees
 * buyer identity, never touches the database, and never performs a business
 * action.
 *
 * Providers, selected by `AI_PROVIDER`:
 *   `gemini`  — Google Gemini `generateContent` (native REST, `x-goog-api-key`)
 *   `openai`  — any OpenAI-compatible `/chat/completions` endpoint (default)
 *   `mock`    — deterministic offline provider (tests / local demos)
 *
 * Environment:
 *   AI_PROVIDER    — `openai` (default) | `gemini` | `mock`
 *   AI_API_KEY     — key for the OpenAI-compatible provider
 *   AI_MODEL       — model id (default `gpt-4o-mini`)
 *   AI_BASE_URL    — base URL (default `https://api.openai.com/v1`)
 *   GEMINI_API_KEY — key for the Gemini provider (absent → graceful 503)
 *   GEMINI_MODEL   — model id (default `gemini-3.5-flash`, free tier eligible)
 *   GEMINI_BASE_URL— API base (default `https://generativelanguage.googleapis.com/v1beta`)
 */

export type SourcingProviderInput = {
  query: string;
  catalog: { id: string; name: string }[];
  minOrderQuantityKg: number;
};

export interface SourcingProvider {
  readonly name: string;
  /** Raw, unvalidated model output — the parser/explainer validates it. */
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
const DEFAULT_GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
/**
 * Default Gemini model. Free-tier eligible Flash models only (Pro models are
 * paid-only). `gemini-3.5-flash` is a currently-available production Flash id;
 * newer ids (e.g. `gemini-3.8-flash`) can be set via `GEMINI_MODEL` when the
 * project has access, and `gemini-3.1-flash-lite` is the cheapest with a larger
 * free daily quota. Model availability changes over time — verify with the
 * models list endpoint before relying on an id. Quotas are never hardcoded.
 */
const DEFAULT_GEMINI_MODEL = 'gemini-3.5-flash';
/**
 * Generation can be slow on the Gemini free tier (observed 30-40s under load,
 * far above the typical <5s), so the request timeout is generous but still
 * bounded. A slow model degrades to the deterministic fallback for the
 * explanation, and to the 503 contract for parsing — never a hang.
 */
const REQUEST_TIMEOUT_MS = 45_000;

/** System prompt: extract a JSON filter using only real catalog values. */
export function buildSourcingPrompt(input: SourcingProviderInput): string {
  const commodities = input.catalog.map((p) => `${p.id} (${p.name})`).join(', ');
  return [
    "You convert a wholesale buyer's natural-language request into a JSON search filter.",
    'Return ONLY a JSON object, no prose, using exactly these keys:',
    '"commodity" (string catalog id or null), "qualityGrade" ("A"|"B"|"C" or null),',
    '"region" (origin/region text or null), "maxPricePerKg" (number ETB/kg or null),',
    '"totalBudget" (number ETB total, only when the buyer named a total budget),',
    '"quantityKg" (number kg or null), "quantityValue" (number or null),',
    '"quantityUnit" ("kg"|"tonne"|"ton"|"quintal"|"gram" or null),',
    '"timeWindow" (short timing text like "within 14 days" or null),',
    '"certifications" (array of requested certificate names, or null),',
    '"notes" (short string or null).',
    `Allowed commodity ids: ${commodities}.`,
    `Allowed grades: ${DELIVERY_QUALITY_GRADES.join(', ')}.`,
    `The platform minimum order quantity is ${input.minOrderQuantityKg} kg.`,
    'Never invent values that are not present in the request; use null when unknown.',
    'Never guess a supplier, a price that was not stated, or a quantity that was not stated.',
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

function timeoutController(): { signal: AbortSignal; clear: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  return { signal: controller.signal, clear: () => clearTimeout(timer) };
}

function toProviderError(error: unknown, label: string): AiProviderError {
  if (error instanceof AiProviderError) return error;
  if (error instanceof Error && error.name === 'AbortError') {
    return new AiProviderError('timeout', `${label} timed out`);
  }
  return new AiProviderError('request_failed', `${label} request failed`);
}

/** Gemini `generateContent` call returning parsed JSON from the model text. */
async function geminiJsonCompletion(params: {
  apiKey: string;
  baseUrl: string;
  model: string;
  system: string;
  user: string;
  label: string;
}): Promise<unknown> {
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: params.system }] },
    contents: [{ role: 'user', parts: [{ text: params.user }] }],
    generationConfig: {
      temperature: 0,
      responseMimeType: 'application/json',
    },
  });

  // The Gemini free tier intermittently returns 503 under load. One short
  // retry turns most transient failures into success without masking a real
  // outage (which still surfaces after the retry as the 503 contract).
  const maxAttempts = 2;
  let lastStatus = 0;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const { signal, clear } = timeoutController();
    try {
      const res = await fetch(
        `${params.baseUrl}/models/${encodeURIComponent(params.model)}:generateContent`,
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-goog-api-key': params.apiKey,
          },
          body,
          signal,
        },
      );
      if (!res.ok) {
        lastStatus = res.status;
        const transient = res.status === 503 || res.status === 429 || res.status >= 500;
        if (transient && attempt < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 1_500 * attempt));
          continue;
        }
        throw new AiProviderError('request_failed', `Gemini responded ${res.status}`);
      }
      const raw = (await res.json().catch(() => null)) as
        | { candidates?: { content?: { parts?: { text?: string }[] } }[] }
        | null;
      const text = raw?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
      if (!text.trim()) {
        throw new AiProviderError('request_failed', 'Gemini returned no content');
      }
      try {
        return JSON.parse(text);
      } catch {
        throw new AiProviderError('request_failed', 'Gemini returned malformed JSON');
      }
    } catch (error) {
      const providerError = toProviderError(error, params.label);
      const transient =
        providerError.code === 'timeout' ||
        /responded (429|5\d\d)/.test(providerError.message);
      if (transient && attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 1_500 * attempt));
        continue;
      }
      throw providerError;
    } finally {
      clear();
    }
  }

  throw new AiProviderError('request_failed', `Gemini responded ${lastStatus || 'no response'}`);
}

function geminiProvider(): SourcingProvider {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new AiProviderError('not_configured', 'GEMINI_API_KEY is not configured');
  }
  const baseUrl = (process.env.GEMINI_BASE_URL || DEFAULT_GEMINI_BASE_URL).replace(/\/+$/, '');
  const model = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;

  return {
    name: `gemini:${model}`,
    async extract(input) {
      return geminiJsonCompletion({
        apiKey,
        baseUrl,
        model,
        system: buildSourcingPrompt(input),
        user: input.query,
        label: 'Gemini',
      });
    },
  };
}

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
      const { signal, clear } = timeoutController();
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
          signal,
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
        throw toProviderError(error, 'AI provider');
      } finally {
        clear();
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
        /(?:under|below|less than|max(?:imum)?|up to|cheaper than)\s*(\d+(?:\.\d+)?)\s*(?:etb|birr)?\s*(?:\/\s*kg|per\s+kg)?/,
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
        totalBudget: null,
        quantityKg: null,
        quantityValue: quantityMatch ? Number(quantityMatch[1]) : null,
        quantityUnit: quantityMatch ? normalizeUnitWord(quantityMatch[2]) : null,
        timeWindow: null,
        certifications: null,
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

/** Provider selected by `AI_PROVIDER` (defaults to the live OpenAI provider). */
export function getSourcingProvider(): SourcingProvider {
  const selected = (process.env.AI_PROVIDER || 'openai').toLowerCase();
  if (selected === 'mock') return mockProvider();
  if (selected === 'gemini') return geminiProvider();
  return openAiCompatibleProvider();
}

/**
 * Shared structured-JSON completion used by the explanation layer
 * (`server/ai/explain.ts`). Throws `AiProviderError('not_configured')` when no
 * live provider is available, which callers turn into a deterministic
 * fallback rather than an error page.
 */
export async function jsonCompletion(params: {
  system: string;
  user: string;
  label: string;
}): Promise<unknown> {
  const selected = (process.env.AI_PROVIDER || 'openai').toLowerCase();

  if (selected === 'mock') {
    // The mock provider is extraction-only; explanation callers fall back.
    throw new AiProviderError('not_configured', 'mock provider has no explanation model');
  }

  if (selected === 'gemini') {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new AiProviderError('not_configured', 'GEMINI_API_KEY is not configured');
    return geminiJsonCompletion({
      apiKey,
      baseUrl: (process.env.GEMINI_BASE_URL || DEFAULT_GEMINI_BASE_URL).replace(/\/+$/, ''),
      model: process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL,
      system: params.system,
      user: params.user,
      label: params.label,
    });
  }

  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) throw new AiProviderError('not_configured', 'AI_API_KEY is not configured');
  const baseUrl = (process.env.AI_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');
  const model = process.env.AI_MODEL || DEFAULT_MODEL;

  const { signal, clear } = timeoutController();
  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: params.system },
          { role: 'user', content: params.user },
        ],
      }),
      signal,
    });
    if (!res.ok) {
      throw new AiProviderError('request_failed', `${params.label} responded ${res.status}`);
    }
    const body = (await res.json().catch(() => null)) as
      | { choices?: { message?: { content?: string } }[] }
      | null;
    const content = body?.choices?.[0]?.message?.content;
    if (typeof content !== 'string') {
      throw new AiProviderError('request_failed', `${params.label} returned no content`);
    }
    try {
      return JSON.parse(content);
    } catch {
      throw new AiProviderError('request_failed', `${params.label} returned malformed JSON`);
    }
  } catch (error) {
    throw toProviderError(error, params.label);
  } finally {
    clear();
  }
}

/** Provider label for response metadata, without contacting the provider. */
export function providerName(): string {
  const selected = (process.env.AI_PROVIDER || 'openai').toLowerCase();
  if (selected === 'mock') return 'mock';
  if (selected === 'gemini') return `gemini:${process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL}`;
  return `openai-compatible:${process.env.AI_MODEL || DEFAULT_MODEL}`;
}

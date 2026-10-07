import { ZodError } from 'zod';

/** Normalize a ZodError (or unknown validation failure) into an API-friendly message. */
export function zodErrorMessages(error: unknown): { code: string; message: string } {
  if (error instanceof ZodError) {
    const first = error.issues[0];
    if (first) {
      return {
        code: 'validation_error',
        message: first.path.length ? `${first.path.join('.')}: ${first.message}` : first.message,
      };
    }
    return { code: 'validation_error', message: 'invalid input' };
  }
  return { code: 'validation_error', message: String(error ?? 'invalid input') };
}

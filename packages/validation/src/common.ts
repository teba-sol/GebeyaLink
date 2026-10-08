import { z } from 'zod';

/** Shared primitives reused across validation schemas. */
export const uuidSchema = z.string().uuid();

/** Product reference id (products use a text slug as their stable key). */
export const productIdSchema = z.string().min(1).max(80);
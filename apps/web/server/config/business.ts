import 'server-only';

import { positiveNumber } from './env';

/**
 * Platform business parameters (docs/prd.md §15: the minimum order quantity
 * "must not be hardcoded into business logic"; docs/business-domain-model.md
 * §25 defines the 24-hour cooperative response window).
 *
 * Environment-configurable with documented defaults.
 */

const DEFAULT_MIN_ORDER_QUANTITY_KG = 1000;
const DEFAULT_RESPONSE_WINDOW_HOURS = 24;

/** Platform-wide minimum order quantity in kg. */
export function minOrderQuantityKg(): number {
  return positiveNumber(process.env.MIN_ORDER_QUANTITY_KG, DEFAULT_MIN_ORDER_QUANTITY_KG);
}

/** Cooperative response window before a pending order expires. */
export function responseWindowHours(): number {
  return positiveNumber(process.env.ORDER_RESPONSE_WINDOW_HOURS, DEFAULT_RESPONSE_WINDOW_HOURS);
}

export function responseWindowMs(): number {
  return responseWindowHours() * 60 * 60 * 1000;
}

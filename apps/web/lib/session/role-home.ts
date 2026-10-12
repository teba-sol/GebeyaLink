import type { PlatformRole } from '@gebeyalink/types';

/**
 * Default landing route per platform role — single source of truth for
 * sign-in redirects and wrong-role redirects (docs/frontend-architecture.md
 * §Auth). Client-safe: no server-only imports so the sign-in form can use it.
 */
export const ROLE_HOME: Record<PlatformRole, string> = {
  admin: '/admin',
  cooperative_staff: '/ops',
  collection_agent: '/agent',
  buyer: '/marketplace',
  transporter: '/transport',
};

/** Safe landing route for a possibly-unknown role (falls back to marketplace). */
export function roleHome(role: PlatformRole | null | undefined): string {
  return role ? ROLE_HOME[role] : '/marketplace';
}

/** Landing route from an untrusted string role (e.g. an API response). */
export function roleHomeFromString(value: string | null | undefined): string {
  if (value && value in ROLE_HOME) return ROLE_HOME[value as PlatformRole];
  return '/marketplace';
}

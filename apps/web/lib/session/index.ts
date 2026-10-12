import 'server-only';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import type { PlatformRole } from '@gebeyalink/types';

import { auth } from '@/server/auth';
import { getActor } from '@/server/authz/guards';
import { ROLE_HOME } from './role-home';

export type PageSession = {
  user: { id: string; email: string; name: string };
  role: PlatformRole | null;
};

/** Signed-in user + platform role for a server component. Null when anonymous. */
export async function getPageSession(): Promise<PageSession | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const actor = await getActor(session.user.id);
  return {
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
    },
    role: actor?.role ?? null,
  };
}

/**
 * Strict role gate for a page/layout (docs/frontend-architecture.md §Auth):
 * anonymous → /sign-in; signed-in without a permitted role → their own home.
 * UI gating is UX only — the API still enforces every rule server-side.
 */
export async function requirePageRole(
  ...roles: PlatformRole[]
): Promise<PageSession> {
  const session = await getPageSession();
  if (!session) redirect('/sign-in');
  if (!session.role || !roles.includes(session.role)) {
    redirect(session.role ? ROLE_HOME[session.role] : '/');
  }
  return session;
}

/**
 * Shared shell gate: anonymous browsing is allowed (marketplace is public),
 * but a signed-in user with a different role is sent to their own workspace.
 */
export async function restrictToRole(
  ...roles: PlatformRole[]
): Promise<PageSession | null> {
  const session = await getPageSession();
  if (!session) return null;
  if (!session.role || !roles.includes(session.role)) {
    redirect(session.role ? ROLE_HOME[session.role] : '/');
  }
  return session;
}

/**
 * Onboarding gate (docs/prd.md §49): require a signed-in user who has not yet
 * been assigned a platform role. Users who already have a role go to their
 * own workspace.
 */
export async function requireOnboardingSession(): Promise<PageSession> {
  const session = await getPageSession();
  if (!session) redirect('/sign-in');
  if (session.role) redirect(ROLE_HOME[session.role]);
  return session;
}

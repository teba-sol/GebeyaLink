import { getTableName } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { account, session, user, verification } from '../server/db/schema';

describe('auth schema', () => {
  it('defines the four Better Auth core tables', () => {
    expect(getTableName(user)).toBe('user');
    expect(getTableName(session)).toBe('session');
    expect(getTableName(account)).toBe('account');
    expect(getTableName(verification)).toBe('verification');
  });

  it('has the required core columns', () => {
    const userCols = Object.keys(user);
    expect(userCols).toEqual(
      expect.arrayContaining([
        'id',
        'name',
        'email',
        'emailVerified',
        'image',
        'createdAt',
        'updatedAt',
      ]),
    );

    const sessionCols = Object.keys(session);
    expect(sessionCols).toEqual(expect.arrayContaining(['id', 'userId', 'expiresAt', 'token']));

    const accountCols = Object.keys(account);
    expect(accountCols).toEqual(
      expect.arrayContaining(['id', 'userId', 'providerId', 'accountId']),
    );

    const verificationCols = Object.keys(verification);
    expect(verificationCols).toEqual(
      expect.arrayContaining(['id', 'identifier', 'value', 'expiresAt']),
    );
  });
});

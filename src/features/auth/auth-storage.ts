import * as SecureStore from 'expo-secure-store';

import type { AuthSession, AuthUser } from '@/features/auth/auth-types';

const AUTH_SESSION_KEY = 'finance.auth.session.v1';

function isAuthUser(value: unknown): value is AuthUser {
  if (!value || typeof value !== 'object') return false;
  const user = value as Partial<AuthUser>;
  return (
    typeof user.id === 'string' &&
    user.id.length > 0 &&
    typeof user.email === 'string' &&
    user.email.length > 0 &&
    (typeof user.name === 'string' || user.name === null) &&
    (typeof user.photoUrl === 'string' || user.photoUrl === null)
  );
}

function parseSession(value: string | null): AuthSession | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<AuthSession>;
    if (
      parsed.version !== 1 ||
      typeof parsed.lastVerifiedAt !== 'number' ||
      !Number.isFinite(parsed.lastVerifiedAt) ||
      !isAuthUser(parsed.user)
    ) {
      return null;
    }
    return parsed as AuthSession;
  } catch {
    return null;
  }
}

export async function readAuthSession() {
  return parseSession(await SecureStore.getItemAsync(AUTH_SESSION_KEY));
}

export async function writeAuthSession(session: AuthSession) {
  await SecureStore.setItemAsync(AUTH_SESSION_KEY, JSON.stringify(session));
}

export async function deleteAuthSession() {
  await SecureStore.deleteItemAsync(AUTH_SESSION_KEY);
}

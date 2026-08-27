import * as Network from 'expo-network';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { AppState } from 'react-native';

import {
  deleteAuthSession,
  readAuthSession,
  writeAuthSession,
} from '@/features/auth/auth-storage';
import type {
  AuthContextValue,
  AuthErrorState,
  AuthSession,
  AuthStatus,
} from '@/features/auth/auth-types';
import {
  configureGoogleAuth,
  GoogleAuthError,
  signInWithGoogle as performGoogleSignIn,
  signOutFromGoogle,
  silentlyValidateGoogleSession,
  toAuthErrorState,
} from '@/features/auth/google-auth-service';
import { clearSensitiveCache } from '@/lib/storage/sensitive-cache';

const AuthContext = createContext<AuthContextValue | null>(null);
const NETWORK_REVALIDATION_INTERVAL_MS = 15_000;

function clearSensitiveCacheSafely() {
  try {
    clearSensitiveCache();
  } catch {
    // Auth state must not depend on best-effort cache cleanup.
  }
}

async function canReachInternet() {
  try {
    const state = await Network.getNetworkStateAsync();
    return state.isConnected === true && state.isInternetReachable !== false;
  } catch {
    return false;
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [status, setStatus] = useState<AuthStatus>('restoring');
  const [error, setError] = useState<AuthErrorState | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const operationId = useRef(0);
  const sessionRef = useRef<AuthSession | null>(null);
  const validationInFlight = useRef(false);

  const requireReauthentication = useCallback(
    async (expectedOperation: number) => {
      await deleteAuthSession().catch(() => undefined);
      if (operationId.current !== expectedOperation) return;
      clearSensitiveCacheSafely();
      sessionRef.current = null;
      setSession(null);
      setStatus('reauth_required');
    },
    [],
  );

  const validateGoogleSession = useCallback(
    async (storedSession: AuthSession) => {
      if (validationInFlight.current) return;
      validationInFlight.current = true;
      const expectedOperation = operationId.current;
      try {
        const result = await silentlyValidateGoogleSession();
        if (
          operationId.current !== expectedOperation ||
          sessionRef.current?.user.id !== storedSession.user.id
        ) {
          return;
        }
        if (
          result.kind === 'no_saved_credential' ||
          result.session.user.id !== storedSession.user.id
        ) {
          await requireReauthentication(expectedOperation);
          return;
        }
        await writeAuthSession(result.session);
        if (
          operationId.current !== expectedOperation ||
          sessionRef.current?.user.id !== storedSession.user.id
        ) {
          return;
        }
        sessionRef.current = result.session;
        setSession(result.session);
      } catch (validationError) {
        if (
          validationError instanceof GoogleAuthError &&
          validationError.authCode === 'REAUTH_REQUIRED'
        ) {
          await requireReauthentication(expectedOperation);
        }
        // Network and other transient errors must preserve the offline session.
      } finally {
        validationInFlight.current = false;
      }
    },
    [requireReauthentication],
  );

  useEffect(() => {
    let mounted = true;
    const currentOperation = ++operationId.current;

    async function restore() {
      configureGoogleAuth();
      const storedSession = await readAuthSession();
      if (!mounted || operationId.current !== currentOperation) return;
      if (!storedSession) {
        setStatus('signed_out');
        return;
      }

      sessionRef.current = storedSession;
      setSession(storedSession);
      setStatus('signed_in');

      if (!(await canReachInternet())) return;
      if (!mounted || operationId.current !== currentOperation) return;
      await validateGoogleSession(storedSession);
    }

    void restore().catch(async (restoreError) => {
      await deleteAuthSession().catch(() => undefined);
      if (!mounted) return;
      sessionRef.current = null;
      setSession(null);
      setError(toAuthErrorState(restoreError));
      setStatus('signed_out');
    });

    return () => {
      mounted = false;
    };
  }, [validateGoogleSession]);

  useEffect(() => {
    let lastReachable: boolean | undefined;

    async function checkForReconnectedNetwork() {
      const state = await Network.getNetworkStateAsync().catch(() => null);
      if (!state) return;
      const reachable =
        state.isConnected === true && state.isInternetReachable !== false;
      const becameReachable = reachable && lastReachable !== true;
      lastReachable = reachable;
      const currentSession = sessionRef.current;
      if (becameReachable && currentSession) {
        void validateGoogleSession(currentSession);
      }
    }

    // expo-network 57.0.1 exposes a native change event, but some SDK 57
    // development runtimes do not provide its EventEmitter. Polling avoids a
    // startup crash while still validating shortly after connectivity returns.
    const networkPoll = setInterval(
      () => void checkForReconnectedNetwork(),
      NETWORK_REVALIDATION_INTERVAL_MS,
    );
    void checkForReconnectedNetwork();

    const appStateSubscription = AppState.addEventListener(
      'change',
      (nextState) => {
        if (nextState !== 'active') return;
        const currentSession = sessionRef.current;
        if (!currentSession) return;
        void canReachInternet().then((reachable) => {
          if (
            reachable &&
            sessionRef.current?.user.id === currentSession.user.id
          ) {
            void validateGoogleSession(currentSession);
          }
        });
      },
    );

    return () => {
      clearInterval(networkPoll);
      appStateSubscription.remove();
    };
  }, [validateGoogleSession]);

  const clearError = useCallback(() => setError(null), []);

  const signInWithGoogle = useCallback(async () => {
    if (isBusy) return;
    setIsBusy(true);
    setError(null);
    const currentOperation = ++operationId.current;
    try {
      if (!(await canReachInternet())) {
        setError({
          code: 'OFFLINE',
          message: 'Internet diperlukan untuk login Google pertama kali.',
        });
        return;
      }
      const result = await performGoogleSignIn();
      if (result.kind === 'cancelled') return;
      await writeAuthSession(result.session);
      if (operationId.current !== currentOperation) return;
      sessionRef.current = result.session;
      setSession(result.session);
      setStatus('signed_in');
    } catch (signInError) {
      if (operationId.current === currentOperation) {
        setError(toAuthErrorState(signInError));
      }
    } finally {
      if (operationId.current === currentOperation) setIsBusy(false);
    }
  }, [isBusy]);

  const signOut = useCallback(async () => {
    if (isBusy) return;
    setIsBusy(true);
    setError(null);
    ++operationId.current;
    await deleteAuthSession().catch(() => undefined);
    sessionRef.current = null;
    setSession(null);
    setStatus('signed_out');
    clearSensitiveCacheSafely();
    await signOutFromGoogle().catch(() => undefined);
    setIsBusy(false);
  }, [isBusy]);

  const value = useMemo<AuthContextValue>(
    () => ({
      clearError,
      error,
      isBusy,
      signInWithGoogle,
      signOut,
      status,
      user: session?.user ?? null,
    }),
    [
      clearError,
      error,
      isBusy,
      session?.user,
      signInWithGoogle,
      signOut,
      status,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used within AuthProvider.');
  return value;
}

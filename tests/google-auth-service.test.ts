import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import {
  getGoogleDriveAccessToken,
  GOOGLE_DRIVE_APPDATA_SCOPE,
  normalizeGoogleAuthError,
  requestGoogleDriveAccess,
  signInWithGoogle,
  silentlyValidateGoogleSession,
} from '@/features/auth/google-auth-service';

const mockAddScopes = jest.fn<() => Promise<unknown>>();
const mockConfigure = jest.fn();
const mockGetTokens = jest.fn<() => Promise<unknown>>();
const mockHasPlayServices = jest.fn<() => Promise<boolean>>();
const mockSignIn = jest.fn<() => Promise<unknown>>();
const mockSignInSilently = jest.fn<() => Promise<unknown>>();

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    addScopes: () => mockAddScopes(),
    clearCachedAccessToken: jest.fn(),
    configure: (...args: unknown[]) => mockConfigure(...args),
    getTokens: () => mockGetTokens(),
    hasPlayServices: () => mockHasPlayServices(),
    signIn: () => mockSignIn(),
    signInSilently: () => mockSignInSilently(),
    signOut: jest.fn(),
  },
  isErrorWithCode: (error: unknown) =>
    Boolean(error && typeof error === 'object' && 'code' in error),
  isNoSavedCredentialFoundResponse: (response: unknown) =>
    (response as { type?: string })?.type === 'noSavedCredentialFound',
  isSuccessResponse: (response: unknown) =>
    (response as { type?: string })?.type === 'success',
  statusCodes: {
    IN_PROGRESS: 'IN_PROGRESS',
    PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
    SIGN_IN_REQUIRED: 'SIGN_IN_REQUIRED',
  },
}));

const googleUser = {
  idToken: 'temporary-id-token',
  scopes: [],
  serverAuthCode: null,
  user: {
    email: 'dina@example.com',
    familyName: null,
    givenName: 'Dina',
    id: 'google-user-1',
    name: 'Dina',
    photo: 'https://example.com/dina.jpg',
  },
};

describe('Google auth service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID =
      '797819627457-2lci158mp3k2mucv16573gp7b2d67ho6.apps.googleusercontent.com';
    mockHasPlayServices.mockResolvedValue(true);
  });

  it('returns a token-free local session after a successful online login', async () => {
    mockSignIn.mockResolvedValue({ data: googleUser, type: 'success' });

    const result = await signInWithGoogle();

    expect(result).toMatchObject({
      kind: 'success',
      session: {
        user: {
          email: 'dina@example.com',
          id: 'google-user-1',
          name: 'Dina',
          photoUrl: 'https://example.com/dina.jpg',
        },
        version: 1,
      },
    });
    expect(JSON.stringify(result)).not.toContain('temporary-id-token');
    expect(mockHasPlayServices).toHaveBeenCalledTimes(1);
    expect(mockConfigure).toHaveBeenCalledWith({
      offlineAccess: false,
      scopes: [GOOGLE_DRIVE_APPDATA_SCOPE],
      webClientId:
        '797819627457-2lci158mp3k2mucv16573gp7b2d67ho6.apps.googleusercontent.com',
    });
  });

  it('requests Drive access incrementally and returns a temporary access token', async () => {
    mockAddScopes.mockResolvedValue({ data: googleUser, type: 'success' });
    mockGetTokens.mockResolvedValue({
      accessToken: 'temporary-drive-access-token',
      idToken: 'temporary-id-token',
    });

    await expect(requestGoogleDriveAccess()).resolves.toEqual({
      kind: 'granted',
    });
    await expect(getGoogleDriveAccessToken()).resolves.toBe(
      'temporary-drive-access-token',
    );
    expect(mockAddScopes).toHaveBeenCalledTimes(1);
  });

  it('treats account-picker cancellation as a neutral result', async () => {
    mockSignIn.mockResolvedValue({ type: 'cancelled' });
    await expect(signInWithGoogle()).resolves.toEqual({ kind: 'cancelled' });
  });

  it('requires a Web Client ID capable of returning an idToken', async () => {
    mockSignIn.mockResolvedValue({
      data: { ...googleUser, idToken: null },
      type: 'success',
    });
    await expect(signInWithGoogle()).rejects.toMatchObject({
      authCode: 'CONFIGURATION',
    });
  });

  it('reports missing silent credentials and explicit revocation separately', async () => {
    mockSignInSilently.mockResolvedValue({ type: 'noSavedCredentialFound' });
    await expect(silentlyValidateGoogleSession()).resolves.toEqual({
      kind: 'no_saved_credential',
    });
    expect(
      normalizeGoogleAuthError({ code: 'SIGN_IN_REQUIRED' }),
    ).toMatchObject({ authCode: 'REAUTH_REQUIRED' });
  });
});

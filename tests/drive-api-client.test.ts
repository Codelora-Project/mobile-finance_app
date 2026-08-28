import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import {
  listDriveBackups,
  uploadDriveBackup,
} from '@/features/cloud-backup/drive-api-client';

const mockClearAccessToken = jest.fn<() => Promise<void>>();
const mockGetAccessToken = jest.fn<() => Promise<string>>();

jest.mock('@/features/auth/google-auth-service', () => ({
  clearGoogleDriveAccessToken: () => mockClearAccessToken(),
  getGoogleDriveAccessToken: () => mockGetAccessToken(),
}));

function mockResponse(input: {
  body?: unknown;
  location?: string;
  ok?: boolean;
  status?: number;
}) {
  const body = input.body ?? {};
  return {
    clone() {
      return this;
    },
    headers: {
      get: (name: string) =>
        name.toLowerCase() === 'location' ? (input.location ?? null) : null,
    },
    json: async () => body,
    ok: input.ok ?? true,
    status: input.status ?? 200,
    text: async () => String(body),
  } as unknown as Response;
}

describe('Google Drive API client', () => {
  const mockFetch = jest.fn<typeof fetch>();

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAccessToken.mockResolvedValue('drive-token');
    global.fetch = mockFetch;
  });

  it('lists only appDataFolder backup metadata', async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse({
        body: {
          files: [
            {
              appProperties: { accountId: 'google-1', backupType: 'full' },
              id: 'file-1',
              modifiedTime: '2026-08-28T01:00:00.000Z',
              name: 'personal_finance_backup_1.json',
              size: '128',
            },
          ],
        },
      }),
    );

    await expect(listDriveBackups()).resolves.toEqual([
      expect.objectContaining({ id: 'file-1', sizeBytes: 128 }),
    ]);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('spaces=appDataFolder'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer drive-token',
        }),
      }),
    );
  });

  it('creates a resumable session and uploads the JSON payload', async () => {
    mockFetch
      .mockResolvedValueOnce(
        mockResponse({ location: 'https://upload.example/session-1' }),
      )
      .mockResolvedValueOnce(
        mockResponse({
          body: {
            appProperties: { accountId: 'google-1', backupType: 'full' },
            id: 'file-1',
            modifiedTime: '2026-08-28T01:00:00.000Z',
            name: 'backup.json',
            size: '2',
          },
        }),
      );

    await expect(
      uploadDriveBackup({
        appProperties: { accountId: 'google-1', backupType: 'full' },
        content: '{}',
        fileName: 'backup.json',
      }),
    ).resolves.toMatchObject({ id: 'file-1', sizeBytes: 2 });

    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      'https://upload.example/session-1',
      expect.objectContaining({ body: '{}', method: 'PUT' }),
    );
  });
});

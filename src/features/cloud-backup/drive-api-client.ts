import {
  clearGoogleDriveAccessToken,
  getGoogleDriveAccessToken,
} from '@/features/auth/google-auth-service';
import type { DriveBackupFile } from '@/features/cloud-backup/cloud-backup-types';

const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_BASE = 'https://www.googleapis.com/upload/drive/v3';
const MAX_RETRY_ATTEMPTS = 3;
const REQUEST_TIMEOUT_MS = 10_000;
const TRANSFER_TIMEOUT_MS = 120_000;

type DriveFileResource = {
  appProperties?: Record<string, string>;
  id?: string;
  modifiedTime?: string;
  name?: string;
  size?: string;
};

type DriveFileListResponse = {
  files?: DriveFileResource[];
};

export class DriveApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'DriveApiError';
  }
}

function delay(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function readDriveError(response: Response) {
  try {
    const body = (await response.clone().json()) as {
      error?: { message?: string };
    };
    return body.error?.message ?? `Google Drive error ${response.status}.`;
  } catch {
    return `Google Drive error ${response.status}.`;
  }
}

async function isRetryableDriveResponse(response: Response) {
  if (response.status === 429 || response.status >= 500) return true;
  if (response.status !== 403) return false;
  try {
    const body = (await response.clone().json()) as {
      error?: { errors?: { reason?: string }[] };
    };
    return Boolean(
      body.error?.errors?.some((item) =>
        ['rateLimitExceeded', 'userRateLimitExceeded'].includes(
          item.reason ?? '',
        ),
      ),
    );
  } catch {
    return false;
  }
}

async function driveFetch(
  url: string,
  init: RequestInit = {},
  timeoutMs = REQUEST_TIMEOUT_MS,
) {
  let accessToken = await getGoogleDriveAccessToken();

  for (let attempt = 0; attempt < MAX_RETRY_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    let response: Response;
    try {
      response = await fetch(url, {
        ...init,
        headers: {
          ...init.headers,
          Authorization: `Bearer ${accessToken}`,
        },
        signal: controller.signal,
      });
    } catch (error) {
      const timedOut = error instanceof Error && error.name === 'AbortError';
      if (!timedOut && attempt < MAX_RETRY_ATTEMPTS - 1) {
        await delay(300 * 2 ** attempt);
        continue;
      }
      throw new DriveApiError(
        0,
        error instanceof Error
          ? error.message
          : 'Google Drive tidak dapat dihubungi.',
      );
    } finally {
      clearTimeout(timeout);
    }

    if (response.status === 401 && attempt === 0) {
      await clearGoogleDriveAccessToken(accessToken).catch(() => undefined);
      accessToken = await getGoogleDriveAccessToken();
      continue;
    }

    const retryable = await isRetryableDriveResponse(response);
    if (retryable && attempt < MAX_RETRY_ATTEMPTS - 1) {
      await delay(300 * 2 ** attempt);
      continue;
    }

    if (!response.ok) {
      throw new DriveApiError(response.status, await readDriveError(response));
    }
    return response;
  }

  throw new DriveApiError(0, 'Google Drive tidak dapat dihubungi.');
}

function mapDriveFile(file: DriveFileResource): DriveBackupFile {
  if (!file.id || !file.name || !file.modifiedTime) {
    throw new DriveApiError(0, 'Metadata cadangan Google Drive tidak lengkap.');
  }
  const sizeBytes = Number(file.size ?? 0);
  return {
    appProperties: file.appProperties ?? {},
    id: file.id,
    modifiedTime: file.modifiedTime,
    name: file.name,
    sizeBytes: Number.isSafeInteger(sizeBytes) ? sizeBytes : 0,
  };
}

export async function listDriveBackups() {
  const query = encodeURIComponent(
    "trashed = false and appProperties has { key='backupType' and value='full' }",
  );
  const fields = encodeURIComponent(
    'files(id,name,size,modifiedTime,appProperties)',
  );
  const response = await driveFetch(
    `${DRIVE_API_BASE}/files?spaces=appDataFolder&q=${query}&orderBy=modifiedTime%20desc&pageSize=100&fields=${fields}`,
  );
  const body = (await response.json()) as DriveFileListResponse;
  return (body.files ?? []).map(mapDriveFile);
}

export async function uploadDriveBackup(input: {
  appProperties: Record<string, string>;
  content: string;
  fileName: string;
}) {
  const sizeBytes = new TextEncoder().encode(input.content).length;
  const fields = encodeURIComponent('id,name,size,modifiedTime,appProperties');
  const initiation = await driveFetch(
    `${DRIVE_UPLOAD_BASE}/files?uploadType=resumable&fields=${fields}`,
    {
      body: JSON.stringify({
        appProperties: input.appProperties,
        mimeType: 'application/json',
        name: input.fileName,
        parents: ['appDataFolder'],
      }),
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Length': String(sizeBytes),
        'X-Upload-Content-Type': 'application/json',
      },
      method: 'POST',
    },
  );
  const sessionUrl = initiation.headers.get('location');
  if (!sessionUrl) {
    throw new DriveApiError(0, 'Google Drive tidak mengembalikan sesi upload.');
  }

  const uploaded = await driveFetch(
    sessionUrl,
    {
      body: input.content,
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'PUT',
    },
    TRANSFER_TIMEOUT_MS,
  );
  return mapDriveFile((await uploaded.json()) as DriveFileResource);
}

export async function downloadDriveBackup(fileId: string) {
  const response = await driveFetch(
    `${DRIVE_API_BASE}/files/${encodeURIComponent(fileId)}?alt=media`,
    {},
    TRANSFER_TIMEOUT_MS,
  );
  return response.text();
}

export async function deleteDriveBackup(fileId: string) {
  await driveFetch(`${DRIVE_API_BASE}/files/${encodeURIComponent(fileId)}`, {
    method: 'DELETE',
  });
}

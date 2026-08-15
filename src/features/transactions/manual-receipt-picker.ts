import * as ImagePicker from 'expo-image-picker';

import {
  supportedReceiptMimeTypes,
  type ReceiptMimeType,
} from '@/features/transactions/receipt-types';
import { createCodedError } from '@/lib/errors';

export type ManualReceiptSelection = Readonly<{
  displayName: string;
  mimeType: ReceiptMimeType;
  sourceImageUri: string;
}>;

function inferMimeType(fileName: string | null | undefined, uri: string) {
  const extensionSource = (fileName ?? uri).split(/[?#]/, 1)[0]?.toLowerCase();
  if (extensionSource?.endsWith('.jpg') || extensionSource?.endsWith('.jpeg')) {
    return 'image/jpeg';
  }
  if (extensionSource?.endsWith('.png')) {
    return 'image/png';
  }
  if (extensionSource?.endsWith('.webp')) {
    return 'image/webp';
  }
  return null;
}

function requireSupportedMimeType(
  mimeType: string | null | undefined,
  fileName: string | null | undefined,
  uri: string,
): ReceiptMimeType {
  const normalizedMimeType = mimeType?.trim().toLowerCase();
  const candidate = normalizedMimeType || inferMimeType(fileName, uri);
  if (
    !candidate ||
    !supportedReceiptMimeTypes.some(
      (supportedMimeType) => supportedMimeType === candidate,
    )
  ) {
    throw createCodedError(
      'VALIDATION_FAILED',
      'Choose a JPEG, PNG, or WEBP receipt image.',
    );
  }
  return candidate as ReceiptMimeType;
}

function getDisplayName(fileName: string | null | undefined, uri: string) {
  if (fileName?.trim()) {
    return fileName.trim();
  }
  const uriName = uri.split(/[\\/]/).at(-1)?.split(/[?#]/, 1)[0];
  return uriName?.trim() || 'Receipt image';
}

export async function pickManualReceipt(): Promise<ManualReceiptSelection | null> {
  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: false,
      mediaTypes: ['images'],
      quality: 1,
      selectionLimit: 1,
    });
    if (result.canceled) {
      return null;
    }

    const asset = result.assets[0];
    if (!asset?.uri) {
      throw createCodedError(
        'FILE_OPERATION_FAILED',
        'The selected receipt image is unavailable.',
      );
    }

    return {
      displayName: getDisplayName(asset.fileName, asset.uri),
      mimeType: requireSupportedMimeType(
        asset.mimeType,
        asset.fileName,
        asset.uri,
      ),
      sourceImageUri: asset.uri,
    };
  } catch (error) {
    if (
      error instanceof Error &&
      'code' in error &&
      (error.code === 'VALIDATION_FAILED' ||
        error.code === 'FILE_OPERATION_FAILED')
    ) {
      throw error;
    }
    throw createCodedError(
      'FILE_OPERATION_FAILED',
      "We couldn't access the receipt image. Choose it again.",
    );
  }
}

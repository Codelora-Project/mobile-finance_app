import * as ImagePicker from 'expo-image-picker';

import {
  supportedReceiptMimeTypes,
  type ReceiptMimeType,
} from '@/features/receipts/receipt-types';
import { createCodedError, isCodedError } from '@/lib/errors';

export type ReceiptImageSelection = Readonly<{
  displayName: string;
  fileSize: number | null;
  height: number;
  mimeType: ReceiptMimeType;
  source: 'camera' | 'gallery';
  sourceImageUri: string;
  width: number;
}>;

type ReceiptImageCandidate = Readonly<{
  fileName?: string | null;
  fileSize?: number | null;
  height: number;
  mimeType?: string | null;
  uri: string;
  width: number;
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

export function validateReceiptImage(
  candidate: ReceiptImageCandidate,
  source: ReceiptImageSelection['source'] = 'gallery',
): ReceiptImageSelection {
  const sourceImageUri = candidate.uri.trim();
  if (!sourceImageUri) {
    throw createCodedError(
      'FILE_OPERATION_FAILED',
      'The selected receipt image is unavailable.',
    );
  }
  if (
    !Number.isSafeInteger(candidate.width) ||
    candidate.width <= 0 ||
    !Number.isSafeInteger(candidate.height) ||
    candidate.height <= 0 ||
    (candidate.fileSize !== null &&
      candidate.fileSize !== undefined &&
      (!Number.isSafeInteger(candidate.fileSize) || candidate.fileSize <= 0))
  ) {
    throw createCodedError(
      'FILE_OPERATION_FAILED',
      'The selected receipt image is invalid. Choose another image.',
    );
  }

  return {
    displayName: getDisplayName(candidate.fileName, sourceImageUri),
    fileSize: candidate.fileSize ?? null,
    height: candidate.height,
    mimeType: requireSupportedMimeType(
      candidate.mimeType,
      candidate.fileName,
      sourceImageUri,
    ),
    source,
    sourceImageUri,
    width: candidate.width,
  };
}

export async function pickReceiptImageFromGallery(): Promise<ReceiptImageSelection | null> {
  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: false,
      mediaTypes: ['images'],
      quality: 0.8,
      selectionLimit: 1,
    });
    if (result.canceled) {
      return null;
    }

    const asset = result.assets[0];
    if (!asset) {
      throw createCodedError(
        'FILE_OPERATION_FAILED',
        'The selected receipt image is unavailable.',
      );
    }
    return validateReceiptImage(asset);
  } catch (error) {
    if (isCodedError(error)) {
      throw error;
    }
    throw createCodedError(
      'FILE_OPERATION_FAILED',
      "We couldn't access the receipt image. Choose it again.",
    );
  }
}

export async function pickReceiptImageFromCamera(): Promise<ReceiptImageSelection | null> {
  try {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      throw createCodedError(
        'FILE_OPERATION_FAILED',
        'Camera access is required to photograph a receipt.',
      );
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (result.canceled) {
      return null;
    }

    const asset = result.assets[0];
    if (!asset) {
      throw createCodedError(
        'FILE_OPERATION_FAILED',
        'The captured receipt image is unavailable.',
      );
    }
    return validateReceiptImage(asset, 'camera');
  } catch (error) {
    if (isCodedError(error)) {
      throw error;
    }
    throw createCodedError(
      'FILE_OPERATION_FAILED',
      "We couldn't open the camera. Try again.",
    );
  }
}

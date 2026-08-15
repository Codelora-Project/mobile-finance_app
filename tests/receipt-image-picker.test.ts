import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import {
  pickReceiptImageFromGallery,
  validateReceiptImage,
} from '@/features/receipts/receipt-image-picker';

const mockLaunchImageLibraryAsync =
  jest.fn<(...args: unknown[]) => Promise<unknown>>();

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: (...args: unknown[]) =>
    mockLaunchImageLibraryAsync(...args),
}));

describe('receipt gallery image picker', () => {
  beforeEach(() => {
    mockLaunchImageLibraryAsync.mockReset();
  });

  it('selects one supported image and keeps only temporary file metadata', async () => {
    mockLaunchImageLibraryAsync.mockResolvedValue({
      assets: [
        {
          fileName: 'receipt.jpeg',
          fileSize: 450_000,
          height: 1600,
          mimeType: 'image/jpeg',
          uri: 'file:///cache/receipt.jpeg',
          width: 1200,
        },
      ],
      canceled: false,
    });

    await expect(pickReceiptImageFromGallery()).resolves.toEqual({
      displayName: 'receipt.jpeg',
      fileSize: 450_000,
      height: 1600,
      mimeType: 'image/jpeg',
      source: 'gallery',
      sourceImageUri: 'file:///cache/receipt.jpeg',
      width: 1200,
    });
    expect(mockLaunchImageLibraryAsync).toHaveBeenCalledWith({
      allowsMultipleSelection: false,
      mediaTypes: ['images'],
      quality: 1,
      selectionLimit: 1,
    });
  });

  it('treats picker cancellation as a normal result', async () => {
    mockLaunchImageLibraryAsync.mockResolvedValue({
      assets: null,
      canceled: true,
    });

    await expect(pickReceiptImageFromGallery()).resolves.toBeNull();
  });

  it('infers a supported MIME type when the picker omits it', () => {
    expect(
      validateReceiptImage({
        fileName: null,
        height: 900,
        mimeType: null,
        uri: 'file:///cache/parking.WEBP?source=gallery',
        width: 600,
      }),
    ).toMatchObject({
      displayName: 'parking.WEBP',
      mimeType: 'image/webp',
    });
  });

  it('rejects unsupported and malformed images with recoverable errors', () => {
    expect(() =>
      validateReceiptImage({
        fileName: 'receipt.heic',
        height: 1000,
        mimeType: 'image/heic',
        uri: 'file:///cache/receipt.heic',
        width: 800,
      }),
    ).toThrow('Choose a JPEG, PNG, or WEBP receipt image.');

    expect(() =>
      validateReceiptImage({
        fileName: 'empty.png',
        fileSize: 0,
        height: 1000,
        mimeType: 'image/png',
        uri: 'file:///cache/empty.png',
        width: 800,
      }),
    ).toThrow('The selected receipt image is invalid. Choose another image.');
  });
});

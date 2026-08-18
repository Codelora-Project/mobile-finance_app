import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import {
  pickReceiptImageFromCamera,
  pickReceiptImageFromGallery,
  validateReceiptImage,
} from '@/features/receipts/receipt-image-picker';

const mockLaunchImageLibraryAsync =
  jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockLaunchCameraAsync =
  jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockRequestCameraPermissionsAsync =
  jest.fn<(...args: unknown[]) => Promise<unknown>>();

jest.mock('expo-image-picker', () => ({
  launchCameraAsync: (...args: unknown[]) => mockLaunchCameraAsync(...args),
  launchImageLibraryAsync: (...args: unknown[]) =>
    mockLaunchImageLibraryAsync(...args),
  requestCameraPermissionsAsync: (...args: unknown[]) =>
    mockRequestCameraPermissionsAsync(...args),
}));

describe('receipt gallery image picker', () => {
  beforeEach(() => {
    mockLaunchImageLibraryAsync.mockReset();
    mockLaunchCameraAsync.mockReset();
    mockRequestCameraPermissionsAsync.mockReset();
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
      quality: 0.8,
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

  it('captures one receipt after camera permission is granted', async () => {
    mockRequestCameraPermissionsAsync.mockResolvedValue({ granted: true });
    mockLaunchCameraAsync.mockResolvedValue({
      assets: [
        {
          fileName: 'camera-receipt.jpg',
          fileSize: 600_000,
          height: 1800,
          mimeType: 'image/jpeg',
          uri: 'file:///cache/camera-receipt.jpg',
          width: 1200,
        },
      ],
      canceled: false,
    });

    await expect(pickReceiptImageFromCamera()).resolves.toMatchObject({
      displayName: 'camera-receipt.jpg',
      source: 'camera',
      sourceImageUri: 'file:///cache/camera-receipt.jpg',
    });
    expect(mockLaunchCameraAsync).toHaveBeenCalledWith({
      mediaTypes: ['images'],
      quality: 0.8,
    });
  });

  it('does not open the camera when permission is denied', async () => {
    mockRequestCameraPermissionsAsync.mockResolvedValue({ granted: false });

    await expect(pickReceiptImageFromCamera()).rejects.toThrow(
      'Camera access is required to photograph a receipt.',
    );
    expect(mockLaunchCameraAsync).not.toHaveBeenCalled();
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

import { describe, expect, it, jest } from '@jest/globals';

jest.mock('@infinitered/react-native-mlkit-text-recognition', () => ({
  recognizeText: jest.fn(),
}));

import { OcrError, recognizeReceipt } from '@/features/receipts/ocr-service';

describe('OCR service', () => {
  it('returns normalized readable text', async () => {
    await expect(
      recognizeReceipt('file:///receipt.png', {
        recognizer: async () => ({ text: '  STORE\r\nTOTAL 10.000  ' }),
      }),
    ).resolves.toEqual({ rawText: 'STORE\r\nTOTAL 10.000' });
  });

  it('maps empty OCR and native errors to OCR_FAILED', async () => {
    await expect(
      recognizeReceipt('file:///empty.png', {
        recognizer: async () => ({ text: '  ' }),
      }),
    ).rejects.toMatchObject({ code: 'OCR_FAILED' });
    await expect(
      recognizeReceipt('file:///broken.png', {
        recognizer: async () => {
          throw new Error('native');
        },
      }),
    ).rejects.toMatchObject({ code: 'OCR_FAILED' });
  });

  it('times out without waiting for a stuck native call', async () => {
    await expect(
      recognizeReceipt('file:///slow.png', {
        recognizer: () => new Promise(() => undefined),
        timeoutMs: 1,
      }),
    ).rejects.toEqual(new OcrError('OCR_TIMEOUT'));
  });
});

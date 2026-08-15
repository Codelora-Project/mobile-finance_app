import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { ImportReceiptScreen } from '@/features/receipts/import-receipt-screen';
import { OcrError } from '@/features/receipts/ocr-service';
import { ReceiptFlowProvider } from '@/features/receipts/receipt-flow-context';
import { createCodedError } from '@/lib/errors';

const mockRouter = { back: jest.fn(), replace: jest.fn() };
const mockPickReceiptImage =
  jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockRecognizeReceipt =
  jest.fn<(...args: unknown[]) => Promise<unknown>>();

jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));
jest.mock('@/features/receipts/receipt-image-picker', () => ({
  pickReceiptImageFromGallery: (...args: unknown[]) =>
    mockPickReceiptImage(...args),
}));
jest.mock('@/features/receipts/ocr-service', () => ({
  OcrError: class OcrError extends Error {
    code: string;
    constructor(mockCode: string) {
      super(mockCode);
      this.code = mockCode;
    }
  },
  recognizeReceipt: (...args: unknown[]) => mockRecognizeReceipt(...args),
}));

const selectedImage = {
  displayName: 'gallery-receipt.png',
  fileSize: 250_000,
  height: 1600,
  mimeType: 'image/png' as const,
  source: 'gallery' as const,
  sourceImageUri: 'file:///cache/gallery-receipt.png',
  width: 1200,
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

function renderScreen() {
  return render(
    <ReceiptFlowProvider>
      <ImportReceiptScreen />
    </ReceiptFlowProvider>,
  );
}

describe('import receipt screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPickReceiptImage.mockReset();
    mockRecognizeReceipt.mockReset();
  });

  it('processes a gallery image and always routes to review', async () => {
    const picker = deferred<typeof selectedImage>();
    mockPickReceiptImage.mockReturnValue(picker.promise);
    mockRecognizeReceipt.mockResolvedValue({ rawText: 'SHOP\nTOTAL 35.000' });
    await renderScreen();
    await act(async () => picker.resolve(selectedImage));
    await waitFor(() =>
      expect(mockRouter.replace).toHaveBeenCalledWith('/receipt/review'),
    );
    expect(mockRecognizeReceipt).toHaveBeenCalledWith(
      selectedImage.sourceImageUri,
    );
  });

  it('returns normally when the initial picker is canceled', async () => {
    const picker = deferred<null>();
    mockPickReceiptImage.mockReturnValue(picker.promise);
    await renderScreen();
    await act(async () => picker.resolve(null));
    await waitFor(() => expect(mockRouter.back).toHaveBeenCalledTimes(1));
  });

  it('shows a recoverable validation error and can retry', async () => {
    const picker = deferred<unknown>();
    mockPickReceiptImage
      .mockReturnValueOnce(picker.promise)
      .mockResolvedValueOnce(selectedImage);
    mockRecognizeReceipt.mockResolvedValue({ rawText: 'SHOP\nTOTAL 10.000' });
    await renderScreen();
    await act(async () => {
      picker.reject(
        createCodedError(
          'VALIDATION_FAILED',
          'Choose a JPEG, PNG, or WEBP receipt image.',
        ),
      );
      await picker.promise.catch(() => undefined);
    });
    expect(
      await screen.findByText('Choose a JPEG, PNG, or WEBP receipt image.'),
    ).toBeOnTheScreen();
    fireEvent.press(screen.getByRole('button', { name: 'Try Another Image' }));
    await waitFor(() =>
      expect(mockRouter.replace).toHaveBeenCalledWith('/receipt/review'),
    );
  });

  it('keeps the receipt attached for manual fallback after native failure', async () => {
    const picker = deferred<typeof selectedImage>();
    mockPickReceiptImage.mockReturnValue(picker.promise);
    mockRecognizeReceipt.mockRejectedValue(new Error('native'));
    await renderScreen();
    await act(async () => picker.resolve(selectedImage));
    fireEvent.press(
      await screen.findByRole('button', { name: 'Enter Manually' }),
    );
    expect(mockRouter.replace).toHaveBeenCalledWith('/receipt/review');
  });

  it('shows timeout recovery without fake progress', async () => {
    const picker = deferred<typeof selectedImage>();
    mockPickReceiptImage.mockReturnValue(picker.promise);
    mockRecognizeReceipt.mockRejectedValue(new OcrError('OCR_TIMEOUT'));
    await renderScreen();
    await act(async () => picker.resolve(selectedImage));
    expect(
      await screen.findByRole('header', {
        name: 'Receipt processing is taking longer than expected.',
      }),
    ).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Try Again' })).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: 'Enter Manually' }),
    ).toBeOnTheScreen();
  });
});

import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { ImportReceiptScreen } from '@/features/receipts/import-receipt-screen';
import { ReceiptFlowProvider } from '@/features/receipts/receipt-flow-context';
import { createCodedError } from '@/lib/errors';

const mockRouter = {
  back: jest.fn(),
};
const mockPickReceiptImage =
  jest.fn<(...args: unknown[]) => Promise<unknown>>();

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
}));

jest.mock('@/features/receipts/receipt-image-picker', () => ({
  pickReceiptImageFromGallery: (...args: unknown[]) =>
    mockPickReceiptImage(...args),
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
  });

  it('opens the gallery and previews a valid temporary image', async () => {
    mockPickReceiptImage.mockResolvedValue(selectedImage);
    await renderScreen();

    expect(
      await screen.findByRole('header', { name: 'Receipt Image' }),
    ).toBeOnTheScreen();
    expect(screen.getByText('gallery-receipt.png')).toBeOnTheScreen();
    expect(screen.getByText('PNG · 1200 × 1600')).toBeOnTheScreen();
    expect(screen.getByLabelText('Selected receipt image')).toBeOnTheScreen();
    expect(
      screen.getByText(/It has not been saved as a transaction/),
    ).toBeOnTheScreen();
    expect(mockPickReceiptImage).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getAllByRole('button', { name: 'Close' })[0]);
    expect(mockRouter.back).toHaveBeenCalledTimes(1);
  });

  it('returns normally when the initial picker is canceled', async () => {
    mockPickReceiptImage.mockResolvedValue(null);
    await renderScreen();

    await waitFor(() => expect(mockRouter.back).toHaveBeenCalledTimes(1));
  });

  it('shows a recoverable validation error and can retry', async () => {
    mockPickReceiptImage
      .mockRejectedValueOnce(
        createCodedError(
          'VALIDATION_FAILED',
          'Choose a JPEG, PNG, or WEBP receipt image.',
        ),
      )
      .mockResolvedValueOnce(selectedImage);
    await renderScreen();

    expect(
      await screen.findByRole('header', { name: 'Receipt unavailable' }),
    ).toBeOnTheScreen();
    expect(
      screen.getByText('Choose a JPEG, PNG, or WEBP receipt image.'),
    ).toBeOnTheScreen();

    await fireEvent.press(
      screen.getByRole('button', { name: 'Choose another image' }),
    );
    expect(
      await screen.findByRole('header', { name: 'Receipt Image' }),
    ).toBeOnTheScreen();
    expect(mockPickReceiptImage).toHaveBeenCalledTimes(2);
  });
});

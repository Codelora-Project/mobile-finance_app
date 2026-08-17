import {
  pickReceiptImageFromCamera,
  pickReceiptImageFromGallery,
} from '@/features/receipts/receipt-image-picker';
import type { ReceiptMimeType } from '@/features/receipts/receipt-types';

export type ManualReceiptSelection = Readonly<{
  displayName: string;
  mimeType: ReceiptMimeType;
  sourceImageUri: string;
}>;

export type ManualReceiptSource = 'camera' | 'gallery';

export async function pickManualReceipt(
  source: ManualReceiptSource,
): Promise<ManualReceiptSelection | null> {
  const image =
    source === 'camera'
      ? await pickReceiptImageFromCamera()
      : await pickReceiptImageFromGallery();
  return image
    ? {
        displayName: image.displayName,
        mimeType: image.mimeType,
        sourceImageUri: image.sourceImageUri,
      }
    : null;
}

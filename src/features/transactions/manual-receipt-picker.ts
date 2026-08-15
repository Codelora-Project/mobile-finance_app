import { pickReceiptImageFromGallery } from '@/features/receipts/receipt-image-picker';
import type { ReceiptMimeType } from '@/features/receipts/receipt-types';

export type ManualReceiptSelection = Readonly<{
  displayName: string;
  mimeType: ReceiptMimeType;
  sourceImageUri: string;
}>;

export async function pickManualReceipt(): Promise<ManualReceiptSelection | null> {
  const image = await pickReceiptImageFromGallery();
  return image
    ? {
        displayName: image.displayName,
        mimeType: image.mimeType,
        sourceImageUri: image.sourceImageUri,
      }
    : null;
}

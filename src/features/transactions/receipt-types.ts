export const supportedReceiptMimeTypes = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export type ReceiptMimeType = (typeof supportedReceiptMimeTypes)[number];

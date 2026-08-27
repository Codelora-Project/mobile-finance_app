import { createContext, useContext, type PropsWithChildren } from 'react';
import { Directory, Paths } from 'expo-file-system';

import {
  copyReceiptToStorage,
  getReceiptFileUri,
  readReceiptBase64,
  receiptFileExists,
  removeAllReceiptFiles,
  removeReceiptFile,
  type ReceiptStorage,
  writeReceiptBase64ToStorage,
} from '@/features/receipts/receipt-storage';

const ReceiptStorageContext = createContext<ReceiptStorage | null>(null);
const fallbackReceiptStorage: ReceiptStorage = {
  copy: (sourceImageUri, mimeType) =>
    copyReceiptToStorage(sourceImageUri, mimeType),
  directory: new Directory(Paths.document, 'receipts'),
  exists: (storageKey) => receiptFileExists(storageKey),
  getUri: (storageKey) => getReceiptFileUri(storageKey),
  quarantineDirectory: new Directory(Paths.document, 'receipt-quarantine'),
  readBase64: (storageKey) => readReceiptBase64(storageKey),
  remove: (storageKey) => removeReceiptFile(storageKey),
  removeAll: () => removeAllReceiptFiles(),
  writeBase64: (base64, mimeType) =>
    writeReceiptBase64ToStorage(base64, mimeType),
};

type ReceiptStorageProviderProps = PropsWithChildren<{
  storage: ReceiptStorage;
}>;

export function ReceiptStorageProvider({
  children,
  storage,
}: ReceiptStorageProviderProps) {
  return (
    <ReceiptStorageContext.Provider value={storage}>
      {children}
    </ReceiptStorageContext.Provider>
  );
}

export function useReceiptStorage() {
  const storage = useContext(ReceiptStorageContext);
  return storage ?? fallbackReceiptStorage;
}

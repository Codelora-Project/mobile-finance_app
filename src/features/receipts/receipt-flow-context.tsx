import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

import type { ReceiptImageSelection } from '@/features/receipts/receipt-image-picker';
import type { ParsedReceipt } from '@/features/receipts/receipt-parser';

export type ReceiptOcrState = Readonly<{
  parsed: ParsedReceipt | null;
  rawText: string | null;
  status:
    'idle' | 'processing' | 'processed' | 'partial' | 'failed' | 'timeout';
}>;

type ReceiptFlowContextValue = Readonly<{
  clearImage: () => void;
  image: ReceiptImageSelection | null;
  ocr: ReceiptOcrState;
  setOcr: (ocr: ReceiptOcrState) => void;
  setImage: (image: ReceiptImageSelection) => void;
}>;

const ReceiptFlowContext = createContext<ReceiptFlowContextValue | null>(null);

export function ReceiptFlowProvider({ children }: { children: ReactNode }) {
  const [image, setImage] = useState<ReceiptImageSelection | null>(null);
  const [ocr, setOcr] = useState<ReceiptOcrState>({
    parsed: null,
    rawText: null,
    status: 'idle',
  });
  const clearImage = useCallback(() => {
    setImage(null);
    setOcr({ parsed: null, rawText: null, status: 'idle' });
  }, []);
  const value = useMemo(
    () => ({ clearImage, image, ocr, setImage, setOcr }),
    [clearImage, image, ocr],
  );

  return (
    <ReceiptFlowContext.Provider value={value}>
      {children}
    </ReceiptFlowContext.Provider>
  );
}

export function useReceiptFlow() {
  const value = useContext(ReceiptFlowContext);
  if (!value) {
    throw new Error('useReceiptFlow must be used inside ReceiptFlowProvider.');
  }
  return value;
}

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

import type { ReceiptImageSelection } from '@/features/receipts/receipt-image-picker';

type ReceiptFlowContextValue = Readonly<{
  clearImage: () => void;
  image: ReceiptImageSelection | null;
  setImage: (image: ReceiptImageSelection) => void;
}>;

const ReceiptFlowContext = createContext<ReceiptFlowContextValue | null>(null);

export function ReceiptFlowProvider({ children }: { children: ReactNode }) {
  const [image, setImage] = useState<ReceiptImageSelection | null>(null);
  const clearImage = useCallback(() => setImage(null), []);
  const value = useMemo(
    () => ({ clearImage, image, setImage }),
    [clearImage, image],
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

import { useLocalSearchParams } from 'expo-router';

import { ReceiptViewerScreen } from '@/features/receipts/receipt-viewer-screen';

export default function ReceiptViewerRoute() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const idValue = Array.isArray(id) ? id[0] : id;
  const transactionId = Number(idValue);

  return (
    <ReceiptViewerScreen
      transactionId={
        Number.isSafeInteger(transactionId) && transactionId > 0
          ? transactionId
          : 0
      }
    />
  );
}

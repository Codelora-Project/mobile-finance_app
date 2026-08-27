import { useLocalSearchParams } from 'expo-router';

import { TransactionDetailScreen } from '@/features/transactions/transaction-detail-screen';

export default function TransactionDetailRoute() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const idValue = Array.isArray(id) ? id[0] : id;
  const transactionId = Number(idValue);

  return (
    <TransactionDetailScreen
      transactionId={
        Number.isSafeInteger(transactionId) && transactionId > 0
          ? transactionId
          : 0
      }
    />
  );
}

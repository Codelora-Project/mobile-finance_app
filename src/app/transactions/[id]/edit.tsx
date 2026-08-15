import { useLocalSearchParams } from 'expo-router';

import { ManualTransactionScreen } from '@/features/transactions/manual-transaction-screen';

export default function EditTransactionRoute() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const idValue = Array.isArray(id) ? id[0] : id;
  const transactionId = Number(idValue);

  return (
    <ManualTransactionScreen
      transactionId={
        Number.isSafeInteger(transactionId) && transactionId > 0
          ? transactionId
          : 0
      }
    />
  );
}

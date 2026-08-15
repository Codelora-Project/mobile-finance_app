import { Stack } from 'expo-router';

import { ReceiptFlowProvider } from '@/features/receipts/receipt-flow-context';
import { colors } from '@/theme/colors';

export default function ReceiptLayout() {
  return (
    <ReceiptFlowProvider>
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: colors.background },
          headerShown: false,
        }}
      />
    </ReceiptFlowProvider>
  );
}

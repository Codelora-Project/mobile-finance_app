import { useSQLiteContext } from 'expo-sqlite';
import { useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import {
  listPaymentMethods,
  type PaymentMethod,
} from '@/features/payment-methods/payment-method-repository';
import { usePickerData } from '@/lib/use-picker-data';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

type PaymentMethodPickerProps = {
  allowNone?: boolean;
  onSelect: (paymentMethod: PaymentMethod | null) => void;
  selectedId?: number | null;
};

export function PaymentMethodPicker({
  allowNone = true,
  onSelect,
  selectedId,
}: PaymentMethodPickerProps) {
  const database = useSQLiteContext();
  const loadPaymentMethods = useCallback(
    () => listPaymentMethods(database),
    [database],
  );
  const {
    error,
    items: paymentMethods,
    loading,
    reload,
  } = usePickerData({
    diagnosticLabel: 'Payment method picker',
    load: loadPaymentMethods,
    resourceKey: 'payment-methods',
  });

  function retryLoad() {
    void reload();
  }

  if (loading) {
    return (
      <View accessibilityLiveRegion="polite" style={styles.state}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.stateText}>Loading payment methods…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View accessibilityLiveRegion="assertive" style={styles.state}>
        <Text style={styles.error}>{error}</Text>
        <AppButton label="Try again" onPress={retryLoad} variant="secondary" />
      </View>
    );
  }

  const noneSelected = selectedId == null;

  return (
    <FlatList
      data={paymentMethods}
      keyExtractor={(paymentMethod) => String(paymentMethod.id)}
      ListHeaderComponent={
        allowNone ? (
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ checked: noneSelected }}
            onPress={() => onSelect(null)}
            style={({ pressed }) => [
              styles.row,
              noneSelected ? styles.selectedRow : null,
              pressed ? styles.pressed : null,
            ]}
          >
            <View style={styles.rowText}>
              <Text style={styles.name}>No payment method</Text>
              <Text style={styles.metadata}>Optional</Text>
            </View>
            <Text
              style={noneSelected ? styles.selectedMark : styles.unselectedMark}
            >
              {noneSelected ? 'Selected' : 'Select'}
            </Text>
          </Pressable>
        ) : null
      }
      renderItem={({ item }) => {
        const selected = item.id === selectedId;
        return (
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            onPress={() => onSelect(item)}
            style={({ pressed }) => [
              styles.row,
              selected ? styles.selectedRow : null,
              pressed ? styles.pressed : null,
            ]}
          >
            <View style={styles.rowText}>
              <Text style={styles.name}>{item.name}</Text>
              {item.isDefault ? (
                <Text style={styles.metadata}>Default</Text>
              ) : null}
            </View>
            <Text
              style={selected ? styles.selectedMark : styles.unselectedMark}
            >
              {selected ? 'Selected' : 'Select'}
            </Text>
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  state: {
    alignItems: 'center',
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 160,
    padding: spacing.lg,
  },
  stateText: {
    color: colors.textSecondary,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
    textAlign: 'center',
  },
  error: {
    color: colors.destructive,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
    textAlign: 'center',
  },
  row: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    minHeight: 64,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  selectedRow: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.sm,
  },
  pressed: {
    opacity: 0.7,
  },
  rowText: {
    flex: 1,
  },
  name: {
    color: colors.textPrimary,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
  },
  metadata: {
    color: colors.textSecondary,
    fontSize: typography.metadata.fontSize,
    lineHeight: typography.metadata.lineHeight,
  },
  selectedMark: {
    color: colors.primary,
    fontSize: typography.secondary.fontSize,
    fontWeight: '600',
  },
  unselectedMark: {
    color: colors.textSecondary,
    fontSize: typography.secondary.fontSize,
  },
});

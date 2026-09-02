import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { memo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { PaymentMethod } from '@/features/payment-methods/payment-method-repository';
import { useLanguage } from '@/lib/i18n/language-context';
import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type ManualPaymentMethodsStripProps = {
  onSelectPaymentMethod: (pm: PaymentMethod) => void;
  paymentMethods: readonly PaymentMethod[];
  selectedPaymentMethodId?: number | null;
  transactionType?: 'expense' | 'income' | 'transfer';
};

export const ManualPaymentMethodsStrip = memo(
  function ManualPaymentMethodsStrip({
    onSelectPaymentMethod,
    paymentMethods,
    selectedPaymentMethodId,
    transactionType = 'expense',
  }: ManualPaymentMethodsStripProps) {
    const { colors, isDark } = useTheme();
    const { t } = useLanguage();

    const sectionLabelText =
      transactionType === 'income'
        ? t.transactions.depositToWalletSection
        : t.transactions.paymentMethodSection;

    return (
      <View style={styles.sectionContainer}>
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          {sectionLabelText}
        </Text>
        <ScrollView
          contentContainerStyle={styles.paymentMethodsList}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {paymentMethods.map((pm) => {
            const isSelected = selectedPaymentMethodId === pm.id;
            return (
              <Pressable
                accessibilityLabel={pm.name}
                accessibilityRole="button"
                key={pm.id}
                onPress={() => onSelectPaymentMethod(pm)}
                style={({ pressed }) => [
                  styles.paymentMethodChip,
                  {
                    backgroundColor: isSelected
                      ? colors.primary
                      : isDark
                        ? colors.surfaceSecondary
                        : '#F1F5F9',
                    borderColor: isSelected
                      ? colors.primary
                      : isDark
                        ? '#27272A'
                        : '#E2E8F0',
                  },
                  isSelected ? styles.paymentMethodChipSelected : null,
                  pressed ? styles.chipPressed : null,
                ]}
              >
                <MaterialCommunityIcons
                  color={
                    isSelected
                      ? '#FFFFFF'
                      : isDark
                        ? colors.textSecondary
                        : '#475569'
                  }
                  name={
                    pm.name.toLowerCase().includes('cash') ||
                    pm.name.toLowerCase().includes('tunai')
                      ? 'cash'
                      : pm.name.toLowerCase().includes('qris') ||
                          pm.name.toLowerCase().includes('gopay') ||
                          pm.name.toLowerCase().includes('ovo')
                        ? 'qrcode-scan'
                        : 'credit-card-outline'
                  }
                  size={16}
                />
                <Text
                  style={[
                    styles.paymentMethodChipText,
                    {
                      color: isSelected
                        ? '#FFFFFF'
                        : isDark
                          ? colors.textPrimary
                          : '#475569',
                    },
                    isSelected ? styles.paymentMethodChipTextSelected : null,
                  ]}
                >
                  {pm.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  chipPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.97 }],
  },
  paymentMethodChip: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    minHeight: 38,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  paymentMethodChipSelected: {
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  paymentMethodChipText: {
    ...typography.metadata,
    fontSize: 12,
    fontWeight: '700',
  },
  paymentMethodChipTextSelected: {
    fontWeight: '800',
  },
  paymentMethodsList: {
    gap: spacing.xs + 2,
    paddingVertical: 2,
  },
  sectionContainer: {
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  sectionLabel: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
});

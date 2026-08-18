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
    const { language } = useLanguage();

    const sectionLabelText =
      transactionType === 'income'
        ? language === 'id'
          ? 'MASUK KE DOMPET / REKENING'
          : 'DEPOSIT TO WALLET / ACCOUNT'
        : language === 'id'
          ? 'METODE PEMBAYARAN'
          : 'PAYMENT METHOD';

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
                style={[
                  styles.paymentMethodChip,
                  {
                    backgroundColor: isSelected
                      ? colors.primary
                      : isDark
                        ? colors.surfaceSecondary
                        : '#F1F5F9',
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                  isSelected ? styles.paymentMethodChipSelected : null,
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
  paymentMethodChip: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 3,
  },
  paymentMethodChipSelected: {
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  paymentMethodChipText: {
    ...typography.metadata,
    fontSize: 12,
    fontWeight: '600',
  },
  paymentMethodChipTextSelected: {
    fontWeight: '800',
  },
  paymentMethodsList: {
    gap: spacing.xs,
    paddingVertical: 2,
  },
  sectionContainer: {
    gap: spacing.xs,
  },
  sectionLabel: {
    ...typography.metadata,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});

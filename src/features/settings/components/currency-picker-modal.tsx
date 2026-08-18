import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { memo } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Screen } from '@/components/ui/screen';
import {
  SUPPORTED_CURRENCIES,
  type SupportedCurrency,
  type SupportedCurrencyCode,
} from '@/features/settings/settings-repository';
import { useLanguage } from '@/lib/i18n/language-context';
import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type CurrencyPickerModalProps = {
  onClose: () => void;
  onSelectCurrency: (currencyCode: SupportedCurrencyCode) => void;
  selectedCode: SupportedCurrencyCode;
  visible: boolean;
};

export const CurrencyPickerModal = memo(function CurrencyPickerModal({
  onClose,
  onSelectCurrency,
  selectedCode,
  visible,
}: CurrencyPickerModalProps) {
  const { colors, isDark } = useTheme();
  const { language } = useLanguage();

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      visible={visible}
    >
      <Screen>
        {/* Modal Header */}
        <View
          style={[
            styles.modalHeader,
            {
              backgroundColor: colors.surface,
              borderBottomColor: colors.border,
            },
          ]}
        >
          <Text
            style={[styles.modalTitle, { color: colors.textPrimary }]}
          >
            {language === 'id'
              ? 'Pilih Mata Uang Utama'
              : 'Select Base Currency'}
          </Text>
          <Pressable
            accessibilityLabel="Close currency picker"
            accessibilityRole="button"
            hitSlop={12}
            onPress={onClose}
            style={styles.closeBtn}
          >
            <MaterialCommunityIcons
              color={colors.textSecondary}
              name="close"
              size={24}
            />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Informational Banner */}
          <View
            style={[
              styles.infoBanner,
              {
                backgroundColor: isDark
                  ? colors.surfaceSecondary
                  : '#EFF6FF',
                borderColor: isDark ? colors.border : '#BFDBFE',
              },
            ]}
          >
            <MaterialCommunityIcons
              color={colors.primary}
              name="information-outline"
              size={20}
            />
            <Text
              style={[
                styles.infoText,
                { color: isDark ? colors.textSecondary : '#1E40AF' },
              ]}
            >
              {language === 'id'
                ? 'Mengubah mata uang utama akan langsung memperbarui simbol & format pada seluruh transaksi dan laporan.'
                : 'Changing the base currency updates currency symbols & formatting across all transactions and reports.'}
            </Text>
          </View>

          {/* List of Currencies */}
          <View
            style={[
              styles.currencyListCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            {SUPPORTED_CURRENCIES.map((currency: SupportedCurrency, index) => {
              const isSelected = currency.code === selectedCode;
              const isLast = index === SUPPORTED_CURRENCIES.length - 1;

              return (
                <Pressable
                  accessibilityRole="button"
                  key={currency.code}
                  onPress={() => {
                    onSelectCurrency(currency.code);
                    onClose();
                  }}
                  style={[
                    styles.currencyRow,
                    isSelected
                      ? {
                          backgroundColor: isDark
                            ? colors.surfaceSecondary
                            : '#F0FDF4',
                        }
                      : null,
                    !isLast
                      ? {
                          borderBottomColor: colors.border,
                          borderBottomWidth: 1,
                        }
                      : null,
                  ]}
                >
                  <View style={styles.symbolBadge}>
                    <Text
                      style={[
                        styles.symbolText,
                        { color: colors.primary },
                      ]}
                    >
                      {currency.symbol}
                    </Text>
                  </View>

                  <View style={styles.currencyInfo}>
                    <View style={styles.nameCodeRow}>
                      <Text
                        style={[
                          styles.currencyName,
                          { color: colors.textPrimary },
                        ]}
                      >
                        {currency.name}
                      </Text>
                      <Text
                        style={[
                          styles.currencyCode,
                          {
                            backgroundColor: isDark
                              ? colors.surfaceSecondary
                              : '#F1F5F9',
                            color: colors.textSecondary,
                          },
                        ]}
                      >
                        {currency.code}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.countryText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {currency.country}
                    </Text>
                  </View>

                  {isSelected ? (
                    <MaterialCommunityIcons
                      color="#10B981"
                      name="check-circle"
                      size={22}
                    />
                  ) : (
                    <MaterialCommunityIcons
                      color={colors.border}
                      name="circle-outline"
                      size={22}
                    />
                  )}
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </Screen>
    </Modal>
  );
});

const styles = StyleSheet.create({
  closeBtn: {
    padding: spacing.xs,
  },
  countryText: {
    ...typography.metadata,
    fontSize: 12,
  },
  currencyCode: {
    borderRadius: 4,
    fontSize: 12,
    fontWeight: '700',
    overflow: 'hidden',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  currencyInfo: {
    flex: 1,
    gap: 2,
  },
  currencyListCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  currencyName: {
    ...typography.body,
    fontSize: 15,
    fontWeight: '700',
  },
  currencyRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  infoBanner: {
    alignItems: 'flex-start',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
  },
  infoText: {
    ...typography.metadata,
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  modalHeader: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  modalTitle: {
    ...typography.sectionTitle,
    fontSize: 17,
    fontWeight: '800',
  },
  nameCodeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  scrollContent: {
    gap: spacing.md,
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  symbolBadge: {
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderRadius: radius.md,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  symbolText: {
    fontSize: 16,
    fontWeight: '900',
  },
});

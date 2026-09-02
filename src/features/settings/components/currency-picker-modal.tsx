import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { memo, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCurrencies = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return SUPPORTED_CURRENCIES;
    return SUPPORTED_CURRENCIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.country.toLowerCase().includes(q) ||
        c.symbol.toLowerCase().includes(q),
    );
  }, [searchQuery]);

  const handleClose = () => {
    setSearchQuery('');
    onClose();
  };

  return (
    <Modal animationType="slide" onRequestClose={handleClose} visible={visible}>
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
          <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
            {t.settings.selectBaseCurrency}
          </Text>
          <Pressable
            accessibilityLabel={t.settings.closeCurrencyPicker}
            accessibilityRole="button"
            hitSlop={12}
            onPress={handleClose}
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
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Informational Banner */}
          <View
            style={[
              styles.infoBanner,
              {
                backgroundColor: isDark ? colors.surfaceSecondary : '#EFF6FF',
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
              {t.settings.currencyChangeDescription}
            </Text>
          </View>

          {/* Search Bar */}
          <View
            style={[
              styles.searchBarContainer,
              {
                backgroundColor: isDark ? colors.surfaceSecondary : '#F1F5F9',
                borderColor: colors.border,
              },
            ]}
          >
            <MaterialCommunityIcons
              color={colors.textSecondary}
              name="magnify"
              size={20}
            />
            <TextInput
              clearButtonMode="while-editing"
              onChangeText={setSearchQuery}
              placeholder={t.settings.searchCurrencyPlaceholder}
              placeholderTextColor={colors.textSecondary}
              style={[styles.searchInput, { color: colors.textPrimary }]}
              value={searchQuery}
            />
            {searchQuery ? (
              <Pressable
                accessibilityLabel={t.settings.clearSearch}
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => setSearchQuery('')}
              >
                <MaterialCommunityIcons
                  color={colors.textSecondary}
                  name="close-circle"
                  size={18}
                />
              </Pressable>
            ) : null}
          </View>

          {/* List of Currencies */}
          {filteredCurrencies.length > 0 ? (
            <View
              style={[
                styles.currencyListCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              {filteredCurrencies.map((currency: SupportedCurrency, index) => {
                const isSelected = currency.code === selectedCode;
                const isLast = index === filteredCurrencies.length - 1;

                return (
                  <Pressable
                    accessibilityRole="button"
                    key={currency.code}
                    onPress={() => {
                      onSelectCurrency(currency.code);
                      handleClose();
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
                    <View style={styles.flagSymbolRow}>
                      <Text style={styles.flagEmoji}>{currency.flag}</Text>
                      <View
                        style={[
                          styles.symbolBadge,
                          {
                            backgroundColor: isDark
                              ? colors.surface
                              : '#EEF2FF',
                          },
                        ]}
                      >
                        <Text
                          style={[styles.symbolText, { color: colors.primary }]}
                        >
                          {currency.symbol}
                        </Text>
                      </View>
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
          ) : (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons
                color={colors.textSecondary}
                name="currency-usd-off"
                size={36}
              />
              <Text
                style={[styles.emptyStateText, { color: colors.textSecondary }]}
              >
                {t.settings.noCurrenciesFound}
              </Text>
            </View>
          )}
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
  emptyState: {
    alignItems: 'center',
    gap: spacing.sm,
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyStateText: {
    ...typography.body,
    fontSize: 14,
    fontWeight: '600',
  },
  flagEmoji: {
    fontSize: 22,
  },
  flagSymbolRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs + 2,
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
  searchBarContainer: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  searchInput: {
    ...typography.body,
    flex: 1,
    fontSize: 13,
    paddingVertical: 2,
  },
  symbolBadge: {
    alignItems: 'center',
    borderRadius: radius.md,
    height: 36,
    justifyContent: 'center',
    minWidth: 36,
    paddingHorizontal: 6,
  },
  symbolText: {
    fontSize: 14,
    fontWeight: '900',
  },
});

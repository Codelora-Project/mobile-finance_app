import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { memo, useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  SUPPORTED_CURRENCIES,
  type SupportedCurrencyCode,
} from '@/features/settings/settings-repository';
import { QuickShortcutsBar } from '@/features/transactions/components/quick-shortcuts-bar';
import type { Language, TranslationSchema } from '@/lib/i18n/translations';
import { formatMoney, formatShortcutLabel } from '@/lib/money';
import type { ThemeSetting } from '@/lib/theme/theme-context';
import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type SettingsAppearanceCardProps = {
  currencyCode: SupportedCurrencyCode;
  currencySymbol: string;
  language: Language;
  onOpenAddShortcut: () => void;
  onOpenCurrencyPicker: () => void;
  onRemoveShortcut: (amount: number) => void;
  onResetShortcuts: () => void;
  onSelectLanguage: (lang: Language) => void;
  onSelectTheme: (theme: ThemeSetting) => void;
  shortcuts: readonly number[];
  t: TranslationSchema;
  themeSetting: ThemeSetting;
};

export const SettingsAppearanceCard = memo(function SettingsAppearanceCard({
  currencyCode,
  currencySymbol,
  language,
  onOpenAddShortcut,
  onOpenCurrencyPicker,
  onRemoveShortcut,
  onResetShortcuts,
  onSelectLanguage,
  onSelectTheme,
  shortcuts,
  t,
  themeSetting,
}: SettingsAppearanceCardProps) {
  const { colors, isDark } = useTheme();

  const [previewAmount, setPreviewAmount] = useState(0);

  const handlePreviewAdd = useCallback((amount: number) => {
    setPreviewAmount((prev) => prev + amount);
  }, []);

  const handlePreviewReset = useCallback(() => {
    setPreviewAmount(0);
  }, []);

  return (
    <View style={styles.sectionGroup}>
      <Text
        style={[
          styles.sectionHeaderLabel,
          { color: colors.textSecondary },
        ]}
      >
        {language === 'id'
          ? 'TAMPILAN & SHORTCUT'
          : 'APPEARANCE & SHORTCUTS'}
      </Text>

      <View
        style={[
          styles.groupedCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        {/* 1. Theme Mode */}
        <View style={styles.cardItemPadding}>
          <View style={styles.itemHeaderBetween}>
            <View style={styles.iconTitleRow}>
              <View
                style={[
                  styles.itemIconBadge,
                  {
                    backgroundColor: isDark
                      ? colors.surfaceSecondary
                      : '#EEF2FF',
                  },
                ]}
              >
                <MaterialCommunityIcons
                  color={colors.primary}
                  name="theme-light-dark"
                  size={18}
                />
              </View>
              <Text
                accessibilityRole="header"
                style={[
                  styles.itemTitle,
                  { color: colors.textPrimary },
                ]}
              >
                {t.settings.themeSection}
              </Text>
            </View>
          </View>

          {/* Segmented Pill Selector */}
          <View
            style={[
              styles.themeSegmentTrack,
              {
                backgroundColor: isDark
                  ? colors.surfaceSecondary
                  : '#F1F5F9',
              },
            ]}
          >
            {(
              [
                {
                  icon: 'white-balance-sunny',
                  key: 'light',
                  label: t.settings.themeLight,
                },
                {
                  icon: 'weather-night',
                  key: 'dark',
                  label: t.settings.themeDark,
                },
                {
                  icon: 'cellphone-cog',
                  key: 'system',
                  label: t.settings.themeSystem,
                },
              ] as const
            ).map((item) => {
              const isSelected = themeSetting === item.key;
              return (
                <Pressable
                  accessibilityLabel={`Pilih Tema ${item.label}`}
                  accessibilityRole="button"
                  key={item.key}
                  onPress={() => onSelectTheme(item.key as ThemeSetting)}
                  style={[
                    styles.themeSegmentTab,
                    isSelected
                      ? [
                          styles.themeSegmentTabActive,
                          { backgroundColor: colors.surface },
                        ]
                      : null,
                  ]}
                >
                  <MaterialCommunityIcons
                    color={
                      isSelected ? colors.primary : colors.textSecondary
                    }
                    name={item.icon}
                    size={16}
                  />
                  <Text
                    adjustsFontSizeToFit
                    minimumFontScale={0.8}
                    numberOfLines={1}
                    style={[
                      styles.themeSegmentTabText,
                      {
                        color: isSelected
                          ? colors.primary
                          : colors.textSecondary,
                        fontWeight: isSelected ? '800' : '600',
                      },
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View
          style={[
            styles.cardInnerDivider,
            { backgroundColor: colors.border },
          ]}
        />

        {/* 2. Quick Amount Shortcuts */}
        <View style={styles.cardItemPadding}>
          <View style={styles.itemHeaderBetween}>
            <View style={styles.iconTitleRow}>
              <View
                style={[
                  styles.itemIconBadge,
                  {
                    backgroundColor: isDark
                      ? colors.surfaceSecondary
                      : '#FEF3C7',
                  },
                ]}
              >
                <MaterialCommunityIcons
                  color="#D97706"
                  name="lightning-bolt"
                  size={18}
                />
              </View>
              <Text
                accessibilityRole="header"
                style={[
                  styles.itemTitle,
                  { color: colors.textPrimary },
                ]}
              >
                {t.settings.shortcutsSection}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              onPress={onResetShortcuts}
            >
              <Text
                style={[
                  styles.resetActionLink,
                  { color: colors.primary },
                ]}
              >
                {t.settings.resetShortcuts}
              </Text>
            </Pressable>
          </View>

          <Text
            style={[
              styles.itemSubtitle,
              { color: colors.textSecondary },
            ]}
          >
            {t.settings.shortcutsDesc}
          </Text>

          {/* Live Preview Box */}
          <View
            style={[
              styles.previewContainer,
              {
                backgroundColor: isDark
                  ? colors.surfaceSecondary
                  : '#F8FAFC',
                borderColor: isDark ? colors.border : '#E2E8F0',
              },
            ]}
          >
            <View style={styles.previewHeaderRow}>
              <View style={styles.previewTag}>
                <MaterialCommunityIcons
                  color="#059669"
                  name="eye-outline"
                  size={14}
                />
                <Text style={styles.previewTagText}>
                  {t.settings.shortcutLivePreview}
                </Text>
              </View>
              <Text
                style={[
                  styles.previewAmountDisplay,
                  { color: colors.textPrimary },
                ]}
              >
                {previewAmount > 0
                  ? formatMoney(previewAmount, currencyCode)
                  : `${currencySymbol} 0`}
              </Text>
            </View>

            <QuickShortcutsBar
              currencySymbol={currencySymbol}
              onAddIncrement={handlePreviewAdd}
              onReset={handlePreviewReset}
              quickShortcuts={shortcuts}
            />
          </View>

          {/* Shortcut Chips Grid */}
          <View style={styles.shortcutChipsWrap}>
            {shortcuts.map((amount) => (
              <View
                key={amount}
                style={[
                  styles.shortcutPillBadge,
                  {
                    backgroundColor: isDark
                      ? colors.surfaceSecondary
                      : '#EFF6FF',
                    borderColor: isDark ? colors.border : '#BFDBFE',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.shortcutPillText,
                    { color: colors.primary },
                  ]}
                >
                  {formatShortcutLabel(amount, currencySymbol)}
                </Text>
                <Pressable
                  accessibilityLabel={`Hapus shortcut ${amount}`}
                  accessibilityRole="button"
                  hitSlop={6}
                  onPress={() => onRemoveShortcut(amount)}
                  style={styles.shortcutRemoveIcon}
                >
                  <MaterialCommunityIcons
                    color="#EF4444"
                    name="close-circle"
                    size={16}
                  />
                </Pressable>
              </View>
            ))}
          </View>

          {/* Action Buttons: Add & Reset to Recommended */}
          <View style={styles.shortcutActionsRow}>
            {shortcuts.length < 8 ? (
              <Pressable
                accessibilityRole="button"
                onPress={onOpenAddShortcut}
                style={[
                  styles.addShortcutCardBtn,
                  {
                    backgroundColor: isDark
                      ? colors.surfaceSecondary
                      : '#F8FAFC',
                    borderColor: colors.border,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  color={colors.primary}
                  name="plus"
                  size={18}
                />
                <Text
                  style={[
                    styles.addShortcutCardText,
                    { color: colors.primary },
                  ]}
                >
                  {t.settings.addShortcut}
                </Text>
              </Pressable>
            ) : null}

            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              onPress={onResetShortcuts}
              style={[
                styles.resetRecommendedBtn,
                {
                  backgroundColor: isDark
                    ? colors.surfaceSecondary
                    : '#EEF2FF',
                  borderColor: isDark ? colors.border : '#C7D2FE',
                },
              ]}
            >
              <MaterialCommunityIcons
                color={colors.primary}
                name="refresh"
                size={15}
              />
              <Text
                style={[
                  styles.resetRecommendedText,
                  { color: colors.primary },
                ]}
              >
                {t.settings.resetToRecommended.replace(
                  '{currency}',
                  currencyCode,
                )}
              </Text>
            </Pressable>
          </View>
        </View>

        <View
          style={[
            styles.cardInnerDivider,
            { backgroundColor: colors.border },
          ]}
        />

        {/* 3. Language Selection */}
        <View style={styles.cardItemPadding}>
          <View style={styles.iconTitleRow}>
            <View
              style={[
                styles.itemIconBadge,
                {
                  backgroundColor: isDark
                    ? colors.surfaceSecondary
                    : '#E0F2FE',
                },
              ]}
            >
              <MaterialCommunityIcons
                color="#0284C7"
                name="translate"
                size={18}
              />
            </View>
            <Text
              accessibilityRole="header"
              style={[styles.itemTitle, { color: colors.textPrimary }]}
            >
              {t.settings.languageSection}
            </Text>
          </View>

          <View style={styles.languagePillsRow}>
            {/* Indonesian */}
            <Pressable
              accessibilityLabel="Pilih Bahasa Indonesia"
              accessibilityRole="button"
              onPress={() => onSelectLanguage('id')}
              style={[
                styles.langPillOption,
                {
                  backgroundColor: isDark
                    ? colors.surfaceSecondary
                    : '#F8FAFC',
                  borderColor: colors.border,
                },
                language === 'id'
                  ? [
                      styles.langPillOptionActive,
                      { borderColor: colors.primary },
                    ]
                  : null,
              ]}
            >
              <Text style={styles.langFlagIcon}>🇮🇩</Text>
              <Text
                adjustsFontSizeToFit
                minimumFontScale={0.8}
                numberOfLines={1}
                style={[
                  styles.langOptionText,
                  { color: colors.textPrimary },
                  language === 'id'
                    ? [
                        styles.langOptionTextActive,
                        { color: colors.primary },
                      ]
                    : null,
                ]}
              >
                {t.settings.langIndonesian}
              </Text>
            </Pressable>

            {/* English */}
            <Pressable
              accessibilityLabel="Select English language"
              accessibilityRole="button"
              onPress={() => onSelectLanguage('en')}
              style={[
                styles.langPillOption,
                {
                  backgroundColor: isDark
                    ? colors.surfaceSecondary
                    : '#F8FAFC',
                  borderColor: colors.border,
                },
                language === 'en'
                  ? [
                      styles.langPillOptionActive,
                      { borderColor: colors.primary },
                    ]
                  : null,
              ]}
            >
              <Text style={styles.langFlagIcon}>🇬🇧</Text>
              <Text
                adjustsFontSizeToFit
                minimumFontScale={0.8}
                numberOfLines={1}
                style={[
                  styles.langOptionText,
                  { color: colors.textPrimary },
                  language === 'en'
                    ? [
                        styles.langOptionTextActive,
                        { color: colors.primary },
                      ]
                    : null,
                ]}
              >
                {t.settings.langEnglish}
              </Text>
            </Pressable>
          </View>
        </View>

        <View
          style={[
            styles.cardInnerDivider,
            { backgroundColor: colors.border },
          ]}
        />

        {/* 4. Base Currency Selection */}
        <View style={styles.cardItemPadding}>
          <Pressable
            accessibilityLabel="Pilih Mata Uang Utama"
            accessibilityRole="button"
            onPress={onOpenCurrencyPicker}
            style={styles.currencyRowButton}
          >
            <View style={styles.iconTitleRow}>
              <View
                style={[
                  styles.itemIconBadge,
                  {
                    backgroundColor: isDark
                      ? colors.surfaceSecondary
                      : '#ECFDF5',
                  },
                ]}
              >
                <MaterialCommunityIcons
                  color="#059669"
                  name="cash-multiple"
                  size={18}
                />
              </View>
              <View style={styles.currencyTextContainer}>
                <Text
                  accessibilityRole="header"
                  style={[styles.itemTitle, { color: colors.textPrimary }]}
                >
                  {language === 'id' ? 'Mata Uang Utama' : 'Base Currency'}
                </Text>
                <Text
                  style={[styles.itemSubtitle, { color: colors.textSecondary }]}
                >
                  {language === 'id'
                    ? 'Simbol & format tampilan transaksi'
                    : 'Transaction symbol & display formatting'}
                </Text>
              </View>
            </View>

            <View style={styles.currencyBadgeWrap}>
              <View
                style={[
                  styles.currencyPillBadge,
                  {
                    backgroundColor: isDark
                      ? colors.surfaceSecondary
                      : '#F8FAFC',
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={styles.currencyFlagEmoji}>
                  {SUPPORTED_CURRENCIES.find((c) => c.code === currencyCode)
                    ?.flag ?? '🌐'}
                </Text>
                <Text
                  style={[
                    styles.currencyBadgeText,
                    { color: colors.textPrimary },
                  ]}
                >
                  {currencyCode}{' '}
                  <Text style={{ color: colors.primary, fontWeight: '700' }}>
                    ({currencySymbol})
                  </Text>
                </Text>
                <MaterialCommunityIcons
                  color={colors.textSecondary}
                  name="chevron-right"
                  size={18}
                />
              </View>
            </View>
          </Pressable>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  addShortcutCardBtn: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  addShortcutCardText: {
    ...typography.metadata,
    fontWeight: '700',
  },
  previewAmountDisplay: {
    ...typography.body,
    fontSize: 14,
    fontWeight: '800',
  },
  previewContainer: {
    borderRadius: radius.md,
    borderWidth: 1,
    marginTop: spacing.xs,
    overflow: 'hidden',
    paddingBottom: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xs,
  },
  previewHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  previewTag: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  previewTagText: {
    ...typography.metadata,
    color: '#059669',
    fontSize: 11,
    fontWeight: '700',
  },
  resetRecommendedBtn: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 5,
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  resetRecommendedText: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '700',
  },
  shortcutActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  cardInnerDivider: {
    height: 1,
    width: '100%',
  },
  cardItemPadding: {
    gap: spacing.sm,
    padding: spacing.md,
  },
  currencyBadgeText: {
    ...typography.metadata,
    fontSize: 13,
    fontWeight: '800',
  },
  currencyBadgeWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencyFlagEmoji: {
    fontSize: 15,
  },
  currencyPillBadge: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
  },
  currencyRowButton: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  currencyTextContainer: {
    flex: 1,
  },
  groupedCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  iconTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  itemHeaderBetween: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  itemIconBadge: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  itemSubtitle: {
    ...typography.metadata,
    fontSize: 12,
  },
  itemTitle: {
    ...typography.sectionTitle,
    fontSize: 15,
    fontWeight: '700',
  },
  langFlagIcon: {
    fontSize: 18,
  },
  langOptionText: {
    ...typography.body,
    fontSize: 13,
    fontWeight: '600',
  },
  langOptionTextActive: {
    fontWeight: '800',
  },
  langPillOption: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1.5,
    flex: 1,
    flexDirection: 'row',
    gap: spacing.xs + 2,
    justifyContent: 'center',
    paddingVertical: spacing.sm + 2,
  },
  langPillOptionActive: {
    borderWidth: 2,
  },
  languagePillsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: 2,
  },
  resetActionLink: {
    ...typography.metadata,
    fontWeight: '700',
  },
  sectionGroup: {
    gap: spacing.xs,
  },
  sectionHeaderLabel: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    paddingHorizontal: spacing.xs,
  },
  shortcutChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: 2,
  },
  shortcutPillBadge: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
  },
  shortcutPillText: {
    ...typography.metadata,
    fontWeight: '700',
  },
  shortcutRemoveIcon: {
    padding: 1,
  },
  themeSegmentTab: {
    alignItems: 'center',
    borderRadius: radius.pill,
    flex: 1,
    flexDirection: 'row',
    gap: 4,
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  themeSegmentTabActive: {
    elevation: 2,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
  },
  themeSegmentTabText: {
    ...typography.metadata,
    fontSize: 12,
  },
  themeSegmentTrack: {
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 2,
    marginTop: 4,
    padding: 3,
  },
});

import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  SUPPORTED_CURRENCIES,
  type SupportedCurrencyCode,
} from '@/features/settings/settings-repository';
import type { Language, TranslationSchema } from '@/lib/i18n/translations';
import { formatShortcutLabel } from '@/lib/money';
import type { ThemeSetting } from '@/lib/theme/theme-context';
import { useTheme } from '@/lib/theme/theme-context';
import { BRAND_PRESETS, type BrandTheme } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type SettingsAppearanceCardProps = {
  brandTheme?: BrandTheme;
  currencyCode: SupportedCurrencyCode;
  currencySymbol: string;
  language: Language;
  onOpenCurrencyPicker: () => void;
  onOpenShortcutsModal: () => void;
  onSelectBrandTheme?: (brandTheme: BrandTheme) => void;
  onSelectLanguage: (lang: Language) => void;
  onSelectTheme: (theme: ThemeSetting) => void;
  shortcuts: readonly number[];
  t: TranslationSchema;
  themeSetting: ThemeSetting;
};

export const SettingsAppearanceCard = memo(function SettingsAppearanceCard({
  brandTheme = 'blue',
  currencyCode,
  currencySymbol,
  language,
  onOpenCurrencyPicker,
  onOpenShortcutsModal,
  onSelectBrandTheme,
  onSelectLanguage,
  onSelectTheme,
  shortcuts,
  t,
  themeSetting,
}: SettingsAppearanceCardProps) {
  const { colors, isDark } = useTheme();

  const activeCurrency = SUPPORTED_CURRENCIES.find(
    (c) => c.code === currencyCode,
  );

  const shortcutPreviewSummary = shortcuts
    .slice(0, 3)
    .map((amt) => formatShortcutLabel(amt, currencySymbol))
    .join(', ');

  return (
    <View style={styles.sectionGroup}>
      <Text
        style={[styles.sectionHeaderLabel, { color: colors.textSecondary }]}
      >
        {language === 'id'
          ? 'TAMPILAN & PREFERENSI'
          : 'APPEARANCE & PREFERENCES'}
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
          <View style={styles.iconTitleRow}>
            <View
              style={[
                styles.itemIconBadge,
                {
                  backgroundColor: isDark
                    ? colors.surfaceSecondary
                    : colors.primaryLight,
                },
              ]}
            >
              <MaterialCommunityIcons
                color={colors.primary}
                name="theme-light-dark"
                size={18}
              />
            </View>
            <View style={styles.headerTextWrap}>
              <Text
                accessibilityRole="header"
                style={[styles.itemTitle, { color: colors.textPrimary }]}
              >
                {t.settings.themeSection}
              </Text>
              <Text
                style={[styles.itemSubtitle, { color: colors.textSecondary }]}
              >
                {t.settings.themeDesc}
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
                  : colors.surfaceSecondary,
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
                          {
                            backgroundColor: colors.surface,
                            shadowColor: colors.shadow,
                          },
                        ]
                      : null,
                  ]}
                >
                  <MaterialCommunityIcons
                    color={isSelected ? colors.primary : colors.textSecondary}
                    name={item.icon}
                    size={15}
                  />
                  <Text
                    style={[
                      styles.themeSegmentTabText,
                      {
                        color: isSelected
                          ? colors.primary
                          : colors.textSecondary,
                        fontWeight: isSelected ? '700' : '500',
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
          style={[styles.cardInnerDivider, { backgroundColor: colors.border }]}
        />

        {/* 2. Brand Accent Theme Color */}
        <View style={styles.cardItemPadding}>
          <View style={styles.iconTitleRow}>
            <View
              style={[
                styles.itemIconBadge,
                {
                  backgroundColor: isDark
                    ? colors.surfaceSecondary
                    : colors.primaryLight,
                },
              ]}
            >
              <MaterialCommunityIcons
                color={colors.primary}
                name="palette-outline"
                size={18}
              />
            </View>
            <View style={styles.headerTextWrap}>
              <Text
                accessibilityRole="header"
                style={[styles.itemTitle, { color: colors.textPrimary }]}
              >
                {language === 'id' ? 'Warna Utama' : 'Primary Color'}
              </Text>
              <Text
                style={[styles.itemSubtitle, { color: colors.textSecondary }]}
              >
                {language === 'id'
                  ? 'Pilih warna untuk tombol utama dan status aktif'
                  : 'Choose the color for primary actions and active states'}
              </Text>
            </View>
          </View>

          {/* Color Swatches Grid */}
          <View style={styles.colorSwatchesGrid}>
            {(
              [
                { id: 'blue', name: 'Biru Modern' },
                { id: 'emerald', name: 'Emerald' },
                { id: 'indigo', name: 'Indigo' },
                { id: 'violet', name: 'Violet' },
                { id: 'amber', name: 'Amber' },
                { id: 'slate', name: 'Slate' },
              ] as const
            ).map((swatch) => {
              const isSelected = brandTheme === swatch.id;
              return (
                <Pressable
                  accessibilityLabel={`Pilih Warna ${swatch.name}`}
                  accessibilityRole="button"
                  key={swatch.id}
                  onPress={() => onSelectBrandTheme?.(swatch.id)}
                  style={[
                    styles.colorSwatchBtn,
                    {
                      backgroundColor: isSelected
                        ? isDark
                          ? colors.surfaceSecondary
                          : colors.background
                        : 'transparent',
                      borderColor: isSelected
                        ? BRAND_PRESETS[swatch.id].primary
                        : isDark
                          ? colors.border
                          : colors.border,
                    },
                    isSelected ? styles.colorSwatchBtnActive : null,
                  ]}
                >
                  <View
                    style={[
                      styles.colorSwatchCircle,
                      {
                        backgroundColor: BRAND_PRESETS[swatch.id].primary,
                      },
                    ]}
                  >
                    {isSelected ? (
                      <MaterialCommunityIcons
                        color={colors.onPrimary}
                        name="check"
                        size={12}
                      />
                    ) : null}
                  </View>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.colorSwatchName,
                      {
                        color: isSelected
                          ? colors.textPrimary
                          : colors.textSecondary,
                        fontWeight: isSelected ? '700' : '500',
                      },
                    ]}
                  >
                    {swatch.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View
          style={[styles.cardInnerDivider, { backgroundColor: colors.border }]}
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
                    : colors.primaryLight,
                },
              ]}
            >
              <MaterialCommunityIcons
                color={colors.primary}
                name="translate"
                size={18}
              />
            </View>
            <View style={styles.headerTextWrap}>
              <Text
                accessibilityRole="header"
                style={[styles.itemTitle, { color: colors.textPrimary }]}
              >
                {t.settings.languageSection}
              </Text>
              <Text
                style={[styles.itemSubtitle, { color: colors.textSecondary }]}
              >
                {t.settings.languageDesc}
              </Text>
            </View>
          </View>

          {/* 2 Pill Options */}
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
                    : colors.background,
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
                    ? [styles.langOptionTextActive, { color: colors.primary }]
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
                    : colors.background,
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
                    ? [styles.langOptionTextActive, { color: colors.primary }]
                    : null,
                ]}
              >
                {t.settings.langEnglish}
              </Text>
            </Pressable>
          </View>
        </View>

        <View
          style={[styles.cardInnerDivider, { backgroundColor: colors.border }]}
        />

        {/* 3. Base Currency Selection Row */}
        <View style={styles.cardItemPadding}>
          <Pressable
            accessibilityLabel="Pilih Mata Uang Utama"
            accessibilityRole="button"
            onPress={onOpenCurrencyPicker}
            style={styles.menuRowButton}
          >
            <View style={styles.iconTitleRow}>
              <View
                style={[
                  styles.itemIconBadge,
                  {
                    backgroundColor: isDark
                      ? colors.surfaceSecondary
                      : colors.incomeBackground,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  color={colors.positive}
                  name="cash-multiple"
                  size={18}
                />
              </View>
              <View style={styles.headerTextWrap}>
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
                    : 'Transaction symbol & formatting'}
                </Text>
              </View>
            </View>

            <View style={styles.rowRightBadgeWrap}>
              <View
                style={[
                  styles.currencyPillBadge,
                  {
                    backgroundColor: isDark
                      ? colors.surfaceSecondary
                      : colors.background,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={styles.currencyFlagEmoji}>
                  {activeCurrency?.flag ?? '🌐'}
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

        <View
          style={[styles.cardInnerDivider, { backgroundColor: colors.border }]}
        />

        {/* 4. Quick Amount Shortcuts Row */}
        <View style={styles.cardItemPadding}>
          <Pressable
            accessibilityLabel={t.settings.shortcutsSection}
            accessibilityRole="button"
            onPress={onOpenShortcutsModal}
            style={styles.menuRowButton}
          >
            <View style={styles.iconTitleRow}>
              <View
                style={[
                  styles.itemIconBadge,
                  {
                    backgroundColor: isDark
                      ? colors.surfaceSecondary
                      : colors.warningBackground,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  color={colors.warning}
                  name="flash"
                  size={18}
                />
              </View>
              <View style={styles.headerTextWrap}>
                <Text
                  accessibilityRole="header"
                  style={[styles.itemTitle, { color: colors.textPrimary }]}
                >
                  {t.settings.shortcutsSection}
                </Text>
                <Text
                  style={[styles.itemSubtitle, { color: colors.textSecondary }]}
                >
                  {shortcutPreviewSummary}... ({shortcuts.length}{' '}
                  {language === 'id' ? 'tombol' : 'chips'})
                </Text>
              </View>
            </View>

            <View style={styles.rowRightBadgeWrap}>
              <View
                style={[
                  styles.actionPillBadge,
                  {
                    backgroundColor: isDark
                      ? colors.surfaceSecondary
                      : colors.warningBackground,
                    borderColor: isDark ? colors.border : colors.warning,
                  },
                ]}
              >
                <Text
                  style={[styles.actionPillText, { color: colors.warning }]}
                >
                  {language === 'id' ? 'Sesuaikan' : 'Customize'}
                </Text>
                <MaterialCommunityIcons
                  color={colors.warning}
                  name="chevron-right"
                  size={16}
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
  actionPillBadge: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
  },
  actionPillText: {
    ...typography.metadata,
    fontSize: 12,
    fontWeight: '700',
  },
  cardInnerDivider: {
    height: 1,
    width: '100%',
  },
  cardItemPadding: {
    gap: spacing.sm,
    padding: spacing.md,
  },
  colorSwatchBtn: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
    width: '48%',
  },
  colorSwatchBtnActive: {
    borderWidth: 2,
  },
  colorSwatchCircle: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  colorSwatchesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs + 2,
    justifyContent: 'space-between',
    marginTop: 4,
  },
  colorSwatchName: {
    ...typography.metadata,
    fontSize: 12,
  },
  currencyBadgeText: {
    ...typography.metadata,
    fontSize: 13,
    fontWeight: '800',
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
  groupedCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  headerTextWrap: {
    flex: 1,
  },
  iconTitleRow: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  itemIconBadge: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 34,
    justifyContent: 'center',
    width: 34,
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
  menuRowButton: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rowRightBadgeWrap: {
    alignItems: 'center',
    justifyContent: 'center',
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

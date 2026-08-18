import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { memo, useCallback, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Screen } from '@/components/ui/screen';
import type { SupportedCurrencyCode } from '@/features/settings/settings-repository';
import { QuickShortcutsBar } from '@/features/transactions/components/quick-shortcuts-bar';
import type { TranslationSchema } from '@/lib/i18n/translations';
import { formatMoney, formatShortcutLabel } from '@/lib/money';
import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type ShortcutsModalProps = {
  currencyCode: SupportedCurrencyCode;
  currencySymbol: string;
  onClose: () => void;
  onOpenAddShortcut: () => void;
  onRemoveShortcut: (amount: number) => void;
  onResetShortcuts: () => void;
  shortcuts: readonly number[];
  t: TranslationSchema;
  visible: boolean;
};

export const ShortcutsModal = memo(function ShortcutsModal({
  currencyCode,
  currencySymbol,
  onClose,
  onOpenAddShortcut,
  onRemoveShortcut,
  onResetShortcuts,
  shortcuts,
  t,
  visible,
}: ShortcutsModalProps) {
  const { colors, isDark } = useTheme();
  const [previewAmount, setPreviewAmount] = useState(0);

  const handlePreviewAdd = useCallback((amount: number) => {
    setPreviewAmount((prev) => prev + amount);
  }, []);

  const handlePreviewReset = useCallback(() => {
    setPreviewAmount(0);
  }, []);

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
          <View style={styles.headerTitleRow}>
            <MaterialCommunityIcons
              color={colors.primary}
              name="flash"
              size={22}
            />
            <Text
              style={[styles.modalTitle, { color: colors.textPrimary }]}
            >
              {t.settings.shortcutsSection}
            </Text>
          </View>
          <Pressable
            accessibilityLabel="Close shortcut manager"
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
              {t.settings.shortcutsDesc}
            </Text>
          </View>

          {/* 1. Live Preview Section */}
          <View
            style={[
              styles.cardSection,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionBadge}>
                <MaterialCommunityIcons
                  color="#059669"
                  name="eye-outline"
                  size={14}
                />
                <Text style={styles.sectionBadgeText}>
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

            <Text
              style={[
                styles.previewHelpText,
                { color: colors.textSecondary },
              ]}
            >
              {t.settings.previewAmountLabel} Ketuk chip di bawah untuk mencoba respons tombol:
            </Text>

            <QuickShortcutsBar
              currencySymbol={currencySymbol}
              onAddIncrement={handlePreviewAdd}
              onReset={handlePreviewReset}
              quickShortcuts={shortcuts}
            />
          </View>

          {/* 2. Shortcuts Management Section */}
          <View
            style={[
              styles.cardSection,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.sectionHeaderRow}>
              <Text
                style={[
                  styles.sectionCardTitle,
                  { color: colors.textPrimary },
                ]}
              >
                {t.settings.editShortcuts}
              </Text>
              <Text
                style={[
                  styles.countBadgeText,
                  { color: colors.textSecondary },
                ]}
              >
                {shortcuts.length}/8
              </Text>
            </View>

            {/* Chips Grid */}
            <View style={styles.chipsWrap}>
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

            {/* Action Buttons */}
            <View style={styles.actionsRow}>
              {shortcuts.length < 8 ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={onOpenAddShortcut}
                  style={[
                    styles.addShortcutBtn,
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
                      styles.addShortcutText,
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
        </ScrollView>
      </Screen>
    </Modal>
  );
});

const styles = StyleSheet.create({
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  addShortcutBtn: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    paddingVertical: spacing.sm + 2,
  },
  addShortcutText: {
    ...typography.metadata,
    fontWeight: '700',
  },
  cardSection: {
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginVertical: 4,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  countBadgeText: {
    ...typography.metadata,
    fontSize: 12,
    fontWeight: '600',
  },
  headerTitleRow: {
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
  previewAmountDisplay: {
    ...typography.body,
    fontSize: 15,
    fontWeight: '900',
  },
  previewHelpText: {
    ...typography.metadata,
    fontSize: 11,
    marginTop: -2,
  },
  resetRecommendedBtn: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 5,
    justifyContent: 'center',
    paddingVertical: spacing.sm + 2,
  },
  resetRecommendedText: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '700',
  },
  scrollContent: {
    gap: spacing.md,
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  sectionBadge: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  sectionBadgeText: {
    ...typography.metadata,
    color: '#059669',
    fontSize: 11,
    fontWeight: '700',
  },
  sectionCardTitle: {
    ...typography.sectionTitle,
    fontSize: 14,
    fontWeight: '700',
  },
  sectionHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
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
});

import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { memo } from 'react';
import {
  Animated,
  Modal,
  PanResponderInstance,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import type { TranslationSchema } from '@/lib/i18n/translations';
import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type HomeDisplaySettingsModalProps = {
  backdropOpacity: Animated.AnimatedInterpolation<number> | Animated.Value;
  hideBalance: boolean;
  onCustomizeQuickLog: () => void;
  onHideBalanceChange: (val: boolean) => void;
  onShowQuickLogChange: (val: boolean) => void;
  onShowWalletChipsChange: (val: boolean) => void;
  onClose: () => void;
  panResponder: PanResponderInstance;
  panY: Animated.Value;
  showQuickLog: boolean;
  showWalletChips: boolean;
  t: TranslationSchema;
  visible: boolean;
};

export const HomeDisplaySettingsModal = memo(function HomeDisplaySettingsModal({
  backdropOpacity,
  hideBalance,
  onCustomizeQuickLog,
  onHideBalanceChange,
  onShowQuickLogChange,
  onShowWalletChipsChange,
  onClose,
  panResponder,
  panY,
  showQuickLog,
  showWalletChips,
  t,
  visible,
}: HomeDisplaySettingsModalProps) {
  const { colors, isDark } = useTheme();

  return (
    <Modal
      animationType="none"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <View style={styles.modalRoot}>
        {/* Static Fade Backdrop */}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            styles.modalBackdrop,
            { opacity: backdropOpacity },
          ]}
        >
          <Pressable
            accessibilityLabel={t.home.closeDisplaySettings}
            accessibilityRole="button"
            onPress={onClose}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        {/* Interactive Bottom Sheet */}
        <Animated.View
          style={[
            styles.sheetContainer,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              transform: [{ translateY: panY }],
            },
          ]}
        >
          {/* Gesture Drag Handle */}
          <View {...panResponder.panHandlers} style={styles.handleTouchable}>
            <View
              style={[
                styles.dragHandle,
                {
                  backgroundColor: isDark
                    ? 'rgba(255, 255, 255, 0.25)'
                    : '#CBD5E1',
                },
              ]}
            />
          </View>

          {/* Header */}
          <View style={styles.headerRow}>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
              {t.home.displaySettingsTitle}
            </Text>
            <Pressable
              accessibilityLabel={t.common.close}
              accessibilityRole="button"
              hitSlop={8}
              onPress={onClose}
              style={styles.closeBtn}
            >
              <MaterialCommunityIcons
                color={colors.textSecondary}
                name="close"
                size={20}
              />
            </Pressable>
          </View>

          {/* Options List */}
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Section Header */}
            <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>
              {t.home.homeDisplaySection}
            </Text>

            {/* 1. Toggle Daftar Dompet */}
            <View
              style={[
                styles.settingRow,
                {
                  backgroundColor: isDark ? colors.surfaceSecondary : '#F8FAFC',
                  borderColor: colors.border,
                },
              ]}
            >
              <View
                style={[
                  styles.iconBox,
                  {
                    backgroundColor: isDark
                      ? 'rgba(37, 99, 235, 0.2)'
                      : '#EFF6FF',
                  },
                ]}
              >
                <MaterialCommunityIcons
                  color={colors.primary}
                  name="wallet-outline"
                  size={20}
                />
              </View>
              <View style={styles.settingTextWrap}>
                <Text
                  style={[styles.settingTitle, { color: colors.textPrimary }]}
                >
                  {t.home.walletList}
                </Text>
                <Text
                  style={[styles.settingDesc, { color: colors.textSecondary }]}
                >
                  {t.home.walletListDescription}
                </Text>
              </View>
              <Switch
                onValueChange={onShowWalletChipsChange}
                thumbColor="#FFFFFF"
                trackColor={{
                  false: isDark ? colors.surfaceSecondary : '#CBD5E1',
                  true: colors.primary,
                }}
                value={showWalletChips}
              />
            </View>

            {/* 2. Toggle Catat Cepat */}
            <View
              style={[
                styles.settingRow,
                {
                  backgroundColor: isDark ? colors.surfaceSecondary : '#F8FAFC',
                  borderColor: colors.border,
                },
              ]}
            >
              <View
                style={[
                  styles.iconBox,
                  {
                    backgroundColor: isDark
                      ? 'rgba(234, 179, 8, 0.2)'
                      : '#FEF9C3',
                  },
                ]}
              >
                <MaterialCommunityIcons
                  color={isDark ? '#FACC15' : '#CA8A04'}
                  name="lightning-bolt"
                  size={20}
                />
              </View>
              <View style={styles.settingTextWrap}>
                <Text
                  style={[styles.settingTitle, { color: colors.textPrimary }]}
                >
                  {t.home.quickLogTitle}
                </Text>
                <Text
                  style={[styles.settingDesc, { color: colors.textSecondary }]}
                >
                  {t.home.quickLogDescription}
                </Text>
              </View>
              <Switch
                onValueChange={onShowQuickLogChange}
                thumbColor="#FFFFFF"
                trackColor={{
                  false: isDark ? colors.surfaceSecondary : '#CBD5E1',
                  true: colors.primary,
                }}
                value={showQuickLog}
              />
            </View>

            {/* 3. Toggle Sensor Saldo */}
            <View
              style={[
                styles.settingRow,
                {
                  backgroundColor: isDark ? colors.surfaceSecondary : '#F8FAFC',
                  borderColor: colors.border,
                },
              ]}
            >
              <View
                style={[
                  styles.iconBox,
                  {
                    backgroundColor: isDark
                      ? 'rgba(168, 85, 247, 0.2)'
                      : '#F3E8FF',
                  },
                ]}
              >
                <MaterialCommunityIcons
                  color={isDark ? '#C084FC' : '#9333EA'}
                  name={hideBalance ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                />
              </View>
              <View style={styles.settingTextWrap}>
                <Text
                  style={[styles.settingTitle, { color: colors.textPrimary }]}
                >
                  {t.home.balancePrivacy}
                </Text>
                <Text
                  style={[styles.settingDesc, { color: colors.textSecondary }]}
                >
                  {t.home.balancePrivacyDescription}
                </Text>
              </View>
              <Switch
                onValueChange={onHideBalanceChange}
                thumbColor="#FFFFFF"
                trackColor={{
                  false: isDark ? colors.surfaceSecondary : '#CBD5E1',
                  true: colors.primary,
                }}
                value={hideBalance}
              />
            </View>

            {/* Section Header */}
            <Text
              style={[
                styles.sectionHeader,
                { color: colors.textMuted, marginTop: spacing.md },
              ]}
            >
              {t.home.customizationSection}
            </Text>

            {/* Button to customize quick log categories */}
            <Pressable
              accessibilityLabel={t.home.quickLogModalTitle}
              accessibilityRole="button"
              onPress={() => {
                onClose();
                setTimeout(() => onCustomizeQuickLog(), 200);
              }}
              style={({ pressed }) => [
                styles.actionButton,
                {
                  backgroundColor: isDark ? colors.surfaceSecondary : '#F8FAFC',
                  borderColor: colors.border,
                },
                pressed ? { opacity: 0.75 } : null,
              ]}
            >
              <View style={styles.actionLeftWrap}>
                <MaterialCommunityIcons
                  color={colors.primary}
                  name="tune-variant"
                  size={20}
                />
                <Text
                  style={[
                    styles.actionButtonText,
                    { color: colors.textPrimary },
                  ]}
                >
                  {t.home.quickLogModalTitle}
                </Text>
              </View>
              <MaterialCommunityIcons
                color={colors.textSecondary}
                name="chevron-right"
                size={20}
              />
            </Pressable>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  actionButton: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  actionButtonText: {
    ...typography.body,
    fontSize: 14,
    fontWeight: '600',
  },
  actionLeftWrap: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  closeBtn: {
    padding: 4,
  },
  dragHandle: {
    borderRadius: radius.pill,
    height: 4,
    width: 38,
  },
  handleTouchable: {
    alignItems: 'center',
    paddingVertical: spacing.xs + 2,
    width: '100%',
  },
  headerRow: {
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: 'rgba(150, 150, 150, 0.1)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  headerTitle: {
    ...typography.sectionTitle,
    fontSize: 17,
    fontWeight: '800',
  },
  iconBox: {
    alignItems: 'center',
    borderRadius: radius.md,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  modalBackdrop: {
    backgroundColor: '#000000',
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  scrollContent: {
    gap: spacing.sm,
    padding: spacing.lg,
    paddingBottom: spacing.xxl + 20,
  },
  sectionHeader: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  settingDesc: {
    ...typography.metadata,
    fontSize: 11,
    marginTop: 2,
  },
  settingRow: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
  },
  settingTextWrap: {
    flex: 1,
  },
  settingTitle: {
    ...typography.body,
    fontSize: 14,
    fontWeight: '700',
  },
  sheetContainer: {
    borderTopLeftRadius: radius.lg + 8,
    borderTopRightRadius: radius.lg + 8,
    borderTopWidth: 1,
    maxHeight: '80%',
  },
});

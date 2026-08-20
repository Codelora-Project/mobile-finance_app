import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useLanguage } from '@/lib/i18n/language-context';
import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type UndoToastBannerProps = {
  canUndo: boolean;
  isUndoing: boolean;
  message: string | null;
  onClose: () => void;
  onUndo: () => void;
  visible: boolean;
};

export const UndoToastBanner = memo(function UndoToastBanner({
  canUndo,
  isUndoing,
  message,
  onClose,
  onUndo,
  visible,
}: UndoToastBannerProps) {
  const { colors } = useTheme();
  const { language } = useLanguage();

  if (!visible || !message) return null;

  return (
    <View
      style={[
        styles.floatingUndoToast,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          shadowColor: colors.textPrimary,
        },
      ]}
    >
      <View style={styles.undoToastLeft}>
        <View
          style={[
            styles.successIconBadge,
            {
              backgroundColor: colors.incomeBackground,
            },
          ]}
        >
          <MaterialCommunityIcons
            color={colors.positive}
            name="check"
            size={14}
          />
        </View>
        <Text
          accessibilityLiveRegion="polite"
          numberOfLines={1}
          style={[styles.undoToastText, { color: colors.textPrimary }]}
        >
          {message}
        </Text>
      </View>

      {canUndo ? (
        <Pressable
          accessibilityLabel={
            language === 'id' ? 'Batalkan tindakan' : 'Undo action'
          }
          accessibilityRole="button"
          disabled={isUndoing}
          hitSlop={8}
          onPress={onUndo}
          style={({ pressed }) => [
            styles.undoButton,
            {
              backgroundColor: colors.surfaceSecondary,
              borderColor: colors.border,
            },
            pressed ? { opacity: 0.75 } : null,
          ]}
        >
          <MaterialCommunityIcons
            color={colors.primary}
            name="undo-variant"
            size={14}
          />
          <Text style={[styles.undoButtonText, { color: colors.primary }]}>
            {language === 'id' ? 'Batalkan' : 'Undo'}
          </Text>
        </Pressable>
      ) : null}
      <Pressable
        accessibilityLabel={
          language === 'id' ? 'Tutup notifikasi' : 'Dismiss notification'
        }
        accessibilityRole="button"
        hitSlop={10}
        onPress={onClose}
        style={styles.closeButton}
      >
        <MaterialCommunityIcons
          color={colors.textMuted}
          name="close"
          size={16}
        />
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  floatingUndoToast: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    elevation: 8,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
    left: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    position: 'absolute',
    right: spacing.md,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    top: spacing.md + 4,
    zIndex: 999,
  },
  closeButton: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  successIconBadge: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  undoButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
  },
  undoButtonText: {
    ...typography.metadata,
    fontSize: 12,
    fontWeight: '700',
  },
  undoToastLeft: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: spacing.xs + 4,
    marginRight: spacing.xs,
  },
  undoToastText: {
    ...typography.metadata,
    fontSize: 13,
    fontWeight: '600',
  },
});

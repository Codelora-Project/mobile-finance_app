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
  const { isDark } = useTheme();
  const { language } = useLanguage();

  if (!visible || !message) return null;

  return (
    <View
      style={[
        styles.floatingUndoToast,
        {
          backgroundColor: isDark ? '#1E293B' : '#0F172A',
          borderColor: isDark ? '#334155' : '#1E293B',
        },
      ]}
    >
      <View style={styles.undoToastLeft}>
        <MaterialCommunityIcons
          color="#38BDF8"
          name="information-outline"
          size={20}
        />
        <Text
          accessibilityLiveRegion="polite"
          numberOfLines={1}
          style={styles.undoToastText}
        >
          {message}
        </Text>
      </View>

      {canUndo ? (
        <Pressable
          accessibilityLabel="Undo action"
          accessibilityRole="button"
          disabled={isUndoing}
          hitSlop={8}
          onPress={onUndo}
          style={({ pressed }) => [
            styles.undoButton,
            pressed ? { opacity: 0.75 } : null,
          ]}
        >
          <MaterialCommunityIcons
            color="#FBBF24"
            name="undo-variant"
            size={16}
          />
          <Text style={styles.undoButtonText}>
            {language === 'id' ? 'BATALKAN' : 'UNDO'}
          </Text>
        </Pressable>
      ) : null}

      <Pressable
        accessibilityLabel="Close notification"
        accessibilityRole="button"
        hitSlop={8}
        onPress={onClose}
        style={styles.closeToastBtn}
      >
        <MaterialCommunityIcons color="#94A3B8" name="close" size={18} />
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  floatingUndoToast: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    bottom: spacing.lg,
    elevation: 8,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
    left: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    position: 'absolute',
    right: spacing.md,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    zIndex: 999,
  },
  undoToastLeft: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: spacing.xs + 2,
    marginRight: spacing.xs,
  },
  undoToastText: {
    ...typography.metadata,
    color: '#F8FAFC',
    flex: 1,
    fontWeight: '600',
  },
  undoButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    borderColor: 'rgba(251, 191, 36, 0.4)',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  undoButtonText: {
    ...typography.metadata,
    color: '#FBBF24',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  closeToastBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
});

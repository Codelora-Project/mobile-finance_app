import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { memo } from 'react';
import {
  Animated,
  Modal,
  PanResponderInstance,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { getCategoryMeta } from '@/features/categories/category-meta';
import type { Category } from '@/features/categories/category-repository';
import type { TranslationSchema } from '@/lib/i18n/translations';
import { useTheme } from '@/lib/theme/theme-context';
import { fixedSemanticColors } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type HomeQuickLogModalProps = {
  allCategories: readonly Category[];
  backdropOpacity: Animated.AnimatedInterpolation<number> | Animated.Value;
  onClose: () => void;
  onReset: () => void;
  onSave: () => void;
  onToggleCategory: (id: number) => void;
  panResponder: PanResponderInstance;
  panY: Animated.Value;
  selectedIds: readonly number[];
  t: TranslationSchema;
  visible: boolean;
};

export const HomeQuickLogModal = memo(function HomeQuickLogModal({
  allCategories,
  backdropOpacity,
  onClose,
  onReset,
  onSave,
  onToggleCategory,
  panResponder,
  panY,
  selectedIds,
  t,
  visible,
}: HomeQuickLogModalProps) {
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
            {
              opacity: backdropOpacity,
            },
          ]}
        >
          <Pressable
            accessibilityLabel={t.common.close}
            onPress={onClose}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        {/* Animated Sliding Bottom Sheet */}
        <Animated.View
          style={[
            styles.modalSheet,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              transform: [{ translateY: panY }],
            },
          ]}
        >
          {/* Draggable Header */}
          <View
            {...panResponder.panHandlers}
            style={styles.modalDragHeaderArea}
          >
            <View
              style={[
                styles.modalDragHandle,
                { backgroundColor: colors.border },
              ]}
            />
            <View style={styles.modalHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text
                  style={[styles.modalTitle, { color: colors.textPrimary }]}
                >
                  {t.home.quickLogModalTitle}
                </Text>
                <Text
                  style={[
                    styles.modalSubtitle,
                    { color: colors.textSecondary },
                  ]}
                >
                  {t.home.quickLogModalDesc}
                </Text>
              </View>
              <Pressable
                accessibilityLabel={t.common.close}
                accessibilityRole="button"
                hitSlop={8}
                onPress={onClose}
                style={styles.modalCloseBtn}
              >
                <MaterialCommunityIcons
                  color={colors.textSecondary}
                  name="close"
                  size={20}
                />
              </Pressable>
            </View>
          </View>

          {/* Categories List */}
          <ScrollView
            contentContainerStyle={styles.categorySelectList}
            showsVerticalScrollIndicator={false}
          >
            {allCategories.map((cat) => {
              const isSelected = selectedIds.includes(cat.id);
              const meta = getCategoryMeta(cat.name, 'expense', isDark);

              return (
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isSelected }}
                  key={cat.id}
                  onPress={() => onToggleCategory(cat.id)}
                  style={({ pressed }) => [
                    styles.categorySelectRow,
                    {
                      backgroundColor: isSelected
                        ? colors.primaryLight
                        : isDark
                          ? colors.surfaceSecondary
                          : colors.surfaceMuted,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={styles.categorySelectLeft}>
                    <View
                      style={[
                        styles.categorySelectIcon,
                        { backgroundColor: meta.backgroundColor },
                      ]}
                    >
                      <MaterialCommunityIcons
                        color={meta.color}
                        name={meta.icon}
                        size={20}
                      />
                    </View>
                    <Text
                      style={[
                        styles.categorySelectName,
                        {
                          color: isSelected
                            ? colors.primary
                            : colors.textPrimary,
                          fontWeight: isSelected ? '700' : '600',
                        },
                      ]}
                    >
                      {cat.name}
                    </Text>
                  </View>

                  <MaterialCommunityIcons
                    color={isSelected ? colors.primary : colors.textSecondary}
                    name={
                      isSelected
                        ? 'checkbox-marked-circle'
                        : 'checkbox-blank-circle-outline'
                    }
                    size={22}
                  />
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Actions: Reset and Save */}
          <View style={styles.modalActionsRow}>
            <Pressable
              accessibilityRole="button"
              onPress={onReset}
              style={[styles.modalResetBtn, { borderColor: colors.border }]}
            >
              <Text
                style={[
                  styles.modalResetBtnText,
                  { color: colors.textSecondary },
                ]}
              >
                {t.home.quickLogModalReset}
              </Text>
            </Pressable>

            <View style={{ flex: 1 }}>
              <AppButton
                label={t.home.quickLogModalSave}
                onPress={onSave}
                variant="primary"
              />
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  categorySelectIcon: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  categorySelectLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  categorySelectList: {
    gap: spacing.xs,
    paddingBottom: spacing.sm,
  },
  categorySelectName: {
    ...typography.body,
  },
  categorySelectRow: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1.5,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  modalActionsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    paddingTop: spacing.xs,
  },
  modalBackdrop: {
    backgroundColor: fixedSemanticColors.modalBackdrop,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalDragHandle: {
    borderRadius: radius.pill,
    height: 4,
    marginBottom: spacing.xs,
    width: 36,
  },
  modalDragHeaderArea: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingBottom: spacing.xs,
  },
  modalHeaderRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalResetBtn: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  modalResetBtnText: {
    ...typography.body,
    fontWeight: '700',
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderTopWidth: 1,
    elevation: 16,
    gap: spacing.sm,
    maxHeight: '75%',
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  modalSubtitle: {
    ...typography.metadata,
    fontSize: 12,
  },
  modalTitle: {
    ...typography.sectionTitle,
    fontSize: 16,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.96 }],
  },
});

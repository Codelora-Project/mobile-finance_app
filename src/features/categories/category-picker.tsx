import { useSQLiteContext } from 'expo-sqlite';
import { useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import {
  listCategories,
  type Category,
  type CategoryType,
} from '@/features/categories/category-repository';
import { usePickerData } from '@/lib/use-picker-data';
import { useLanguage } from '@/lib/i18n/language-context';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

type CategoryPickerProps = {
  onSelect: (category: Category) => void;
  selectedId?: number | null;
  type: CategoryType;
};

export function CategoryPicker({
  onSelect,
  selectedId,
  type,
}: CategoryPickerProps) {
  const database = useSQLiteContext();
  const { t } = useLanguage();
  const loadCategories = useCallback(
    () => listCategories(database, type),
    [database, type],
  );
  const {
    error,
    items: categories,
    loading,
    reload,
  } = usePickerData({
    diagnosticLabel: 'Category picker',
    load: loadCategories,
    resourceKey: type,
  });

  function retryLoad() {
    void reload();
  }

  if (loading) {
    return (
      <View accessibilityLiveRegion="polite" style={styles.state}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.stateText}>{t.categories.loading}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View accessibilityLiveRegion="assertive" style={styles.state}>
        <Text style={styles.error}>{error}</Text>
        <AppButton
          label={t.common.tryAgain}
          onPress={retryLoad}
          variant="secondary"
        />
      </View>
    );
  }

  return (
    <FlatList
      data={categories}
      keyExtractor={(category) => String(category.id)}
      ListEmptyComponent={
        <Text style={styles.stateText}>
          {type === 'expense'
            ? t.categories.emptyExpense
            : t.categories.emptyIncome}
        </Text>
      }
      renderItem={({ item }) => {
        const selected = item.id === selectedId;
        return (
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            onPress={() => onSelect(item)}
            style={({ pressed }) => [
              styles.row,
              selected ? styles.selectedRow : null,
              pressed ? styles.pressed : null,
            ]}
          >
            <View style={styles.rowText}>
              <Text style={styles.name}>{item.name}</Text>
              {item.isDefault ? (
                <Text style={styles.metadata}>{t.common.defaultLabel}</Text>
              ) : null}
            </View>
            <Text
              style={selected ? styles.selectedMark : styles.unselectedMark}
            >
              {selected ? t.common.selected : t.common.select}
            </Text>
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  state: {
    alignItems: 'center',
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 160,
    padding: spacing.lg,
  },
  stateText: {
    color: colors.textSecondary,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
    textAlign: 'center',
  },
  error: {
    color: colors.destructive,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
    textAlign: 'center',
  },
  row: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    minHeight: 64,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  selectedRow: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.sm,
  },
  pressed: {
    opacity: 0.7,
  },
  rowText: {
    flex: 1,
  },
  name: {
    color: colors.textPrimary,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
  },
  metadata: {
    color: colors.textSecondary,
    fontSize: typography.metadata.fontSize,
    lineHeight: typography.metadata.lineHeight,
  },
  selectedMark: {
    color: colors.primary,
    fontSize: typography.secondary.fontSize,
    fontWeight: '600',
  },
  unselectedMark: {
    color: colors.textSecondary,
    fontSize: typography.secondary.fontSize,
  },
});

import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
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
import { mapError } from '@/lib/errors';
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
  const [categories, setCategories] = useState<readonly Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadedType, setLoadedType] = useState<CategoryType | null>(null);
  const [loading, setLoading] = useState(true);

  const loadCategories = useCallback(async () => {
    try {
      const nextCategories = await listCategories(database, type);
      setCategories(nextCategories);
      setError(null);
      setLoadedType(type);
    } catch (caughtError) {
      if (__DEV__) {
        console.error(
          'Category picker could not load categories.',
          caughtError,
        );
      }
      setError(mapError(caughtError, 'DATABASE_WRITE_FAILED').message);
    } finally {
      setLoading(false);
    }
  }, [database, type]);

  useEffect(() => {
    let active = true;
    listCategories(database, type)
      .then((nextCategories) => {
        if (active) {
          setCategories(nextCategories);
          setError(null);
          setLoadedType(type);
        }
      })
      .catch((caughtError: unknown) => {
        if (__DEV__) {
          console.error(
            'Category picker could not load categories.',
            caughtError,
          );
        }
        if (active) {
          setError(mapError(caughtError, 'DATABASE_WRITE_FAILED').message);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [database, type]);

  function retryLoad() {
    setError(null);
    setLoading(true);
    void loadCategories();
  }

  if (loading || loadedType !== type) {
    return (
      <View accessibilityLiveRegion="polite" style={styles.state}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.stateText}>Loading categories…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View accessibilityLiveRegion="assertive" style={styles.state}>
        <Text style={styles.error}>{error}</Text>
        <AppButton label="Try again" onPress={retryLoad} variant="secondary" />
      </View>
    );
  }

  return (
    <FlatList
      data={categories}
      keyExtractor={(category) => String(category.id)}
      ListEmptyComponent={
        <Text style={styles.stateText}>No {type} categories available.</Text>
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
                <Text style={styles.metadata}>Default</Text>
              ) : null}
            </View>
            <Text
              style={selected ? styles.selectedMark : styles.unselectedMark}
            >
              {selected ? 'Selected' : 'Select'}
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

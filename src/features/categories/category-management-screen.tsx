import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { AppInput } from '@/components/ui/app-input';
import { Screen } from '@/components/ui/screen';
import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
  type Category,
  type CategoryType,
} from '@/features/categories/category-repository';
import { isCodedError, mapError } from '@/lib/errors';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

type EditorState = {
  category: Category | null;
  type: CategoryType;
};

function getOperationMessage(error: unknown) {
  if (isCodedError(error) && error.code === 'VALIDATION_FAILED') {
    return error.message;
  }
  return mapError(error, 'DATABASE_WRITE_FAILED').message;
}

export function CategoryManagementScreen() {
  const database = useSQLiteContext();
  const router = useRouter();
  const [categories, setCategories] = useState<readonly Category[]>([]);
  const [selectedType, setSelectedType] = useState<CategoryType>('expense');
  const [loading, setLoading] = useState(true);
  const [screenError, setScreenError] = useState<string | null>(null);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [name, setName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadCategories = useCallback(async () => {
    try {
      const nextCategories = await listCategories(database, selectedType);
      setCategories(nextCategories);
      setScreenError(null);
    } catch (error) {
      if (__DEV__) {
        console.error('Category management could not load categories.', error);
      }
      setScreenError(mapError(error, 'DATABASE_WRITE_FAILED').message);
    } finally {
      setLoading(false);
    }
  }, [database, selectedType]);

  useEffect(() => {
    let active = true;
    listCategories(database, selectedType)
      .then((nextCategories) => {
        if (active) {
          setCategories(nextCategories);
          setScreenError(null);
        }
      })
      .catch((error: unknown) => {
        if (__DEV__) {
          console.error(
            'Category management could not load categories.',
            error,
          );
        }
        if (active) {
          setScreenError(mapError(error, 'DATABASE_WRITE_FAILED').message);
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
  }, [database, selectedType]);

  function retryLoad() {
    setScreenError(null);
    setLoading(true);
    void loadCategories();
  }

  function selectType(type: CategoryType) {
    if (type !== selectedType) {
      setScreenError(null);
      setCategories([]);
      setLoading(true);
      setSelectedType(type);
    }
  }

  function openAddEditor() {
    setEditor({ category: null, type: selectedType });
    setName('');
    setFormError(null);
  }

  function openEditEditor(category: Category) {
    setEditor({ category, type: category.type });
    setName(category.name);
    setFormError(null);
  }

  function closeEditor() {
    if (!saving) {
      setEditor(null);
      setFormError(null);
    }
  }

  async function saveCategory() {
    if (!editor || saving) {
      return;
    }
    setFormError(null);
    setSaving(true);
    try {
      if (editor.category) {
        await updateCategory(database, editor.category.id, { name });
      } else {
        await createCategory(database, { name, type: editor.type });
      }
      setEditor(null);
      await loadCategories();
    } catch (error) {
      if (__DEV__ && !isCodedError(error)) {
        console.error('Category could not be saved.', error);
      }
      setFormError(getOperationMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete(category: Category) {
    if (deletingId !== null) {
      return;
    }
    setScreenError(null);
    setDeletingId(category.id);
    try {
      await deleteCategory(database, category.id);
      await loadCategories();
    } catch (error) {
      if (__DEV__ && !isCodedError(error)) {
        console.error('Category could not be deleted.', error);
      }
      setScreenError(getOperationMessage(error));
    } finally {
      setDeletingId(null);
    }
  }

  function requestDelete(category: Category) {
    Alert.alert(
      'Delete category?',
      `Transactions using ${category.name} will be moved to the ${category.type} Other category.`,
      [
        { style: 'cancel', text: 'Cancel' },
        {
          onPress: () => void confirmDelete(category),
          style: 'destructive',
          text: 'Delete',
        },
      ],
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <AppButton label="Back" onPress={() => router.back()} variant="ghost" />
        <Text accessibilityRole="header" style={styles.title}>
          Categories
        </Text>
        <AppButton label="Add" onPress={openAddEditor} variant="ghost" />
      </View>

      <View accessibilityRole="tablist" style={styles.tabs}>
        {(['expense', 'income'] as const).map((type) => {
          const selected = selectedType === type;
          return (
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              key={type}
              onPress={() => selectType(type)}
              style={[styles.tab, selected ? styles.selectedTab : null]}
            >
              <Text
                style={selected ? styles.selectedTabLabel : styles.tabLabel}
              >
                {type === 'expense' ? 'Expense' : 'Income'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {screenError ? (
        <View accessibilityLiveRegion="assertive" style={styles.errorBanner}>
          <Text style={styles.errorText}>{screenError}</Text>
          <AppButton label="Try again" onPress={retryLoad} variant="ghost" />
        </View>
      ) : null}

      {loading ? (
        <View accessibilityLiveRegion="polite" style={styles.loadingState}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.secondaryText}>Loading categories…</Text>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.listContent}
          data={categories}
          keyExtractor={(category) => String(category.id)}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No categories</Text>
              <Text style={styles.secondaryText}>
                Add a {selectedType} category to get started.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={styles.rowText}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.metadata}>
                  {item.isFallback
                    ? 'Default · Fallback'
                    : item.isDefault
                      ? 'Default'
                      : 'Custom'}
                </Text>
              </View>
              {!item.isDefault ? (
                <View style={styles.actions}>
                  <AppButton
                    label="Edit"
                    onPress={() => openEditEditor(item)}
                    variant="ghost"
                  />
                  <AppButton
                    disabled={deletingId !== null}
                    label={deletingId === item.id ? 'Deleting…' : 'Delete'}
                    onPress={() => requestDelete(item)}
                    variant="destructive"
                  />
                </View>
              ) : null}
            </View>
          )}
        />
      )}

      <Modal
        animationType="slide"
        onRequestClose={closeEditor}
        presentationStyle="pageSheet"
        visible={editor !== null}
      >
        <Screen style={styles.editorScreen}>
          <Text accessibilityRole="header" style={styles.title}>
            {editor?.category ? 'Edit category' : 'Add category'}
          </Text>

          {!editor?.category ? (
            <View>
              <Text style={styles.fieldLabel}>Type</Text>
              <View style={styles.editorTypeRow}>
                {(['expense', 'income'] as const).map((type) => {
                  const selected = editor?.type === type;
                  return (
                    <Pressable
                      accessibilityRole="radio"
                      accessibilityState={{ checked: selected }}
                      key={type}
                      onPress={() =>
                        setEditor((current) =>
                          current ? { ...current, type } : current,
                        )
                      }
                      style={[
                        styles.typeOption,
                        selected ? styles.selectedTypeOption : null,
                      ]}
                    >
                      <Text
                        style={
                          selected
                            ? styles.selectedTypeLabel
                            : styles.typeOptionLabel
                        }
                      >
                        {type === 'expense' ? 'Expense' : 'Income'}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : (
            <Text style={styles.secondaryText}>
              Type: {editor.type === 'expense' ? 'Expense' : 'Income'}
            </Text>
          )}

          <AppInput
            autoFocus
            error={formError}
            label="Category name"
            maxLength={40}
            onChangeText={setName}
            placeholder="e.g. Pet care"
            returnKeyType="done"
            value={name}
          />

          <View style={styles.editorActions}>
            <AppButton
              disabled={saving}
              label="Cancel"
              onPress={closeEditor}
              variant="secondary"
            />
            <AppButton
              label="Save category"
              loading={saving}
              onPress={saveCategory}
            />
          </View>
        </Screen>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.pageTitle.fontSize,
    fontWeight: typography.pageTitle.fontWeight,
    lineHeight: typography.pageTitle.lineHeight,
  },
  tabs: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    padding: spacing.xs,
  },
  tab: {
    alignItems: 'center',
    borderRadius: radius.sm,
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
  },
  selectedTab: {
    backgroundColor: colors.surface,
  },
  tabLabel: {
    color: colors.textSecondary,
    fontSize: typography.body.fontSize,
  },
  selectedTabLabel: {
    color: colors.primary,
    fontSize: typography.body.fontSize,
    fontWeight: '600',
  },
  errorBanner: {
    alignItems: 'center',
    backgroundColor: '#FEF3F2',
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    padding: spacing.sm,
  },
  errorText: {
    color: colors.destructive,
    fontSize: typography.secondary.fontSize,
    lineHeight: typography.secondary.lineHeight,
    textAlign: 'center',
  },
  loadingState: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
    justifyContent: 'center',
  },
  listContent: {
    flexGrow: 1,
    padding: spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    minHeight: 320,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: typography.sectionTitle.fontSize,
    fontWeight: typography.sectionTitle.fontWeight,
    lineHeight: typography.sectionTitle.lineHeight,
  },
  secondaryText: {
    color: colors.textSecondary,
    fontSize: typography.secondary.fontSize,
    lineHeight: typography.secondary.lineHeight,
    textAlign: 'center',
  },
  row: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    minHeight: 72,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
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
  actions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  editorScreen: {
    gap: spacing.lg,
    padding: spacing.lg,
  },
  fieldLabel: {
    color: colors.textPrimary,
    fontSize: typography.secondary.fontSize,
    fontWeight: '600',
    lineHeight: typography.secondary.lineHeight,
    marginBottom: spacing.xs,
  },
  editorTypeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  typeOption: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
  },
  selectedTypeOption: {
    borderColor: colors.primary,
  },
  typeOptionLabel: {
    color: colors.textSecondary,
    fontSize: typography.body.fontSize,
  },
  selectedTypeLabel: {
    color: colors.primary,
    fontSize: typography.body.fontSize,
    fontWeight: '600',
  },
  editorActions: {
    gap: spacing.sm,
    marginTop: 'auto',
  },
});

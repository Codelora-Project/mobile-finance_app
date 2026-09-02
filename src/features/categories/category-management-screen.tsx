import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useRef, useState } from 'react';
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
import { useLanguage } from '@/lib/i18n/language-context';
import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

type EditorState = {
  category: Category | null;
  type: CategoryType;
};

export function CategoryManagementScreen() {
  const database = useSQLiteContext();
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const savingRef = useRef(false);
  const deletingRef = useRef(false);
  const loadRequestRef = useRef(0);
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
    const requestId = ++loadRequestRef.current;
    setLoading(true);
    try {
      const nextCategories = await listCategories(database, selectedType);
      if (requestId !== loadRequestRef.current) return;
      setCategories(nextCategories);
      setScreenError(null);
    } catch (error) {
      if (__DEV__) {
        console.error('Category management could not load categories.', error);
      }
      if (requestId === loadRequestRef.current) {
        setScreenError(
          mapError(error, 'DATABASE_WRITE_FAILED', t.appErrors).message,
        );
      }
    } finally {
      if (requestId === loadRequestRef.current) {
        setLoading(false);
      }
    }
  }, [database, selectedType, t.appErrors]);

  useEffect(() => {
    const loadTimer = setTimeout(() => {
      void loadCategories();
    }, 0);
    return () => {
      clearTimeout(loadTimer);
      loadRequestRef.current += 1;
    };
  }, [loadCategories]);

  function selectType(type: CategoryType) {
    setSelectedType(type);
    setLoading(true);
    setScreenError(null);
  }

  function retryLoad() {
    setLoading(true);
    void loadCategories();
  }

  function openAddEditor() {
    setName('');
    setFormError(null);
    setEditor({ category: null, type: selectedType });
  }

  function openEditEditor(category: Category) {
    setName(category.name);
    setFormError(null);
    setEditor({ category, type: category.type });
  }

  function closeEditor() {
    setEditor(null);
    setName('');
    setFormError(null);
  }

  async function saveEditor() {
    if (!editor || savingRef.current) {
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setFormError(null);
    try {
      if (editor.category) {
        await updateCategory(database, editor.category.id, {
          name,
        });
      } else {
        await createCategory(database, { name, type: editor.type });
      }
      setEditor(null);
      await loadCategories();
    } catch (error) {
      if (__DEV__ && !isCodedError(error)) {
        console.error('Category could not be saved.', error);
      }
      setFormError(
        mapError(error, 'DATABASE_WRITE_FAILED', t.appErrors).message,
      );
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  async function confirmDelete(category: Category) {
    if (deletingRef.current) {
      return;
    }
    deletingRef.current = true;
    setScreenError(null);
    setDeletingId(category.id);
    try {
      await deleteCategory(database, category.id);
      await loadCategories();
    } catch (error) {
      if (__DEV__ && !isCodedError(error)) {
        console.error('Category could not be deleted.', error);
      }
      setScreenError(
        mapError(error, 'DATABASE_WRITE_FAILED', t.appErrors).message,
      );
    } finally {
      deletingRef.current = false;
      setDeletingId(null);
    }
  }

  function requestDelete(category: Category) {
    Alert.alert(
      t.categories.deleteConfirmTitle,
      t.categories.deleteReassignment
        .replace('{name}', category.name)
        .replace(
          '{type}',
          category.type === 'expense'
            ? t.categories.expenseType
            : t.categories.incomeType,
        ),
      [
        { style: 'cancel', text: t.common.cancel },
        {
          onPress: () => void confirmDelete(category),
          style: 'destructive',
          text: t.common.delete,
        },
      ],
    );
  }

  return (
    <Screen>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <AppButton
          label={t.common.back}
          onPress={() => router.back()}
          variant="ghost"
        />
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: colors.textPrimary }]}
        >
          {t.categories.title}
        </Text>
        <AppButton
          label={t.common.add}
          onPress={openAddEditor}
          variant="ghost"
        />
      </View>

      <View
        accessibilityRole="tablist"
        style={[styles.tabs, { backgroundColor: colors.surfaceSecondary }]}
      >
        {(['expense', 'income'] as const).map((type) => {
          const selected = selectedType === type;
          return (
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              key={type}
              onPress={() => selectType(type)}
              style={[
                styles.tab,
                selected
                  ? [styles.selectedTab, { backgroundColor: colors.surface }]
                  : null,
              ]}
            >
              <Text
                style={[
                  styles.tabLabel,
                  { color: selected ? colors.primary : colors.textSecondary },
                  selected ? styles.selectedTabLabel : null,
                ]}
              >
                {type === 'expense'
                  ? t.transactions.expense
                  : t.transactions.income}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {screenError ? (
        <View
          accessibilityLiveRegion="assertive"
          style={[
            styles.errorBanner,
            { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' },
          ]}
        >
          <Text style={[styles.errorText, { color: colors.destructive }]}>
            {screenError}
          </Text>
          <AppButton
            label={t.common.tryAgain}
            onPress={retryLoad}
            variant="ghost"
          />
        </View>
      ) : null}

      {loading ? (
        <View accessibilityLiveRegion="polite" style={styles.loadingState}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={[styles.secondaryText, { color: colors.textSecondary }]}>
            {t.categories.loading}
          </Text>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.listContent}
          data={categories}
          keyExtractor={(category) => String(category.id)}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text
                accessibilityRole="header"
                style={[styles.emptyTitle, { color: colors.textPrimary }]}
              >
                {t.categories.emptyTitle.replace(
                  '{type}',
                  selectedType === 'expense'
                    ? t.categories.expenseType
                    : t.categories.incomeType,
                )}
              </Text>
              <Text
                style={[styles.secondaryText, { color: colors.textSecondary }]}
              >
                {t.categories.emptyDescription.replace(
                  '{type}',
                  selectedType === 'expense'
                    ? t.categories.expenseType
                    : t.categories.incomeType,
                )}
              </Text>
            </View>
          }
          renderItem={({ item: category }) => {
            const isDeleting = deletingId === category.id;
            return (
              <View
                accessibilityLabel={`${category.name}, ${category.isDefault ? t.categories.defaultCategory : t.categories.customCategory}`}
                style={[
                  styles.row,
                  {
                    backgroundColor: colors.surface,
                    borderBottomColor: colors.border,
                  },
                ]}
              >
                <View style={styles.rowText}>
                  <Text style={[styles.name, { color: colors.textPrimary }]}>
                    {category.name}
                  </Text>
                  <Text
                    style={[styles.metadata, { color: colors.textSecondary }]}
                  >
                    {category.isDefault
                      ? t.categories.defaultCategory
                      : t.categories.customCategory}
                  </Text>
                </View>
                {!category.isDefault ? (
                  <View style={styles.actions}>
                    <AppButton
                      accessibilityLabel={t.categories.editAccessibility.replace(
                        '{name}',
                        category.name,
                      )}
                      disabled={isDeleting}
                      label={t.common.edit}
                      onPress={() => openEditEditor(category)}
                      variant="ghost"
                    />
                    <AppButton
                      accessibilityLabel={t.categories.deleteAccessibility.replace(
                        '{name}',
                        category.name,
                      )}
                      disabled={isDeleting}
                      label={t.common.delete}
                      loading={isDeleting}
                      onPress={() => requestDelete(category)}
                      variant="destructive"
                    />
                  </View>
                ) : null}
              </View>
            );
          }}
        />
      )}

      <Modal
        animationType="slide"
        onRequestClose={closeEditor}
        presentationStyle="pageSheet"
        visible={editor !== null}
      >
        <Screen>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <AppButton
              disabled={saving}
              label={t.common.cancel}
              onPress={closeEditor}
              variant="ghost"
            />
            <Text
              accessibilityRole="header"
              style={[styles.title, { color: colors.textPrimary }]}
            >
              {editor?.category ? t.categories.edit : t.categories.newTitle}
            </Text>
            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.editorScreen}>
            <AppInput
              autoFocus
              error={formError}
              label={t.categories.nameLabel}
              maxLength={40}
              onChangeText={(nextName) => {
                setName(nextName);
                if (formError) setFormError(null);
              }}
              placeholder={t.categories.namePlaceholder}
              value={name}
            />

            <View>
              <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>
                {t.categories.typeLabel}
              </Text>
              <View style={styles.editorTypeRow}>
                {(['expense', 'income'] as const).map((type) => {
                  const selected = editor?.type === type;
                  return (
                    <Pressable
                      accessibilityRole="radio"
                      accessibilityState={{ checked: selected }}
                      disabled={saving}
                      key={type}
                      onPress={() =>
                        setEditor((current) =>
                          current ? { ...current, type } : null,
                        )
                      }
                      style={[
                        styles.typeOption,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                        },
                        selected
                          ? [
                              styles.selectedTypeOption,
                              { borderColor: colors.primary },
                            ]
                          : null,
                      ]}
                    >
                      <Text
                        style={[
                          styles.typeOptionLabel,
                          {
                            color: selected
                              ? colors.primary
                              : colors.textSecondary,
                          },
                          selected ? styles.selectedTypeLabel : null,
                        ]}
                      >
                        {type === 'expense'
                          ? t.transactions.expense
                          : t.transactions.income}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.editorActions}>
              <AppButton
                disabled={saving || name.trim().length === 0}
                label={t.categories.save}
                loading={saving}
                onPress={() => void saveEditor()}
              />
            </View>
          </View>
        </Screen>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  headerSpacer: {
    width: 64,
  },
  title: {
    fontSize: typography.sectionTitle.fontSize,
    fontWeight: typography.sectionTitle.fontWeight,
    lineHeight: typography.sectionTitle.lineHeight,
  },
  tabs: {
    borderRadius: radius.md,
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    padding: spacing.xs,
  },
  tab: {
    alignItems: 'center',
    borderRadius: radius.sm,
    flex: 1,
    justifyContent: 'center',
    minHeight: 40,
    paddingVertical: spacing.xs,
  },
  selectedTab: {
    elevation: 1,
    shadowOffset: { height: 1, width: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tabLabel: {
    fontSize: typography.body.fontSize,
  },
  selectedTabLabel: {
    fontSize: typography.body.fontSize,
    fontWeight: '600',
  },
  errorBanner: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    padding: spacing.sm,
  },
  errorText: {
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
    fontSize: typography.sectionTitle.fontSize,
    fontWeight: typography.sectionTitle.fontWeight,
    lineHeight: typography.sectionTitle.lineHeight,
  },
  secondaryText: {
    fontSize: typography.secondary.fontSize,
    lineHeight: typography.secondary.lineHeight,
    textAlign: 'center',
  },
  row: {
    alignItems: 'center',
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
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
  },
  metadata: {
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
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
  },
  selectedTypeOption: {
    borderWidth: 1.5,
  },
  typeOptionLabel: {
    fontSize: typography.body.fontSize,
  },
  selectedTypeLabel: {
    fontSize: typography.body.fontSize,
    fontWeight: '600',
  },
  editorActions: {
    gap: spacing.sm,
    marginTop: 'auto',
  },
});

import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { AppInput } from '@/components/ui/app-input';
import { Screen } from '@/components/ui/screen';
import {
  createPaymentMethod,
  deletePaymentMethod,
  listPaymentMethods,
  updatePaymentMethod,
  type PaymentMethod,
} from '@/features/payment-methods/payment-method-repository';
import { isCodedError, mapError } from '@/lib/errors';
import { useTheme } from '@/lib/theme/theme-context';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

function getOperationMessage(error: unknown) {
  if (isCodedError(error) && error.code === 'VALIDATION_FAILED') {
    return error.message;
  }
  return mapError(error, 'DATABASE_WRITE_FAILED').message;
}

export function PaymentMethodManagementScreen() {
  const database = useSQLiteContext();
  const router = useRouter();
  const { colors } = useTheme();
  const savingRef = useRef(false);
  const deletingRef = useRef(false);
  const [paymentMethods, setPaymentMethods] = useState<
    readonly PaymentMethod[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [screenError, setScreenError] = useState<string | null>(null);
  const [editor, setEditor] = useState<PaymentMethod | 'new' | null>(null);
  const [name, setName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadPaymentMethods = useCallback(async () => {
    try {
      const nextPaymentMethods = await listPaymentMethods(database);
      setPaymentMethods(nextPaymentMethods);
      setScreenError(null);
    } catch (error) {
      if (__DEV__) {
        console.error(
          'Payment method management could not load payment methods.',
          error,
        );
      }
      setScreenError(mapError(error, 'DATABASE_WRITE_FAILED').message);
    } finally {
      setLoading(false);
    }
  }, [database]);

  useEffect(() => {
    let active = true;
    listPaymentMethods(database)
      .then((nextPaymentMethods) => {
        if (active) {
          setPaymentMethods(nextPaymentMethods);
          setScreenError(null);
        }
      })
      .catch((error: unknown) => {
        if (__DEV__) {
          console.error(
            'Payment method management could not load payment methods.',
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
  }, [database]);

  function retryLoad() {
    setLoading(true);
    void loadPaymentMethods();
  }

  function openAddEditor() {
    setName('');
    setFormError(null);
    setEditor('new');
  }

  function openEditEditor(paymentMethod: PaymentMethod) {
    setName(paymentMethod.name);
    setFormError(null);
    setEditor(paymentMethod);
  }

  function closeEditor() {
    setEditor(null);
    setName('');
    setFormError(null);
  }

  async function savePaymentMethod() {
    if (!editor || savingRef.current) {
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setFormError(null);
    try {
      if (editor === 'new') {
        await createPaymentMethod(database, { name });
      } else {
        await updatePaymentMethod(database, editor.id, { name });
      }
      setEditor(null);
      await loadPaymentMethods();
    } catch (error) {
      if (__DEV__ && !isCodedError(error)) {
        console.error('Payment method could not be saved.', error);
      }
      setFormError(getOperationMessage(error));
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  async function confirmDelete(paymentMethod: PaymentMethod) {
    if (deletingRef.current) {
      return;
    }
    deletingRef.current = true;
    setScreenError(null);
    setDeletingId(paymentMethod.id);
    try {
      await deletePaymentMethod(database, paymentMethod.id);
      await loadPaymentMethods();
    } catch (error) {
      if (__DEV__ && !isCodedError(error)) {
        console.error('Payment method could not be deleted.', error);
      }
      setScreenError(getOperationMessage(error));
    } finally {
      deletingRef.current = false;
      setDeletingId(null);
    }
  }

  function requestDelete(paymentMethod: PaymentMethod) {
    Alert.alert(
      'Delete payment method?',
      `Transactions using ${paymentMethod.name} will be moved to the default payment method.`,
      [
        { style: 'cancel', text: 'Cancel' },
        {
          onPress: () => void confirmDelete(paymentMethod),
          style: 'destructive',
          text: 'Delete',
        },
      ],
    );
  }

  return (
    <Screen>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <AppButton label="Back" onPress={() => router.back()} variant="ghost" />
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: colors.textPrimary }]}
        >
          Payment Methods
        </Text>
        <AppButton label="Add" onPress={openAddEditor} variant="ghost" />
      </View>

      <Text style={[styles.description, { color: colors.textSecondary }]}>
        Manage cash, bank accounts, and cards available for transactions.
      </Text>

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
          <AppButton label="Try again" onPress={retryLoad} variant="ghost" />
        </View>
      ) : null}

      {loading ? (
        <View accessibilityLiveRegion="polite" style={styles.loadingState}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={[styles.secondaryText, { color: colors.textSecondary }]}>
            Loading payment methods…
          </Text>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.listContent}
          data={paymentMethods}
          keyExtractor={(paymentMethod) => String(paymentMethod.id)}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                No payment methods
              </Text>
              <Text
                style={[styles.secondaryText, { color: colors.textSecondary }]}
              >
                Add a payment method to get started.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View
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
                  {item.name}
                </Text>
                <Text
                  style={[styles.metadata, { color: colors.textSecondary }]}
                >
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
          <Text
            accessibilityRole="header"
            style={[styles.title, { color: colors.textPrimary }]}
          >
            {editor === 'new' ? 'Add payment method' : 'Edit payment method'}
          </Text>

          <AppInput
            autoFocus
            error={formError}
            label="Payment method name"
            maxLength={40}
            onChangeText={setName}
            placeholder="e.g. Company card"
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
              label="Save payment method"
              loading={saving}
              onPress={savePaymentMethod}
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
    fontSize: typography.pageTitle.fontSize,
    fontWeight: typography.pageTitle.fontWeight,
    lineHeight: typography.pageTitle.lineHeight,
  },
  description: {
    fontSize: typography.secondary.fontSize,
    lineHeight: typography.secondary.lineHeight,
    paddingHorizontal: spacing.md,
    textAlign: 'center',
  },
  errorBanner: {
    alignItems: 'center',
    borderRadius: 8,
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
  secondaryText: {
    fontSize: typography.secondary.fontSize,
    lineHeight: typography.secondary.lineHeight,
    textAlign: 'center',
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
  editorActions: {
    gap: spacing.sm,
    marginTop: 'auto',
  },
});

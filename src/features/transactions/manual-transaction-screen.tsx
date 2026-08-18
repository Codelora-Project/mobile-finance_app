import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import {
  ActivityIndicator,
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { Screen } from '@/components/ui/screen';
import { CategoryPicker } from '@/features/categories/category-picker';
import { PaymentMethodPicker } from '@/features/payment-methods/payment-method-picker';
import { ManualAmountInput } from '@/features/transactions/components/manual-amount-input';
import { ManualCategoryGrid } from '@/features/transactions/components/manual-category-grid';
import { ManualDetailsSection } from '@/features/transactions/components/manual-details-section';
import { ManualPaymentMethodsStrip } from '@/features/transactions/components/manual-payment-methods-strip';
import { ManualReceiptModal } from '@/features/transactions/components/manual-receipt-modal';
import { ManualTransactionHeader } from '@/features/transactions/components/manual-transaction-header';
import { ManualTypeToggle } from '@/features/transactions/components/manual-type-toggle';
import {
  useManualTransactionViewModel,
  type ManualTransactionScreenProps,
} from '@/features/transactions/hooks/use-manual-transaction-view-model';
import { formatMoney } from '@/lib/money';
import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export { type ManualTransactionScreenProps };

export function ManualTransactionScreen({
  transactionId: propTransactionId,
}: ManualTransactionScreenProps = {}) {
  const { colors } = useTheme();

  const { actions, refs, state } = useManualTransactionViewModel({
    propTransactionId,
  });

  if (state.loading) {
    return (
      <Screen>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <Animated.View
        style={[
          styles.container,
          {
            opacity: refs.fadeAnim,
            transform: [{ translateY: refs.slideAnim }],
          },
        ]}
      >
        {/* 1. TOP NAVIGATION HEADER */}
        <ManualTransactionHeader
          deleting={state.deleting}
          isEditMode={state.isEditMode}
          onClose={actions.handleClose}
          onDelete={state.isEditMode ? actions.handleDelete : undefined}
          title={state.screenTitle}
        />

        {/* 2. FORM BODY */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Type Toggle: Expense / Income */}
          <ManualTypeToggle
            onChangeType={(type) => {
              actions.setForm((c) => ({
                ...c,
                category: null,
                isReimbursable: false,
                receipt: null,
                type,
              }));
              actions.setErrors({});
            }}
            selectedType={state.form.type}
            t={state.t}
          />

          {/* Amount Hero Input */}
          <ManualAmountInput
            amount={state.form.amount}
            amountInputRef={refs.amountInputRef}
            currencySymbol={state.currencySymbol}
            error={state.errors.amount}
            onAddIncrement={actions.handleAddIncrement}
            onChangeAmount={(amount) => {
              actions.setForm((c) => ({ ...c, amount }));
              actions.setErrors((c) => ({ ...c, amount: undefined }));
            }}
            onPressCard={() => refs.amountInputRef.current?.focus()}
            onResetAmount={actions.handleClearAmount}
            quickShortcuts={state.quickShortcuts}
          />

          {/* 1-Tap Category Grid */}
          <ManualCategoryGrid
            categories={state.categoriesList}
            error={state.errors.category}
            onOpenMoreCategories={() => actions.setPicker('category')}
            onSelectCategory={actions.handleSelectCategory}
            selectedCategoryId={state.form.category?.id}
            transactionType={state.form.type}
          />

          {/* Quick Payment Methods Strip */}
          <ManualPaymentMethodsStrip
            onSelectPaymentMethod={actions.handleSelectPaymentMethod}
            paymentMethods={state.paymentMethodsList}
            selectedPaymentMethodId={state.form.paymentMethod?.id}
          />

          {/* Compact Merchant, Receipt & Expandable Advanced Options */}
          <ManualDetailsSection
            claimMembership={state.claimMembership}
            counterparty={state.form.counterparty}
            date={state.form.date}
            isExpense={state.isExpense}
            isReimbursable={state.form.isReimbursable}
            note={state.form.note}
            onChangeCounterparty={(counterparty) =>
              actions.setForm((c) => ({ ...c, counterparty }))
            }
            onChangeDate={(date) => actions.setForm((c) => ({ ...c, date }))}
            onChangeNote={(note) => actions.setForm((c) => ({ ...c, note }))}
            onChangeReimbursable={(isReimbursable) =>
              actions.setForm((c) => ({ ...c, isReimbursable }))
            }
            onChangeTime={(time) => actions.setForm((c) => ({ ...c, time }))}
            onOpenReceiptMenu={() => actions.setReceiptMenuVisible(true)}
            onToggleShowDetails={() =>
              actions.setShowDetailSection((prev) => !prev)
            }
            receipt={state.form.receipt}
            showDetailSection={state.showDetailSection}
            time={state.form.time}
          />

          {state.errors.submit ? (
            <Text style={styles.errorBanner}>{state.errors.submit}</Text>
          ) : null}

          {/* Big Save Button */}
          <View style={styles.actionBtnContainer}>
            <Pressable
              accessibilityRole="button"
              disabled={state.saving}
              onPress={() => void actions.handleSave()}
              style={[
                styles.saveBigButton,
                state.isExpense
                  ? styles.saveBigButtonExpense
                  : styles.saveBigButtonIncome,
                state.saving ? styles.saveBigButtonDisabled : null,
              ]}
              testID="save-transaction"
            >
              {state.saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}
                  numberOfLines={1}
                  style={styles.saveBigButtonText}
                >
                  {state.isEditMode
                    ? state.language === 'id'
                      ? 'Update Transaksi' +
                        (state.parsedAmountMinor > 0
                          ? ' (' +
                            formatMoney(state.parsedAmountMinor, state.currencyCode) +
                            ')'
                          : '')
                      : 'Update Transaction' +
                        (state.parsedAmountMinor > 0
                          ? ' (' +
                            formatMoney(state.parsedAmountMinor, state.currencyCode) +
                            ')'
                          : '')
                    : state.isExpense
                      ? state.language === 'id'
                        ? '✓ Simpan Pengeluaran' +
                          (state.parsedAmountMinor > 0
                            ? ' (' +
                              formatMoney(state.parsedAmountMinor, state.currencyCode) +
                              ')'
                            : '')
                        : '✓ Save Expense' +
                          (state.parsedAmountMinor > 0
                            ? ' (' +
                              formatMoney(state.parsedAmountMinor, state.currencyCode) +
                              ')'
                            : '')
                      : state.language === 'id'
                        ? '✓ Simpan Pemasukan' +
                          (state.parsedAmountMinor > 0
                            ? ' (' +
                              formatMoney(state.parsedAmountMinor, state.currencyCode) +
                              ')'
                            : '')
                        : '✓ Save Income' +
                          (state.parsedAmountMinor > 0
                            ? ' (' +
                              formatMoney(state.parsedAmountMinor, state.currencyCode) +
                              ')'
                            : '')}
                </Text>
              )}
            </Pressable>

            {state.isEditMode ? (
              <AppButton
                disabled={state.deleting || state.saving}
                label={state.t.common.delete}
                loading={state.deleting}
                onPress={actions.handleDelete}
                variant="destructive"
              />
            ) : null}
          </View>
        </ScrollView>
      </Animated.View>

      {/* Category Picker Modal */}
      <Modal
        animationType="slide"
        onRequestClose={() => actions.setPicker(null)}
        visible={state.picker === 'category'}
      >
        <Screen>
          <View
            style={[
              styles.modalScreenHeader,
              {
                backgroundColor: colors.surface,
                borderBottomColor: colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.actionSheetTitle,
                { color: colors.textPrimary },
              ]}
            >
              {state.language === 'id' ? 'Pilih Kategori' : 'Select Category'}
            </Text>
            <Pressable
              accessibilityLabel="Close category picker"
              accessibilityRole="button"
              hitSlop={12}
              onPress={() => actions.setPicker(null)}
              style={styles.closeIconButton}
            >
              <MaterialCommunityIcons color="#64748B" name="close" size={24} />
            </Pressable>
          </View>
          <CategoryPicker
            onSelect={(selectedCategory) => {
              actions.handleSelectCategory(selectedCategory);
              actions.setPicker(null);
            }}
            selectedId={state.form.category?.id}
            type={state.form.type}
          />
        </Screen>
      </Modal>

      {/* Payment Method Picker Modal */}
      <Modal
        animationType="slide"
        onRequestClose={() => actions.setPicker(null)}
        visible={state.picker === 'paymentMethod'}
      >
        <Screen>
          <View
            style={[
              styles.modalScreenHeader,
              {
                backgroundColor: colors.surface,
                borderBottomColor: colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.actionSheetTitle,
                { color: colors.textPrimary },
              ]}
            >
              {state.language === 'id'
                ? 'Pilih Metode Pembayaran'
                : 'Select Payment Method'}
            </Text>
            <Pressable
              accessibilityLabel="Close payment method picker"
              accessibilityRole="button"
              hitSlop={12}
              onPress={() => actions.setPicker(null)}
              style={styles.closeIconButton}
            >
              <MaterialCommunityIcons color="#64748B" name="close" size={24} />
            </Pressable>
          </View>
          <PaymentMethodPicker
            onSelect={(selectedPaymentMethod) => {
              if (selectedPaymentMethod) {
                actions.handleSelectPaymentMethod(selectedPaymentMethod);
              }
              actions.setPicker(null);
            }}
            selectedId={state.form.paymentMethod?.id}
          />
        </Screen>
      </Modal>

      {/* Action Sheet Modal: Choose Camera vs Gallery */}
      <ManualReceiptModal
        hasReceipt={Boolean(state.form.receipt)}
        onClose={() => actions.setReceiptMenuVisible(false)}
        onRemoveReceipt={actions.handleRemoveReceipt}
        onSelectSource={(source) => void actions.handleSelectReceiptSource(source)}
        visible={state.receiptMenuVisible}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  actionBtnContainer: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  actionSheetTitle: {
    ...typography.sectionTitle,
    fontSize: 16,
    fontWeight: '800',
  },
  closeIconButton: {
    padding: spacing.xs,
  },
  container: {
    flex: 1,
  },
  errorBanner: {
    ...typography.metadata,
    backgroundColor: '#FEE2E2',
    borderRadius: radius.md,
    color: '#EF4444',
    fontWeight: '600',
    overflow: 'hidden',
    padding: spacing.md,
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  modalScreenHeader: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  saveBigButton: {
    alignItems: 'center',
    borderRadius: radius.lg,
    elevation: 4,
    justifyContent: 'center',
    paddingVertical: spacing.md + 2,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  saveBigButtonDisabled: {
    opacity: 0.6,
  },
  saveBigButtonExpense: {
    backgroundColor: '#EF4444',
  },
  saveBigButtonIncome: {
    backgroundColor: '#10B981',
  },
  saveBigButtonText: {
    ...typography.body,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  scrollContent: {
    gap: spacing.md,
    paddingBottom: spacing.xxl + 32,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },
});

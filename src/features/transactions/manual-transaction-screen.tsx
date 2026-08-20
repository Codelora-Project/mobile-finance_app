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

import { Screen } from '@/components/ui/screen';
import { CategoryPicker } from '@/features/categories/category-picker';
import { PaymentMethodPicker } from '@/features/payment-methods/payment-method-picker';
import { WalletPicker } from '@/features/wallets';
import { ManualAmountInput } from '@/features/transactions/components/manual-amount-input';
import { ManualCategoryGrid } from '@/features/transactions/components/manual-category-grid';
import { ManualDetailsSection } from '@/features/transactions/components/manual-details-section';
import { ManualPaymentMethodsStrip } from '@/features/transactions/components/manual-payment-methods-strip';
import { ManualReceiptModal } from '@/features/transactions/components/manual-receipt-modal';
import { ManualTransactionHeader } from '@/features/transactions/components/manual-transaction-header';
import { ManualTransferSection } from '@/features/transactions/components/manual-transfer-section';
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
  const { colors, isDark } = useTheme();

  const { actions, refs, state } = useManualTransactionViewModel({
    propTransactionId,
  });

  if (state.loading) {
    return (
      <View style={styles.modalOverlay}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </View>
    );
  }

  const isTransfer = state.form.type === 'transfer';

  return (
    <View style={styles.modalOverlay}>
      {/* 1. Dimmed Backdrop */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          styles.backdrop,
          { opacity: refs.fadeAnim },
        ]}
      >
        <Pressable
          accessibilityLabel="Tutup dialog"
          accessibilityRole="button"
          onPress={actions.handleClose}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* 2. Bottom Sheet Container */}
      <Animated.View
        style={[
          styles.sheetContainer,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            transform: [{ translateY: refs.slideAnim }],
          },
        ]}
      >
        {/* Drag Handle Indicator */}
        <View style={styles.dragHandleContainer}>
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
          {/* Type Toggle: Expense / Income / Transfer */}
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

          {/* Conditional Form Body: Transfer vs Standard Expense/Income */}
          {isTransfer ? (
            <ManualTransferSection
              currencySymbol={state.currencySymbol}
              destinationWallet={state.form.transferToPaymentMethod}
              errorDestination={state.errors.transferToPaymentMethod}
              errorFeeAmount={state.errors.transferFeeAmount}
              errorSource={state.errors.paymentMethod}
              hasTransferFee={state.form.hasTransferFee}
              onChangeFeeAmount={(fee) => {
                actions.setForm((c) => ({ ...c, transferFeeAmount: fee }));
                actions.setErrors((c) => ({ ...c, transferFeeAmount: undefined }));
              }}
              onChangeFeeNote={(feeNote) =>
                actions.setForm((c) => ({ ...c, transferFeeNote: feeNote }))
              }
              onOpenDestinationPicker={() => actions.setPicker('transferDestination')}
              onOpenFeeCategoryPicker={() => actions.setPicker('transferFeeCategory')}
              onOpenSourcePicker={() => actions.setPicker('transferSource')}
              onSetQuickFee={(fee) => {
                actions.setForm((c) => ({ ...c, transferFeeAmount: fee }));
                actions.setErrors((c) => ({ ...c, transferFeeAmount: undefined }));
              }}
              onSwapWallets={actions.handleSwapWallets}
              onToggleTransferFee={actions.handleToggleTransferFee}
              sourceWallet={state.form.paymentMethod}
              t={state.t}
              transferFeeAmount={state.form.transferFeeAmount}
              transferFeeCategory={state.form.transferFeeCategory}
              transferFeeNote={state.form.transferFeeNote}
            />
          ) : (
            <>
              {/* 1-Tap Category Grid (Filtered by type) */}
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
                transactionType={state.form.type}
              />
            </>
          )}

          {/* Quick Merchant / Store Name Note */}
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
            onChangeNote={(note) => {
              actions.setForm((c) => ({ ...c, note }));
              actions.setErrors((c) => ({ ...c, note: undefined }));
            }}
            onChangeReimbursable={(isReimbursable) =>
              actions.setForm((c) => ({ ...c, isReimbursable }))
            }
            onChangeTime={(time) => actions.setForm((c) => ({ ...c, time }))}
            onOpenReceiptMenu={() => actions.setReceiptMenuVisible(true)}
            onToggleShowDetails={() => actions.setShowDetailSection((v) => !v)}
            receipt={state.form.receipt}
            showDetailSection={state.showDetailSection}
            time={state.form.time}
          />

          {/* Global Submit/Validation Errors */}
          {state.errors.submit ? (
            <Text style={styles.errorBanner}>{state.errors.submit}</Text>
          ) : null}

          {/* Big Action Save Button */}
          <View style={styles.actionBtnContainer}>
            <Pressable
              accessibilityLabel={
                state.isEditMode
                  ? state.language === 'id'
                    ? 'Perbarui Transaksi'
                    : 'Update Transaction'
                  : isTransfer
                  ? state.language === 'id'
                    ? `Transfer (${formatMoney(state.parsedAmountMinor, state.currencyCode)})`
                    : `Transfer (${formatMoney(state.parsedAmountMinor, state.currencyCode)})`
                  : state.form.type === 'income'
                  ? state.language === 'id'
                    ? `Simpan Pemasukan (${formatMoney(state.parsedAmountMinor, state.currencyCode)})`
                    : `Save Income (${formatMoney(state.parsedAmountMinor, state.currencyCode)})`
                  : state.language === 'id'
                  ? `Simpan Pengeluaran (${formatMoney(state.parsedAmountMinor, state.currencyCode)})`
                  : `Save Expense (${formatMoney(state.parsedAmountMinor, state.currencyCode)})`
              }
              accessibilityRole="button"
              disabled={state.saving}
              onPress={() => void actions.handleSave()}
              style={({ pressed }) => [
                styles.saveBigButton,
                {
                  backgroundColor: colors.primary,
                  shadowColor: colors.primary,
                },
                state.saving ? styles.saveBigButtonDisabled : null,
                pressed ? { opacity: 0.85, transform: [{ scale: 0.98 }] } : null,
              ]}
              testID="save-transaction"
            >
              {state.saving ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.saveBigButtonText}>
                  {state.isEditMode
                    ? state.language === 'id'
                      ? 'Perbarui Transaksi'
                      : 'Update Transaction'
                    : isTransfer
                    ? state.language === 'id'
                      ? `Transfer (${formatMoney(state.parsedAmountMinor, state.currencyCode)})`
                      : `Transfer (${formatMoney(state.parsedAmountMinor, state.currencyCode)})`
                    : state.form.type === 'income'
                    ? state.language === 'id'
                      ? `Simpan Pemasukan (${formatMoney(state.parsedAmountMinor, state.currencyCode)})`
                      : `Save Income (${formatMoney(state.parsedAmountMinor, state.currencyCode)})`
                    : state.language === 'id'
                    ? `Simpan Pengeluaran (${formatMoney(state.parsedAmountMinor, state.currencyCode)})`
                    : `Save Expense (${formatMoney(state.parsedAmountMinor, state.currencyCode)})`}
                </Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </Animated.View>

      {/* Category Picker Modal (for standard Expense/Income) */}
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
            type={state.form.type === 'income' ? 'income' : 'expense'}
          />
        </Screen>
      </Modal>

      {/* Payment Method Picker Modal (for standard Expense/Income) */}
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

      {/* Transfer Source Wallet Picker Modal */}
      <Modal
        animationType="slide"
        onRequestClose={() => actions.setPicker(null)}
        visible={state.picker === 'transferSource'}
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
                ? 'Pilih Dompet Pengirim'
                : 'Select Source Wallet'}
            </Text>
            <Pressable
              accessibilityLabel="Close source wallet picker"
              accessibilityRole="button"
              hitSlop={12}
              onPress={() => actions.setPicker(null)}
              style={styles.closeIconButton}
            >
              <MaterialCommunityIcons color="#64748B" name="close" size={24} />
            </Pressable>
          </View>
          <WalletPicker
            onSelect={actions.handleSelectTransferSource}
            selectedId={state.form.paymentMethod?.id}
          />
        </Screen>
      </Modal>

      {/* Transfer Destination Wallet Picker Modal */}
      <Modal
        animationType="slide"
        onRequestClose={() => actions.setPicker(null)}
        visible={state.picker === 'transferDestination'}
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
                ? 'Pilih Dompet Penerima'
                : 'Select Destination Wallet'}
            </Text>
            <Pressable
              accessibilityLabel="Close destination wallet picker"
              accessibilityRole="button"
              hitSlop={12}
              onPress={() => actions.setPicker(null)}
              style={styles.closeIconButton}
            >
              <MaterialCommunityIcons color="#64748B" name="close" size={24} />
            </Pressable>
          </View>
          <WalletPicker
            excludeWalletId={state.form.paymentMethod?.id}
            onSelect={actions.handleSelectTransferDestination}
            selectedId={state.form.transferToPaymentMethod?.id}
          />
        </Screen>
      </Modal>

      {/* Transfer Fee Category Picker Modal */}
      <Modal
        animationType="slide"
        onRequestClose={() => actions.setPicker(null)}
        visible={state.picker === 'transferFeeCategory'}
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
                ? 'Kategori Biaya Transfer'
                : 'Transfer Fee Category'}
            </Text>
            <Pressable
              accessibilityLabel="Close fee category picker"
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
              actions.setForm((c) => ({
                ...c,
                transferFeeCategory: selectedCategory,
              }));
              actions.setPicker(null);
            }}
            selectedId={state.form.transferFeeCategory?.id}
            type="expense"
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
    </View>
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
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  closeIconButton: {
    padding: spacing.xs,
  },
  dragHandle: {
    borderRadius: radius.pill,
    height: 4,
    width: 40,
  },
  dragHandleContainer: {
    alignItems: 'center',
    paddingBottom: spacing.xs,
    paddingTop: spacing.xs + 2,
    width: '100%',
  },
  errorBanner: {
    ...typography.metadata,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderRadius: radius.md,
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '600',
    marginTop: spacing.xs,
    padding: spacing.sm + 2,
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  modalOverlay: {
    backgroundColor: 'transparent',
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalScreenHeader: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
  },
  saveBigButton: {
    alignItems: 'center',
    borderRadius: radius.lg,
    elevation: 4,
    justifyContent: 'center',
    paddingVertical: spacing.md,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  saveBigButtonDisabled: {
    opacity: 0.7,
  },
  saveBigButtonText: {
    ...typography.body,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  scrollContent: {
    gap: spacing.md,
    paddingBottom: spacing.xxl + 24,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },
  sheetContainer: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    elevation: 24,
    maxHeight: '92%',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    width: '100%',
  },
});

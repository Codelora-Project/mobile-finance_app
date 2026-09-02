import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import type {
  SaveTransactionInput,
  Transaction,
} from '@/features/transactions/transaction-repository';
import type { Wallet } from '@/features/wallets';
import { useLanguage } from '@/lib/i18n/language-context';
import { formatMoney } from '@/lib/money';
import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

type TransferReviewModalProps = {
  currencyCode: string;
  input: SaveTransactionInput | null;
  language: 'id' | 'en';
  onCancel: () => void;
  onConfirm: () => void;
  originalTransaction: Transaction | null;
  saving: boolean;
  wallets: readonly Wallet[];
};

export function TransferReviewModal({
  currencyCode,
  input,
  onCancel,
  onConfirm,
  originalTransaction,
  saving,
  wallets,
}: TransferReviewModalProps) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  if (!input || input.type !== 'transfer') return null;

  const source = wallets.find((wallet) => wallet.id === input.paymentMethodId);
  const destination = wallets.find(
    (wallet) => wallet.id === input.transferToPaymentMethodId,
  );
  const balanceAfter = (wallet: Wallet) => {
    let balance = wallet.currentBalanceMinor;
    if (originalTransaction?.type === 'transfer') {
      if (originalTransaction.paymentMethodId === wallet.id) {
        balance +=
          originalTransaction.amountMinor +
          (originalTransaction.transferFeeMinor ?? 0);
      }
      if (originalTransaction.transferToPaymentMethodId === wallet.id) {
        balance -= originalTransaction.amountMinor;
      }
    }
    if (input.paymentMethodId === wallet.id) {
      balance -= input.amountMinor + (input.transferFeeMinor ?? 0);
    }
    if (input.transferToPaymentMethodId === wallet.id) {
      balance += input.amountMinor;
    }
    return balance;
  };

  const transferFeeMinor = input.transferFeeMinor ?? 0;
  const totalDebit = input.amountMinor + transferFeeMinor;

  return (
    <Modal animationType="fade" onRequestClose={onCancel} transparent visible>
      <View style={styles.backdrop}>
        <View
          accessibilityViewIsModal
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View style={styles.header}>
            <View
              style={[
                styles.iconBadge,
                { backgroundColor: colors.primaryLight },
              ]}
            >
              <MaterialCommunityIcons
                color={colors.primary}
                name="bank-transfer"
                size={26}
              />
            </View>
            <Text
              accessibilityRole="header"
              style={[styles.title, { color: colors.textPrimary }]}
            >
              {t.transactions.reviewTransfer}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {t.transactions.reviewTransferDescription}
            </Text>
          </View>

          <View style={[styles.flow, { borderColor: colors.border }]}>
            <WalletBalance
              balance={source ? balanceAfter(source) : null}
              balanceLabel={t.transactions.balanceAfterTransfer}
              currencyCode={currencyCode}
              label={t.transactions.fromLabel}
              name={source?.name ?? '—'}
            />
            <MaterialCommunityIcons
              color={colors.primary}
              name="arrow-down"
              size={22}
            />
            <WalletBalance
              balance={destination ? balanceAfter(destination) : null}
              balanceLabel={t.transactions.balanceAfterTransfer}
              currencyCode={currencyCode}
              label={t.transactions.toLabel}
              name={destination?.name ?? '—'}
            />
          </View>

          <View style={styles.summary}>
            <SummaryRow
              label={t.transactions.amountLabel}
              value={formatMoney(input.amountMinor, currencyCode)}
            />
            <SummaryRow
              label={t.transactions.transferFee}
              value={formatMoney(transferFeeMinor, currencyCode)}
            />
            <View
              style={[styles.divider, { backgroundColor: colors.border }]}
            />
            <SummaryRow
              emphasized
              label={t.transactions.totalDebit}
              value={formatMoney(totalDebit, currencyCode)}
            />
          </View>

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              disabled={saving}
              onPress={onCancel}
              style={[styles.button, { borderColor: colors.border }]}
            >
              <Text style={[styles.buttonText, { color: colors.textPrimary }]}>
                {t.common.back}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={saving}
              onPress={onConfirm}
              style={[styles.button, { backgroundColor: colors.primary }]}
              testID="confirm-transfer"
            >
              <Text style={[styles.buttonText, { color: colors.onPrimary }]}>
                {saving
                  ? t.transactions.savingTransfer
                  : t.transactions.confirmTransfer}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function WalletBalance({
  balance,
  balanceLabel,
  currencyCode,
  label,
  name,
}: {
  balance: number | null;
  balanceLabel: string;
  currencyCode: string;
  label: string;
  name: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.walletRow}>
      <View style={styles.walletText}>
        <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
        <Text style={[styles.walletName, { color: colors.textPrimary }]}>
          {name}
        </Text>
      </View>
      <View style={styles.balanceText}>
        <Text style={[styles.label, { color: colors.textMuted }]}>
          {balance === null ? '' : balanceLabel}
        </Text>
        <Text style={[styles.balance, { color: colors.textPrimary }]}>
          {balance === null ? '—' : formatMoney(balance, currencyCode)}
        </Text>
      </View>
    </View>
  );
}

function SummaryRow({
  emphasized = false,
  label,
  value,
}: {
  emphasized?: boolean;
  label: string;
  value: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
        {label}
      </Text>
      <Text
        style={[
          styles.summaryValue,
          { color: emphasized ? colors.primary : colors.textPrimary },
          emphasized ? styles.emphasized : null,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: spacing.sm },
  backdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.md,
  },
  balance: { ...typography.secondary, fontWeight: '800' },
  balanceText: { alignItems: 'flex-end' },
  button: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: spacing.sm,
  },
  buttonText: {
    ...typography.secondary,
    fontWeight: '800',
    textAlign: 'center',
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
    maxWidth: 480,
    padding: spacing.lg,
    width: '100%',
  },
  divider: { height: 1 },
  emphasized: { fontSize: 16 },
  flow: {
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  header: { alignItems: 'center', gap: spacing.xs },
  iconBadge: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  label: { ...typography.metadata, fontSize: 11 },
  subtitle: { ...typography.secondary, textAlign: 'center' },
  summary: { gap: spacing.sm },
  summaryLabel: { ...typography.secondary },
  summaryRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryValue: { ...typography.secondary, fontWeight: '700' },
  title: { ...typography.sectionTitle, fontSize: 20 },
  walletName: { ...typography.body, fontWeight: '800' },
  walletRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  walletText: { flex: 1 },
});

import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { memo } from 'react';
import {
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AppInput } from '@/components/ui/app-input';
import type { ManualReceiptSelection } from '@/features/transactions/manual-receipt-picker';
import type { TransactionClaimMembership } from '@/features/transactions/transaction-repository';
import { useLanguage } from '@/lib/i18n/language-context';
import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type ManualDetailsSectionProps = {
  claimMembership?: TransactionClaimMembership | null;
  counterparty: string;
  date: string;
  isExpense: boolean;
  isReimbursable: boolean;
  note: string;
  onChangeCounterparty: (text: string) => void;
  onChangeDate: (date: string) => void;
  onChangeNote: (note: string) => void;
  onChangeReimbursable: (val: boolean) => void;
  onChangeTime: (time: string) => void;
  onOpenReceiptMenu: () => void;
  onToggleShowDetails: () => void;
  receipt?: ManualReceiptSelection | null;
  showDetailSection: boolean;
  time: string;
};

export const ManualDetailsSection = memo(function ManualDetailsSection({
  claimMembership,
  counterparty,
  date,
  isExpense,
  isReimbursable,
  note,
  onChangeCounterparty,
  onChangeDate,
  onChangeNote,
  onChangeReimbursable,
  onChangeTime,
  onOpenReceiptMenu,
  onToggleShowDetails,
  receipt,
  showDetailSection,
  time,
}: ManualDetailsSectionProps) {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();

  return (
    <View style={styles.sectionContainer}>
      <View style={styles.compactDetailRow}>
        <View
          style={[
            styles.counterpartyInputWrap,
            {
              backgroundColor: colors.surfaceMuted,
              borderColor: colors.border,
            },
          ]}
        >
          <MaterialCommunityIcons
            color={colors.textMuted}
            name="store-outline"
            size={20}
          />
          <TextInput
            accessibilityLabel={t.transactions.counterpartyAccessibility}
            onChangeText={onChangeCounterparty}
            placeholder={t.transactions.counterpartyPlaceholder}
            placeholderTextColor={colors.textMuted}
            style={[styles.compactInput, { color: colors.textPrimary }]}
            value={counterparty}
          />
        </View>

        {isExpense ? (
          <Pressable
            accessibilityLabel={t.transactions.addReceipt}
            accessibilityRole="button"
            onPress={onOpenReceiptMenu}
            style={[
              styles.receiptActionChip,
              {
                backgroundColor: receipt
                  ? isDark
                    ? colors.accentIndigoBackground
                    : colors.primaryLight
                  : colors.surfaceSecondary,
                borderColor: receipt ? colors.primary : colors.border,
              },
              receipt ? styles.receiptActionChipActive : null,
            ]}
          >
            <MaterialCommunityIcons
              color={receipt ? colors.primary : colors.textSecondary}
              name={receipt ? 'image-check' : 'camera-plus-outline'}
              size={20}
            />
            <Text
              numberOfLines={1}
              style={[
                styles.receiptActionChipText,
                {
                  color: receipt ? colors.primary : colors.textSecondary,
                },
                receipt ? styles.receiptActionChipTextActive : null,
              ]}
            >
              {receipt ? receipt.displayName : t.transactions.addPhoto}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {claimMembership ? (
        <Text style={[styles.claimMembershipNotice, { color: colors.warning }]}>
          {t.transactions.claimMembership
            .replace('{id}', String(claimMembership.claimId))
            .replace('{status}', claimMembership.claimStatus)}
        </Text>
      ) : null}

      {/* Expandable Advanced Options */}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: showDetailSection }}
        onPress={onToggleShowDetails}
        style={styles.advancedToggleBtn}
      >
        <Text style={[styles.advancedToggleText, { color: colors.primary }]}>
          {showDetailSection
            ? t.transactions.hideAdvancedOptions
            : t.transactions.showAdvancedOptions}
        </Text>
      </Pressable>

      {showDetailSection ? (
        <View
          style={[
            styles.advancedFieldsPanel,
            {
              backgroundColor: colors.surfaceMuted,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.dateRow}>
            <View style={styles.dateField}>
              <AppInput
                accessibilityLabel={t.transactions.transactionDate}
                label={t.transactions.dateLabel}
                onChangeText={onChangeDate}
                placeholder="YYYY-MM-DD"
                value={date}
              />
            </View>
            <View style={styles.timeField}>
              <AppInput
                accessibilityLabel={t.transactions.transactionTime}
                label={t.transactions.timeLabel}
                onChangeText={onChangeTime}
                placeholder="HH:mm"
                value={time}
              />
            </View>
          </View>

          {isExpense ? (
            <View
              style={[
                styles.reimbursableRow,
                { borderTopColor: colors.border },
              ]}
            >
              <View>
                <Text
                  style={[
                    styles.reimbursableTitle,
                    { color: colors.textPrimary },
                  ]}
                >
                  {t.transactions.claimableLabel}
                </Text>
                <Text
                  style={[
                    styles.reimbursableSubtitle,
                    { color: colors.textSecondary },
                  ]}
                >
                  {t.transactions.claimableDescription}
                </Text>
              </View>
              <Switch
                accessibilityLabel={t.transactions.claimableLabel}
                onValueChange={onChangeReimbursable}
                trackColor={{
                  false: colors.borderStrong,
                  true: colors.primary,
                }}
                value={isReimbursable}
              />
            </View>
          ) : null}

          <AppInput
            label={t.transactions.fullNote}
            multiline
            numberOfLines={2}
            onChangeText={onChangeNote}
            placeholder={t.common.optional}
            value={note}
          />
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  advancedFieldsPanel: {
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  advancedToggleBtn: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  advancedToggleText: {
    ...typography.metadata,
    fontSize: 12,
    fontWeight: '700',
  },
  claimMembershipNotice: {
    ...typography.metadata,
    fontWeight: '700',
    paddingHorizontal: spacing.xs,
  },
  compactDetailRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  compactInput: {
    ...typography.body,
    flex: 1,
    fontSize: 13,
    paddingVertical: spacing.sm,
  },
  counterpartyInputWrap: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  dateField: {
    flex: 1,
  },
  dateRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  receiptActionChip: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    height: 44,
    maxWidth: 140,
    paddingHorizontal: spacing.sm,
  },
  receiptActionChipActive: {
    borderWidth: 1.5,
  },
  receiptActionChipText: {
    ...typography.metadata,
    fontSize: 12,
    fontWeight: '600',
  },
  receiptActionChipTextActive: {
    fontWeight: '700',
  },
  reimbursableRow: {
    alignItems: 'center',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
  },
  reimbursableSubtitle: {
    ...typography.metadata,
    fontSize: 11,
  },
  reimbursableTitle: {
    ...typography.body,
    fontSize: 13,
    fontWeight: '700',
  },
  sectionContainer: {
    gap: spacing.xs,
  },
  timeField: {
    width: 100,
  },
});

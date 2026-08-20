import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { memo, useCallback, useMemo, useRef } from 'react';
import {
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { getCategoryMeta } from '@/features/categories/category-meta';
import type { TransactionListItem } from '@/features/transactions/transaction-repository';
import { toLocalDateTimeInput } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { useLanguage } from '@/lib/i18n/language-context';
import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type TransactionRowItemProps = {
  isLast?: boolean;
  onDelete?: (transaction: TransactionListItem) => void;
  onEdit?: (transaction: TransactionListItem) => void;
  onLongPress?: (transaction: TransactionListItem) => void;
  onPress: (id: number) => void;
  receiptBadgeText?: string;
  reimbursableBadgeText?: string;
  transaction: TransactionListItem;
};

export const TransactionRowItem = memo(function TransactionRowItem({
  isLast = false,
  onDelete,
  onEdit,
  onLongPress,
  onPress,
  receiptBadgeText = 'Struk',
  reimbursableBadgeText = 'Reimburse',
  transaction,
}: TransactionRowItemProps) {
  const { colors, isDark } = useTheme();
  const { language } = useLanguage();

  const translateX = useRef(new Animated.Value(0)).current;
  const currentOffset = useRef(0);

  const closeSwipe = useCallback(() => {
    Animated.spring(translateX, {
      bounciness: 4,
      toValue: 0,
      useNativeDriver: true,
    }).start(() => {
      currentOffset.current = 0;
    });
  }, [translateX]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) => {
          return (
            (Boolean(onDelete) || Boolean(onEdit)) &&
            Math.abs(gestureState.dx) > 12 &&
            Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.4
          );
        },
        onPanResponderGrant: () => {
          translateX.stopAnimation((val) => {
            currentOffset.current = val;
          });
        },
        onPanResponderMove: (_, gestureState) => {
          let newDx = currentOffset.current + gestureState.dx;
          // Apply resistance damping
          if (newDx < -90) {
            newDx = -90 + (newDx + 90) * 0.3;
          } else if (newDx > 90) {
            newDx = 90 + (newDx - 90) * 0.3;
          }
          translateX.setValue(newDx);
        },
        onPanResponderRelease: (_, gestureState) => {
          const finalDx = currentOffset.current + gestureState.dx;
          if (finalDx < -40 && onDelete) {
            // Snap open to reveal delete button
            Animated.spring(translateX, {
              bounciness: 4,
              toValue: -76,
              useNativeDriver: true,
            }).start(() => {
              currentOffset.current = -76;
            });
          } else if (finalDx > 40 && onEdit) {
            // Snap open to reveal edit button
            Animated.spring(translateX, {
              bounciness: 4,
              toValue: 76,
              useNativeDriver: true,
            }).start(() => {
              currentOffset.current = 76;
            });
          } else {
            closeSwipe();
          }
        },
        onPanResponderTerminate: () => {
          closeSwipe();
        },
      }),
    [closeSwipe, onDelete, onEdit, translateX],
  );

  const meta = getCategoryMeta(
    transaction.categoryName,
    transaction.type,
    isDark,
  );
  const isTransfer = transaction.type === 'transfer';

  // 1. Determine Title
  const hasCounterparty = Boolean(transaction.counterparty?.trim());
  const title =
    isTransfer &&
    transaction.paymentMethodName &&
    transaction.transferToPaymentMethodName
      ? `${transaction.paymentMethodName} → ${transaction.transferToPaymentMethodName}`
      : hasCounterparty
        ? transaction.counterparty?.trim()
        : transaction.categoryName;

  // 2. Determine Subtitle
  const metaSubtitle = isTransfer
    ? language === 'id'
      ? 'Transfer Antar Dompet'
      : 'Wallet Transfer'
    : hasCounterparty
      ? `${transaction.categoryName}${
          transaction.paymentMethodName
            ? ` · ${transaction.paymentMethodName}`
            : ''
        }`
      : transaction.paymentMethodName || '';

  // 3. Format Time
  let timeStr = '';
  try {
    if (transaction.occurredAt) {
      const { time } = toLocalDateTimeInput(
        transaction.occurredAt,
        transaction.timezoneOffsetMinutes ?? 0,
      );
      timeStr = time;
    }
  } catch {
    // Fallback if timestamp issue
  }

  return (
    <View style={styles.swipeWrapper}>
      {/* Background Action: Edit (Swipe Right) */}
      {onEdit ? (
        <View
          style={[
            styles.swipeActionLeft,
            {
              backgroundColor: isDark ? '#1E3A8A' : '#2563EB',
            },
          ]}
        >
          <Pressable
            accessibilityLabel={language === 'id' ? 'Ubah' : 'Edit'}
            accessibilityRole="button"
            onPress={() => {
              closeSwipe();
              onEdit(transaction);
            }}
            style={styles.swipeActionButton}
          >
            <MaterialCommunityIcons
              color="#FFFFFF"
              name="pencil-outline"
              size={18}
            />
            <Text style={styles.swipeActionText}>
              {language === 'id' ? 'Ubah' : 'Edit'}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {/* Background Action: Delete (Swipe Left) */}
      {onDelete ? (
        <View
          style={[
            styles.swipeActionRight,
            {
              backgroundColor: isDark ? '#7F1D1D' : '#DC2626',
            },
          ]}
        >
          <Pressable
            accessibilityLabel={language === 'id' ? 'Hapus' : 'Delete'}
            accessibilityRole="button"
            onPress={() => {
              closeSwipe();
              onDelete(transaction);
            }}
            style={styles.swipeActionButton}
          >
            <MaterialCommunityIcons
              color="#FFFFFF"
              name="trash-can-outline"
              size={18}
            />
            <Text style={styles.swipeActionText}>
              {language === 'id' ? 'Hapus' : 'Delete'}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {/* Foreground Swipeable Content */}
      <Animated.View
        style={[
          styles.animatedRow,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
            borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
            transform: [{ translateX }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        <Pressable
          accessibilityLabel={`${title}, ${formatMoney(
            transaction.amountMinor,
            transaction.currencyCode,
          )}`}
          accessibilityRole="button"
          onLongPress={onLongPress ? () => onLongPress(transaction) : undefined}
          onPress={() => {
            if (currentOffset.current !== 0) {
              closeSwipe();
            } else {
              onPress(transaction.id);
            }
          }}
          style={({ pressed }) => [
            styles.rowContainer,
            pressed ? { opacity: 0.7 } : null,
          ]}
        >
          {/* Category Icon Badge (Unified Monochromatic) */}
          <View
            style={[
              styles.iconBadge,
              {
                backgroundColor: meta.backgroundColor,
              },
            ]}
          >
            <MaterialCommunityIcons
              color={meta.color}
              name={meta.icon}
              size={19}
            />
          </View>

          {/* Content Column */}
          <View style={styles.contentCol}>
            {/* Row 1: Title & Amount */}
            <View style={styles.mainRow}>
              <Text
                ellipsizeMode={isTransfer ? 'middle' : 'tail'}
                numberOfLines={1}
                style={[styles.itemTitle, { color: colors.textPrimary }]}
              >
                {title}
              </Text>
              <Text
                numberOfLines={1}
                style={[
                  styles.itemAmount,
                  {
                    color:
                      transaction.type === 'expense'
                        ? colors.destructive
                        : transaction.type === 'income'
                          ? colors.positive
                          : colors.textPrimary,
                  },
                ]}
              >
                {transaction.type === 'expense'
                  ? '−'
                  : transaction.type === 'income'
                    ? '+'
                    : '⇄ '}
                {formatMoney(transaction.amountMinor, transaction.currencyCode)}
              </Text>
            </View>

            {/* Row 2: Subtitle, Time & Badges */}
            <View style={styles.metaRow}>
              <View style={styles.metaLeft}>
                {metaSubtitle || timeStr ? (
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.categorySubtitle,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {metaSubtitle}
                    {metaSubtitle && timeStr ? ' · ' : null}
                    {timeStr ? (
                      <Text style={{ color: colors.textMuted }}>{timeStr}</Text>
                    ) : null}
                  </Text>
                ) : null}
              </View>

              {/* Badges */}
              <View style={styles.badgesWrap}>
                {transaction.hasReceipt ? (
                  <View
                    style={[
                      styles.pillBadge,
                      {
                        backgroundColor: isDark
                          ? 'rgba(255,255,255,0.06)'
                          : 'rgba(0,0,0,0.04)',
                      },
                    ]}
                  >
                    <MaterialCommunityIcons
                      color={colors.textSecondary}
                      name="receipt-outline"
                      size={10}
                    />
                    <Text
                      style={[
                        styles.pillBadgeText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {receiptBadgeText}
                    </Text>
                  </View>
                ) : null}

                {transaction.isReimbursable ? (
                  <View
                    style={[
                      styles.pillBadge,
                      {
                        backgroundColor: isDark
                          ? 'rgba(255,255,255,0.06)'
                          : 'rgba(0,0,0,0.04)',
                      },
                    ]}
                  >
                    <MaterialCommunityIcons
                      color={colors.textSecondary}
                      name="briefcase-outline"
                      size={10}
                    />
                    <Text
                      style={[
                        styles.pillBadgeText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {reimbursableBadgeText}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  animatedRow: {
    width: '100%',
  },
  badgesWrap: {
    alignItems: 'center',
    flexDirection: 'row',
    flexShrink: 0,
    gap: 4,
  },
  categorySubtitle: {
    ...typography.metadata,
    flexShrink: 1,
    fontSize: 12,
  },
  contentCol: {
    flex: 1,
    gap: 3,
    justifyContent: 'center',
    minWidth: 0,
  },
  iconBadge: {
    alignItems: 'center',
    borderRadius: radius.md,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  itemAmount: {
    ...typography.body,
    flexShrink: 0,
    fontSize: 14,
    fontWeight: '700',
  },
  itemTitle: {
    ...typography.body,
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    marginRight: spacing.sm,
    minWidth: 0,
  },
  mainRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minWidth: 0,
  },
  metaLeft: {
    flex: 1,
    minWidth: 0,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pillBadge: {
    alignItems: 'center',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
  },
  pillBadgeText: {
    ...typography.metadata,
    fontSize: 10,
    fontWeight: '600',
    lineHeight: 12,
  },
  rowContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm + 2,
    minHeight: 62,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  swipeActionButton: {
    alignItems: 'center',
    flex: 1,
    gap: 2,
    justifyContent: 'center',
    width: 70,
  },
  swipeActionLeft: {
    alignItems: 'center',
    borderRadius: radius.md,
    bottom: 2,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    top: 2,
    width: 70,
  },
  swipeActionRight: {
    alignItems: 'center',
    borderRadius: radius.md,
    bottom: 2,
    justifyContent: 'center',
    position: 'absolute',
    right: 0,
    top: 2,
    width: 70,
  },
  swipeActionText: {
    ...typography.metadata,
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  swipeWrapper: {
    overflow: 'hidden',
    position: 'relative',
  },
});

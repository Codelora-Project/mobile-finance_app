import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { Screen } from '@/components/ui/screen';
import {
  listClaims,
  type ClaimStatus,
  type ClaimSummary,
} from '@/features/claims/claim-repository';
import { mapError } from '@/lib/errors';
import { formatMoney } from '@/lib/money';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

const filters: readonly Readonly<{
  label: string;
  value: ClaimStatus | undefined;
}>[] = [
  { label: 'All', value: undefined },
  { label: 'Draft', value: 'draft' },
  { label: 'Submitted', value: 'submitted' },
  { label: 'Reimbursed', value: 'reimbursed' },
  { label: 'Rejected', value: 'rejected' },
];

function statusLabel(status: ClaimStatus) {
  return status[0]?.toUpperCase() + status.slice(1);
}

export function ClaimsScreen() {
  const database = useSQLiteContext();
  const router = useRouter();
  const params = useLocalSearchParams<{ feedback?: string | string[] }>();
  const feedback = Array.isArray(params.feedback)
    ? params.feedback[0]
    : params.feedback;
  const [status, setStatus] = useState<ClaimStatus | undefined>();
  const [claims, setClaims] = useState<readonly ClaimSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setClaims(await listClaims(database, status));
    } catch (loadError) {
      setError(mapError(loadError, 'DATABASE_WRITE_FAILED').message);
    } finally {
      setLoading(false);
    }
  }, [database, status]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <Screen>
      <View style={styles.header}>
        <AppButton label="Back" onPress={() => router.back()} variant="ghost" />
        <Text accessibilityRole="header" style={styles.title}>
          Claims
        </Text>
        <AppButton
          label="New Claim"
          onPress={() => router.push('/claims/new')}
          variant="ghost"
        />
      </View>

      <View style={styles.filters}>
        {filters.map((filter) => (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: filter.value === status }}
            key={filter.label}
            onPress={() => setStatus(filter.value)}
            style={[
              styles.filter,
              filter.value === status ? styles.filterSelected : null,
            ]}
          >
            <Text
              style={
                filter.value === status
                  ? styles.filterTextSelected
                  : styles.filterText
              }
            >
              {filter.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {feedback ? (
        <Text accessibilityLiveRegion="polite" style={styles.feedback}>
          {feedback}
        </Text>
      ) : null}
      {error ? (
        <Text accessibilityLiveRegion="assertive" style={styles.error}>
          {error}
        </Text>
      ) : null}

      {loading ? (
        <View style={styles.state}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.stateText}>Loading claims…</Text>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={
            claims.length === 0 ? styles.emptyList : styles.list
          }
          data={claims}
          keyExtractor={(claim) => String(claim.id)}
          ListEmptyComponent={
            <View style={styles.state}>
              <Text accessibilityRole="header" style={styles.emptyTitle}>
                {status ? `No ${status} claims` : 'No claims yet'}
              </Text>
              <Text style={styles.stateText}>
                {status
                  ? 'Choose another status to see more claims.'
                  : 'Create a claim from your reimbursable expenses.'}
              </Text>
              {!status ? (
                <View style={styles.emptyAction}>
                  <AppButton
                    label="New Claim"
                    onPress={() => router.push('/claims/new')}
                  />
                </View>
              ) : null}
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              accessibilityLabel={`${item.title}, ${statusLabel(item.status)}`}
              accessibilityRole="button"
              onPress={() => router.push(`/claims/${item.id}`)}
              style={({ pressed }) => [
                styles.claimRow,
                pressed ? styles.pressed : null,
              ]}
            >
              <View style={styles.rowText}>
                <Text numberOfLines={1} style={styles.rowTitle}>
                  {item.title}
                </Text>
                <Text style={styles.rowMetadata}>
                  {statusLabel(item.status)} · {item.itemCount}{' '}
                  {item.itemCount === 1 ? 'expense' : 'expenses'}
                </Text>
                <Text style={styles.rowMetadata}>
                  {item.periodStart && item.periodEnd
                    ? `${item.periodStart} – ${item.periodEnd}`
                    : 'No period'}
                </Text>
              </View>
              <Text style={styles.amount}>
                {item.currencyCode
                  ? formatMoney(item.totalMinor, item.currencyCode)
                  : '—'}
              </Text>
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  title: {
    color: colors.textPrimary,
    flex: 1,
    fontSize: typography.sectionTitle.fontSize,
    fontWeight: typography.sectionTitle.fontWeight,
    textAlign: 'center',
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    padding: spacing.md,
  },
  filter: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  filterSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: { color: colors.textPrimary },
  filterTextSelected: { color: colors.surface, fontWeight: '700' },
  feedback: {
    color: colors.positive,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  error: {
    color: colors.destructive,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  list: { paddingBottom: spacing.xxl },
  emptyList: { flexGrow: 1 },
  state: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  stateText: {
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: typography.sectionTitle.fontSize,
    fontWeight: typography.sectionTitle.fontWeight,
  },
  emptyAction: { marginTop: spacing.lg, width: '100%' },
  claimRow: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 92,
    padding: spacing.lg,
  },
  rowText: { flex: 1 },
  rowTitle: {
    color: colors.textPrimary,
    fontSize: typography.body.fontSize,
    fontWeight: '700',
  },
  rowMetadata: {
    color: colors.textSecondary,
    fontSize: typography.metadata.fontSize,
    marginTop: spacing.xs,
  },
  amount: {
    color: colors.textPrimary,
    fontSize: typography.body.fontSize,
    fontWeight: '700',
  },
  pressed: { opacity: 0.72 },
});

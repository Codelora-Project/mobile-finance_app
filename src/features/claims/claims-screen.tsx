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
import { useTheme } from '@/lib/theme/theme-context';
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
  const { colors } = useTheme();
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
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: colors.textPrimary }]}
        >
          Claims
        </Text>
        <AppButton
          label="New Claim"
          onPress={() => router.push('/claims/new')}
          variant="ghost"
        />
      </View>

      <View style={styles.filters}>
        {filters.map((filter) => {
          const isSelected = filter.value === status;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              key={filter.label}
              onPress={() => setStatus(filter.value)}
              style={[
                styles.filter,
                {
                  backgroundColor: isSelected ? colors.primary : colors.surface,
                  borderColor: isSelected ? colors.primary : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  {
                    color: isSelected ? '#FFFFFF' : colors.textPrimary,
                    fontWeight: isSelected ? '700' : '400',
                  },
                ]}
              >
                {filter.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {feedback ? (
        <Text
          accessibilityLiveRegion="polite"
          style={[styles.feedback, { color: colors.positive }]}
        >
          {feedback}
        </Text>
      ) : null}
      {error ? (
        <Text
          accessibilityLiveRegion="assertive"
          style={[styles.error, { color: colors.destructive }]}
        >
          {error}
        </Text>
      ) : null}

      {loading && claims.length === 0 ? (
        <View style={styles.state}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={[styles.stateText, { color: colors.textSecondary }]}>
            Loading claims…
          </Text>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={[
            styles.list,
            claims.length === 0 ? styles.emptyList : null,
          ]}
          data={claims}
          keyExtractor={(claim) => String(claim.id)}
          ListEmptyComponent={
            <View style={styles.state}>
              <Text
                accessibilityRole="header"
                style={[styles.emptyTitle, { color: colors.textPrimary }]}
              >
                No claims found
              </Text>
              <Text style={[styles.stateText, { color: colors.textSecondary }]}>
                {status
                  ? 'Try selecting a different status filter.'
                  : 'Submit work expenses for reimbursement by creating a claim.'}
              </Text>
              {!status ? (
                <View style={styles.emptyAction}>
                  <AppButton
                    label="Create Claim"
                    onPress={() => router.push('/claims/new')}
                  />
                </View>
              ) : null}
            </View>
          }
          onRefresh={() => void load()}
          refreshing={loading}
          renderItem={({ item: claim }) => (
            <Pressable
              accessibilityLabel={`${claim.title}, ${statusLabel(claim.status)}`}
              accessibilityRole="button"
              onPress={() => router.push(`/claims/${claim.id}`)}
              style={({ pressed }) => [
                styles.claimRow,
                {
                  backgroundColor: colors.surface,
                  borderBottomColor: colors.border,
                },
                pressed ? styles.pressed : null,
              ]}
            >
              <View style={styles.rowText}>
                <Text
                  numberOfLines={1}
                  style={[styles.rowTitle, { color: colors.textPrimary }]}
                >
                  {claim.title}
                </Text>
                <Text
                  style={[styles.rowMetadata, { color: colors.textSecondary }]}
                >
                  {statusLabel(claim.status)} · {claim.itemCount} items
                </Text>
              </View>
              <Text style={[styles.amount, { color: colors.textPrimary }]}>
                {formatMoney(claim.totalMinor, 'IDR')}
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
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  title: {
    flex: 1,
    fontSize: typography.pageTitle.fontSize,
    fontWeight: typography.pageTitle.fontWeight,
    lineHeight: typography.pageTitle.lineHeight,
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    padding: spacing.md,
  },
  filter: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  filterText: {
    fontSize: 14,
  },
  feedback: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  error: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  list: {
    paddingBottom: spacing.xxl + spacing.md,
  },
  emptyList: {
    flexGrow: 1,
  },
  state: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  stateText: {
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  emptyTitle: {
    fontSize: typography.sectionTitle.fontSize,
    fontWeight: typography.sectionTitle.fontWeight,
  },
  emptyAction: {
    marginTop: spacing.lg,
    width: '100%',
  },
  claimRow: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 92,
    padding: spacing.lg,
  },
  rowText: {
    flex: 1,
    flexShrink: 1,
  },
  rowTitle: {
    fontSize: typography.body.fontSize,
    fontWeight: '700',
  },
  rowMetadata: {
    fontSize: typography.metadata.fontSize,
    marginTop: spacing.xs,
  },
  amount: {
    flexShrink: 0,
    fontSize: typography.body.fontSize,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.72,
  },
});

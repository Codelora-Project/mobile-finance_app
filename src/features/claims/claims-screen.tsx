import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { Screen } from '@/components/ui/screen';
import { ClaimListRowItem } from '@/features/claims/components/claim-list-row-item';
import { ClaimsEmptyState } from '@/features/claims/components/claims-empty-state';
import { ClaimsHeader } from '@/features/claims/components/claims-header';
import { ClaimsStatusFilterBar } from '@/features/claims/components/claims-status-filter-bar';
import {
  listClaims,
  type ClaimStatus,
  type ClaimSummary,
} from '@/features/claims/claim-repository';
import { mapError } from '@/lib/errors';
import { useTheme } from '@/lib/theme/theme-context';
import { spacing } from '@/theme/spacing';

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
  const loadRequestRef = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++loadRequestRef.current;
    setLoading(true);
    setError(null);
    try {
      const nextClaims = await listClaims(database, status);
      if (requestId === loadRequestRef.current) {
        setClaims(nextClaims);
      }
    } catch (loadError) {
      if (requestId === loadRequestRef.current) {
        setError(mapError(loadError, 'DATABASE_WRITE_FAILED').message);
      }
    } finally {
      if (requestId === loadRequestRef.current) {
        setLoading(false);
      }
    }
  }, [database, status]);

  useFocusEffect(
    useCallback(() => {
      void load();
      return () => {
        loadRequestRef.current += 1;
      };
    }, [load]),
  );

  const handleNewClaim = useCallback(() => {
    router.push('/claims/new');
  }, [router]);

  const handlePressClaim = useCallback(
    (id: number) => {
      router.push(`/claims/${id}`);
    },
    [router],
  );

  return (
    <Screen>
      {/* 1. Header with Title & New Claim Button */}
      <ClaimsHeader onNewClaim={handleNewClaim} />

      {/* 2. Horizontal Status Filter Bar */}
      <ClaimsStatusFilterBar
        onSelectStatus={setStatus}
        selectedStatus={status}
      />

      {/* 3. Feedback / Error Alerts */}
      {feedback ? (
        <Text
          accessibilityLiveRegion="polite"
          style={[styles.feedback, { color: colors.positive }]}
        >
          {feedback}
        </Text>
      ) : null}
      {error && claims.length > 0 ? (
        <Text
          accessibilityLiveRegion="assertive"
          style={[styles.error, { color: colors.destructive }]}
        >
          {error}
        </Text>
      ) : null}

      {/* 4. Claims List */}
      {error && claims.length === 0 ? (
        <View style={styles.state}>
          <Text
            accessibilityLiveRegion="assertive"
            style={[styles.error, { color: colors.destructive }]}
          >
            {error}
          </Text>
          <AppButton label="Try again" onPress={() => void load()} />
        </View>
      ) : loading && claims.length === 0 ? (
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
            <ClaimsEmptyState
              hasStatusFilter={Boolean(status)}
              onCreateClaim={handleNewClaim}
            />
          }
          onRefresh={() => void load()}
          refreshing={loading}
          renderItem={({ item: claim }) => (
            <ClaimListRowItem claim={claim} onPress={handlePressClaim} />
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  emptyList: {
    flexGrow: 1,
  },
  error: {
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  feedback: {
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  list: {
    paddingBottom: spacing.xxl + spacing.md,
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
});

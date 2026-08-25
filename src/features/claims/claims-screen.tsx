import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useRef, useState } from 'react';
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
import { useLanguage } from '@/lib/i18n/language-context';
import { useTheme } from '@/lib/theme/theme-context';
import { contentMaxWidth } from '@/theme/layout';
import { spacing } from '@/theme/spacing';

export function ClaimsScreen() {
  const database = useSQLiteContext();
  const router = useRouter();
  const { colors } = useTheme();
  const { language, t } = useLanguage();
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

  const displayedClaims = useMemo(() => {
    if (status) return claims;
    const priority: Record<ClaimStatus, number> = {
      draft: 0,
      rejected: 1,
      submitted: 2,
      reimbursed: 3,
    };
    return [...claims].sort(
      (a, b) =>
        priority[a.status] - priority[b.status] || b.updatedAt - a.updatedAt,
    );
  }, [claims, status]);

  const actionRequiredCount = useMemo(
    () =>
      status
        ? 0
        : claims.filter(
            (claim) => claim.status === 'draft' || claim.status === 'rejected',
          ).length,
    [claims, status],
  );

  return (
    <Screen>
      {/* 1. Header with Title & New Claim Button */}
      <ClaimsHeader
        backLabel={t.common.back}
        newClaimLabel={language === 'id' ? 'Klaim baru' : 'New claim'}
        onBack={() => router.back()}
        onNewClaim={claims.length > 0 ? handleNewClaim : undefined}
        title={language === 'id' ? 'Klaim' : 'Claims'}
      />

      {/* 2. Horizontal Status Filter Bar */}
      <ClaimsStatusFilterBar
        onSelectStatus={setStatus}
        selectedStatus={status}
      />

      {actionRequiredCount > 0 ? (
        <View
          accessibilityLiveRegion="polite"
          style={[
            styles.priorityBanner,
            {
              backgroundColor: colors.warningBackground,
              borderColor: colors.warning,
            },
          ]}
        >
          <MaterialCommunityIcons
            color={colors.warning}
            name="alert-circle-outline"
            size={20}
          />
          <View style={styles.priorityText}>
            <Text style={[styles.priorityTitle, { color: colors.textPrimary }]}>
              {language === 'id'
                ? `${actionRequiredCount} klaim perlu tindakan`
                : `${actionRequiredCount} ${actionRequiredCount === 1 ? 'claim needs' : 'claims need'} attention`}
            </Text>
            <Text
              style={[styles.prioritySubtitle, { color: colors.textSecondary }]}
            >
              {language === 'id'
                ? 'Draf dan klaim ditolak ditampilkan lebih dahulu.'
                : 'Draft and rejected claims are shown first.'}
            </Text>
          </View>
        </View>
      ) : null}

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
          <AppButton label={t.common.tryAgain} onPress={() => void load()} />
        </View>
      ) : loading && claims.length === 0 ? (
        <View style={styles.state}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={[styles.stateText, { color: colors.textSecondary }]}>
            {language === 'id' ? 'Memuat klaim…' : 'Loading claims…'}
          </Text>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={[
            styles.list,
            claims.length === 0 ? styles.emptyList : null,
          ]}
          data={displayedClaims}
          keyExtractor={(claim) => String(claim.id)}
          ListEmptyComponent={
            <ClaimsEmptyState
              createLabel={language === 'id' ? 'Buat klaim' : 'Create claim'}
              description={
                language === 'id'
                  ? 'Kelompokkan transaksi kantor yang akan diajukan untuk penggantian biaya.'
                  : 'Group work expenses that you want to submit for reimbursement.'
              }
              filteredDescription={
                language === 'id'
                  ? 'Pilih status lain untuk melihat klaim.'
                  : 'Select a different status to view other claims.'
              }
              hasStatusFilter={Boolean(status)}
              onCreateClaim={handleNewClaim}
              title={language === 'id' ? 'Belum ada klaim' : 'No claims found'}
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
    alignSelf: 'center',
    maxWidth: contentMaxWidth,
    paddingBottom: spacing.xxl + spacing.md,
    width: '100%',
  },
  priorityBanner: {
    alignItems: 'center',
    alignSelf: 'center',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xs,
    maxWidth: contentMaxWidth - spacing.md * 2,
    padding: spacing.sm,
    width: '92%',
  },
  prioritySubtitle: {
    fontSize: 11,
  },
  priorityText: {
    flex: 1,
    gap: 1,
  },
  priorityTitle: {
    fontSize: 13,
    fontWeight: '700',
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

import { useLocalSearchParams } from 'expo-router';

import { ClaimDetailScreen } from '@/features/claims/claim-detail-screen';

export default function ClaimDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ClaimDetailScreen claimId={Number(id)} />;
}

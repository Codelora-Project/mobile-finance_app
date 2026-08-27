import { useLocalSearchParams } from 'expo-router';

import { ClaimFormScreen } from '@/features/claims/claim-form-screen';

export default function EditClaimRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ClaimFormScreen claimId={Number(id)} />;
}

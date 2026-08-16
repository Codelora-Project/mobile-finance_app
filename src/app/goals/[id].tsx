import { useLocalSearchParams } from 'expo-router';

import { GoalDetailScreen } from '@/features/goals/goal-detail-screen';

export default function GoalDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const goalId = parseInt(id || '0', 10);

  return <GoalDetailScreen goalId={goalId} />;
}

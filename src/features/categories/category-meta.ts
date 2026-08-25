import type { MaterialCommunityIconName } from '@/lib/material-community-icons';

export type CategoryMeta = {
  icon: MaterialCommunityIconName;
  color: string;
  backgroundColor: string;
};

// Clean, consistent, monochromatic icon mapping (Apple / Linear style)
const CATEGORY_ICON_MAP: Record<string, MaterialCommunityIconName> = {
  'food & drink': 'silverware-fork-knife',
  transportation: 'car-outline',
  shopping: 'shopping-outline',
  bills: 'receipt-text-outline',
  entertainment: 'gamepad-variant-outline',
  health: 'heart-pulse',
  education: 'school-outline',
  subscription: 'repeat',
  work: 'briefcase-outline',
  travel: 'airplane',
  salary: 'cash-multiple',
  freelance: 'laptop',
  business: 'domain',
  allowance: 'hand-coin-outline',
  refund: 'cash-refund',
  gift: 'gift-outline',
};

export function getCategoryMeta(
  categoryName: string | null | undefined,
  type: 'expense' | 'income' | 'transfer' = 'expense',
  isDark = false,
): CategoryMeta {
  const normalized = categoryName?.trim().toLowerCase() ?? '';
  const icon: MaterialCommunityIconName =
    type === 'transfer'
      ? 'swap-horizontal'
      : (CATEGORY_ICON_MAP[normalized] ??
        (type === 'income' ? 'arrow-bottom-left' : 'tag-outline'));

  // Unified, monochromatic styling across all categories
  const color = isDark ? '#94A3B8' : '#475569';
  const backgroundColor = isDark ? '#1E293B' : '#F1F5F9';

  return {
    icon,
    color,
    backgroundColor,
  };
}

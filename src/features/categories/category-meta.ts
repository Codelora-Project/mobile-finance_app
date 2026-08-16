import type { ComponentProps } from 'react';
import type MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

export type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export type CategoryMeta = {
  icon: IconName;
  color: string;
  backgroundColor: string;
};

const CATEGORY_MAP: Record<string, CategoryMeta> = {
  'food & drink': {
    icon: 'silverware-fork-knife',
    color: '#EA580C',
    backgroundColor: '#FFEDD5',
  },
  transportation: {
    icon: 'car-outline',
    color: '#2563EB',
    backgroundColor: '#DBEAFE',
  },
  shopping: {
    icon: 'shopping-outline',
    color: '#9333EA',
    backgroundColor: '#F3E8FF',
  },
  bills: {
    icon: 'receipt-text-outline',
    color: '#DC2626',
    backgroundColor: '#FEE2E2',
  },
  entertainment: {
    icon: 'gamepad-variant-outline',
    color: '#DB2777',
    backgroundColor: '#FCE7F3',
  },
  health: {
    icon: 'heart-pulse',
    color: '#059669',
    backgroundColor: '#D1FAE5',
  },
  education: {
    icon: 'school-outline',
    color: '#0891B2',
    backgroundColor: '#CFFAFE',
  },
  subscription: {
    icon: 'repeat',
    color: '#4F46E5',
    backgroundColor: '#E0E7FF',
  },
  work: {
    icon: 'briefcase-outline',
    color: '#475569',
    backgroundColor: '#F1F5F9',
  },
  travel: {
    icon: 'airplane',
    color: '#0284C7',
    backgroundColor: '#E0F2FE',
  },
  salary: {
    icon: 'cash-multiple',
    color: '#16A34A',
    backgroundColor: '#DCFCE7',
  },
  freelance: {
    icon: 'laptop',
    color: '#0D9488',
    backgroundColor: '#CCFBF1',
  },
  business: {
    icon: 'domain',
    color: '#D97706',
    backgroundColor: '#FEF3C7',
  },
  allowance: {
    icon: 'hand-coin-outline',
    color: '#16A34A',
    backgroundColor: '#DCFCE7',
  },
  refund: {
    icon: 'cash-refund',
    color: '#0284C7',
    backgroundColor: '#E0F2FE',
  },
  gift: {
    icon: 'gift-outline',
    color: '#E11D48',
    backgroundColor: '#FFE4E6',
  },
};

export function getCategoryMeta(
  categoryName: string | null | undefined,
  type: 'expense' | 'income' = 'expense',
): CategoryMeta {
  const normalized = categoryName?.trim().toLowerCase() ?? '';
  if (normalized && CATEGORY_MAP[normalized]) {
    return CATEGORY_MAP[normalized];
  }

  if (type === 'income') {
    return {
      icon: 'arrow-bottom-left',
      color: '#16A34A',
      backgroundColor: '#DCFCE7',
    };
  }

  return {
    icon: 'tag-outline',
    color: '#64748B',
    backgroundColor: '#F1F5F9',
  };
}

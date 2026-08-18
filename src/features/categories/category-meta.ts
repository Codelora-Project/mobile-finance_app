import type { ComponentProps } from 'react';
import type MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

export type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export type CategoryMeta = {
  icon: IconName;
  color: string;
  backgroundColor: string;
};

type CategoryDef = {
  icon: IconName;
  color: string;
  backgroundColor: string;
  darkColor: string;
  darkBackgroundColor: string;
};

const CATEGORY_MAP: Record<string, CategoryDef> = {
  'food & drink': {
    icon: 'silverware-fork-knife',
    color: '#EA580C',
    backgroundColor: '#FFEDD5',
    darkColor: '#FB923C',
    darkBackgroundColor: '#431407',
  },
  transportation: {
    icon: 'car-outline',
    color: '#2563EB',
    backgroundColor: '#DBEAFE',
    darkColor: '#60A5FA',
    darkBackgroundColor: '#1E3A8A',
  },
  shopping: {
    icon: 'shopping-outline',
    color: '#9333EA',
    backgroundColor: '#F3E8FF',
    darkColor: '#C084FC',
    darkBackgroundColor: '#581C87',
  },
  bills: {
    icon: 'receipt-text-outline',
    color: '#DC2626',
    backgroundColor: '#FEE2E2',
    darkColor: '#F87171',
    darkBackgroundColor: '#7F1D1D',
  },
  entertainment: {
    icon: 'gamepad-variant-outline',
    color: '#DB2777',
    backgroundColor: '#FCE7F3',
    darkColor: '#F472B6',
    darkBackgroundColor: '#831843',
  },
  health: {
    icon: 'heart-pulse',
    color: '#059669',
    backgroundColor: '#D1FAE5',
    darkColor: '#34D399',
    darkBackgroundColor: '#064E3B',
  },
  education: {
    icon: 'school-outline',
    color: '#0891B2',
    backgroundColor: '#CFFAFE',
    darkColor: '#38BDF8',
    darkBackgroundColor: '#0C4A6E',
  },
  subscription: {
    icon: 'repeat',
    color: '#4F46E5',
    backgroundColor: '#E0E7FF',
    darkColor: '#818CF8',
    darkBackgroundColor: '#312E81',
  },
  work: {
    icon: 'briefcase-outline',
    color: '#475569',
    backgroundColor: '#F1F5F9',
    darkColor: '#94A3B8',
    darkBackgroundColor: '#334155',
  },
  travel: {
    icon: 'airplane',
    color: '#0284C7',
    backgroundColor: '#E0F2FE',
    darkColor: '#38BDF8',
    darkBackgroundColor: '#075985',
  },
  salary: {
    icon: 'cash-multiple',
    color: '#16A34A',
    backgroundColor: '#DCFCE7',
    darkColor: '#4ADE80',
    darkBackgroundColor: '#14532D',
  },
  freelance: {
    icon: 'laptop',
    color: '#0D9488',
    backgroundColor: '#CCFBF1',
    darkColor: '#2DD4BF',
    darkBackgroundColor: '#134E4A',
  },
  business: {
    icon: 'domain',
    color: '#D97706',
    backgroundColor: '#FEF3C7',
    darkColor: '#FBBF24',
    darkBackgroundColor: '#78350F',
  },
  allowance: {
    icon: 'hand-coin-outline',
    color: '#16A34A',
    backgroundColor: '#DCFCE7',
    darkColor: '#4ADE80',
    darkBackgroundColor: '#14532D',
  },
  refund: {
    icon: 'cash-refund',
    color: '#0284C7',
    backgroundColor: '#E0F2FE',
    darkColor: '#38BDF8',
    darkBackgroundColor: '#075985',
  },
  gift: {
    icon: 'gift-outline',
    color: '#E11D48',
    backgroundColor: '#FFE4E6',
    darkColor: '#FB7185',
    darkBackgroundColor: '#881337',
  },
};

export function getCategoryMeta(
  categoryName: string | null | undefined,
  type: 'expense' | 'income' | 'transfer' = 'expense',
  isDark = false,
): CategoryMeta {
  const normalized = categoryName?.trim().toLowerCase() ?? '';
  if (normalized && CATEGORY_MAP[normalized]) {
    const def = CATEGORY_MAP[normalized];
    return {
      icon: def.icon,
      color: isDark ? def.darkColor : def.color,
      backgroundColor: isDark ? def.darkBackgroundColor : def.backgroundColor,
    };
  }

  if (type === 'transfer') {
    return {
      icon: 'swap-horizontal',
      color: isDark ? '#60A5FA' : '#2563EB',
      backgroundColor: isDark ? '#1E3A8A' : '#EFF6FF',
    };
  }

  if (type === 'income') {
    return {
      icon: 'arrow-bottom-left',
      color: isDark ? '#4ADE80' : '#16A34A',
      backgroundColor: isDark ? '#14532D' : '#DCFCE7',
    };
  }

  return {
    icon: 'tag-outline',
    color: isDark ? '#94A3B8' : '#64748B',
    backgroundColor: isDark ? '#334155' : '#F1F5F9',
  };
}

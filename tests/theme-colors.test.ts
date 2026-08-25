import { describe, expect, it } from '@jest/globals';

import { BRAND_PRESETS, getDarkPalette } from '@/theme/colors';

describe('dark theme colors', () => {
  it('uses the neutral graphite palette', () => {
    expect(getDarkPalette('blue')).toMatchObject({
      background: '#09090B',
      border: '#303034',
      card: '#18181B',
      destructive: '#FB7185',
      divider: '#303034',
      expenseBackground: '#3A171B',
      incomeBackground: '#12351F',
      positive: '#4ADE80',
      surface: '#18181B',
      surfaceSecondary: '#27272A',
      textMuted: '#71717A',
      textPrimary: '#FAFAFA',
      textSecondary: '#A1A1AA',
      warning: '#FBBF24',
      warningBackground: '#3A2A0F',
    });
  });

  it('keeps the selected brand color as the accent', () => {
    for (const [name, preset] of Object.entries(BRAND_PRESETS)) {
      expect(getDarkPalette(name as keyof typeof BRAND_PRESETS).primary).toBe(
        preset.primaryDark,
      );
    }
  });
});

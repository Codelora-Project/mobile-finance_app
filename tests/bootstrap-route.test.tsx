import { render, screen } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';

import BootstrapRoute from '@/app/(app)/(tabs)/index';

jest.mock('@/features/home/home-screen', () => {
  const ReactNative = require('react-native');
  return {
    HomeScreen: () => (
      <ReactNative.Text accessibilityRole="header">
        Phase 6 Home
      </ReactNative.Text>
    ),
  };
});

describe('application entry route', () => {
  it('renders the Phase 6 Home screen', async () => {
    await render(<BootstrapRoute />);

    expect(
      screen.getByRole('header', { name: 'Phase 6 Home' }),
    ).toBeOnTheScreen();
  });
});

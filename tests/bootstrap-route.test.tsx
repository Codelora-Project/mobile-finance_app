import { render, screen } from '@testing-library/react-native';
import { describe, expect, it } from '@jest/globals';

import BootstrapRoute from '@/app/index';

describe('application entry route', () => {
  it('renders the project identity and Phase 3 management entry points', async () => {
    await render(<BootstrapRoute />);

    expect(
      screen.getByRole('header', { name: 'Personal Finance' }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: 'Categories' }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: 'Payment methods' }),
    ).toBeOnTheScreen();
  });
});

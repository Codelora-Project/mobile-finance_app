import { render, screen } from '@testing-library/react-native';
import { describe, expect, it } from '@jest/globals';

import BootstrapRoute from '@/app/index';

describe('bootstrap route', () => {
  it('renders the project identity and readiness state', async () => {
    await render(<BootstrapRoute />);

    expect(
      screen.getByRole('header', { name: 'Personal Finance' }),
    ).toBeOnTheScreen();
    expect(screen.getByText('Project foundation is ready.')).toBeOnTheScreen();
  });
});

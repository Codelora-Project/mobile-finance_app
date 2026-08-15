import { render, screen } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';

import AddTransactionRoute from '@/app/add';

jest.mock('expo-router', () => ({
  Redirect: ({ href }: { href: string }) => {
    const ReactNative = require('react-native');
    return <ReactNative.Text>{href}</ReactNative.Text>;
  },
}));

describe('legacy add transaction route', () => {
  it('opens the transaction form directly', async () => {
    await render(<AddTransactionRoute />);

    expect(screen.getByText('/transactions/new')).toBeOnTheScreen();
  });
});

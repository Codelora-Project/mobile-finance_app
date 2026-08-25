import { fireEvent, render, screen } from '@testing-library/react-native';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import MainTabLayout from '@/app/(tabs)/_layout';
import { LanguageProvider } from '@/lib/i18n/language-context';

const mockRouter = { push: jest.fn() };
let mockPathname = '/';

jest.mock('expo-router', () => {
  const React = require('react');
  const ReactNative = require('react-native');

  function MockTabs({ children }: { children: React.ReactNode }) {
    return React.createElement(ReactNative.View, null, children);
  }

  MockTabs.Screen = ({
    name,
    options,
  }: {
    name: string;
    options: {
      tabBarButton?: () => React.ReactNode;
      title: string;
    };
  }) =>
    React.createElement(
      ReactNative.View,
      { accessibilityLabel: `tab-${name}` },
      options.tabBarButton
        ? options.tabBarButton()
        : React.createElement(ReactNative.Text, null, options.title),
    );

  return {
    Tabs: MockTabs,
    usePathname: () => mockPathname,
    useRouter: () => mockRouter,
  };
});

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => {
  const ReactNative = require('react-native');
  return (props: { name: string }) => (
    <ReactNative.Text>{props.name}</ReactNative.Text>
  );
});

describe('main tab layout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPathname = '/';
  });

  it('renders the tab destinations and opens Add as an action in English', async () => {
    await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { height: 812, width: 375, x: 0, y: 0 },
          insets: { bottom: 0, left: 0, right: 0, top: 0 },
        }}
      >
        <LanguageProvider initialLanguage="en">
          <MainTabLayout />
        </LanguageProvider>
      </SafeAreaProvider>,
    );

    expect(screen.getByText('Home')).toBeOnTheScreen();
    expect(screen.getByText('Wallets')).toBeOnTheScreen();
    expect(screen.getByText('Transactions')).toBeOnTheScreen();
    expect(screen.getByText('Goals')).toBeOnTheScreen();
    expect(screen.getByText('Reports')).toBeOnTheScreen();
    expect(screen.getByText('More')).toBeOnTheScreen();
    expect(screen.getByText('Claims')).toBeOnTheScreen();

    await fireEvent.press(
      screen.getByRole('button', { name: 'Add transaction' }),
    );
    expect(mockRouter.push).toHaveBeenCalledWith('/transactions/new');
  });

  it('renders the tab destinations in Indonesian', async () => {
    await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { height: 812, width: 375, x: 0, y: 0 },
          insets: { bottom: 0, left: 0, right: 0, top: 0 },
        }}
      >
        <LanguageProvider initialLanguage="id">
          <MainTabLayout />
        </LanguageProvider>
      </SafeAreaProvider>,
    );

    expect(screen.getByText('Beranda')).toBeOnTheScreen();
    expect(screen.getByText('Dompet')).toBeOnTheScreen();
    expect(screen.getByText('Riwayat')).toBeOnTheScreen();
    expect(screen.getByText('Target')).toBeOnTheScreen();
    expect(screen.getByText('Laporan')).toBeOnTheScreen();
    expect(screen.getByText('Lainnya')).toBeOnTheScreen();
    expect(screen.getByText('Klaim')).toBeOnTheScreen();

    await fireEvent.press(
      screen.getByRole('button', { name: 'Catat transaksi' }),
    );
    expect(mockRouter.push).toHaveBeenCalledWith('/transactions/new');
  });

  it('hides the transaction FAB on Reports', async () => {
    mockPathname = '/analytics';

    await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { height: 812, width: 375, x: 0, y: 0 },
          insets: { bottom: 0, left: 0, right: 0, top: 0 },
        }}
      >
        <LanguageProvider initialLanguage="en">
          <MainTabLayout />
        </LanguageProvider>
      </SafeAreaProvider>,
    );

    expect(
      screen.queryByRole('button', { name: 'Add transaction' }),
    ).not.toBeOnTheScreen();
  });
});

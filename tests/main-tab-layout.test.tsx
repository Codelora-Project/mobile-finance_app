import { fireEvent, render, screen } from '@testing-library/react-native';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import MainTabLayout from '@/app/(tabs)/_layout';

const mockRouter = { push: jest.fn() };

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
  });

  it('renders the four destinations and opens Add as an action', async () => {
    await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { height: 812, width: 375, x: 0, y: 0 },
          insets: { bottom: 0, left: 0, right: 0, top: 0 },
        }}
      >
        <MainTabLayout />
      </SafeAreaProvider>,
    );

    expect(screen.getByText('Home')).toBeOnTheScreen();
    expect(screen.getByText('Transactions')).toBeOnTheScreen();
    expect(screen.getByText('Claims')).toBeOnTheScreen();
    expect(screen.getByText('Settings')).toBeOnTheScreen();

    await fireEvent.press(
      screen.getByRole('button', { name: 'Add transaction' }),
    );
    expect(mockRouter.push).toHaveBeenCalledWith('/transactions/new');
  });
});


import { fireEvent, render, screen } from '@testing-library/react-native';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { MoreScreen } from '@/features/navigation/more-screen';
import { LanguageProvider } from '@/lib/i18n/language-context';

const mockRouter = { push: jest.fn() };

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
}));

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => {
  const ReactNative = require('react-native');
  return ({ name }: { name: string }) => (
    <ReactNative.Text>{name}</ReactNative.Text>
  );
});

describe('more screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('groups planning, transaction management, and app data actions', async () => {
    await render(
      <LanguageProvider initialLanguage="en">
        <MoreScreen />
      </LanguageProvider>,
    );

    expect(screen.getByText('PLANNING')).toBeOnTheScreen();
    expect(screen.getByText('TRANSACTION MANAGEMENT')).toBeOnTheScreen();
    expect(screen.getByText('APP & DATA')).toBeOnTheScreen();

    await fireEvent.press(
      screen.getByRole('button', {
        name: /Savings Goals, Track savings goals and progress/,
      }),
    );
    expect(mockRouter.push).toHaveBeenCalledWith('/goals');

    await fireEvent.press(
      screen.getByRole('button', {
        name: /Settings, Language, currency, appearance, and preferences/,
      }),
    );
    expect(mockRouter.push).toHaveBeenCalledWith('/settings');
  });
});

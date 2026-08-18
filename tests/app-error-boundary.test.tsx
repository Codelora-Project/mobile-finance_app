import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => {
  const ReactNative = require('react-native');
  return (props: { name: string }) => (
    <ReactNative.Text>{props.name}</ReactNative.Text>
  );
});

import { AppErrorBoundary } from '@/components/ui/app-error-boundary';

function ProblemChild({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Test crash in child component');
  }
  return <Text>Normal content loaded</Text>;
}

function TestContainer() {
  const [hasError, setHasError] = useState(true);

  return (
    <AppErrorBoundary>
      <View>
        <ProblemChild shouldThrow={hasError} />
        <TouchableOpacity onPress={() => setHasError(false)}>
          <Text>Fix Error</Text>
        </TouchableOpacity>
      </View>
    </AppErrorBoundary>
  );
}

describe('AppErrorBoundary component', () => {
  it('renders fallback UI when a child component throws an error', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await render(<TestContainer />);

    expect(
      screen.getByRole('header', { name: 'Terjadi Kendala Teknis' }),
    ).toBeOnTheScreen();
    expect(screen.getByText('Test crash in child component')).toBeOnTheScreen();

    // Trigger reset
    await fireEvent.press(screen.getByText('Coba Muat Ulang'));

    spy.mockRestore();
  });

  it('renders children normally when no error occurs', async () => {
    await render(
      <AppErrorBoundary>
        <ProblemChild shouldThrow={false} />
      </AppErrorBoundary>,
    );

    expect(screen.getByText('Normal content loaded')).toBeOnTheScreen();
  });
});

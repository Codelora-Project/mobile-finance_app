import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';
import { Pressable, Text } from 'react-native';

import { usePickerData } from '@/lib/use-picker-data';

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

function PickerProbe({
  load,
  resourceKey,
}: {
  load: () => Promise<readonly number[]>;
  resourceKey: string;
}) {
  const { error, items, loading, reload } = usePickerData({
    diagnosticLabel: 'Test picker',
    load,
    resourceKey,
  });

  return (
    <>
      <Text>
        {loading ? 'loading' : error ? 'error' : `items:${items.join(',')}`}
      </Text>
      <Pressable accessibilityRole="button" onPress={() => void reload()}>
        <Text>reload</Text>
      </Pressable>
    </>
  );
}

describe('usePickerData', () => {
  it('ignores a stale response after its resource key changes', async () => {
    const first = createDeferred<readonly number[]>();
    const second = createDeferred<readonly number[]>();
    const load = jest
      .fn<() => Promise<readonly number[]>>()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const view = await render(<PickerProbe load={load} resourceKey="first" />);

    await waitFor(() => expect(load).toHaveBeenCalledTimes(1));
    await view.rerender(<PickerProbe load={load} resourceKey="second" />);
    await waitFor(() => expect(load).toHaveBeenCalledTimes(2));

    await act(async () => second.resolve([2]));
    expect(await screen.findByText('items:2')).toBeOnTheScreen();

    await act(async () => first.resolve([1]));
    expect(screen.getByText('items:2')).toBeOnTheScreen();
  });

  it('supports retry after a failed load', async () => {
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const load = jest
      .fn<() => Promise<readonly number[]>>()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce([3]);
    try {
      await render(<PickerProbe load={load} resourceKey="picker" />);

      expect(await screen.findByText('error')).toBeOnTheScreen();
      await fireEvent.press(screen.getByRole('button', { name: 'reload' }));

      expect(await screen.findByText('items:3')).toBeOnTheScreen();
      expect(load).toHaveBeenCalledTimes(2);
    } finally {
      consoleError.mockRestore();
    }
  });
});

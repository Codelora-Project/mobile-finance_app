import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { describe, expect, it } from '@jest/globals';
import { Pressable, Text } from 'react-native';

import {
  ReceiptFlowProvider,
  useReceiptFlow,
} from '@/features/receipts/receipt-flow-context';

const selectedImage = {
  displayName: 'receipt.jpg',
  fileSize: 100_000,
  height: 1200,
  mimeType: 'image/jpeg' as const,
  source: 'gallery' as const,
  sourceImageUri: 'file:///cache/receipt.jpg',
  width: 800,
};

function FlowProbe() {
  const { clearImage, image, setImage } = useReceiptFlow();
  return (
    <>
      <Text>{image?.sourceImageUri ?? 'No image'}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => setImage(selectedImage)}
      >
        <Text>Select image</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={() => clearImage()}>
        <Text>Exit flow</Text>
      </Pressable>
    </>
  );
}

describe('receipt flow context', () => {
  it('keeps the selected image in memory until the flow is cleared', async () => {
    const view = await render(
      <ReceiptFlowProvider>
        <FlowProbe />
      </ReceiptFlowProvider>,
    );

    expect(screen.getByText('No image')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Select image' }));
    await waitFor(() =>
      expect(screen.getByText('file:///cache/receipt.jpg')).toBeOnTheScreen(),
    );

    await view.rerender(
      <ReceiptFlowProvider>
        <FlowProbe />
      </ReceiptFlowProvider>,
    );
    expect(screen.getByText('file:///cache/receipt.jpg')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Exit flow' }));
    await waitFor(() => expect(screen.getByText('No image')).toBeOnTheScreen());
  });
});

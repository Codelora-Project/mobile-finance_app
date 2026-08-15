import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Linking } from 'react-native';

import { ReceiptCameraScreen } from '@/features/receipts/receipt-camera-screen';

const mockRouter = { back: jest.fn(), replace: jest.fn() };
const mockClearImage = jest.fn();
const mockSetImage = jest.fn();
const mockSetOcr = jest.fn();
const mockRequestPermission = jest.fn<() => Promise<unknown>>();
const mockTakePicture = jest.fn<() => Promise<unknown>>();
let mockPermission: Record<string, unknown> | null;
let mockCameraProps: Record<string, unknown> = {};

jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));
jest.mock('@/features/receipts/receipt-flow-context', () => ({
  useReceiptFlow: () => ({
    clearImage: mockClearImage,
    setImage: mockSetImage,
    setOcr: mockSetOcr,
  }),
}));
jest.mock('expo-camera', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    CameraView: React.forwardRef(
      (props: Record<string, unknown>, ref: unknown) => {
        mockCameraProps = props;
        React.useImperativeHandle(ref, () => ({
          takePictureAsync: () => mockTakePicture(),
        }));
        React.useEffect(() => {
          (props.onCameraReady as (() => void) | undefined)?.();
        }, [props.onCameraReady]);
        return React.createElement(View, {
          accessibilityLabel: 'Native camera preview',
        });
      },
    ),
    useCameraPermissions: () => [mockPermission, mockRequestPermission],
  };
});

describe('receipt camera screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCameraProps = {};
    mockPermission = { canAskAgain: false, granted: true, status: 'granted' };
    mockRequestPermission.mockResolvedValue({ granted: false });
    mockTakePicture.mockResolvedValue({
      height: 1600,
      uri: 'file:///cache/camera-receipt.jpg',
      width: 1200,
    });
  });

  it('requests permission only after the Scan route is mounted and handles denial', async () => {
    mockPermission = {
      canAskAgain: true,
      granted: false,
      status: 'undetermined',
    };
    await render(<ReceiptCameraScreen />);

    await waitFor(() => expect(mockRequestPermission).toHaveBeenCalledTimes(1));
    expect(
      screen.getByRole('header', { name: 'Camera access is disabled.' }),
    ).toBeOnTheScreen();

    const settingsSpy = jest
      .spyOn(Linking, 'openSettings')
      .mockResolvedValue(undefined);
    await fireEvent.press(
      screen.getByRole('button', { name: 'Open Settings' }),
    );
    expect(settingsSpy).toHaveBeenCalledTimes(1);

    await fireEvent.press(
      screen.getByRole('button', { name: 'Import Receipt' }),
    );
    expect(mockRouter.replace).toHaveBeenCalledWith('/receipt/import');
  });

  it('opens the back camera, toggles flash, captures, and retakes', async () => {
    await render(<ReceiptCameraScreen />);
    expect(screen.getByLabelText('Native camera preview')).toBeOnTheScreen();
    expect(mockCameraProps).toMatchObject({
      facing: 'back',
      flash: 'off',
      mode: 'picture',
    });

    await fireEvent.press(screen.getByRole('button', { name: 'Flash Off' }));
    expect(screen.getByRole('button', { name: 'Flash On' })).toBeOnTheScreen();
    expect(mockCameraProps.flash).toBe('on');

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Capture' }).props
          .accessibilityState,
      ).toEqual({
        busy: false,
        disabled: false,
      }),
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Capture' }));
    expect(
      await screen.findByLabelText('Captured receipt preview'),
    ).toBeOnTheScreen();
    expect(mockTakePicture).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getByRole('button', { name: 'Retake' }));
    expect(
      await screen.findByLabelText('Native camera preview'),
    ).toBeOnTheScreen();
  });

  it('feeds Use Photo and the gallery shortcut into the existing import pipeline', async () => {
    const view = await render(<ReceiptCameraScreen />);
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Capture' }).props.accessibilityState
          .disabled,
      ).toBe(false),
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Capture' }));
    await fireEvent.press(
      await screen.findByRole('button', { name: 'Use Photo' }),
    );

    expect(mockSetImage).toHaveBeenCalledWith(
      expect.objectContaining({
        mimeType: 'image/jpeg',
        source: 'camera',
        sourceImageUri: 'file:///cache/camera-receipt.jpg',
      }),
    );
    expect(mockSetOcr).toHaveBeenCalledWith({
      parsed: null,
      rawText: null,
      status: 'idle',
    });
    expect(mockRouter.replace).toHaveBeenCalledWith('/receipt/import');

    await view.unmount();
    await render(<ReceiptCameraScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Gallery' }));
    expect(mockClearImage).toHaveBeenCalled();
    expect(mockRouter.replace).toHaveBeenCalledWith('/receipt/import');
  });
});

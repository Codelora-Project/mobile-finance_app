import { useCallback, useMemo, useState } from 'react';
import { Animated, PanResponder } from 'react-native';

export type UseBottomSheetGestureOptions = {
  closeThreshold?: number;
  closeVelocity?: number;
  onClose?: () => void;
  sheetHeight?: number;
};

export function useBottomSheetGesture({
  closeThreshold = 70,
  closeVelocity = 0.4,
  onClose,
  sheetHeight = 450,
}: UseBottomSheetGestureOptions = {}) {
  const [panY] = useState(() => new Animated.Value(sheetHeight));
  const [backdropAnim] = useState(() => new Animated.Value(0));
  const [visible, setVisible] = useState(false);

  const open = useCallback(() => {
    panY.setValue(sheetHeight);
    backdropAnim.setValue(0);
    setVisible(true);
    Animated.parallel([
      Animated.spring(panY, {
        friction: 8,
        tension: 100,
        toValue: 0,
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        duration: 200,
        toValue: 1,
        useNativeDriver: true,
      }),
    ]).start();
  }, [backdropAnim, panY, sheetHeight]);

  const close = useCallback(
    (customOnClose?: (() => void) | unknown) => {
      Animated.parallel([
        Animated.timing(panY, {
          duration: 180,
          toValue: sheetHeight,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          duration: 180,
          toValue: 0,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setVisible(false);
        panY.setValue(0);
        if (typeof customOnClose === 'function') customOnClose();
        if (onClose) onClose();
      });
    },
    [backdropAnim, onClose, panY, sheetHeight],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 5,
        onPanResponderMove: (_, gestureState) => {
          if (gestureState.dy > 0) {
            panY.setValue(gestureState.dy);
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          if (
            gestureState.dy > closeThreshold ||
            gestureState.vy > closeVelocity
          ) {
            close();
          } else {
            Animated.parallel([
              Animated.spring(panY, {
                friction: 8,
                tension: 100,
                toValue: 0,
                useNativeDriver: true,
              }),
              Animated.timing(backdropAnim, {
                duration: 150,
                toValue: 1,
                useNativeDriver: true,
              }),
            ]).start();
          }
        },
        onStartShouldSetPanResponder: () => true,
      }),
    [backdropAnim, close, closeThreshold, closeVelocity, panY],
  );

  const backdropOpacity = useMemo(
    () =>
      Animated.multiply(
        backdropAnim,
        panY.interpolate({
          extrapolate: 'clamp',
          inputRange: [0, 300],
          outputRange: [1, 0],
        }),
      ),
    [backdropAnim, panY],
  );

  return {
    backdropAnim,
    backdropOpacity,
    close,
    open,
    panResponder,
    panY,
    setVisible,
    visible,
  };
}

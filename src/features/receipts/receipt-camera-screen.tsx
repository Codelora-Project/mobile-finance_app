import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Image,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { Screen } from '@/components/ui/screen';
import { useReceiptFlow } from '@/features/receipts/receipt-flow-context';
import { validateReceiptImage } from '@/features/receipts/receipt-image-picker';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

type CapturedPhoto = Readonly<{ height: number; uri: string; width: number }>;

export function ReceiptCameraScreen() {
  const router = useRouter();
  const { clearImage, setImage, setOcr } = useReceiptFlow();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);
  const capturingRef = useRef(false);
  const requestedRef = useRef(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [captured, setCaptured] = useState<CapturedPhoto | null>(null);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = useCallback(() => {
    clearImage();
    router.back();
  }, [clearImage, router]);

  const openGallery = useCallback(() => {
    clearImage();
    router.replace('/receipt/import');
  }, [clearImage, router]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        close();
        return true;
      },
    );
    return () => subscription.remove();
  }, [close]);

  useEffect(() => {
    if (
      !permission ||
      permission.granted ||
      !permission.canAskAgain ||
      requestedRef.current
    )
      return;
    requestedRef.current = true;
    requestPermission().catch(() => {
      setError('Camera access is disabled.');
    });
  }, [permission, requestPermission]);

  async function capture() {
    if (!cameraReady || capturingRef.current || !cameraRef.current) return;
    capturingRef.current = true;
    setCapturing(true);
    setError(null);
    try {
      const picture = await cameraRef.current.takePictureAsync({ quality: 1 });
      if (!picture) throw new Error('Camera did not return a photo.');
      setCaptured({
        height: picture.height,
        uri: picture.uri,
        width: picture.width,
      });
    } catch {
      setError("We couldn't capture this receipt. Try again.");
    } finally {
      capturingRef.current = false;
      setCapturing(false);
    }
  }

  function retake() {
    setCaptured(null);
    setError(null);
    setCameraReady(false);
  }

  function usePhoto() {
    if (!captured) return;
    try {
      const image = validateReceiptImage(
        {
          fileName: 'camera-receipt.jpg',
          height: captured.height,
          mimeType: 'image/jpeg',
          uri: captured.uri,
          width: captured.width,
        },
        'camera',
      );
      setImage(image);
      setOcr({ parsed: null, rawText: null, status: 'idle' });
      router.replace('/receipt/import');
    } catch {
      setError("We couldn't use this photo. Retake the receipt.");
    }
  }

  if (!permission) {
    return (
      <Screen style={styles.centered}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.stateText}>Starting camera…</Text>
      </Screen>
    );
  }

  if (!permission.granted) {
    return (
      <Screen>
        <View style={styles.lightHeader}>
          <AppButton label="Close" onPress={close} variant="ghost" />
          <Text accessibilityRole="header" style={styles.lightTitle}>
            Scan Receipt
          </Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.permissionContent}>
          <Text accessibilityRole="header" style={styles.permissionTitle}>
            Camera access is disabled.
          </Text>
          <Text accessibilityLiveRegion="assertive" style={styles.stateText}>
            {error ??
              'Enable it in Android Settings or import a receipt instead.'}
          </Text>
          <View style={styles.permissionActions}>
            <AppButton
              label="Open Settings"
              onPress={() => void Linking.openSettings()}
            />
            <AppButton
              label="Import Receipt"
              onPress={openGallery}
              variant="secondary"
            />
          </View>
        </View>
      </Screen>
    );
  }

  if (captured) {
    return (
      <View style={styles.cameraScreen}>
        <Image
          accessibilityLabel="Captured receipt preview"
          resizeMode="contain"
          source={{ uri: captured.uri }}
          style={styles.camera}
        />
        <View style={styles.topControls}>
          <CameraControl label="Close" onPress={close} />
        </View>
        <View style={styles.previewFooter}>
          {error ? (
            <Text
              accessibilityLiveRegion="assertive"
              style={styles.cameraError}
            >
              {error}
            </Text>
          ) : null}
          <View style={styles.previewActions}>
            <AppButton label="Retake" onPress={retake} variant="secondary" />
            <AppButton label="Use Photo" onPress={usePhoto} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.cameraScreen}>
      <CameraView
        facing="back"
        flash={flashEnabled ? 'on' : 'off'}
        mode="picture"
        onCameraReady={() => setCameraReady(true)}
        ref={cameraRef}
        style={styles.camera}
      />
      <View style={styles.topControls}>
        <CameraControl label="Close" onPress={close} />
        <CameraControl
          label={flashEnabled ? 'Flash On' : 'Flash Off'}
          onPress={() => setFlashEnabled((value) => !value)}
        />
      </View>
      <View style={styles.captureFooter}>
        {error ? (
          <Text accessibilityLiveRegion="assertive" style={styles.cameraError}>
            {error}
          </Text>
        ) : null}
        <View style={styles.captureControls}>
          <CameraControl label="Gallery" onPress={openGallery} />
          <Pressable
            accessibilityLabel="Capture"
            accessibilityRole="button"
            accessibilityState={{
              busy: capturing,
              disabled: !cameraReady || capturing,
            }}
            disabled={!cameraReady || capturing}
            onPress={() => void capture()}
            style={({ pressed }) => [
              styles.shutterOuter,
              !cameraReady || capturing ? styles.disabled : null,
              pressed ? styles.pressed : null,
            ]}
            testID="capture-receipt"
          >
            {capturing ? (
              <ActivityIndicator color={colors.surface} />
            ) : (
              <View style={styles.shutterInner} />
            )}
          </Pressable>
          <View style={styles.controlSpacer} />
        </View>
      </View>
    </View>
  );
}

function CameraControl({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.cameraControl,
        pressed ? styles.pressed : null,
      ]}
    >
      <Text style={styles.cameraControlText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  camera: { bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 },
  cameraControl: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    borderColor: 'rgba(255,255,255,0.4)',
    borderRadius: radius.md,
    borderWidth: 1,
    minHeight: 48,
    minWidth: 96,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  cameraControlText: {
    color: colors.surface,
    fontSize: typography.secondary.fontSize,
    fontWeight: '600',
  },
  cameraError: {
    color: colors.surface,
    fontSize: typography.secondary.fontSize,
    textAlign: 'center',
  },
  cameraScreen: { backgroundColor: '#000000', flex: 1 },
  captureControls: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  captureFooter: {
    alignItems: 'center',
    bottom: spacing.xxl,
    gap: spacing.md,
    left: spacing.lg,
    position: 'absolute',
    right: spacing.lg,
  },
  centered: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  controlSpacer: { width: 96 },
  disabled: { opacity: 0.5 },
  headerSpacer: { width: 72 },
  lightHeader: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  lightTitle: {
    color: colors.textPrimary,
    flex: 1,
    fontSize: typography.sectionTitle.fontSize,
    fontWeight: typography.sectionTitle.fontWeight,
    textAlign: 'center',
  },
  permissionActions: { gap: spacing.sm, marginTop: spacing.lg, width: '100%' },
  permissionContent: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  permissionTitle: {
    color: colors.textPrimary,
    fontSize: typography.sectionTitle.fontSize,
    fontWeight: typography.sectionTitle.fontWeight,
    textAlign: 'center',
  },
  pressed: { opacity: 0.72 },
  previewActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  previewFooter: {
    bottom: spacing.xxl,
    gap: spacing.md,
    left: spacing.lg,
    position: 'absolute',
    right: spacing.lg,
  },
  shutterInner: {
    backgroundColor: colors.surface,
    borderRadius: 30,
    height: 60,
    width: 60,
  },
  shutterOuter: {
    alignItems: 'center',
    borderColor: colors.surface,
    borderRadius: 42,
    borderWidth: 4,
    height: 84,
    justifyContent: 'center',
    width: 84,
  },
  stateText: {
    color: colors.textSecondary,
    fontSize: typography.body.fontSize,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    left: spacing.lg,
    position: 'absolute',
    right: spacing.lg,
    top: spacing.xxl,
  },
});

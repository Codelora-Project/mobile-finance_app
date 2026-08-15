import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { Screen } from '@/components/ui/screen';
import { OcrError, recognizeReceipt } from '@/features/receipts/ocr-service';
import { parseReceipt } from '@/features/receipts/receipt-parser';
import { pickReceiptImageFromGallery } from '@/features/receipts/receipt-image-picker';
import { useReceiptFlow } from '@/features/receipts/receipt-flow-context';
import { isCodedError, mapError } from '@/lib/errors';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

type ViewState =
  'selecting' | 'processing' | 'failed' | 'timeout' | 'selection_error';

function getSelectionError(error: unknown) {
  return isCodedError(error)
    ? error.message
    : mapError(error, 'FILE_OPERATION_FAILED').message;
}

export function ImportReceiptScreen() {
  const router = useRouter();
  const { clearImage, image, setImage, setOcr } = useReceiptFlow();
  const [state, setState] = useState<ViewState>('selecting');
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);
  const runIdRef = useRef(0);

  const closeFlow = useCallback(() => {
    runIdRef.current += 1;
    clearImage();
    router.back();
  }, [clearImage, router]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        closeFlow();
        return true;
      },
    );
    return () => subscription.remove();
  }, [closeFlow]);

  const processImage = useCallback(
    async (sourceImageUri: string) => {
      const runId = ++runIdRef.current;
      setState('processing');
      setOcr({ parsed: null, rawText: null, status: 'processing' });
      try {
        const result = await recognizeReceipt(sourceImageUri);
        if (runId !== runIdRef.current) return;
        const parsed = parseReceipt(result.rawText);
        const status = parsed.totalMinor === null ? 'partial' : 'processed';
        setOcr({ parsed, rawText: result.rawText, status });
        router.replace('/receipt/review');
      } catch (processingError) {
        if (runId !== runIdRef.current) return;
        const timeout =
          processingError instanceof OcrError &&
          processingError.code === 'OCR_TIMEOUT';
        setOcr({
          parsed: null,
          rawText: null,
          status: timeout ? 'timeout' : 'failed',
        });
        setState(timeout ? 'timeout' : 'failed');
      }
    },
    [router, setOcr],
  );

  const selectImage = useCallback(
    async (closeOnCancel = false) => {
      setState('selecting');
      setError(null);
      try {
        const selected = await pickReceiptImageFromGallery();
        if (selected) {
          setImage(selected);
          await processImage(selected.sourceImageUri);
        } else if (closeOnCancel || !image) {
          closeFlow();
        } else {
          setState('failed');
        }
      } catch (selectionError) {
        setError(getSelectionError(selectionError));
        setState('selection_error');
      }
    },
    [closeFlow, image, processImage, setImage],
  );

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    queueMicrotask(() => {
      if (image) void processImage(image.sourceImageUri);
      else void selectImage(true);
    });
  }, [image, processImage, selectImage]);

  function enterManually() {
    setOcr({ parsed: null, rawText: null, status: 'failed' });
    router.replace('/receipt/review');
  }

  if (state === 'selecting' || state === 'processing') {
    return (
      <Screen style={styles.centered}>
        {image ? (
          <Image
            accessibilityLabel="Selected receipt image"
            resizeMode="contain"
            source={{ uri: image.sourceImageUri }}
            style={styles.preview}
          />
        ) : null}
        <ActivityIndicator color={colors.primary} size="large" />
        <Text accessibilityRole="header" style={styles.title}>
          {state === 'selecting' ? 'Opening gallery…' : 'Reading receipt…'}
        </Text>
        {state === 'processing' ? (
          <Text style={styles.message}>This usually takes a few seconds.</Text>
        ) : null}
      </Screen>
    );
  }

  const timeout = state === 'timeout';
  return (
    <Screen style={styles.centered}>
      {image ? (
        <Image
          accessibilityLabel="Selected receipt image"
          resizeMode="contain"
          source={{ uri: image.sourceImageUri }}
          style={styles.preview}
        />
      ) : null}
      <View style={styles.card}>
        <Text accessibilityRole="header" style={styles.title}>
          {timeout
            ? 'Receipt processing is taking longer than expected.'
            : 'We couldn’t read this receipt.'}
        </Text>
        {!timeout ? (
          <Text accessibilityLiveRegion="assertive" style={styles.message}>
            {error ?? 'Try another image or enter the expense manually.'}
          </Text>
        ) : null}
        <View style={styles.actions}>
          {timeout && image ? (
            <AppButton
              label="Try Again"
              onPress={() => void processImage(image.sourceImageUri)}
            />
          ) : (
            <AppButton
              label="Try Another Image"
              onPress={() => void selectImage()}
            />
          )}
          {image ? (
            <AppButton
              label="Enter Manually"
              onPress={enterManually}
              variant="secondary"
            />
          ) : null}
          <AppButton label="Back" onPress={closeFlow} variant="ghost" />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { gap: spacing.sm, marginTop: spacing.lg },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.lg,
    width: '100%',
  },
  centered: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  message: {
    color: colors.textSecondary,
    fontSize: typography.body.fontSize,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  preview: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    height: 220,
    width: '100%',
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.sectionTitle.fontSize,
    fontWeight: typography.sectionTitle.fontWeight,
    textAlign: 'center',
  },
});

import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { Screen } from '@/components/ui/screen';
import {
  pickReceiptImageFromGallery,
  type ReceiptImageSelection,
} from '@/features/receipts/receipt-image-picker';
import { useReceiptFlow } from '@/features/receipts/receipt-flow-context';
import { isCodedError, mapError } from '@/lib/errors';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

function getImageErrorMessage(error: unknown) {
  if (isCodedError(error)) {
    return error.message;
  }
  return mapError(error, 'FILE_OPERATION_FAILED').message;
}

function getMimeLabel(image: ReceiptImageSelection) {
  return image.mimeType.replace('image/', '').toUpperCase();
}

export function ImportReceiptScreen() {
  const router = useRouter();
  const { clearImage, image, setImage } = useReceiptFlow();
  const [selecting, setSelecting] = useState(image === null);
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(
    () => () => {
      mountedRef.current = false;
    },
    [],
  );

  const closeFlow = useCallback(() => {
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

  const selectImage = useCallback(
    async (closeOnCancel = false) => {
      setSelecting(true);
      setError(null);
      try {
        const selectedImage = await pickReceiptImageFromGallery();
        if (!mountedRef.current) {
          return;
        }
        if (selectedImage) {
          setImage(selectedImage);
          return;
        }
        if (closeOnCancel || !image) {
          closeFlow();
        }
      } catch (selectionError) {
        if (__DEV__ && !isCodedError(selectionError)) {
          console.error('Receipt image selection failed.', selectionError);
        }
        if (mountedRef.current) {
          setError(getImageErrorMessage(selectionError));
        }
      } finally {
        if (mountedRef.current) {
          setSelecting(false);
        }
      }
    },
    [closeFlow, image, setImage],
  );

  useEffect(() => {
    if (startedRef.current || image) {
      return;
    }
    startedRef.current = true;
    void selectImage(true);
  }, [image, selectImage]);

  if (selecting && !image) {
    return (
      <Screen style={styles.centeredState}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.stateText}>Opening gallery…</Text>
      </Screen>
    );
  }

  if (!image) {
    return (
      <Screen>
        <View style={styles.header}>
          <AppButton label="Back" onPress={closeFlow} variant="ghost" />
          <Text accessibilityRole="header" style={styles.title}>
            Import Receipt
          </Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centeredState}>
          <Text accessibilityRole="header" style={styles.stateTitle}>
            Receipt unavailable
          </Text>
          <Text accessibilityLiveRegion="assertive" style={styles.stateText}>
            {error ?? 'Choose another receipt image.'}
          </Text>
          <View style={styles.stateActions}>
            <AppButton
              label="Choose another image"
              loading={selecting}
              onPress={() => void selectImage()}
            />
            <AppButton label="Back" onPress={closeFlow} variant="secondary" />
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <AppButton label="Close" onPress={closeFlow} variant="ghost" />
        <Text accessibilityRole="header" style={styles.title}>
          Receipt Image
        </Text>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Image
          accessibilityLabel="Selected receipt image"
          resizeMode="contain"
          source={{ uri: image.sourceImageUri }}
          style={styles.preview}
        />
        <Text numberOfLines={2} style={styles.fileName}>
          {image.displayName}
        </Text>
        <Text style={styles.metadata}>
          {getMimeLabel(image)} · {image.width} × {image.height}
        </Text>
        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>Image ready</Text>
          <Text style={styles.noticeText}>
            This image is kept temporarily in the receipt flow. It has not been
            saved as a transaction.
          </Text>
        </View>
        {error ? (
          <Text accessibilityLiveRegion="assertive" style={styles.error}>
            {error}
          </Text>
        ) : null}
        <View style={styles.actions}>
          <AppButton
            label="Choose another image"
            loading={selecting}
            onPress={() => void selectImage()}
            variant="secondary"
          />
          <AppButton label="Close" onPress={closeFlow} variant="ghost" />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  title: {
    color: colors.textPrimary,
    flex: 1,
    fontSize: typography.sectionTitle.fontSize,
    fontWeight: typography.sectionTitle.fontWeight,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 72,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  preview: {
    alignSelf: 'stretch',
    backgroundColor: colors.surfaceSecondary,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    height: 400,
  },
  fileName: {
    color: colors.textPrimary,
    fontSize: typography.body.fontSize,
    fontWeight: '600',
    marginTop: spacing.md,
  },
  metadata: {
    color: colors.textSecondary,
    fontSize: typography.secondary.fontSize,
    marginTop: spacing.xs,
  },
  notice: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    marginTop: spacing.lg,
    padding: spacing.md,
  },
  noticeTitle: {
    color: colors.textPrimary,
    fontSize: typography.body.fontSize,
    fontWeight: '600',
  },
  noticeText: {
    color: colors.textSecondary,
    fontSize: typography.secondary.fontSize,
    lineHeight: typography.secondary.lineHeight,
    marginTop: spacing.xs,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  error: {
    color: colors.destructive,
    fontSize: typography.secondary.fontSize,
    marginTop: spacing.md,
  },
  centeredState: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  stateTitle: {
    color: colors.textPrimary,
    fontSize: typography.sectionTitle.fontSize,
    fontWeight: typography.sectionTitle.fontWeight,
  },
  stateText: {
    color: colors.textSecondary,
    fontSize: typography.body.fontSize,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  stateActions: {
    gap: spacing.sm,
    marginTop: spacing.lg,
    width: '100%',
  },
});

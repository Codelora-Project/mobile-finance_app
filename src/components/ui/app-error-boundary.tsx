import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { Screen } from '@/components/ui/screen';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type AppErrorBoundaryProps = {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
};

type AppErrorBoundaryState = {
  error: Error | null;
  hasError: boolean;
};

export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  override state: AppErrorBoundaryState = {
    error: null,
    hasError: false,
  };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return {
      error,
      hasError: true,
    };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    if (__DEV__) {
      console.error('AppErrorBoundary caught an unhandled error:', error, errorInfo);
    }
    this.props.onError?.(error, errorInfo);
  }

  resetErrorBoundary = (): void => {
    this.setState({
      error: null,
      hasError: false,
    });
  };

  override render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.resetErrorBoundary);
      }

      return (
        <Screen>
          <View style={styles.container}>
            <View style={styles.iconCircle}>
              <MaterialCommunityIcons
                color="#EF4444"
                name="alert-circle-outline"
                size={48}
              />
            </View>

            <Text accessibilityRole="header" style={styles.title}>
              Terjadi Kendala Teknis
            </Text>

            <Text style={styles.message}>
              {this.state.error.message ||
                'Aplikasi mengalami kendala tak terduga. Silakan coba muat ulang bagian ini.'}
            </Text>

            <View style={styles.actionWrap}>
              <AppButton
                label="Coba Muat Ulang"
                onPress={this.resetErrorBoundary}
                variant="primary"
              />
            </View>
          </View>
        </Screen>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  actionWrap: {
    marginTop: spacing.md,
    width: '100%',
  },
  container: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  iconCircle: {
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderRadius: radius.pill,
    height: 80,
    justifyContent: 'center',
    marginBottom: spacing.xs,
    width: 80,
  },
  message: {
    ...typography.metadata,
    color: '#64748B',
    fontSize: 13,
    lineHeight: 20,
    maxWidth: 280,
    textAlign: 'center',
  },
  title: {
    ...typography.sectionTitle,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
});

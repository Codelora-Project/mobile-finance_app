import { StyleSheet, type ViewProps } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { useTheme } from '@/lib/theme/theme-context';

export function Screen({
  children,
  edges = ['top'],
  style,
  ...props
}: ViewProps & { edges?: readonly Edge[] }) {
  const { colors } = useTheme();

  return (
    <SafeAreaView
      edges={edges}
      style={[styles.screen, { backgroundColor: colors.background }, style]}
      {...props}
    >
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
});

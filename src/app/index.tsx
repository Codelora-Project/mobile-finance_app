import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export default function BootstrapRoute() {
  return (
    <View style={styles.screen}>
      <Text accessibilityRole="header" style={styles.title}>
        Personal Finance
      </Text>
      <Text style={styles.message}>Project foundation is ready.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    alignItems: 'center',
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.pageTitle.fontSize,
    fontWeight: typography.pageTitle.fontWeight,
    lineHeight: typography.pageTitle.lineHeight,
  },
  message: {
    color: colors.textSecondary,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});

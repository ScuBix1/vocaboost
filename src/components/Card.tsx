/**
 * Conteneur Card (design §3.2).
 */
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, shadows, spacing, typography } from '@/theme/tokens';

export interface CardProps {
  children?: ReactNode;
  title?: string;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function Card({ children, title, onPress, accessibilityLabel, style, testID }: CardProps) {
  const header = title ? (
    <View style={styles.header}>
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      {onPress ? (
        <Text style={styles.chevron} accessible={false}>
          ›
        </Text>
      ) : null}
    </View>
  ) : null;

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        testID={testID}
        style={({ pressed }) => [styles.card, pressed && styles.pressed, style]}
      >
        {header}
        {children}
      </Pressable>
    );
  }

  return (
    <View
      style={[styles.card, style]}
      accessible={accessibilityLabel ? true : undefined}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
    >
      {header}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.sm,
  },
  pressed: { opacity: 0.9 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { ...typography.h3, color: colors.text, flex: 1 },
  chevron: { ...typography.h2, color: colors.textMuted, marginLeft: spacing.sm },
});

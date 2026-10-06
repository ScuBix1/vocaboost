/**
 * État vide (design §3.8).
 */
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '@/theme/tokens';

import { Button } from './Button';

export interface EmptyStateProps {
  emoji: string;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** `primary` si c'est l'unique action de l'écran. */
  actionVariant?: 'primary' | 'secondary';
  compact?: boolean;
}

export function EmptyState({
  emoji,
  title,
  message,
  actionLabel,
  onAction,
  actionVariant = 'secondary',
  compact = false,
}: EmptyStateProps) {
  return (
    <View style={[styles.container, compact && styles.compact]}>
      <Text style={styles.emoji} accessible={false} importantForAccessibility="no">
        {emoji}
      </Text>
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} variant={actionVariant} style={styles.action} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', padding: spacing.xl, gap: spacing.md },
  compact: { padding: spacing.lg },
  emoji: { fontSize: 48, lineHeight: 56 },
  title: { ...typography.h3, color: colors.text, textAlign: 'center' },
  message: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
  action: { alignSelf: 'stretch', marginTop: spacing.sm },
});

/**
 * État vide v2 (design §4.13) : Vobi à la place de l'emoji.
 */
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '@/theme/tokens';

import { Button } from './Button';
import { Vobi, type VobiMood } from './Vobi';

export interface EmptyStateProps {
  mood: VobiMood;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** `primary` si c'est l'unique action de l'écran. */
  actionVariant?: 'primary' | 'secondary';
  compact?: boolean;
}

export function EmptyState({
  mood,
  title,
  message,
  actionLabel,
  onAction,
  actionVariant = 'secondary',
  compact = false,
}: EmptyStateProps) {
  return (
    <View style={[styles.container, compact && styles.compact]}>
      <Vobi mood={mood} size={compact ? 80 : 96} />
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
  container: { alignItems: 'center', padding: spacing.xl, gap: spacing.sm },
  compact: { padding: spacing.sm },
  title: { ...typography.h3, color: colors.ink, textAlign: 'center' },
  message: { ...typography.body, color: colors.inkMuted, textAlign: 'center' },
  action: { alignSelf: 'stretch', marginTop: spacing.sm },
});

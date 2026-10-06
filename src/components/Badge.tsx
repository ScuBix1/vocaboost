/**
 * Badge (design §3.9) : niveau, langue, « Réussi » / « À retravailler ».
 */
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme/tokens';

export interface BadgeProps {
  label: string;
  variant?: 'default' | 'success' | 'danger';
  size?: 'sm' | 'lg';
}

const VARIANTS = {
  default: { bg: colors.primarySoft, fg: colors.primaryPressed },
  success: { bg: colors.successSoft, fg: colors.successText },
  danger: { bg: colors.dangerSoft, fg: colors.dangerText },
} as const;

export function Badge({ label, variant = 'default', size = 'sm' }: BadgeProps) {
  const { bg, fg } = VARIANTS[variant];
  return (
    <View style={[styles.badge, size === 'lg' && styles.large, { backgroundColor: bg }]}>
      <Text style={[size === 'lg' ? styles.textLg : styles.text, { color: fg }]}>{label}</Text>
    </View>
  );
}

/** Badge de résultat de test (RG-70). */
export function ResultBadge({ passed, size }: { passed: boolean; size?: 'sm' | 'lg' }) {
  return <Badge label={passed ? 'Réussi' : 'À retravailler'} variant={passed ? 'success' : 'danger'} size={size} />;
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radius.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  large: { alignSelf: 'center', paddingVertical: spacing.sm, paddingHorizontal: spacing.lg },
  text: { ...typography.caption },
  textLg: { ...typography.h3 },
});

/**
 * Badge v2 (design §4.13) : niveau, langue, « Réussi » / « À retravailler ».
 */
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, typography } from '@/theme/tokens';

export interface BadgeProps {
  label: string;
  variant?: 'default' | 'level' | 'success' | 'danger' | 'review';
  size?: 'sm' | 'lg';
  emoji?: string;
}

const VARIANTS = {
  default: { bg: colors.primarySoft, fg: colors.primaryInk },
  level: { bg: colors.primarySoft, fg: colors.primaryInk },
  success: { bg: colors.successSoft, fg: colors.successInk },
  danger: { bg: colors.dangerSoft, fg: colors.dangerInk },
  /** « À revoir » (v1.1) : jaune chaud, jamais de rouge (ce n'est pas une faute). */
  review: { bg: colors.sunSoft, fg: colors.sunInk },
} as const;

export function Badge({ label, variant = 'default', size = 'sm', emoji }: BadgeProps) {
  const { bg, fg } = VARIANTS[variant];
  const textStyle = [size === 'lg' ? styles.textLg : styles.text, { color: fg }];
  return (
    <View style={[styles.badge, size === 'lg' && styles.large, { backgroundColor: bg }]}>
      {emoji ? (
        <Text style={textStyle} accessible={false}>
          {emoji}
        </Text>
      ) : null}
      <Text style={textStyle}>{label}</Text>
    </View>
  );
}

/** Badge de résultat de test (RG-70) ; la version `lg` porte la médaille 🏅 quand c'est réussi. */
export function ResultBadge({ passed, size }: { passed: boolean; size?: 'sm' | 'lg' }) {
  return (
    <Badge
      label={passed ? 'Réussi' : 'À retravailler'}
      variant={passed ? 'success' : 'danger'}
      size={size}
      emoji={passed && size === 'lg' ? '🏅' : undefined}
    />
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radius.sm,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  large: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 12 },
  text: { ...typography.caption, fontWeight: '900' },
  textLg: { fontSize: 16, lineHeight: 20, fontWeight: '900' },
});

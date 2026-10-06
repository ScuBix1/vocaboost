/**
 * Tuile de statistique (design §3.5).
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, MAX_FONT_MULTIPLIER, radius, shadows, spacing, typography } from '@/theme/tokens';

export interface StatTileProps {
  value: string | number;
  label: string;
  emoji?: string;
  sublabel?: string;
  tone?: 'default' | 'success' | 'warning';
  onPress?: () => void;
  testID?: string;
}

const TONE_COLORS = {
  default: colors.text,
  success: colors.success,
  warning: colors.warning,
} as const;

export function StatTile({ value, label, emoji, sublabel, tone = 'default', onPress, testID }: StatTileProps) {
  const a11yLabel = `${label} : ${value}${sublabel ? ` ${sublabel}` : ''}`;
  const content = (
    <>
      <View style={styles.row}>
        {emoji ? (
          <Text style={styles.value} accessible={false} maxFontSizeMultiplier={MAX_FONT_MULTIPLIER}>
            {emoji}
          </Text>
        ) : null}
        <Text style={[styles.value, { color: TONE_COLORS[tone] }]} maxFontSizeMultiplier={MAX_FONT_MULTIPLIER}>
          {value}
        </Text>
      </View>
      <Text style={styles.label}>{label}</Text>
      {sublabel ? <Text style={styles.sublabel}>{sublabel}</Text> : null}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={a11yLabel}
        testID={testID}
        style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
      >
        {content}
      </Pressable>
    );
  }
  return (
    <View style={styles.tile} accessible accessibilityLabel={a11yLabel} testID={testID}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minHeight: 96,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.xs,
    ...shadows.sm,
  },
  pressed: { opacity: 0.9 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
  value: { ...typography.stat, color: colors.text },
  label: { ...typography.caption, color: colors.textMuted },
  sublabel: { ...typography.caption, color: colors.textMuted },
});

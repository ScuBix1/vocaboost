/**
 * Tuile de statistique v2 (design §4.7) : fond coloré doux, valeur `stat` dans l'ink du ton.
 */
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, MAX_FONT_MULTIPLIER, spacing, typography } from '@/theme/tokens';

export type StatTone = 'default' | 'success' | 'sun' | 'flame' | 'primary' | 'warning';

export interface StatTileProps {
  value: ReactNode;
  label: string;
  emoji?: string;
  sublabel?: string;
  tone?: StatTone;
  /** Valeur lue par le lecteur d'écran si `value` est un nœud animé. */
  a11yValue?: string | number;
  onPress?: () => void;
  testID?: string;
  valueTestID?: string;
}

const TONES: Record<StatTone, { bg: string; fg: string; border?: string }> = {
  default: { bg: colors.surface, fg: colors.ink, border: colors.border },
  success: { bg: colors.successSoft, fg: colors.successInk },
  sun: { bg: colors.sunSoft, fg: colors.sunInk },
  warning: { bg: colors.sunSoft, fg: colors.sunInk },
  flame: { bg: colors.flameSoft, fg: colors.flameInk },
  primary: { bg: colors.primarySoft, fg: colors.primaryInk },
};

export function StatTile({ value, label, emoji, sublabel, tone = 'default', a11yValue, onPress, testID, valueTestID }: StatTileProps) {
  const t = TONES[tone];
  const spoken = a11yValue ?? (typeof value === 'string' || typeof value === 'number' ? value : '');
  const a11yLabel = `${label} : ${spoken}${sublabel ? ` ${sublabel}` : ''}`;
  const tileStyle = [styles.tile, { backgroundColor: t.bg }, t.border ? { borderWidth: 2, borderColor: t.border } : null];
  const content = (
    <>
      <View style={styles.row}>
        {emoji ? (
          <Text style={styles.value} accessible={false} maxFontSizeMultiplier={MAX_FONT_MULTIPLIER}>
            {emoji}
          </Text>
        ) : null}
        <Text style={[styles.value, { color: t.fg }]} maxFontSizeMultiplier={MAX_FONT_MULTIPLIER} testID={valueTestID}>
          {value}
        </Text>
      </View>
      <Text style={[styles.label, { color: t.fg }]}>{label}</Text>
      {sublabel ? <Text style={[styles.label, { color: t.fg }]}>{sublabel}</Text> : null}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={a11yLabel}
        testID={testID}
        style={({ pressed }) => [tileStyle, pressed && styles.pressed]}
      >
        {content}
      </Pressable>
    );
  }
  return (
    <View style={tileStyle} accessible accessibilityLabel={a11yLabel} testID={testID}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { flex: 1, borderRadius: 20, padding: 14, gap: 2 },
  pressed: { opacity: 0.9 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  value: { ...typography.stat, color: colors.ink },
  label: { ...typography.caption },
});
